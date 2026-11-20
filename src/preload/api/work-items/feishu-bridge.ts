import { ipcRenderer } from 'electron'
import type { FeishuTableMapping } from '../../../shared/feishu/feishu-types'
import type { PreloadApi } from '../../api-types'

export const feishuApi = {
  connect: (args: { appId: string; appSecret: string }) =>
    ipcRenderer.invoke('feishu:connect', args),

  disconnect: (): Promise<{ ok: true }> => ipcRenderer.invoke('feishu:disconnect'),

  status: () => ipcRenderer.invoke('feishu:status'),

  inferMapping: (args: { appToken: string; tableId: string }) =>
    ipcRenderer.invoke('feishu:inferMapping', args),

  listRecords: (args: {
    appToken: string
    tableId: string
    mapping: FeishuTableMapping
    state?: 'open' | 'closed' | null
    assigneeOpenId?: string | null
    labels?: string[]
    freeText?: string | null
    pageToken?: string
  }) => ipcRenderer.invoke('feishu:listRecords', args),

  getRecord: (args: {
    appToken: string
    tableId: string
    recordId: string
    mapping: FeishuTableMapping
  }) => ipcRenderer.invoke('feishu:getRecord', args),

  updateRecordState: (args: {
    appToken: string
    tableId: string
    recordId: string
    mapping: FeishuTableMapping
    stateOption: string
  }) => ipcRenderer.invoke('feishu:updateRecordState', args),

  listComments: (args: { appToken: string; mapping: FeishuTableMapping; recordId: string }) =>
    ipcRenderer.invoke('feishu:listComments', args),

  addComment: (args: {
    appToken: string
    mapping: FeishuTableMapping
    recordId: string
    body: string
  }) => ipcRenderer.invoke('feishu:addComment', args)
} satisfies PreloadApi['feishu']
