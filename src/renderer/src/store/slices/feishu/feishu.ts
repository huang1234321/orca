import type { StateCreator } from 'zustand'
import type { AppState } from '../../types'
import { feishuLocalTarget, feishuStatusForTarget } from '@/runtime/feishu/runtime-feishu-client'
import type { FeishuSlice } from './feishu-slice-contract'

export const createFeishuSlice: StateCreator<AppState, [], [], FeishuSlice> = (set, get) => ({
  feishuStatus: null,
  feishuStatusChecked: false,
  feishuStatusContextKey: null,
  feishuChecking: false,

  // Credentials live on local main; the status never varies by runtime environment.
  checkFeishuConnection: async () => {
    if (get().feishuChecking) {
      return
    }
    set({ feishuChecking: true })
    try {
      const status = await feishuStatusForTarget(feishuLocalTarget)
      set({ feishuStatus: status, feishuStatusChecked: true })
    } catch {
      set({
        feishuStatus: { connected: false, appId: null, error: null },
        feishuStatusChecked: true
      })
    } finally {
      set({ feishuChecking: false })
    }
  }
})
