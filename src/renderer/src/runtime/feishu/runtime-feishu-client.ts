import type {
  FeishuComment,
  FeishuFieldSchema,
  FeishuTableMapping,
  FeishuWorkItem
} from '../../../../shared/feishu/feishu-types'
import type { RuntimeClientTarget } from '../../../../shared/remote-runtime/host-catalog/runtime-client-target'
import { callRuntimeRpc } from '../rpc/calls/runtime-rpc-call'

/** Feishu credentials and RPC handlers live on local main; there is no remote owner to route by. */
export const feishuLocalTarget: RuntimeClientTarget = { kind: 'local' }

export type FeishuConnectionStatus = {
  connected: boolean
  appId: string | null
  error: string | null
}

export type FeishuConnectResult = { ok: true } | { ok: false; error: string }

export type FeishuInferMappingResult =
  | { ok: true; fields: FeishuFieldSchema[]; mapping: FeishuTableMapping }
  | { ok: false; error: string }

export type FeishuListRecordsResult =
  | { ok: true; items: FeishuWorkItem[]; hasMore: boolean; pageToken: string | null }
  | { ok: false; error: string }

export type FeishuGetRecordResult =
  | { ok: true; item: FeishuWorkItem }
  | { ok: false; error: string }

export type FeishuMutationResult = { ok: true } | { ok: false; error: string }

export type FeishuListRecordsArgs = {
  appToken: string
  tableId: string
  mapping: FeishuTableMapping
  state?: 'open' | 'closed' | null
  assigneeOpenId?: string | null
  labels?: string[]
  freeText?: string | null
  pageToken?: string
}

export async function feishuStatusForTarget(
  target: RuntimeClientTarget
): Promise<FeishuConnectionStatus> {
  const status =
    target.kind === 'environment'
      ? await callRuntimeRpc<{
          connected: boolean
          appId: string | null
          error: string | null
          app: { appId: string } | null
        }>(target, 'feishu.status', undefined, { timeoutMs: 15_000 })
      : await window.api.feishu.status()
  return { connected: status.connected, appId: status.appId, error: status.error }
}

export function feishuConnectForTarget(
  target: RuntimeClientTarget,
  args: { appId: string; appSecret: string }
): Promise<FeishuConnectResult> {
  return target.kind === 'environment'
    ? callRuntimeRpc<FeishuConnectResult>(target, 'feishu.connect', args, { timeoutMs: 30_000 })
    : window.api.feishu.connect(args)
}

export async function feishuDisconnectForTarget(
  target: RuntimeClientTarget
): Promise<{ ok: true }> {
  if (target.kind === 'environment') {
    return callRuntimeRpc<{ ok: true }>(target, 'feishu.disconnect', undefined, {
      timeoutMs: 15_000
    })
  }
  return window.api.feishu.disconnect()
}

export function feishuInferMappingForTarget(
  target: RuntimeClientTarget,
  args: { appToken: string; tableId: string }
): Promise<FeishuInferMappingResult> {
  return target.kind === 'environment'
    ? callRuntimeRpc<FeishuInferMappingResult>(target, 'feishu.inferMapping', args, {
        timeoutMs: 30_000
      })
    : window.api.feishu.inferMapping(args)
}

export function feishuListRecordsForTarget(
  target: RuntimeClientTarget,
  args: FeishuListRecordsArgs
): Promise<FeishuListRecordsResult> {
  return target.kind === 'environment'
    ? callRuntimeRpc<FeishuListRecordsResult>(target, 'feishu.listRecords', args, {
        timeoutMs: 30_000
      })
    : window.api.feishu.listRecords(args)
}

export function feishuGetRecordForTarget(
  target: RuntimeClientTarget,
  args: { appToken: string; tableId: string; recordId: string; mapping: FeishuTableMapping }
): Promise<FeishuGetRecordResult> {
  return target.kind === 'environment'
    ? callRuntimeRpc<FeishuGetRecordResult>(target, 'feishu.getRecord', args, { timeoutMs: 30_000 })
    : window.api.feishu.getRecord(args)
}

export function feishuUpdateRecordStateForTarget(
  target: RuntimeClientTarget,
  args: {
    appToken: string
    tableId: string
    recordId: string
    mapping: FeishuTableMapping
    stateOption: string
  }
): Promise<FeishuMutationResult> {
  return target.kind === 'environment'
    ? callRuntimeRpc<FeishuMutationResult>(target, 'feishu.updateRecordState', args, {
        timeoutMs: 30_000
      })
    : window.api.feishu.updateRecordState(args)
}

export function feishuUpdateRecordBodyForTarget(
  target: RuntimeClientTarget,
  args: {
    appToken: string
    tableId: string
    recordId: string
    mapping: FeishuTableMapping
    body: string
  }
): Promise<FeishuMutationResult> {
  return target.kind === 'environment'
    ? callRuntimeRpc<FeishuMutationResult>(target, 'feishu.updateRecordBody', args, {
        timeoutMs: 30_000
      })
    : window.api.feishu.updateRecordBody(args)
}

export function feishuReadDocContentForTarget(
  target: RuntimeClientTarget,
  args: { docUrl: string }
): Promise<{ ok: true; markdown: string } | { ok: false; error: string }> {
  return target.kind === 'environment'
    ? callRuntimeRpc<{ ok: true; markdown: string } | { ok: false; error: string }>(
        target,
        'feishu.readDocContent',
        args,
        { timeoutMs: 30_000 }
      )
    : window.api.feishu.readDocContent(args)
}

export function feishuListCommentsForTarget(
  target: RuntimeClientTarget,
  args: { appToken: string; mapping: FeishuTableMapping; recordId: string }
): Promise<{ ok: true; comments: FeishuComment[] }> {
  return target.kind === 'environment'
    ? callRuntimeRpc<{ ok: true; comments: FeishuComment[] }>(target, 'feishu.listComments', args, {
        timeoutMs: 30_000
      })
    : window.api.feishu.listComments(args)
}

export function feishuAddCommentForTarget(
  target: RuntimeClientTarget,
  args: { appToken: string; mapping: FeishuTableMapping; recordId: string; body: string }
): Promise<{ ok: true; comment: FeishuComment } | { ok: false; error: string }> {
  return target.kind === 'environment'
    ? callRuntimeRpc<{ ok: true; comment: FeishuComment } | { ok: false; error: string }>(
        target,
        'feishu.addComment',
        args,
        { timeoutMs: 30_000 }
      )
    : window.api.feishu.addComment(args)
}
