import { useMemo, useState } from 'react'
import { LoaderCircle, RefreshCcw } from 'lucide-react'
import { FeishuIcon } from '@/components/icons/FeishuIcon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import type { TaskPageComposerActionsModel } from '../use-task-page-composer-actions'
import { FeishuRecordList } from './FeishuRecordList'
import { FeishuRecordDetail } from './FeishuRecordDetail'
import { normalizeFeishuRepoUrl, useFeishuTaskList } from './use-feishu-task-list'

function openFeishuSetup(): void {
  useAppStore.getState().openSettingsPage()
  useAppStore.getState().openSettingsTarget({ pane: 'tasks', repoId: null })
}

export function TaskPageFeishuContent({
  model
}: {
  model: TaskPageComposerActionsModel
}): React.JSX.Element | null {
  const t = useTranslate()
  const checkFeishuConnection = useAppStore((s) => s.checkFeishuConnection)
  const [searchInput, setSearchInput] = useState('')
  const {
    settings,
    repos,
    repoSelection,
    taskSource,
    hideTaskSource,
    feishuStatus,
    feishuItems,
    setFeishuItems,
    feishuLoading,
    setFeishuLoading,
    feishuError,
    setFeishuError,
    feishuRefreshNonce,
    setFeishuRefreshNonce,
    selectedFeishuRecord,
    setSelectedFeishuRecord
  } = model
  const binding = settings?.feishuTaskSource ?? null
  const connected = feishuStatus?.connected === true
  const repoUrlFilter = useMemo(() => {
    if (!repoSelection || repoSelection.size === 0) {
      return []
    }
    const allowed = new Set(repoSelection)
    return (repos ?? [])
      .filter((repo) => allowed.has(repo.id))
      .map((repo) => normalizeFeishuRepoUrl(repo.gitRemoteIdentity?.remoteUrl ?? ''))
      .filter((url) => url.length > 0)
  }, [repos, repoSelection])
  useFeishuTaskList({
    binding,
    repoUrlFilter,
    connected,
    setItems: setFeishuItems,
    setLoading: setFeishuLoading,
    setError: setFeishuError,
    searchInput,
    refreshNonce: feishuRefreshNonce
  })

  if (taskSource !== 'feishu') {
    return null
  }
  if (!connected || !binding) {
    return (
      <div className="mt-4 flex flex-col items-center justify-center rounded-md border border-border/50 bg-muted/50 px-6 py-14 text-center shadow-sm">
        <FeishuIcon className="mb-4 size-8 text-muted-foreground/60" />
        <p className="text-base font-medium text-foreground">
          {t('feishu.empty.title', 'Connect Feishu and bind a table')}
        </p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {t(
            'feishu.empty.body',
            'Browse Bitable records, update their state, and start workspaces from them.'
          )}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={openFeishuSetup}>{t('feishu.empty.setup', 'Open Feishu setup')}</Button>
          <Button variant="outline" onClick={() => hideTaskSource('feishu', 'Feishu')}>
            {t('feishu.empty.hide', 'Hide Feishu')}
          </Button>
        </div>
      </div>
    )
  }
  return (
    <div className="@container flex min-h-0 max-h-full flex-col overflow-hidden rounded-md rounded-t-none border border-t-0 border-border/50 bg-background shadow-sm">
      <div className="flex min-h-10 flex-none flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-muted/35 px-3 py-1">
        <div className="min-w-0 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t('feishu.list.title', 'Feishu records')}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t(
              'feishu.list.searchPlaceholder',
              'Search or filter, e.g. is:open label:bug'
            )}
            className="h-7 max-w-64"
            aria-label={t(
              'feishu.list.searchPlaceholder',
              'Search or filter, e.g. is:open label:bug'
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={t('feishu.list.refresh', 'Refresh')}
            onClick={() => {
              void checkFeishuConnection()
              setFeishuRefreshNonce((value) => value + 1)
            }}
          >
            <RefreshCcw className="size-3.5" />
          </Button>
        </div>
      </div>
      {feishuError ? (
        <div className="border-b border-border px-4 py-3 text-sm text-destructive">
          {feishuError}
        </div>
      ) : null}
      {feishuLoading && feishuItems.length === 0 ? (
        <div className="flex items-center justify-center py-14">
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : selectedFeishuRecord ? (
        <FeishuRecordDetail
          record={selectedFeishuRecord}
          binding={binding}
          onClose={() => setSelectedFeishuRecord(null)}
          onRecordChanged={setSelectedFeishuRecord}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto scrollbar-sleek">
          <FeishuRecordList
            items={feishuItems}
            loading={feishuLoading}
            selectedRecord={selectedFeishuRecord}
            onOpenRecord={setSelectedFeishuRecord}
          />
        </div>
      )}
    </div>
  )
}
