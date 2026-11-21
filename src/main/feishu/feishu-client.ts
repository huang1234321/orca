import type {
  FeishuFieldSchema,
  FeishuQueryFilters,
  FeishuTableMapping,
  FeishuWorkItem
} from '../../shared/feishu/feishu-types'
import { categorizeState } from '../../shared/feishu/feishu-field-mapping'
import { feishuRecordUrl } from '../../shared/feishu/feishu-types'
import { readFeishuApp } from './feishu-credential-store'
import {
  resolveFeishuAppToken,
  isRecord,
  feishuRequest,
  forgetFeishuTenantToken,
  getTenantToken,
  joinTextSegments,
  REQUEST_TIMEOUT_MS,
  toIsoTimestamp
} from './feishu-request'

const RECORD_PAGE_SIZE = 50

type RawField = {
  field_id?: unknown
  field_name?: unknown
  type?: unknown
  ui_type?: unknown
  is_primary?: unknown
}

type RawRecord = {
  record_id?: unknown
  fields?: Record<string, unknown>
}

type SearchResponse = {
  items?: RawRecord[]
  has_more?: boolean
  page_token?: string
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function readPersonList(value: unknown): { id: string; name: string | null }[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((person): { id: string; name: string | null }[] => {
    if (!person || typeof person !== 'object') {
      return []
    }
    if (!isRecord(person) || typeof person.id !== 'string') {
      return []
    }
    return [{ id: person.id, name: readString(person.name) }]
  })
}

function readUrlLink(value: unknown): string | null {
  // URL fields read back as [{link, text, type}] like person fields read as arrays.
  const entry = Array.isArray(value) ? value[0] : value
  const link = isRecord(entry) ? entry.link : null
  return typeof link === 'string' ? link : null
}

function mapFields(raw: RawField): FeishuFieldSchema {
  return {
    fieldId: typeof raw.field_id === 'string' ? raw.field_id : '',
    fieldName: typeof raw.field_name === 'string' ? raw.field_name : '',
    type: typeof raw.type === 'number' ? raw.type : 0,
    uiType: typeof raw.ui_type === 'string' ? raw.ui_type : '',
    isPrimary: raw.is_primary === true
  }
}

export async function listFeishuFields(
  appToken: string,
  tableId: string
): Promise<FeishuFieldSchema[]> {
  appToken = await resolveFeishuAppToken(appToken)
  const result = await feishuRequest<{ items?: RawField[] }>(
    `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/fields?page_size=100`
  )
  if (!result.ok) {
    return []
  }
  return (result.data.items ?? []).map(mapFields)
}

function mapWorkItem(
  appToken: string,
  tableId: string,
  raw: RawRecord,
  mapping: FeishuTableMapping
): FeishuWorkItem | null {
  const recordId = typeof raw.record_id === 'string' ? raw.record_id : ''
  if (!recordId) {
    return null
  }
  const fields = raw.fields ?? {}
  const title = joinTextSegments(fields[mapping.titleField]) ?? ''
  if (!title) {
    return null
  }
  const stateLabel = readString(fields[mapping.stateField ?? ''])
  const assignees = readPersonList(fields[mapping.assigneeField ?? ''])
  const repoUrl = readUrlLink(fields[mapping.repoField ?? ''])
  const docUrl = readUrlLink(fields[mapping.docField ?? ''])
  return {
    id: recordId,
    key:
      typeof fields[mapping.numberField ?? ''] === 'string' ||
      typeof fields[mapping.numberField ?? ''] === 'number'
        ? String(fields[mapping.numberField ?? ''])
        : recordId.slice(-8),
    title,
    body: mapping.bodyField ? joinTextSegments(fields[mapping.bodyField]) : null,
    state: categorizeState(stateLabel, mapping.stateCategories),
    stateLabel,
    labels: mapping.labelsField ? asStringArray(fields[mapping.labelsField]) : [],
    assignees,
    repoUrl,
    docUrl,
    url: feishuRecordUrl(appToken, tableId, recordId),
    updatedAt: toIsoTimestamp(fields['更新时间'] ?? fields['修改时间']),
    createdAt: toIsoTimestamp(fields['创建时间'])
  }
}

/** Server-side conditions stay single-valued per field so one flat 'and' conjunction is correct. */
function buildFilterConditions(
  mapping: FeishuTableMapping,
  filters: FeishuQueryFilters
): { field_name: string; operator: string; value: string[] }[] {
  const conditions: { field_name: string; operator: string; value: string[] }[] = []
  if (filters.assigneeOpenId && mapping.assigneeField) {
    conditions.push({
      field_name: mapping.assigneeField,
      operator: 'is',
      value: [filters.assigneeOpenId]
    })
  }
  for (const label of filters.labels ?? []) {
    if (mapping.labelsField) {
      conditions.push({ field_name: mapping.labelsField, operator: 'is', value: [label] })
    }
  }
  if (filters.freeText && mapping.titleField) {
    conditions.push({
      field_name: mapping.titleField,
      operator: 'contains',
      value: [filters.freeText]
    })
  }
  return conditions
}

export async function searchFeishuRecords(
  appToken: string,
  tableId: string,
  mapping: FeishuTableMapping,
  filters: FeishuQueryFilters = {},
  pageToken?: string
): Promise<
  | { ok: true; items: FeishuWorkItem[]; hasMore: boolean; pageToken: string | null }
  | { ok: false; error: string }
> {
  appToken = await resolveFeishuAppToken(appToken)
  const conditions = buildFilterConditions(mapping, filters)
  const body = {
    field_names: [
      mapping.titleField,
      ...(mapping.bodyField ? [mapping.bodyField] : []),
      ...(mapping.stateField ? [mapping.stateField] : []),
      ...(mapping.labelsField ? [mapping.labelsField] : []),
      ...(mapping.assigneeField ? [mapping.assigneeField] : []),
      ...(mapping.numberField ? [mapping.numberField] : []),
      ...(mapping.repoField ? [mapping.repoField] : []),
      ...(mapping.docField ? [mapping.docField] : []),
      '创建时间',
      '更新时间'
    ].filter((name, index, all) => all.indexOf(name) === index),
    filter: conditions.length ? { conjunction: 'and', conditions } : undefined,
    page_size: RECORD_PAGE_SIZE,
    ...(pageToken ? { page_token: pageToken } : {})
  }
  const result = await feishuRequest<SearchResponse>(
    `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/search`,
    { method: 'POST', body }
  )
  if (!result.ok) {
    return {
      ok: false,
      error: `Feishu records search failed: ${result.msg} (${String(result.code)})`
    }
  }
  // State categories map many options to open/closed; one flat conjunction cannot express
  // the per-option OR, so state filtering happens on mapped items.
  const items = (result.data.items ?? [])
    .map((raw) => mapWorkItem(appToken, tableId, raw, mapping))
    .filter((item): item is FeishuWorkItem => item !== null)
    .filter((item) => !filters.state || item.state === filters.state)
  return {
    ok: true,
    items,
    hasMore: result.data.has_more === true,
    pageToken: result.data.page_token ?? null
  }
}

export async function getFeishuRecord(
  appToken: string,
  tableId: string,
  recordId: string,
  mapping: FeishuTableMapping
): Promise<FeishuWorkItem | null> {
  appToken = await resolveFeishuAppToken(appToken)
  const result = await feishuRequest<{ record?: RawRecord }>(
    `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`
  )
  if (!result.ok || !result.data.record) {
    return null
  }
  return mapWorkItem(appToken, tableId, result.data.record, mapping)
}

export async function verifyFeishuCredentials(
  appId: string,
  appSecret: string
): Promise<{ ok: boolean; error: string | null }> {
  const response = await fetch(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    }
  )
  const json: { code?: number; msg?: string; tenant_access_token?: string } = await response.json()
  return {
    ok: json.code === 0 && Boolean(json.tenant_access_token),
    error: json.code !== 0 ? (json.msg ?? 'invalid credentials') : null
  }
}

export async function getFeishuConnectionStatus(): Promise<{
  connected: boolean
  appId: string | null
  error: string | null
}> {
  const app = await readFeishuApp()
  if (!app) {
    return { connected: false, appId: null, error: null }
  }
  const token = await getTenantToken()
  return {
    connected: token !== null,
    appId: app.appId,
    error:
      token === null ? 'Feishu tenant token request failed; check the app secret and scopes.' : null
  }
}

export { forgetFeishuTenantToken }
