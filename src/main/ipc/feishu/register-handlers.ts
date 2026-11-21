import { ipcMain } from 'electron'
import { taskProviderFailure } from '../../../shared/work-items/task-provider-failure'
import type { FeishuTableMapping } from '../../../shared/feishu/feishu-types'
import { RuntimeFeishuCommands } from '../../runtime/integrations/feishu/runtime-feishu-commands'

const commands = new RuntimeFeishuCommands()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function requireMapping(value: unknown): FeishuTableMapping | null {
  if (!isRecord(value)) {
    return null
  }
  const raw = value
  if (typeof raw.titleField !== 'string' || raw.titleField.trim() === '') {
    return null
  }
  return {
    titleField: raw.titleField,
    bodyField: typeof raw.bodyField === 'string' ? raw.bodyField : null,
    stateField: typeof raw.stateField === 'string' ? raw.stateField : null,
    stateCategories: isRecord(raw.stateCategories)
      ? Object.fromEntries(
          Object.entries(raw.stateCategories).filter(
            (entry): entry is [string, 'open' | 'closed'] =>
              entry[1] === 'open' || entry[1] === 'closed'
          )
        )
      : null,
    labelsField: typeof raw.labelsField === 'string' ? raw.labelsField : null,
    assigneeField: typeof raw.assigneeField === 'string' ? raw.assigneeField : null,
    numberField: typeof raw.numberField === 'string' ? raw.numberField : null,
    repoField: typeof raw.repoField === 'string' ? raw.repoField : null,
    docField: typeof raw.docField === 'string' ? raw.docField : null,
    comments: isRecord(raw.comments)
      ? {
          tableId: String(raw.comments.tableId ?? ''),
          linkField: String(raw.comments.linkField ?? ''),
          bodyField: String(raw.comments.bodyField ?? '')
        }
      : null
  }
}

export function registerFeishuHandlers(): void {
  ipcMain.handle(
    'feishu:connect',
    async (_event, args: { appId?: unknown; appSecret?: unknown }) => {
      if (typeof args?.appId !== 'string' || typeof args?.appSecret !== 'string') {
        return taskProviderFailure(
          'feishu.credentialsRequired',
          'App ID and app secret are required.'
        )
      }
      return commands.feishuConnect({ appId: args.appId, appSecret: args.appSecret })
    }
  )

  ipcMain.handle('feishu:updateRecordBody', (_event, args: Record<string, unknown>) => {
    const mapping = requireMapping(args?.mapping)
    if (
      typeof args?.appToken !== 'string' ||
      typeof args?.tableId !== 'string' ||
      typeof args?.recordId !== 'string' ||
      typeof args?.body !== 'string' ||
      !mapping
    ) {
      return taskProviderFailure(
        'feishu.fieldMappingRequired',
        'Bitable binding and body are required.'
      )
    }
    return commands.feishuUpdateRecordBody(
      args.appToken,
      args.tableId,
      args.recordId,
      mapping,
      args.body
    )
  })

  ipcMain.handle('feishu:disconnect', () => commands.feishuDisconnect())

  ipcMain.handle('feishu:readDocContent', (_event, args: { docUrl?: unknown }) =>
    typeof args?.docUrl === 'string'
      ? commands.feishuReadDocContent(args.docUrl)
      : taskProviderFailure('feishu.tableRequired', 'Doc URL is required.')
  )

  ipcMain.handle('feishu:status', () => commands.feishuStatus())

  ipcMain.handle(
    'feishu:inferMapping',
    (_event, args: { appToken?: unknown; tableId?: unknown }) => {
      if (typeof args?.appToken !== 'string' || typeof args?.tableId !== 'string') {
        return taskProviderFailure(
          'feishu.tableRequired',
          'Bitable app token and table ID are required.'
        )
      }
      return commands.feishuInferMapping(args.appToken, args.tableId)
    }
  )

  ipcMain.handle('feishu:listRecords', (_event, args: Record<string, unknown>) => {
    const mapping = requireMapping(args?.mapping)
    if (typeof args?.appToken !== 'string' || typeof args?.tableId !== 'string' || !mapping) {
      return taskProviderFailure(
        'feishu.fieldMappingRequired',
        'App token, table ID, and mapping are required.'
      )
    }
    return commands.feishuListRecords(
      args.appToken,
      args.tableId,
      mapping,
      {
        state: args.state === 'open' || args.state === 'closed' ? args.state : null,
        assigneeOpenId: typeof args.assigneeOpenId === 'string' ? args.assigneeOpenId : null,
        labels: Array.isArray(args.labels) ? args.labels.filter((l) => typeof l === 'string') : [],
        freeText: typeof args.freeText === 'string' ? args.freeText : null
      },
      typeof args.pageToken === 'string' ? args.pageToken : undefined
    )
  })

  ipcMain.handle('feishu:getRecord', (_event, args: Record<string, unknown>) => {
    const mapping = requireMapping(args?.mapping)
    if (
      typeof args?.appToken !== 'string' ||
      typeof args?.tableId !== 'string' ||
      typeof args?.recordId !== 'string' ||
      !mapping
    ) {
      return taskProviderFailure('feishu.recordNotFound', 'Record not found')
    }
    return commands.feishuGetRecord(args.appToken, args.tableId, args.recordId, mapping)
  })

  ipcMain.handle('feishu:updateRecordState', (_event, args: Record<string, unknown>) => {
    const mapping = requireMapping(args?.mapping)
    if (
      typeof args?.appToken !== 'string' ||
      typeof args?.tableId !== 'string' ||
      typeof args?.recordId !== 'string' ||
      typeof args?.stateOption !== 'string' ||
      !mapping
    ) {
      return taskProviderFailure('feishu.updateFailed', 'Record state update failed')
    }
    return commands.feishuUpdateRecordState(
      args.appToken,
      args.tableId,
      args.recordId,
      mapping,
      args.stateOption
    )
  })

  ipcMain.handle('feishu:listComments', (_event, args: Record<string, unknown>) => {
    const mapping = requireMapping(args?.mapping)
    if (typeof args?.appToken !== 'string' || typeof args?.recordId !== 'string' || !mapping) {
      return taskProviderFailure('feishu.recordNotFound', 'Record not found')
    }
    return commands.feishuListComments(args.appToken, mapping, args.recordId)
  })

  ipcMain.handle('feishu:addComment', (_event, args: Record<string, unknown>) => {
    const mapping = requireMapping(args?.mapping)
    if (
      typeof args?.appToken !== 'string' ||
      typeof args?.recordId !== 'string' ||
      typeof args?.body !== 'string' ||
      !mapping
    ) {
      return taskProviderFailure('feishu.commentBodyRequired', 'Comment body is required.')
    }
    return commands.feishuAddComment(args.appToken, mapping, args.recordId, args.body)
  })
}
