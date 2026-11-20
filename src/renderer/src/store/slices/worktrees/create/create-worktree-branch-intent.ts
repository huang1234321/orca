import type { RuntimeClientTarget } from '../../../../../../shared/remote-runtime/host-catalog/runtime-client-target'
import { runtimeTargetSupportsCapability } from '@/runtime/rpc/compatibility/runtime-target-capability'
import {
  WORKTREE_OPEN_EXISTING_BRANCH_RUNTIME_CAPABILITY,
  WORKTREE_OPEN_EXISTING_BRANCH_V2_RUNTIME_CAPABILITY,
  WORKTREE_OPEN_EXISTING_BRANCH_V2_REQUEST_RUNTIME_CAPABILITY
} from '../../../../../../shared/remote-runtime/protocol/worktree-runtime-capabilities'
import type { CreateWorktreeCallOptions, WorktreeCreateRequest } from './worktree-create-payload'

/** Applies the caller's branch-intent onto the request after the host proves the capability. */
export async function applyWorktreeCreateBranchIntent(
  request: WorktreeCreateRequest,
  options: CreateWorktreeCallOptions | undefined,
  target: RuntimeClientTarget
): Promise<void> {
  if (options?.branchIntent === 'create-exact') {
    if (options.provisionedRoot) {
      throw new Error('An exact-name create cannot adopt a provisioned root.')
    }
    // The caller checked this host's capability; another await here would let the active parent drift.
    request.branchIntent = 'create-exact'
    return
  }
  if (options?.branchIntent) {
    const capability =
      options.branchIntent === 'open-existing-v2'
        ? WORKTREE_OPEN_EXISTING_BRANCH_V2_REQUEST_RUNTIME_CAPABILITY
        : options.branchIntent === 'create-new'
          ? WORKTREE_OPEN_EXISTING_BRANCH_V2_RUNTIME_CAPABILITY
          : WORKTREE_OPEN_EXISTING_BRANCH_RUNTIME_CAPABILITY
    if (!(await runtimeTargetSupportsCapability(target, capability))) {
      throw new Error(
        'Update Orca on the workspace host to reuse a branch or explicitly create a separate branch.'
      )
    }
    request.branchIntent = options.branchIntent
  }
}
