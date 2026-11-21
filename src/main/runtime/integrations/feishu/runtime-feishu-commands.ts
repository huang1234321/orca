import type { FeishuTableMapping } from '../../../../shared/feishu/feishu-types'
import {
  forgetFeishuTenantToken,
  getFeishuConnectionStatus,
  getFeishuRecord,
  listFeishuFields,
  searchFeishuRecords,
  verifyFeishuCredentials
} from '../../../feishu/feishu-client'
import {
  updateFeishuRecordBody,
  updateFeishuRecordState
} from '../../../feishu/feishu-record-mutations'
import { readFeishuDocMarkdown } from '../../../feishu/feishu-doc-reader'
import {
  addFeishuComment,
  findFeishuCommentTable,
  listFeishuComments
} from '../../../feishu/feishu-comments'
import {
  forgetFeishuCredentials,
  readFeishuApp,
  saveFeishuApp
} from '../../../feishu/feishu-credential-store'
import { inferFeishuTableMapping } from '../../../../shared/feishu/feishu-field-mapping'

export class RuntimeFeishuCommands {
  async feishuConnect(args: { appId: string; appSecret: string }) {
    const trimmed = { appId: args.appId.trim(), appSecret: args.appSecret.trim() }
    if (!trimmed.appId || !trimmed.appSecret) {
      return { ok: false as const, error: 'App ID and secret are required.' }
    }
    const verified = await verifyFeishuCredentials(trimmed.appId, trimmed.appSecret)
    if (!verified.ok) {
      return { ok: false as const, error: verified.error ?? 'Connection failed' }
    }
    await saveFeishuApp(trimmed.appId, trimmed.appSecret)
    forgetFeishuTenantToken()
    return { ok: true as const }
  }

  async feishuDisconnect(): Promise<{ ok: true }> {
    forgetFeishuCredentials()
    forgetFeishuTenantToken()
    return { ok: true }
  }

  async feishuStatus() {
    const app = await readFeishuApp()
    const status = await getFeishuConnectionStatus()
    return {
      connected: status.connected,
      appId: status.appId,
      error: status.error,
      app: app ?? null
    }
  }

  async feishuInferMapping(appToken: string, tableId: string) {
    const fields = await listFeishuFields(appToken, tableId)
    if (fields.length === 0) {
      return {
        ok: false as const,
        error: 'No fields readable; check the app scopes and table access.'
      }
    }
    const mapping = inferFeishuTableMapping(fields)
    const commentTable = await findFeishuCommentTable(appToken, tableId)
    return {
      ok: true as const,
      fields,
      mapping: commentTable ? { ...mapping, comments: commentTable } : mapping
    }
  }

  async feishuListRecords(
    appToken: string,
    tableId: string,
    mapping: FeishuTableMapping,
    filters: {
      state?: 'open' | 'closed' | null
      assigneeOpenId?: string | null
      labels?: string[]
      freeText?: string | null
    },
    pageToken?: string
  ) {
    return searchFeishuRecords(appToken, tableId, mapping, filters, pageToken)
  }

  async feishuGetRecord(
    appToken: string,
    tableId: string,
    recordId: string,
    mapping: FeishuTableMapping
  ) {
    const item = await getFeishuRecord(appToken, tableId, recordId, mapping)
    return item ? { ok: true as const, item } : { ok: false as const, error: 'Record not found' }
  }

  async feishuUpdateRecordState(
    appToken: string,
    tableId: string,
    recordId: string,
    mapping: FeishuTableMapping,
    stateOption: string
  ) {
    const updated = await updateFeishuRecordState(appToken, tableId, recordId, mapping, stateOption)
    return updated
      ? { ok: true as const }
      : { ok: false as const, error: 'Record state update failed' }
  }

  async feishuUpdateRecordBody(
    appToken: string,
    tableId: string,
    recordId: string,
    mapping: FeishuTableMapping,
    body: string
  ) {
    const updated = await updateFeishuRecordBody(appToken, tableId, recordId, mapping, body)
    return updated
      ? { ok: true as const }
      : { ok: false as const, error: 'Record body update failed' }
  }

  async feishuListComments(appToken: string, mapping: FeishuTableMapping, recordId: string) {
    return { ok: true as const, comments: await listFeishuComments(appToken, mapping, recordId) }
  }

  async feishuAddComment(
    appToken: string,
    mapping: FeishuTableMapping,
    recordId: string,
    body: string
  ) {
    const comment = await addFeishuComment(appToken, mapping, recordId, body)
    return comment
      ? { ok: true as const, comment }
      : { ok: false as const, error: 'Comment creation failed' }
  }

  async feishuReadDocContent(docUrl: string) {
    const markdown = await readFeishuDocMarkdown(docUrl)
    return markdown === null
      ? { ok: false as const, error: 'Doc not readable; check the link and docx scopes.' }
      : { ok: true as const, markdown }
  }
}
