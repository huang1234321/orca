import type { FeishuFieldSchema, FeishuTableMapping } from './feishu-types'

const CLOSED_STATE_HINTS = [
  '已完成',
  '已关闭',
  '已合并',
  '已取消',
  'done',
  'closed',
  'merged',
  'canceled',
  'cancelled'
]
const TITLE_NAME_HINTS = ['标题', '任务名', '名称', 'title', 'name']
const BODY_NAME_HINTS = ['描述', '正文', '详情', '说明', 'description', 'body', 'details']
const STATE_NAME_HINTS = ['状态', 'state', 'status']
const LABELS_NAME_HINTS = ['标签', 'labels', 'tags']
const ASSIGNEE_NAME_HINTS = ['负责人', '处理人', '执行人', 'assignee', 'owner']
const NUMBER_NAME_HINTS = ['编号', 'number', 'id']
const REPO_NAME_HINTS = ['仓库', '代码库', 'repo', 'repository']

function nameMatches(name: string, hints: readonly string[]): boolean {
  const lower = name.toLowerCase()
  return hints.some((hint) => lower === hint || lower.includes(hint.toLowerCase()))
}

/** Bitable ui_type codes (verified): Text, SingleSelect, MultiSelect, User, Url, AutoNumber, CreatedTime, ModifiedTime, CreatedUser. */
function uiType(schema: FeishuFieldSchema): string {
  return schema.uiType.toLowerCase()
}

/** Heuristic default mapping from a table's field schema, in the spirit of pickAgileFieldIds. */
export function inferFeishuTableMapping(fields: readonly FeishuFieldSchema[]): FeishuTableMapping {
  const find = (predicate: (field: FeishuFieldSchema) => boolean): FeishuFieldSchema | undefined =>
    fields.find(predicate)

  const title =
    find((f) => f.isPrimary && uiType(f) === 'text') ??
    find((f) => uiType(f) === 'text' && nameMatches(f.fieldName, TITLE_NAME_HINTS)) ??
    find((f) => uiType(f) === 'text')
  const state =
    find((f) => uiType(f) === 'singleselect' && nameMatches(f.fieldName, STATE_NAME_HINTS)) ??
    find((f) => uiType(f) === 'singleselect')
  const labels = find(
    (f) => uiType(f) === 'multiselect' && nameMatches(f.fieldName, LABELS_NAME_HINTS)
  )
  const assignee =
    find((f) => uiType(f) === 'user' && nameMatches(f.fieldName, ASSIGNEE_NAME_HINTS)) ??
    find((f) => uiType(f) === 'user')
  const body = find((f) => uiType(f) === 'text' && nameMatches(f.fieldName, BODY_NAME_HINTS))
  const number =
    find((f) => uiType(f) === 'autonumber' && nameMatches(f.fieldName, NUMBER_NAME_HINTS)) ??
    find((f) => uiType(f) === 'autonumber')
  const repo = find((f) => uiType(f) === 'url' && nameMatches(f.fieldName, REPO_NAME_HINTS))

  return {
    titleField: title?.fieldName ?? fields[0]?.fieldName ?? '',
    ...(body ? { bodyField: body.fieldName } : { bodyField: null }),
    ...(state ? { stateField: state.fieldName } : { stateField: null }),
    ...(labels ? { labelsField: labels.fieldName } : { labelsField: null }),
    ...(assignee ? { assigneeField: assignee.fieldName } : { assigneeField: null }),
    ...(number ? { numberField: number.fieldName } : { numberField: null }),
    ...(repo ? { repoField: repo.fieldName } : { repoField: null }),
    stateCategories: state ? inferStateCategories(state) : null,
    comments: null
  }
}

/** Option names carrying completion semantics default to closed; everything else stays open. */
export function inferStateCategories(
  stateField: FeishuFieldSchema & { property?: { options?: { name?: unknown }[] } | null }
): Record<string, 'open' | 'closed'> {
  const categories: Record<string, 'open' | 'closed'> = {}
  for (const option of stateField.property?.options ?? []) {
    const name = typeof option?.name === 'string' ? option.name.trim() : ''
    if (!name) {
      continue
    }
    const lower = name.toLowerCase()
    categories[name] = CLOSED_STATE_HINTS.some((hint) => lower.includes(hint.toLowerCase()))
      ? 'closed'
      : 'open'
  }
  return categories
}

export function categorizeState(
  optionName: string | null | undefined,
  categories: Record<string, 'open' | 'closed'> | null | undefined
): 'open' | 'closed' {
  if (!optionName || !categories) {
    return 'open'
  }
  return categories[optionName] === 'closed' ? 'closed' : 'open'
}
