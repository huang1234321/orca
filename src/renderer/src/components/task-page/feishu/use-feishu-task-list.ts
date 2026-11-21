import { useEffect, useMemo } from 'react'
import { parseTaskQuery } from '../../../../../shared/work-items/task-query'
import type {
  FeishuTaskSourceBinding,
  FeishuWorkItem
} from '../../../../../shared/feishu/feishu-types'
import {
  feishuListRecordsForTarget,
  feishuLocalTarget
} from '@/runtime/feishu/runtime-feishu-client'

const MAX_PAGES_PER_FETCH = 3

export type FeishuTaskListModel = {
  binding: FeishuTaskSourceBinding | null
  connected: boolean
  /** Normalized repo URLs from the task page repo picker; empty means unscoped. */
  repoUrlFilter?: readonly string[]
  setItems: (items: FeishuWorkItem[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  searchInput: string
  /** Preset chip state; overrides any is:open/is:closed token from the search text. */
  stateOverride?: 'open' | 'closed' | null
  refreshNonce: number
}

/** Feishu keeps its own query text (like jiraSearchInput); GitHub's shared bar stays GitHub-scoped. */
export function useFeishuTaskList(model: FeishuTaskListModel): void {
  const { binding, connected, setItems, setLoading, setError } = model
  const parsed = useMemo(() => parseTaskQuery(model.searchInput), [model.searchInput])
  const parsedState = parsed.state === 'open' || parsed.state === 'closed' ? parsed.state : null
  const state = model.stateOverride ?? parsedState
  const freeText = parsed.freeText || null
  const labels = parsed.labels

  useEffect(() => {
    if (!binding || !connected) {
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const collected: FeishuWorkItem[] = []
    const fetchPages = async (pageToken?: string, depth = 0): Promise<void> => {
      const result = await feishuListRecordsForTarget(feishuLocalTarget, {
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
      const visible = scopeItemsToRepoFilter(result.items, model.repoUrlFilter)
      collected.push(...visible)
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
  }, [
    binding,
    connected,
    state,
    freeText,
    labels,
    model.refreshNonce,
    setLoading,
    setError,
    setItems
  ])
}

export function normalizeFeishuRepoUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')
}

/** A repo picker selection scopes repo-linked rows; unlinked rows stay visible. */
function scopeItemsToRepoFilter(
  items: FeishuWorkItem[],
  filter: readonly string[] | undefined
): FeishuWorkItem[] {
  if (!filter || filter.length === 0) {
    return items
  }
  const allowed = new Set(filter)
  return items.filter((item) => !item.repoUrl || allowed.has(normalizeFeishuRepoUrl(item.repoUrl)))
}
