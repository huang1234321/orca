import { z } from 'zod'
import { OptionalPlainString } from '../rpc-param-primitives'

export const FeishuStateCategory = z.enum(['open', 'closed'])

export const FeishuCommentsTableMapping = z.object({
  tableId: z.string().min(1),
  linkField: z.string().min(1),
  bodyField: z.string().min(1)
})

export const FeishuTableMappingShape = z.object({
  titleField: z.string().min(1, 'Missing title field'),
  bodyField: OptionalPlainString,
  stateField: OptionalPlainString,
  stateCategories: z.record(z.string(), FeishuStateCategory).nullable().optional(),
  labelsField: OptionalPlainString,
  assigneeField: OptionalPlainString,
  numberField: OptionalPlainString,
  repoField: OptionalPlainString,
  docField: OptionalPlainString,
  comments: FeishuCommentsTableMapping.nullable().optional()
})
