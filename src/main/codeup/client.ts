import { shouldHideNonOpenReviewOnDefaultBranch } from '../source-control/repo-default-branch'
import {
  getHostedReviewLocalGitOptions,
  type HostedReviewExecutionOptions
} from '../source-control/hosted-review-git-options'
import { getCodeupRepoRef, type CodeupRepoRef } from './repository-ref'
import {
  mapCodeupMergeRequest,
  type CodeupMergeRequestInfo,
  type RawCodeupMergeRequest
} from './merge-request-mappers'
import { cancelUnreadResponseBody } from '../lib/unread-response-body'

// openapi-rdc is the only API gateway; codeup.aliyun.com and devops.aliyun.com serve the web app.
const DEFAULT_API_BASE_URL = 'https://openapi-rdc.aliyuncs.com'
const REQUEST_TIMEOUT_MS = 10_000
const MERGE_REQUEST_LIST_TIMEOUT_MS = 15_000
// The server silently caps any larger page size at 20.
const MERGE_REQUEST_PAGE_SIZE = 20
const MERGE_REQUEST_MAX_PAGES = 3

type CodeupAuthConfig = {
  apiBaseUrl: string
  token: string | null
  organizationId: string | null
}

type RequestOptions = {
  searchParams?: Record<string, string | number>
  timeoutMs?: number
  // Why: only a single-resource fetch may read 404 as "absent".
  allowNotFound?: boolean
}

function envValue(name: string): string | null {
  const value = process.env[name]?.trim() ?? ''
  return value.length > 0 ? value : null
}

function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

export function getAuthConfig(): CodeupAuthConfig {
  return {
    apiBaseUrl: normalizeApiBaseUrl(envValue('ORCA_CODEUP_API_BASE_URL') ?? DEFAULT_API_BASE_URL),
    token: envValue('ORCA_CODEUP_TOKEN'),
    organizationId: envValue('ORCA_CODEUP_ORGANIZATION_ID')
  }
}

function configuredOrganizationId(repo: CodeupRepoRef): string {
  return getAuthConfig().organizationId ?? repo.organizationId
}

/** Org-scoped OAPI prefix: /oapi/v1/codeup/organizations/{organizationId}. */
export function codeupOrgPath(repo: CodeupRepoRef): string {
  return `/oapi/v1/codeup/organizations/${encodeURIComponent(configuredOrganizationId(repo))}`
}

/** OAPI responses are bare JSON; some actions wrap payloads as {success, errorCode, errorMessage, result}. */
type CodeupEnvelope<T> = {
  success?: boolean | null
  errorCode?: string | null
  errorMessage?: string | null
  result?: T | null
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
  // Creation must distinguish transport/auth failures from confirmed absence.
  throwOnFailure = false
): Promise<T | null> {
  const config = getAuthConfig()
  const url = new URL(`${config.apiBaseUrl}${path}`)
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    url.searchParams.set(key, String(value))
  }
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(config.token ? { 'x-yunxiao-token': config.token } : {})
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS)
    })
    if (!response.ok) {
      await cancelUnreadResponseBody(response)
      if (throwOnFailure && !(options.allowNotFound && response.status === 404)) {
        throw new Error(`Codeup request failed: HTTP ${response.status}`)
      }
      return null
    }
    const envelope: CodeupEnvelope<T> & T = await response.json()
    if (envelope && typeof envelope === 'object' && 'result' in envelope) {
      if (envelope.success === false) {
        if (throwOnFailure) {
          throw new Error(
            `Codeup request failed: ${envelope.errorCode ?? 'UNKNOWN'} ${envelope.errorMessage ?? ''}`.trim()
          )
        }
        return null
      }
      return envelope.result ?? null
    }
    return envelope
  } catch (error) {
    if (throwOnFailure) {
      throw error
    }
    return null
  }
}

type RawCodeupRepository = {
  id?: number | string | null
  Id?: number | string | null
}

const repositoryIdCache = new Map<string, number>()

/**
 * MR endpoints address repositories by numeric ID; git remotes only carry the path.
 * The by-path repository endpoint returns it directly. Memoized (IDs are stable).
 */
export async function resolveCodeupRepositoryId(
  repo: CodeupRepoRef,
  throwOnFailure = false
): Promise<number | null> {
  const cacheKey = `${configuredOrganizationId(repo)}/${repo.repoPath}`
  const cached = repositoryIdCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }
  const raw = await requestJson<RawCodeupRepository>(
    `${codeupOrgPath(repo)}/repositories/${encodeURIComponent(repo.repoPath)}`,
    { allowNotFound: true },
    throwOnFailure
  )
  const value = raw?.id ?? raw?.Id
  const id = typeof value === 'number' ? value : Number(value)
  if (raw && Number.isFinite(id)) {
    repositoryIdCache.set(cacheKey, id)
    return id
  }
  return null
}

/**
 * Branch lookup runs against the org-wide listing: the repo-scoped
 * /repositories/{id}/changeRequests list 404s on the OAPI gateway (verified).
 */
async function findMergeRequestForBranch(
  repo: CodeupRepoRef,
  repositoryId: number,
  branchName: string,
  throwOnFailure: boolean
): Promise<RawCodeupMergeRequest | null> {
  for (let page = 1; page <= MERGE_REQUEST_MAX_PAGES; page++) {
    const list = await requestJson<RawCodeupMergeRequest[]>(
      `${codeupOrgPath(repo)}/changeRequests`,
      {
        searchParams: {
          projectIds: repositoryId,
          state: 'all',
          page,
          pageSize: MERGE_REQUEST_PAGE_SIZE
        },
        timeoutMs: MERGE_REQUEST_LIST_TIMEOUT_MS
      },
      throwOnFailure
    )
    const items = Array.isArray(list) ? list : []
    const match = items.find(
      (item) => item.sourceBranch?.replace(/^refs\/heads\//, '') === branchName
    )
    if (match) {
      return match
    }
    if (items.length < MERGE_REQUEST_PAGE_SIZE) {
      return null
    }
  }
  return null
}

export async function getCodeupMergeRequest(
  repoPath: string,
  mrNumber: number,
  connectionId?: string | null,
  options: HostedReviewExecutionOptions = {}
): Promise<CodeupMergeRequestInfo | null> {
  const repo = await getCodeupRepoRef(
    repoPath,
    connectionId,
    getHostedReviewLocalGitOptions(options)
  )
  if (!repo) {
    return null
  }
  const repositoryId = await resolveCodeupRepositoryId(repo)
  if (repositoryId === null) {
    return null
  }
  const raw = await requestJson<RawCodeupMergeRequest>(
    `${codeupOrgPath(repo)}/repositories/${repositoryId}/changeRequests/${encodeURIComponent(String(mrNumber))}`,
    { allowNotFound: true }
  )
  return raw ? mapCodeupMergeRequest(raw) : null
}

export async function getCodeupMergeRequestForBranch(
  repoPath: string,
  branch: string,
  linkedMRNumber?: number | null,
  connectionId?: string | null,
  options: HostedReviewExecutionOptions = {},
  throwOnFailure = false
): Promise<CodeupMergeRequestInfo | null> {
  const branchName = branch.replace(/^refs\/heads\//, '')
  if (!branchName && linkedMRNumber == null) {
    return null
  }

  const repo = await getCodeupRepoRef(
    repoPath,
    connectionId,
    getHostedReviewLocalGitOptions(options)
  )
  if (!repo) {
    return null
  }
  const repositoryId = await resolveCodeupRepositoryId(repo, throwOnFailure)
  if (repositoryId === null) {
    if (throwOnFailure && typeof linkedMRNumber !== 'number') {
      throw new Error('Codeup repository could not be resolved from the remote path')
    }
    return typeof linkedMRNumber === 'number'
      ? getCodeupMergeRequest(repoPath, linkedMRNumber, connectionId, options)
      : null
  }

  if (branchName) {
    const raw = await findMergeRequestForBranch(repo, repositoryId, branchName, throwOnFailure)
    const mapped = raw ? mapCodeupMergeRequest(raw) : null
    if (mapped && raw) {
      const hideOnDefaultBranch = await shouldHideNonOpenReviewOnDefaultBranch({
        state: mapped.state,
        reviewNumber: typeof raw.localId === 'number' ? raw.localId : Number(raw.localId) || null,
        linkedReviewNumber: linkedMRNumber,
        branchName,
        repoPath,
        connectionId,
        localGitOptions: getHostedReviewLocalGitOptions(options)
      })
      if (!hideOnDefaultBranch) {
        return mapped
      }
    }
  }

  if (typeof linkedMRNumber !== 'number') {
    return null
  }
  return getCodeupMergeRequest(repoPath, linkedMRNumber, connectionId, options)
}

/** Surface lookup failures as unavailable rather than a false missing review. */
export function getCodeupMergeRequestForBranchOrThrow(
  repoPath: string,
  branch: string,
  linkedMRNumber?: number | null,
  connectionId?: string | null,
  options: HostedReviewExecutionOptions = {}
): Promise<CodeupMergeRequestInfo | null> {
  return getCodeupMergeRequestForBranch(
    repoPath,
    branch,
    linkedMRNumber,
    connectionId,
    options,
    true
  )
}

export async function getCodeupRepoSlug(
  repoPath: string,
  connectionId?: string | null,
  options: HostedReviewExecutionOptions = {}
): Promise<CodeupRepoRef | null> {
  return getCodeupRepoRef(repoPath, connectionId, getHostedReviewLocalGitOptions(options))
}
