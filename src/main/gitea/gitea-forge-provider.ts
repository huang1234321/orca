import type { ForgeProvider } from '../source-control/forge-provider'
import {
  forgeConnectionId,
  hostedReviewExecutionArgs
} from '../source-control/forge-provider-helpers'
import {
  getGiteaPullRequest,
  getGiteaPullRequestForBranchOrThrow,
  getGiteaRepoSlug
} from './client'
import { createGiteaPullRequest } from './pull-request-creation'
import { mapGiteaReview } from '../source-control/forge-review-mappers'

export const giteaForgeProvider = {
  id: 'gitea',
  supportsReviewCreation: true,
  resolveRepository: (context) =>
    getGiteaRepoSlug(
      context.repoPath,
      forgeConnectionId(context),
      ...hostedReviewExecutionArgs(context)
    ),
  async getReviewForBranch(input) {
    // Lookup failure is unavailable, never proof no review exists.
    const pr = await getGiteaPullRequestForBranchOrThrow(
      input.repoPath,
      input.branch,
      input.linkedReviewNumber ?? null,
      forgeConnectionId(input),
      ...hostedReviewExecutionArgs(input)
    )
    return pr ? mapGiteaReview(pr) : null
  },
  async getReviewByNumber(input) {
    const pr = await getGiteaPullRequest(
      input.repoPath,
      input.number,
      forgeConnectionId(input),
      ...hostedReviewExecutionArgs(input)
    )
    return pr ? mapGiteaReview(pr) : null
  },
  createReview: createGiteaPullRequest
} satisfies ForgeProvider
