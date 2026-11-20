import type {
  CheckStatus,
  PRMergeableState
} from '../../shared/github/pull-requests/pull-request-types'

/**
 * Wire shape from the yunxiao OAPI changeRequests endpoints (verified live):
 * list items carry state/updatedAt/hasConflict/workInProgress, the detail
 * resource carries status/createTime/updateTime/conflictCheckStatus.
 */
export type RawCodeupMergeRequest = {
  localId?: number | string | null
  mrBizId?: string | null
  title?: string | null
  description?: string | null
  status?: string | null
  state?: string | null
  sourceBranch?: string | null
  targetBranch?: string | null
  detailUrl?: string | null
  webUrl?: string | null
  createTime?: string | null
  updateTime?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  workInProgress?: boolean | null
  hasConflict?: boolean | null
  conflictCheckStatus?: string | null
}

export type CodeupMergeRequestInfo = {
  number: number
  title: string
  state: 'open' | 'closed' | 'merged' | 'draft'
  url: string
  status: CheckStatus
  updatedAt: string
  mergeable: PRMergeableState
  sourceBranch?: string
}

function statusText(raw: RawCodeupMergeRequest): string {
  return (raw.status ?? raw.state ?? '').trim().toUpperCase()
}

export function mapCodeupMergeRequestState(
  raw: RawCodeupMergeRequest
): CodeupMergeRequestInfo['state'] {
  switch (statusText(raw)) {
    case 'MERGED':
      return 'merged'
    case 'CLOSED':
    case 'DECLINED':
    case 'REJECTED':
      return 'closed'
    default:
      // TO_BE_MERGED, UNDER_REVIEW, MERGING and any unknown in-flight value keep the MR visible.
      return 'open'
  }
}

function toNumber(value: RawCodeupMergeRequest['localId']): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function mapMergeable(raw: RawCodeupMergeRequest): PRMergeableState {
  if (raw.hasConflict === true) {
    return 'CONFLICTING'
  }
  return (raw.conflictCheckStatus ?? '').trim().toUpperCase() === 'NO_CONFLICT'
    ? 'MERGEABLE'
    : 'UNKNOWN'
}

export function mapCodeupMergeRequest(raw: RawCodeupMergeRequest): CodeupMergeRequestInfo | null {
  const number = toNumber(raw.localId)
  const title = raw.title?.trim()
  const url = raw.detailUrl?.trim() || raw.webUrl?.trim()
  if (number === null || !title || !url) {
    return null
  }
  const sourceBranch = raw.sourceBranch?.trim()
  const mappedState = mapCodeupMergeRequestState(raw)
  return {
    number,
    title,
    state: mappedState === 'open' && raw.workInProgress === true ? 'draft' : mappedState,
    url,
    // Codeup pipeline (Check Run) rollups live in a separate API group; neutral until wired.
    status: 'neutral',
    updatedAt: raw.updatedAt ?? raw.updateTime ?? raw.createdAt ?? raw.createTime ?? '',
    mergeable: mapMergeable(raw),
    ...(sourceBranch ? { sourceBranch } : {})
  }
}
