import { hostedReviewSshConnectionId } from './hosted-review-execution-host'
import {
  getHostedReviewLocalGitOptions,
  hasHostedReviewLocalGitOptions,
  type HostedReviewExecutionOptions
} from './hosted-review-git-options'
import type { ForgeProviderRepositoryContext } from './forge-provider-inputs'

/** Forge CLIs/API clients run here; only their Git reads route to SSH. */
export function forgeConnectionId(context: ForgeProviderRepositoryContext): string | null {
  return hostedReviewSshConnectionId(context.executionHostId)
}

export function hostedReviewExecutionArgs(
  options: HostedReviewExecutionOptions
): [] | [HostedReviewExecutionOptions] {
  return hasHostedReviewLocalGitOptions(options)
    ? [{ localGitExecOptions: getHostedReviewLocalGitOptions(options) }]
    : []
}
