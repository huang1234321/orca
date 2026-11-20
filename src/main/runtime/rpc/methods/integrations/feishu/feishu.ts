import { defineMethod } from '../../../core'
import {
  FeishuCommentBody,
  FeishuConnect,
  FeishuInferMapping,
  FeishuListRecords,
  FeishuRecord,
  FeishuUpdateState
} from '../../../../../../shared/rpc-contract/feishu/feishu-params'

export const FEISHU_METHODS = [
  defineMethod({
    name: 'feishu.connect',
    permission: 'accounts-admin',
    params: FeishuConnect,
    handler: async (params, { runtime }) =>
      runtime.feishuConnect({ appId: params.appId, appSecret: params.appSecret })
  }),
  defineMethod({
    name: 'feishu.disconnect',
    permission: 'accounts-admin',
    params: null,
    handler: async (_params, { runtime }) => runtime.feishuDisconnect()
  }),
  defineMethod({
    name: 'feishu.status',
    permission: 'workspace',
    params: null,
    handler: async (_params, { runtime }) => runtime.feishuStatus()
  }),
  defineMethod({
    name: 'feishu.inferMapping',
    permission: 'workspace',
    params: FeishuInferMapping,
    handler: async (params, { runtime }) =>
      runtime.feishuInferMapping(params.appToken.trim(), params.tableId.trim())
  }),
  defineMethod({
    name: 'feishu.listRecords',
    permission: 'workspace',
    params: FeishuListRecords,
    handler: async (params, { runtime }) =>
      runtime.feishuListRecords(
        params.appToken,
        params.tableId,
        params.mapping,
        {
          state: params.state ?? null,
          assigneeOpenId: params.assigneeOpenId ?? null,
          labels: params.labels,
          freeText: params.freeText ?? null
        },
        params.pageToken ?? undefined
      )
  }),
  defineMethod({
    name: 'feishu.getRecord',
    permission: 'workspace',
    params: FeishuRecord,
    handler: async (params, { runtime }) =>
      runtime.feishuGetRecord(params.appToken, params.tableId, params.recordId, params.mapping)
  }),
  defineMethod({
    name: 'feishu.updateRecordState',
    permission: 'workspace',
    params: FeishuUpdateState,
    handler: async (params, { runtime }) =>
      runtime.feishuUpdateRecordState(
        params.appToken,
        params.tableId,
        params.recordId,
        params.mapping,
        params.stateOption
      )
  }),
  defineMethod({
    name: 'feishu.listComments',
    permission: 'workspace',
    params: FeishuRecord,
    handler: async (params, { runtime }) =>
      runtime.feishuListComments(params.appToken, params.mapping, params.recordId)
  }),
  defineMethod({
    name: 'feishu.addComment',
    permission: 'workspace',
    params: FeishuCommentBody,
    handler: async (params, { runtime }) =>
      runtime.feishuAddComment(params.appToken, params.mapping, params.recordId, params.body)
  })
]
