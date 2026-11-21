import { useMemo, useState } from 'react'
import { LoaderCircle, RefreshCw, Search, X } from 'lucide-react'
import { FeishuIcon } from '@/components/icons/FeishuIcon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import type { TaskPageComposerActionsModel } from '../use-task-page-composer-actions'
import { FeishuRecordList } from './FeishuRecordList'
import { PresetChip } from '../github/listing/Filters'
import { launchFeishuRecordWorkspace } from '@/lib/workspace/creation/work-item/launch-feishu-record'
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
  const [presetFilter, setPresetFilter] = useState<'all' | 'open' | 'done'>('open')
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
    stateOverride: presetFilter === 'all' ? null : presetFilter === 'open' ? 'open' : 'closed',
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
    <div className="mt-3 flex min-h-0 min-w-0 max-h-full flex-col overflow-hidden rounded-md border border-border/50 bg-background shadow-sm">
      <div className="flex min-w-0 flex-col gap-2.5 rounded-md rounded-b-none border border-border/50 bg-muted/35 px-3 py-2.5">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'all', label: t('feishu.preset.all', 'All') },
              { id: 'open', label: t('feishu.preset.open', 'Open') },
              { id: 'done', label: t('feishu.preset.done', 'Done') }
            ] as const
          ).map((chip) => (
            <PresetChip
              key={chip.id}
              label={chip.label}
              active={presetFilter === chip.id}
              onSelect={() => setPresetFilter(chip.id)}
            />
          ))}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('feishu.list.searchPlaceholder', 'Search Feishu tasks...')}
              className="h-8 rounded-md border-border/60 bg-background pl-8 pr-8 text-xs text-foreground shadow-xs"
            />
            {searchInput ? (
              <button
                type="button"
                aria-label={t('feishu.list.clearSearch', 'Clear search')}
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                void checkFeishuConnection()
                setFeishuRefreshNonce((value) => value + 1)
              }}
              aria-label={t('feishu.list.refresh', 'Refresh Feishu tasks')}
              className="size-8 cursor-pointer border-border/60 bg-background text-foreground shadow-xs hover:bg-muted/60"
            >
              {feishuLoading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          </div>
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
        <div
          data-task-list-scroll="feishu"
          className="min-h-0 flex-initial overflow-auto scrollbar-sleek scrollbar-sleek-lg"
          style={{ scrollbarGutter: 'stable' }}
        >
          <FeishuRecordList
            onLaunchRecord={(item) => void launchFeishuRecordWorkspace(item)}
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
