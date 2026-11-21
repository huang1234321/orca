import type { FeishuTableMapping } from '../../shared/feishu/feishu-types'
import { feishuRequest, resolveFeishuAppToken } from './feishu-request'

function recordUrl(appToken: string, tableId: string, recordId: string): string {
  return `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`
}

export async function updateFeishuRecordState(
  appToken: string,
  tableId: string,
  recordId: string,
  mapping: FeishuTableMapping,
  stateOption: string
): Promise<boolean> {
  appToken = await resolveFeishuAppToken(appToken)
  if (!mapping.stateField) {
    return false
  }
  const result = await feishuRequest(recordUrl(appToken, tableId, recordId), {
    method: 'PUT',
    body: { fields: { [mapping.stateField]: stateOption } }
  })
  return result.ok
}

export async function updateFeishuRecordBody(
  appToken: string,
  tableId: string,
  recordId: string,
  mapping: FeishuTableMapping,
  body: string
): Promise<boolean> {
  appToken = await resolveFeishuAppToken(appToken)
  if (!mapping.bodyField) {
    return false
  }
  const result = await feishuRequest(recordUrl(appToken, tableId, recordId), {
    method: 'PUT',
    body: { fields: { [mapping.bodyField]: body } }
  })
  return result.ok
}
