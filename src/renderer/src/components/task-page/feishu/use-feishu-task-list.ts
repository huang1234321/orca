import { useEffect, useMemo } from 'react'
import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import { parseTaskQuery } from '../../../../../shared/work-items/task-query'
import type {
  FeishuTaskSourceBinding,
  FeishuWorkItem
} from '../../../../../shared/feishu/feishu-types'
import { feishuListRecordsForTarget } from '@/runtime/feishu/runtime-feishu-client'
import {
  defaultScopeSource,
  rowLessSourceTarget
} from '@/runtime/hosts/selection/default-creation-host'
import type { RuntimeClientTarget } from '../../../../../shared/remote-runtime/host-catalog/runtime-client-target'

const MAX_PAGES_PER_FETCH = 3

export type FeishuTaskListModel = {
  settings: Pick<GlobalSettings, 'activeRuntimeEnvironmentId'> | null
  binding: FeishuTaskSourceBinding | null
  connected: boolean
  setItems: (items: FeishuWorkItem[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  searchInput: string
  refreshNonce: number
}

/** Feishu keeps its own query text (like jiraSearchInput); GitHub's shared bar stays GitHub-scoped. */
export function useFeishuTaskList(model: FeishuTaskListModel): void {
  const { binding, connected, setItems, setLoading, setError } = model
  const parsed = useMemo(() => parseTaskQuery(model.searchInput), [model.searchInput])
  const target: RuntimeClientTarget = useMemo(
    () => rowLessSourceTarget(defaultScopeSource(model.settings)),
    [model.settings]
  )
  const state = parsed.state === 'open' || parsed.state === 'closed' ? parsed.state : null
  const freeText = parsed.freeText || null
  const labels = parsed.labels
  const scopeKey = JSON.stringify([
    binding?.appToken ?? null,
    binding?.tableId ?? null,
    state,
    freeText,
    labels,
    model.refreshNonce
  ])

  useEffect(() => {
    if (!binding || !connected) {
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const collected: FeishuWorkItem[] = []
    const fetchPages = async (pageToken?: string, depth = 0): Promise<void> => {
      const result = await feishuListRecordsForTarget(target, {
        appToken: binding.appToken,
        tableId: binding.tableId,
        mapping: binding.mapping,
        state,
        freeText,
        labels,
        ...(pageToken ? { pageToken } : {})
      })
      if (cancelled) {
        return
      }
      if (!result.ok) {
        setError(result.error)
        setItems([])
        return
      }
      collected.push(...result.items)
      setItems([...collected])
      if (result.hasMore && result.pageToken && depth + 1 < MAX_PAGES_PER_FETCH) {
        await fetchPages(result.pageToken, depth + 1)
      }
    }
    fetchPages()
      .catch((error: unknown) => {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : String(error))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
    // scopeKey folds every fetch input; setter identity stays stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, connected, target, setLoading, setError, setItems])
}

export function feishuTaskTarget(
  settings: Pick<GlobalSettings, 'activeRuntimeEnvironmentId'> | null
): RuntimeClientTarget {
  return rowLessSourceTarget(defaultScopeSource(settings))
}
