import type { WorktreeMeta } from '../../../../shared/worktree/meta-types'
import type { Worktree } from '../../../../shared/worktree/types'

type LinkedWorkItemMetadata = Pick<
  Worktree,
  | 'linkedGitLabMR'
  | 'linkedGitLabIssue'
  | 'linkedBitbucketPR'
  | 'linkedAzureDevOpsPR'
  | 'linkedGiteaPR'
  | 'linkedCodeupMR'
  | 'linkedWorkItem'
  | 'linkedItems'
  | 'linkedTaskSourceContext'
>

export function getLinkedWorkItemMetadata(meta: WorktreeMeta | undefined): LinkedWorkItemMetadata {
  return {
    linkedGitLabMR: meta?.linkedGitLabMR ?? null,
    linkedGitLabIssue: meta?.linkedGitLabIssue ?? null,
    linkedBitbucketPR: meta?.linkedBitbucketPR ?? null,
    linkedAzureDevOpsPR: meta?.linkedAzureDevOpsPR ?? null,
    linkedGiteaPR: meta?.linkedGiteaPR ?? null,
    linkedCodeupMR: meta?.linkedCodeupMR ?? null,
    linkedWorkItem: meta?.linkedWorkItem ?? null,
    ...(meta?.linkedItems !== undefined ? { linkedItems: meta.linkedItems } : {}),
    linkedTaskSourceContext: meta?.linkedTaskSourceContext ?? null
  }
}
