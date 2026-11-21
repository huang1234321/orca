import type { FeishuComment, FeishuTableMapping } from '../../shared/feishu/feishu-types'
import {
  feishuRequest,
  isRecord,
  joinTextSegments,
  resolveFeishuAppToken,
  toIsoTimestamp
} from './feishu-request'

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
  appToken = await resolveFeishuAppToken(appToken)
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
  appToken = await resolveFeishuAppToken(appToken)
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

type RawTable = { table_id?: unknown; name?: unknown }
type RawFieldWithProperty = {
  field_name?: unknown
  type?: unknown
  ui_type?: unknown
  property?: unknown
}

export type FeishuCommentTableRef = {
  tableId: string
  linkField: string
  bodyField: string
}

/**
 * Locate a subtable linked into the main table through a one-way link field
 * (type 18 pointing at mainTableId): the comment-subtable pattern.
 */
export async function findFeishuCommentTable(
  appToken: string,
  mainTableId: string
): Promise<FeishuCommentTableRef | null> {
  const tables = await feishuRequest<{ items?: RawTable[] }>(
    `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables?page_size=50`
  )
  if (!tables.ok) {
    return null
  }
  for (const table of tables.data.items ?? []) {
    const tableId = typeof table.table_id === 'string' ? table.table_id : null
    if (!tableId || tableId === mainTableId) {
      continue
    }
    const fields = await feishuRequest<{ items?: RawFieldWithProperty[] }>(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/fields?page_size=100`
    )
    if (!fields.ok) {
      continue
    }
    const items = fields.data.items ?? []
    const link = items.find(
      (f) =>
        f.type === 18 &&
        isRecord(f.property) &&
        f.property.table_id === mainTableId &&
        typeof f.field_name === 'string'
    )
    const body = items.find(
      (f) =>
        typeof f.ui_type === 'string' &&
        f.ui_type.toLowerCase() === 'text' &&
        typeof f.field_name === 'string'
    )
    if (
      link &&
      body &&
      typeof link.field_name === 'string' &&
      typeof body.field_name === 'string'
    ) {
      return { tableId, linkField: link.field_name, bodyField: body.field_name }
    }
  }
  return null
}
