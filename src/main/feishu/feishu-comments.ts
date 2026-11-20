import type { FeishuComment, FeishuTableMapping } from '../../shared/feishu/feishu-types'
import { isRecord, feishuRequest, joinTextSegments, toIsoTimestamp } from './feishu-request'

const RECORD_PAGE_SIZE = 50

type RawRecord = {
  record_id?: unknown
  fields?: Record<string, unknown>
}

type SearchResponse = {
  items?: RawRecord[]
  has_more?: boolean
}

export async function listFeishuComments(
  appToken: string,
  mapping: FeishuTableMapping,
  recordId: string
): Promise<FeishuComment[]> {
  const comments = mapping.comments
  if (!comments) {
    return []
  }
  const result = await feishuRequest<SearchResponse>(
    `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(comments.tableId)}/records/search`,
    {
      method: 'POST',
      body: {
        filter: {
          conjunction: 'and',
          conditions: [{ field_name: comments.linkField, operator: 'is', value: [recordId] }]
        },
        page_size: RECORD_PAGE_SIZE
      }
    }
  )
  if (!result.ok) {
    return []
  }
  return (result.data.items ?? [])
    .map((raw): FeishuComment | null => {
      const body = joinTextSegments(raw.fields?.[comments.bodyField])
      if (!body) {
        return null
      }
      const creators = raw.fields?.['创建人']
      const firstCreator = Array.isArray(creators) ? creators[0] : null
      const author = isRecord(firstCreator) ? firstCreator.name : null
      return {
        id: typeof raw.record_id === 'string' ? raw.record_id : '',
        body,
        authorName: typeof author === 'string' ? author : null,
        createdAt: toIsoTimestamp(raw.fields?.['创建时间'])
      }
    })
    .filter((comment): comment is FeishuComment => comment !== null)
}

export async function addFeishuComment(
  appToken: string,
  mapping: FeishuTableMapping,
  recordId: string,
  body: string
): Promise<FeishuComment | null> {
  const comments = mapping.comments
  if (!comments || !body.trim()) {
    return null
  }
  const result = await feishuRequest<{ record?: RawRecord }>(
    `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(comments.tableId)}/records`,
    {
      method: 'POST',
      body: {
        fields: {
          [comments.bodyField]: body,
          [comments.linkField]: [recordId]
        }
      }
    }
  )
  if (!result.ok) {
    return null
  }
  const created = result.data.record
  return {
    id: typeof created?.record_id === 'string' ? created.record_id : '',
    body,
    authorName: null,
    createdAt: new Date().toISOString()
  }
}
