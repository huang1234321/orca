import { z } from 'zod'
import { OptionalPlainString, OptionalString, requiredString } from '../rpc-param-primitives'
import { FeishuTableMappingShape } from './feishu-mapping-params'

export const FeishuConnect = z.object({
  appId: requiredString('App ID is required'),
  appSecret: requiredString('App secret is required')
})

export const FeishuTableRef = z.object({
  appToken: requiredString('Bitable app token is required'),
  tableId: requiredString('Table ID is required')
})

export const FeishuInferMapping = FeishuTableRef

export const FeishuSetMapping = z.object({
  appToken: requiredString('Bitable app token is required'),
  tableId: requiredString('Table ID is required'),
  mapping: FeishuTableMappingShape
})

export const FeishuListRecords = z.object({
  appToken: requiredString('Bitable app token is required'),
  tableId: requiredString('Table ID is required'),
  mapping: FeishuTableMappingShape,
  state: z.enum(['open', 'closed']).nullable().optional(),
  assigneeOpenId: OptionalString,
  labels: z.array(z.string()).optional(),
  freeText: OptionalPlainString,
  pageToken: OptionalString
})

export const FeishuRecord = z.object({
  appToken: requiredString('Bitable app token is required'),
  tableId: requiredString('Table ID is required'),
  recordId: requiredString('Record ID is required'),
  mapping: FeishuTableMappingShape
})

export const FeishuUpdateState = z.object({
  appToken: requiredString('Bitable app token is required'),
  tableId: requiredString('Table ID is required'),
  recordId: requiredString('Record ID is required'),
  mapping: FeishuTableMappingShape,
  stateOption: requiredString('State option is required')
})

export const FeishuCommentBody = z.object({
  appToken: requiredString('Bitable app token is required'),
  mapping: FeishuTableMappingShape,
  recordId: requiredString('Record ID is required'),
  body: requiredString('Comment body is required')
})

export const FeishuListTables = z.object({
  appToken: requiredString('Bitable app token is required')
})
