import type {
  FeishuComment,
  FeishuTableMapping,
  FeishuWorkItem
} from '../../../shared/feishu/feishu-types'

export type FeishuApi = {
  connect: (args: {
    appId: string
    appSecret: string
  }) => Promise<{ ok: true } | { ok: false; error: string }>
  disconnect: () => Promise<{ ok: true }>
  status: () => Promise<{
    connected: boolean
    appId: string | null
    error: string | null
    app: { appId: string } | null
  }>
  inferMapping: (args: { appToken: string; tableId: string }) => Promise<
    | {
        ok: true
        fields: {
          fieldId: string
          fieldName: string
          type: number
          uiType: string
          isPrimary: boolean
        }[]
        mapping: FeishuTableMapping
      }
    | { ok: false; error: string }
  >
  listRecords: (args: {
    appToken: string
    tableId: string
    mapping: FeishuTableMapping
    state?: 'open' | 'closed' | null
    assigneeOpenId?: string | null
    labels?: string[]
    freeText?: string | null
    pageToken?: string
  }) => Promise<
    | { ok: true; items: FeishuWorkItem[]; hasMore: boolean; pageToken: string | null }
    | { ok: false; error: string }
  >
  getRecord: (args: {
    appToken: string
    tableId: string
    recordId: string
    mapping: FeishuTableMapping
  }) => Promise<{ ok: true; item: FeishuWorkItem } | { ok: false; error: string }>
  readDocContent: (args: {
    docUrl: string
  }) => Promise<{ ok: true; markdown: string } | { ok: false; error: string }>
  updateRecordBody: (args: {
    appToken: string
    tableId: string
    recordId: string
    mapping: FeishuTableMapping
    body: string
  }) => Promise<{ ok: true } | { ok: false; error: string }>
  updateRecordState: (args: {
    appToken: string
    tableId: string
    recordId: string
    mapping: FeishuTableMapping
    stateOption: string
  }) => Promise<{ ok: true } | { ok: false; error: string }>
  listComments: (args: {
    appToken: string
    mapping: FeishuTableMapping
    recordId: string
  }) => Promise<{
    ok: true
    comments: FeishuComment[]
  }>
  addComment: (args: {
    appToken: string
    mapping: FeishuTableMapping
    recordId: string
    body: string
  }) => Promise<{ ok: true; comment: FeishuComment } | { ok: false; error: string }>
}
