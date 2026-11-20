import type { ExecutionHostId } from '../../shared/execution-host/execution-host'
import { hostedReviewSshConnectionId } from '../source-control/hosted-review-execution-host'
import type {
  CreateHostedReviewInput,
  CreateHostedReviewResult
} from '../../shared/source-control/hosted-review/hosted-review-contracts'
import {
  normalizeHostedReviewBaseRef,
  normalizeHostedReviewHeadRef
} from '../../shared/source-control/hosted-review/hosted-review-refs'
import {
  HostedReviewApiRequestError,
  requestHostedReviewJson
} from '../source-control/hosted-review-api-request'
import { readHostedPullRequestTemplate } from '../source-control/pull-request-template'
import {
  codeupOrgPath,
  getAuthConfig,
  getCodeupMergeRequestForBranch,
  resolveCodeupRepositoryId
} from './client'
import { mapCodeupMergeRequest, type RawCodeupMergeRequest } from './merge-request-mappers'
import { getCodeupRepoRef } from './repository-ref'

const CREATE_REQUEST_TIMEOUT_MS = 60_000

export function isCodeupReviewCreationAuthenticated(): boolean {
  return getAuthConfig().token !== null
}

function oapiHeaders(): Record<string, string> {
  const token = getAuthConfig().token
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'x-yunxiao-token': token } : {})
  }
}

type CreateEnvelope = {
  success?: boolean | null
  errorCode?: string | null
  errorMessage?: string | null
  result?: RawCodeupMergeRequest | null
}

function apiErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function classifyCreateError(error: unknown): CreateHostedReviewResult {
  const message = apiErrorMessage(error)
  if (message) {
    console.warn('createCodeupMergeRequest failed:', message)
  }
  const lower = message.toLowerCase()
  const status = error instanceof HostedReviewApiRequestError ? error.status : null
  if (
    status === 401 ||
    status === 403 ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('authentication')
  ) {
    return {
      ok: false,
      code: 'auth_required',
      error:
        'Create MR failed: Codeup is not authenticated. Next step: set ORCA_CODEUP_TOKEN (and optionally ORCA_CODEUP_ORGANIZATION_ID) in this environment.',
      reason: 'auth_required'
    }
  }
  if (
    status === 409 ||
    lower.includes('already exists') ||
    lower.includes('already open') ||
    lower.includes('已存在')
  ) {
    return {
      ok: false,
      code: 'already_exists',
      error: 'A merge request already exists for this branch.',
      reason: 'existing_review'
    }
  }
  if (error instanceof HostedReviewApiRequestError && error.timedOut) {
    return {
      ok: false,
      code: 'unknown_completion',
      error: 'MR creation may have completed. Refreshing branch review state...',
      reason: 'creation_unconfirmed'
    }
  }
  if (status === 400 || status === 422 || lower.includes('validation')) {
    return {
      ok: false,
      code: 'validation',
      error:
        'Create MR failed: Codeup rejected the merge request. Check the base branch and branch state, then try again.',
      reason: 'rejected'
    }
  }
  return {
    ok: false,
    code: 'unknown',
    error: 'Create MR failed: Codeup could not create the merge request. Try again in a moment.',
    reason: 'create_failed'
  }
}

async function findExistingMergeRequest(
  repoPath: string,
  head: string,
  connectionId?: string | null
): Promise<{ number: number; url: string } | null> {
  const existing = await getCodeupMergeRequestForBranch(repoPath, head, null, connectionId)
  return existing ? { number: existing.number, url: existing.url } : null
}

export async function createCodeupMergeRequest(
  repoPath: string,
  input: CreateHostedReviewInput,
  executionHostId: ExecutionHostId
): Promise<CreateHostedReviewResult> {
  if (input.provider !== 'codeup') {
    return {
      ok: false,
      code: 'unsupported_provider',
      error: 'Creating reviews for this provider is not supported yet.',
      reason: 'provider_not_supported'
    }
  }

  // The Codeup REST calls run on this client; only the git reads under them are routed.
  const connectionId = hostedReviewSshConnectionId(executionHostId)

  const repo = await getCodeupRepoRef(repoPath, connectionId)
  if (!repo) {
    return {
      ok: false,
      code: 'unsupported_provider',
      error: 'Creating merge requests requires a Codeup remote.',
      reason: 'unsupported_provider'
    }
  }

  const base = normalizeHostedReviewBaseRef(input.base)
  const head = input.head ? normalizeHostedReviewHeadRef(input.head) : ''
  const title = input.title.trim()
  if (!base || !head || !title) {
    return {
      ok: false,
      code: 'validation',
      error: 'Create MR failed: base branch, head branch, and title are required.',
      reason: 'base_head_title_required'
    }
  }
  if (head.toLowerCase() === base.toLowerCase()) {
    return {
      ok: false,
      code: 'validation',
      error: 'Create MR failed: choose a different base branch before creating a merge request.',
      reason: 'same_base_branch'
    }
  }

  const description =
    input.useTemplate && !input.body?.trim()
      ? await readHostedPullRequestTemplate(repoPath, connectionId)
      : (input.body ?? '')

  try {
    const repositoryId = await resolveCodeupRepositoryId(repo, true)
    if (repositoryId === null) {
      return {
        ok: false,
        code: 'unsupported_provider',
        error:
          'Create MR failed: the Codeup repository could not be resolved from the remote path.',
        reason: 'unsupported_provider'
      }
    }
    const repositoryIdString = String(repositoryId)
    const response = await requestHostedReviewJson<CreateEnvelope & RawCodeupMergeRequest>(
      new URL(
        `${getAuthConfig().apiBaseUrl}${codeupOrgPath(repo)}/repositories/${repositoryId}/changeRequests`
      ),
      {
        method: 'POST',
        headers: oapiHeaders(),
        body: JSON.stringify({
          title,
          ...(description.trim() ? { description } : {}),
          sourceBranch: head,
          targetBranch: base,
          sourceProjectId: repositoryIdString,
          targetProjectId: repositoryIdString,
          createFrom: 'WEB'
        })
      },
      CREATE_REQUEST_TIMEOUT_MS
    )
    const raw = response?.result ?? response ?? null
    const created = raw ? mapCodeupMergeRequest(raw) : null
    if (created) {
      return { ok: true, number: created.number, url: created.url }
    }
    const found = await findExistingMergeRequest(repoPath, head, connectionId).catch(() => null)
    return found
      ? { ok: true, ...found }
      : {
          ok: false,
          code: 'unknown_completion',
          error: 'MR creation may have completed. Refreshing branch review state...',
          reason: 'creation_unconfirmed'
        }
  } catch (error) {
    const classified = classifyCreateError(error)
    if (
      !classified.ok &&
      (classified.code === 'already_exists' || classified.code === 'unknown_completion')
    ) {
      const existing = await findExistingMergeRequest(repoPath, head, connectionId).catch(
        () => null
      )
      if (existing) {
        return {
          ok: false,
          code: 'already_exists',
          error: 'A merge request already exists for this branch.',
          reason: 'existing_review',
          existingReview: existing
        }
      }
    }
    return classified
  }
}
