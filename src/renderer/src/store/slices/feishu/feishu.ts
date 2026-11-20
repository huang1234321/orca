import type { StateCreator } from 'zustand'
import type { AppState } from '../../types'
import { feishuStatusForTarget } from '@/runtime/feishu/runtime-feishu-client'
import { getProviderRuntimeContextKey } from '@/runtime/hosts/observations/provider-runtime-context'
import {
  defaultScopeSource,
  rowLessSourceTarget
} from '@/runtime/hosts/selection/default-creation-host'
import type { FeishuSlice } from './feishu-slice-contract'

export const createFeishuSlice: StateCreator<AppState, [], [], FeishuSlice> = (set, get) => ({
  feishuStatus: null,
  feishuStatusChecked: false,
  feishuStatusContextKey: null,
  feishuChecking: false,

  checkFeishuConnection: async () => {
    const contextKey = getProviderRuntimeContextKey(get().settings)
    if (get().feishuStatusContextKey !== contextKey) {
      set({ feishuStatusChecked: false, feishuStatusContextKey: contextKey })
    }
    if (get().feishuChecking) {
      return
    }
    set({ feishuChecking: true })
    try {
      const status = await feishuStatusForTarget(
        rowLessSourceTarget(defaultScopeSource(get().settings))
      )
      if (getProviderRuntimeContextKey(get().settings) !== contextKey) {
        return
      }
      set({ feishuStatus: status, feishuStatusChecked: true })
    } catch {
      if (getProviderRuntimeContextKey(get().settings) !== contextKey) {
        return
      }
      set({
        feishuStatus: { connected: false, appId: null, error: null },
        feishuStatusChecked: true
      })
    } finally {
      set({ feishuChecking: false })
    }
  }
})
