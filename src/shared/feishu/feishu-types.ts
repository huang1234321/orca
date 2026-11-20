/** Feishu Bitable task-source types. API shapes verified against open.feishu.cn (2026-11). */

export type FeishuTaskSourceBinding = {
  appToken: string
  tableId: string
  mapping: FeishuTableMapping
}

export type FeishuStateCategory = 'open' | 'closed'

/** How one Bitable table's columns map onto the task contract; heuristics prefill, users adjust. */
export type FeishuTableMapping = {
  titleField: string
  bodyField?: string | null
  stateField?: string | null
  /** Single-select option name → open/closed; options without an entry count as open. */
  stateCategories?: Record<string, FeishuStateCategory> | null
  labelsField?: string | null
  assigneeField?: string | null
  numberField?: string | null
  repoField?: string | null
  comments?: {
    tableId: string
    linkField: string
    bodyField: string
  } | null
}

export type FeishuTableRef = {
  appToken: string
  tableId: string
  name?: string | null
}

export type FeishuAppStatus = {
  connected: boolean
  appId: string | null
  checking: boolean
  lastError: string | null
}

export type FeishuFieldSchema = {
  fieldId: string
  fieldName: string
  type: number
  uiType: string
  isPrimary: boolean
}

/** Normalized task record; text segments joined, timestamps in ISO strings. */
export type FeishuWorkItem = {
  id: string
  key: string
  title: string
  body: string | null
  state: 'open' | 'closed'
  stateLabel: string | null
  labels: string[]
  assignees: { id: string; name: string | null }[]
  repoUrl: string | null
  url: string
  updatedAt: string | null
  createdAt: string | null
}

export type FeishuComment = {
  id: string
  body: string
  authorName: string | null
  createdAt: string | null
}

export type FeishuRecordUpdate = {
  title?: string
  body?: string
  /** Target single-select option name. */
  state?: string
  addLabels?: string[]
  removeLabels?: string[]
}

export type FeishuQueryFilters = {
  state?: 'open' | 'closed' | null
  assigneeOpenId?: string | null
  labels?: string[]
  freeText?: string | null
}

export function feishuRecordUrl(appToken: string, tableId: string, recordId: string): string {
  return `https://feishu.cn/base/${appToken}?table=${tableId}&record=${recordId}`
}
