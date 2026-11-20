import type { StateCreator } from 'zustand'
import type { AppState } from '../../types'
import type { FeishuConnectionStatus } from '@/runtime/feishu/runtime-feishu-client'

export type FeishuSlice = {
  feishuStatus: FeishuConnectionStatus | null
  feishuStatusChecked: boolean
  feishuStatusContextKey: string | null
  feishuChecking: boolean

  checkFeishuConnection: () => Promise<void>
}

type FeishuStateCreator = StateCreator<AppState, [], [], FeishuSlice>

export type FeishuSliceSet = Parameters<FeishuStateCreator>[0]
export type FeishuSliceGet = Parameters<FeishuStateCreator>[1]
