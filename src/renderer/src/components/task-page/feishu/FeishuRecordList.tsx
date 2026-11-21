import { CircleDot, ExternalLink, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'
import { formatRelativeTime } from '../task-page-source-context'
import type { FeishuWorkItem } from '../../../../../shared/feishu/feishu-types'

function repoLabel(repoUrl: string | null): string | null {
  if (!repoUrl) {
    return null
  }
  const withoutProtocol = repoUrl.replace(/^[a-z]+:\/\//i, '').replace(/\.git$/, '')
  const segments = withoutProtocol.split('/').filter(Boolean)
  const tail = segments.slice(-2).join('/')
  return tail || null
}

/** GitHub-style two-line row: state icon + bold title + number pill, meta line below. */
function FeishuRow({
  item,
  selected,
  onOpen
}: {
  item: FeishuWorkItem
  selected: boolean
  onOpen: (item: FeishuWorkItem) => void
}): React.JSX.Element {
  const t = useTranslate()
  const open = item.state === 'open'
  const repo = repoLabel(item.repoUrl)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onOpen(item)
        }
      }}
      className={cn(
        'group flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50',
        selected && 'bg-muted/60'
      )}
    >
      {open ? (
        <CircleDot className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
      ) : (
        <CheckCircle2
          className="mt-0.5 size-4 shrink-0 text-muted-foreground/70"
          aria-hidden="true"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 truncate text-sm font-medium text-foreground">{item.title}</span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/40 px-1.5 py-0.5 text-muted-foreground">
            <span className="font-mono text-[11px] font-normal">#{item.key}</span>
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted-foreground">
          {item.stateLabel ? (
            <Badge variant={open ? 'secondary' : 'outline'} className="px-1.5 py-0 text-2xs">
              {item.stateLabel}
            </Badge>
          ) : null}
          {item.labels.slice(0, 3).map((label) => (
            <Badge key={label} variant="outline" className="px-1.5 py-0 text-2xs">
              {label}
            </Badge>
          ))}
          {repo ? <span className="truncate font-mono">{repo}</span> : null}
          {item.assignees.length > 0 ? (
            <span className="truncate">
              {item.assignees
                .map((person) => person.name ?? '')
                .filter(Boolean)
                .join(', ')}
            </span>
          ) : null}
          {item.updatedAt ? <span>{formatRelativeTime(item.updatedAt)}</span> : null}
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100"
        aria-label={t('feishu.list.openInBrowser', 'Open in Feishu')}
        onClick={(event) => {
          event.stopPropagation()
          void openAppHttpLink(item.url)
        }}
      >
        <ExternalLink className="size-3.5" />
      </button>
    </div>
  )
}

export function FeishuRecordList({
  items,
  loading,
  selectedRecord,
  onOpenRecord
}: {
  items: readonly FeishuWorkItem[]
  loading: boolean
  selectedRecord: FeishuWorkItem | null
  onOpenRecord: (item: FeishuWorkItem) => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="divide-y divide-border/50">
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
        />
      ))}
    </div>
  )
}
