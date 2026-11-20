import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'
import { formatRelativeTime } from '../task-page-source-context'
import type { FeishuWorkItem } from '../../../../../shared/feishu/feishu-types'

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
        <div
          key={item.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpenRecord(item)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              onOpenRecord(item)
            }
          }}
          className={cn(
            'flex cursor-pointer items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50',
            selectedRecord?.id === item.id && 'bg-muted/60'
          )}
        >
          <span className="w-14 shrink-0 font-mono text-2xs text-muted-foreground">{item.key}</span>
          {item.stateLabel ? (
            // Closed options read as muted; open ones stay secondary like other task rows.
            <Badge variant={item.state === 'closed' ? 'outline' : 'secondary'} className="shrink-0">
              {item.stateLabel}
            </Badge>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.title}</span>
          {item.labels.slice(0, 2).map((label) => (
            <Badge key={label} variant="outline" className="hidden shrink-0 @sm:inline-flex">
              {label}
            </Badge>
          ))}
          {item.assignees.length > 0 ? (
            <span className="hidden shrink-0 text-2xs text-muted-foreground @md:inline">
              {item.assignees
                .map((person) => person.name ?? '')
                .filter(Boolean)
                .join(', ')}
            </span>
          ) : null}
          <span className="hidden w-20 shrink-0 text-right text-2xs text-muted-foreground @lg:inline">
            {item.updatedAt ? formatRelativeTime(item.updatedAt) : ''}
          </span>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label={t('feishu.list.openInBrowser', 'Open in Feishu')}
            onClick={(event) => {
              event.stopPropagation()
              void openAppHttpLink(item.url)
            }}
          >
            <ExternalLink className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
