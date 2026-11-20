import type { ForgeProvider } from '../source-control/forge-provider'
import {
  forgeConnectionId,
  hostedReviewExecutionArgs
} from '../source-control/forge-provider-helpers'
import {
  getCodeupMergeRequest,
  getCodeupMergeRequestForBranchOrThrow,
  getCodeupRepoSlug
} from './client'
import { createCodeupMergeRequest } from './merge-request-creation'
import { mapCodeupReview } from '../source-control/forge-review-mappers'

export const codeupForgeProvider = {
  id: 'codeup',
  supportsReviewCreation: true,
  resolveRepository: (context) =>
    getCodeupRepoSlug(
      context.repoPath,
      forgeConnectionId(context),
      ...hostedReviewExecutionArgs(context)
    ),
  async getReviewForBranch(input) {
    // Lookup failure is unavailable, never proof no review exists.
    const mr = await getCodeupMergeRequestForBranchOrThrow(
      input.repoPath,
      input.branch,
      input.linkedReviewNumber ?? null,
      forgeConnectionId(input),
      ...hostedReviewExecutionArgs(input)
    )
    return mr ? mapCodeupReview(mr) : null
  },
  async getReviewByNumber(input) {
    const mr = await getCodeupMergeRequest(
      input.repoPath,
      input.number,
      forgeConnectionId(input),
      ...hostedReviewExecutionArgs(input)
    )
    return mr ? mapCodeupReview(mr) : null
  },
  createReview: createCodeupMergeRequest
} satisfies ForgeProvider
