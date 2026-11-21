import { ExternalLink, Rocket } from 'lucide-react'
import { GitHubUserAvatar } from '@/components/github/github-user-avatar'
import { Badge } from '@/components/ui/badge'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'
import {
  GITHUB_TASK_GRID_CLASS,
  GITHUB_TASK_HEADER_SURFACE_CLASS,
  GITHUB_TASK_STICKY_ID_CELL_CLASS,
  GITHUB_TASK_STICKY_ID_HEADER_CLASS,
  GITHUB_TASK_STICKY_TITLE_CELL_CLASS,
  GITHUB_TASK_STICKY_TITLE_HEADER_CLASS,
  formatRelativeTime
} from '../task-page-source-context'
import type { FeishuWorkItem } from '../../../../../shared/feishu/feishu-types'

function repoLabel(repoUrl: string | null): string | null {
  if (!repoUrl) {
    return null
  }
  const withoutProtocol = repoUrl.replace(/^[a-z]+:\/\//i, '').replace(/\.git$/, '')
  const segments = withoutProtocol.split('/').filter(Boolean)
  return segments.slice(-2).join('/') || null
}

/** GitHub task-table layout: ID | Title/Context | Assignees | Status | Updated | actions. */
function FeishuRow({
  item,
  selected,
  onOpen,
  onLaunch
}: {
  item: FeishuWorkItem
  selected: boolean
  onOpen: (item: FeishuWorkItem) => void
  onLaunch: (item: FeishuWorkItem) => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(item)
        }
      }}
      className={cn(
        'group/feishu-row grid min-h-12 cursor-pointer gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        selected && 'bg-accent/60',
        GITHUB_TASK_GRID_CLASS
      )}
    >
      <div className={cn(GITHUB_TASK_STICKY_ID_CELL_CLASS, selected && 'bg-accent/60')}>
        <span className="inline-flex items-center gap-1 rounded-md border border-border/40 px-1.5 py-0.5 text-muted-foreground">
          <span className="font-mono text-[11px] font-normal">#{item.key}</span>
        </span>
      </div>
      <div className={GITHUB_TASK_STICKY_TITLE_CELL_CLASS}>
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-[13px] font-medium text-foreground">{item.title}</h3>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
          {item.labels.slice(0, 3).map((label) => (
            <span key={label} className="rounded border border-border/40 px-1.5 py-px text-[11px]">
              {label}
            </span>
          ))}
          {repoLabel(item.repoUrl) ? (
            <span className="truncate font-mono text-[11px]">{repoLabel(item.repoUrl)}</span>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 items-center">
        {item.assignees.slice(0, 2).map((person, index) => (
          <GitHubUserAvatar
            key={person.id}
            login={person.id}
            name={person.name}
            className={cn('size-5 rounded-full ring-1 ring-background', index > 0 && '-ml-1.5')}
          />
        ))}
        {item.assignees.length > 2 ? (
          <span className="-ml-1.5 text-[11px] text-muted-foreground">
            +{item.assignees.length - 2}
          </span>
        ) : null}
      </div>
      <div className="flex items-center">
        {item.stateLabel ? (
          <Badge
            variant={item.state === 'closed' ? 'outline' : 'secondary'}
            className="px-1.5 py-0"
          >
            {item.stateLabel}
          </Badge>
        ) : null}
      </div>
      <div className="flex items-center text-[12px] text-muted-foreground">
        {item.updatedAt ? formatRelativeTime(item.updatedAt) : ''}
      </div>
      <div className="flex items-center justify-end gap-0.5 pr-0.5 opacity-0 transition-opacity group-hover/feishu-row:opacity-100">
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label={t('feishu.detail.launch', 'Start workspace')}
          onClick={(event) => {
            event.stopPropagation()
            onLaunch(item)
          }}
        >
          <Rocket className="size-3.5" />
        </button>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
          aria-label={t('feishu.list.openInBrowser', 'Open in Feishu')}
          onClick={(event) => {
            event.stopPropagation()
            void openAppHttpLink(item.url)
          }}
        >
          <ExternalLink className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

export function FeishuRecordList({
  items,
  loading,
  selectedRecord,
  onOpenRecord,
  onLaunchRecord
}: {
  items: readonly FeishuWorkItem[]
  loading: boolean
  selectedRecord: FeishuWorkItem | null
  onOpenRecord: (item: FeishuWorkItem) => void
  onLaunchRecord: (item: FeishuWorkItem) => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="divide-y divide-border/40">
      <div
        className={cn(
          'sticky top-0 z-40 grid h-8 gap-3 border-b border-border/50 px-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground [&>span]:flex [&>span]:items-center',
          GITHUB_TASK_HEADER_SURFACE_CLASS,
          GITHUB_TASK_GRID_CLASS
        )}
      >
        <span className={GITHUB_TASK_STICKY_ID_HEADER_CLASS}>{t('feishu.list.colId', 'ID')}</span>
        <span className={GITHUB_TASK_STICKY_TITLE_HEADER_CLASS}>
          {t('feishu.list.colTitle', 'Title / Context')}
        </span>
        <span>{t('feishu.list.colAssignees', 'Assignees')}</span>
        <span>{t('feishu.list.colStatus', 'Status')}</span>
        <span>{t('feishu.list.colUpdated', 'Updated')}</span>
        <span />
      </div>
      {loading && items.length === 0
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-3 py-3">
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted/70" />
              <div className="mt-2 h-3 w-3/5 animate-pulse rounded bg-muted/60" />
            </div>
          ))
        : null}
      {!loading && items.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            {t('feishu.list.emptyTitle', 'No matching records')}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('feishu.list.emptyBody', 'Try different search terms or state filters.')}
          </p>
        </div>
      ) : null}
      {items.map((item) => (
        <FeishuRow
          key={item.id}
          item={item}
          selected={selectedRecord?.id === item.id}
          onOpen={onOpenRecord}
          onLaunch={onLaunchRecord}
        />
      ))}
    </div>
  )
}
