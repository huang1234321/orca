import type { ExecutionHostId } from '../../shared/execution-host/execution-host'
import type { HostedReviewExecutionOptions } from './hosted-review-git-options'

export type ForgeProviderRepositoryContext = HostedReviewExecutionOptions & {
  repoPath: string
  /** Resolved, never null: `local` and "unresolved" are no longer the same value. */
  executionHostId: ExecutionHostId
}
