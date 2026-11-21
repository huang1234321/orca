import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, FileText, LoaderCircle, Rocket, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import CommentMarkdown from '@/components/comment-markdown/CommentMarkdown'
import { useTranslate } from '@/i18n/use-translate'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'
import { launchFeishuRecordWorkspace } from '@/lib/workspace/creation/work-item/launch-feishu-record'
import { formatRelativeTime } from '../task-page-source-context'
import type {
  FeishuComment,
  FeishuTableMapping,
  FeishuTaskSourceBinding,
  FeishuWorkItem
} from '../../../../../shared/feishu/feishu-types'
import {
  feishuAddCommentForTarget,
  feishuListCommentsForTarget,
  feishuLocalTarget,
  feishuReadDocContentForTarget,
  feishuUpdateRecordBodyForTarget,
  feishuUpdateRecordStateForTarget
} from '@/runtime/feishu/runtime-feishu-client'
import { LinearIssueMarkdownDescriptionEditor } from '@/components/task-page/linear/issue-workspace/LinearIssueMarkdownDescriptionEditor'
import { getScreenSubmitShortcutLabel } from '@/lib/keyboard/screen-submit-shortcut'

export function FeishuRecordDetail({
  record,
  binding,
  onClose,
  onRecordChanged
}: {
  record: FeishuWorkItem
  binding: FeishuTaskSourceBinding
  onClose: () => void
  onRecordChanged: (record: FeishuWorkItem) => void
}): React.JSX.Element {
  const t = useTranslate()
  const [comments, setComments] = useState<FeishuComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentBody, setCommentBody] = useState('')
  const [sending, setSending] = useState(false)
  const [bodySaving, setBodySaving] = useState(false)
  const [docMarkdown, setDocMarkdown] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)
  const mapping: FeishuTableMapping = binding.mapping
  const stateOptions = Object.keys(mapping.stateCategories ?? {})
  const submitShortcutLabel = getScreenSubmitShortcutLabel()

  const saveBody = (body: string): void => {
    if (body === (record.body ?? '')) {
      return
    }
    setBodySaving(true)
    feishuUpdateRecordBodyForTarget(feishuLocalTarget, {
      appToken: binding.appToken,
      tableId: binding.tableId,
      recordId: record.id,
      mapping,
      body
    })
      .then((result) => {
        if (result.ok) {
          onRecordChanged({ ...record, body })
        } else {
          toast.error(result.error)
          onRecordChanged({ ...record })
        }
      })
      .catch(() => {
        toast.error(t('feishu.detail.bodySaveFailed', 'Description save failed'))
        onRecordChanged({ ...record })
      })
      .finally(() => {
        setBodySaving(false)
      })
  }

  useEffect(() => {
    let cancelled = false
    setCommentsLoading(true)
    if (!mapping.comments) {
      setComments([])
      setCommentsLoading(false)
      return
    }
    feishuListCommentsForTarget(feishuLocalTarget, {
      appToken: binding.appToken,
      mapping,
      recordId: record.id
    })
      .then((result) => {
        if (!cancelled) {
          setComments(result.ok ? result.comments : [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setComments([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCommentsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [binding.appToken, mapping, record.id])

  useEffect(() => {
    let cancelled = false
    if (!record.docUrl) {
      setDocMarkdown(null)
      setDocError(null)
      return
    }
    setDocLoading(true)
    setDocError(null)
    feishuReadDocContentForTarget(feishuLocalTarget, { docUrl: record.docUrl })
      .then((result) => {
        if (cancelled) {
          return
        }
        if (result.ok) {
          setDocMarkdown(result.markdown)
        } else {
          setDocMarkdown(null)
          setDocError(result.error)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDocMarkdown(null)
          setDocError(t('feishu.detail.docLoadFailed', 'Doc load failed'))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDocLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [record.docUrl, t])

  const submitComment = async (): Promise<void> => {
    const body = commentBody.trim()
    if (!body) {
      return
    }
    setSending(true)
    await postFeishuComment(
      { appToken: binding.appToken, mapping, recordId: record.id, body },
      (comment) => {
        setComments((current) => [...current, comment])
        setCommentBody('')
      }
    )
    setSending(false)
  }

  const changeState = async (stateOption: string): Promise<void> => {
    const result = await feishuUpdateRecordStateForTarget(feishuLocalTarget, {
      appToken: binding.appToken,
      tableId: binding.tableId,
      recordId: record.id,
      mapping,
      stateOption
    })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    onRecordChanged({
      ...record,
      stateLabel: stateOption,
      state: mapping.stateCategories?.[stateOption] === 'closed' ? 'closed' : 'open'
    })
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-none items-start justify-between gap-3 border-b border-border/50 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs text-muted-foreground">{record.key}</span>
            {record.stateLabel ? <Badge variant="secondary">{record.stateLabel}</Badge> : null}
          </div>
          <h2 className="mt-1 truncate text-sm font-medium text-foreground">{record.title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {stateOptions.length > 0 && record.stateLabel ? (
            <Select value={record.stateLabel} onValueChange={(value) => void changeState(value)}>
              <SelectTrigger className="h-7 w-32" aria-label={t('feishu.detail.state', 'State')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stateOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {record.docUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void openAppHttpLink(record.docUrl ?? '')}
            >
              <FileText className="size-4" />
              {t('feishu.detail.openDoc', 'Doc')}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void launchFeishuRecordWorkspace(record)}
          >
            <Rocket className="size-4" />
            <span className="sr-only">{t('feishu.detail.launch', 'Start workspace')}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void openAppHttpLink(record.url)}
          >
            <ExternalLink className="size-4" />
            <span className="sr-only">{t('feishu.list.openInBrowser', 'Open in Feishu')}</span>
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
            <span className="sr-only">{t('feishu.detail.close', 'Close')}</span>
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto scrollbar-sleek px-4 py-4">
        {record.docUrl ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {t('feishu.detail.docContent', 'Detail doc')}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void openAppHttpLink(record.docUrl ?? '')}
              >
                <FileText className="size-3.5" />
                {t('feishu.detail.openDoc', 'Doc')}
              </Button>
            </div>
            {docLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
              </div>
            ) : docError ? (
              <p className="text-sm text-destructive">{docError}</p>
            ) : docMarkdown ? (
              <CommentMarkdown content={docMarkdown} variant="document" expandImages />
            ) : null}
          </div>
        ) : mapping.bodyField ? (
          <LinearIssueMarkdownDescriptionEditor
            value={record.body ?? ''}
            onChange={() => {}}
            onSave={saveBody}
            density="page"
            disabled={bodySaving}
            submitShortcutLabel={submitShortcutLabel}
          />
        ) : record.body ? (
          <CommentMarkdown content={record.body} variant="document" expandImages />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('feishu.detail.noBody', 'No description')}
          </p>
        )}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t('feishu.detail.comments', 'Comments')}
          </p>
          {commentsLoading ? (
            <div className="flex justify-center py-4">
              <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {mapping.comments
                ? t('feishu.detail.noComments', 'No comments yet')
                : t(
                    'feishu.detail.noCommentsTable',
                    'No comments table is bound in the Feishu setup'
                  )}
            </p>
          ) : (
            <ul className="space-y-3">
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-md border border-border/50 bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2 text-2xs text-muted-foreground">
                    <span>{comment.authorName ?? t('feishu.detail.unknownAuthor', 'App')}</span>
                    <span>{comment.createdAt ? formatRelativeTime(comment.createdAt) : ''}</span>
                  </div>
                  <div className="mt-1 text-sm">
                    <CommentMarkdown content={comment.body} variant="compact" />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {mapping.comments ? (
            <div className="flex gap-2">
              <Input
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    void submitComment()
                  }
                }}
                placeholder={t('feishu.detail.commentPlaceholder', 'Add a comment')}
                aria-label={t('feishu.detail.commentPlaceholder', 'Add a comment')}
              />
              <Button
                type="button"
                size="sm"
                disabled={sending || !commentBody.trim()}
                onClick={() => void submitComment()}
              >
                {sending ? t('feishu.detail.sending', 'Sending…') : t('feishu.detail.send', 'Send')}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Module-level so the component keeps no try/finally (a React Compiler bailout). */
async function postFeishuComment(
  args: Parameters<typeof feishuAddCommentForTarget>[1],
  onSent: (comment: FeishuComment) => void
): Promise<void> {
  const result = await feishuAddCommentForTarget(feishuLocalTarget, args)
  if (!result.ok) {
    toast.error(result.error)
    return
  }
  if (result.ok) {
    onSent(result.comment)
  }
}
