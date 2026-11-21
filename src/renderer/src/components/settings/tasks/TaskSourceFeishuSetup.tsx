import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TaskSourceShowInTasksStep } from './TaskSourceShowInTasksStep'
import { TaskSourceStepRow } from './TaskSourceStepRow'
import { useTranslate } from '@/i18n/use-translate'
import type {
  FeishuTableMapping,
  FeishuTaskSourceBinding
} from '../../../../../shared/feishu/feishu-types'
import {
  feishuConnectForTarget,
  feishuInferMappingForTarget,
  feishuLocalTarget
} from '@/runtime/feishu/runtime-feishu-client'
import { getConnectStepState, type ConnectStepProps } from './task-source-setup-state'

// Base URLs carry the app_token directly; wiki URLs carry the wiki node token,
// which the main process resolves to the underlying bitable obj_token.
const BITABLE_URL_RE = /(?:base|wiki)\/([A-Za-z0-9]+).*[?&]table=([A-Za-z0-9]+)/

function parseBitableBinding(value: string): { appToken: string; tableId: string } | null {
  const match = BITABLE_URL_RE.exec(value.trim())
  return match ? { appToken: match[1] ?? '', tableId: match[2] ?? '' } : null
}

function mappingSlotList(
  t: (key: string, fallback: string) => string,
  mapping: FeishuTableMapping
): { label: string; field: string | null | undefined }[] {
  return [
    { label: t('feishu.mapping.title', 'Title'), field: mapping.titleField },
    { label: t('feishu.mapping.state', 'State'), field: mapping.stateField },
    { label: t('feishu.mapping.labels', 'Labels'), field: mapping.labelsField },
    { label: t('feishu.mapping.assignee', 'Assignee'), field: mapping.assigneeField },
    { label: t('feishu.mapping.body', 'Description'), field: mapping.bodyField },
    { label: t('feishu.mapping.number', 'Number'), field: mapping.numberField },
    { label: t('feishu.mapping.repo', 'Repository link'), field: mapping.repoField },
    { label: t('feishu.mapping.doc', 'Detail doc'), field: mapping.docField }
  ]
}

export function FeishuSetupSteps(
  props: ConnectStepProps & {
    binding: FeishuTaskSourceBinding | null | undefined
    onUpdateBinding: (binding: FeishuTaskSourceBinding | null) => void
    onConnected: () => void
  }
): React.JSX.Element {
  const t = useTranslate()
  const [connectOpen, setConnectOpen] = useState(false)
  const [appId, setAppId] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [bindingInput, setBindingInput] = useState(
    props.binding ? `${props.binding.appToken} ${props.binding.tableId}` : ''
  )
  const [inferring, setInferring] = useState(false)
  const [inferred, setInferred] = useState<FeishuTableMapping | null>(null)

  const handleConnect = async (): Promise<void> => {
    setConnecting(true)
    await connectFeishuApp(
      appId.trim(),
      appSecret.trim(),
      () => setConnectOpen(false),
      props.onConnected
    )
    setConnecting(false)
  }

  const handleInfer = async (): Promise<void> => {
    const parsed =
      parseBitableBinding(bindingInput) ??
      (bindingInput.trim().split(/\s+/).length === 2
        ? {
            appToken: bindingInput.trim().split(/\s+/)[0] ?? '',
            tableId: bindingInput.trim().split(/\s+/)[1] ?? ''
          }
        : null)
    if (!parsed?.appToken || !parsed.tableId) {
      toast.error(
        t('feishu.setup.bindingHint', 'Paste a Bitable URL (with table=…) or "appToken tableId".')
      )
      return
    }
    setInferring(true)
    const mapping = await inferFeishuMapping(parsed)
    setInferring(false)
    if (mapping) {
      setInferred(mapping)
      props.onUpdateBinding({ ...parsed, mapping })
    }
  }

  const bound = props.binding !== null && props.binding !== undefined
  const shownMapping = inferred ?? props.binding?.mapping ?? null

  return (
    <ol className="divide-y divide-border/50">
      <TaskSourceStepRow
        index={1}
        state={getConnectStepState(props)}
        title={t('feishu.setup.connectTitle', 'Connect Feishu')}
        description={t(
          'feishu.setup.connectDescription',
          'Create a custom app with Bitable scopes, then paste its app ID and secret.'
        )}
        action={
          <Button
            type="button"
            size="sm"
            variant={props.connected ? 'outline' : 'default'}
            onClick={() => setConnectOpen((open) => !open)}
          >
            {props.connected
              ? t('feishu.setup.reconnect', 'Reconnect')
              : t('feishu.setup.connect', 'Connect app')}
          </Button>
        }
      >
        {connectOpen || !props.connected ? (
          <div className="mt-2 space-y-2">
            <Input
              value={appId}
              onChange={(event) => setAppId(event.target.value)}
              placeholder={t('feishu.setup.appIdPlaceholder', 'cli_xxxxxxxxxxxxxxxx')}
              aria-label={t('feishu.setup.appIdLabel', 'App ID')}
            />
            <Input
              type="password"
              value={appSecret}
              onChange={(event) => setAppSecret(event.target.value)}
              placeholder={t('feishu.setup.appSecretLabel', 'App secret')}
              aria-label={t('feishu.setup.appSecretLabel', 'App secret')}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={connecting || !appId.trim() || !appSecret.trim()}
                onClick={() => void handleConnect()}
              >
                {connecting
                  ? t('feishu.setup.connecting', 'Connecting…')
                  : t('feishu.setup.save', 'Save and connect')}
              </Button>
            </div>
          </div>
        ) : null}
      </TaskSourceStepRow>
      <TaskSourceStepRow
        index={2}
        state={
          inferring ? 'in-progress' : bound ? 'done' : props.connected ? 'in-progress' : 'pending'
        }
        title={t('feishu.setup.bindTitle', 'Bind a Bitable table')}
        description={t(
          'feishu.setup.bindDescription',
          'Paste the Bitable URL of your task table; the field mapping is inferred from its columns.'
        )}
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!props.connected || inferring || !bindingInput.trim()}
            onClick={() => void handleInfer()}
          >
            {inferring
              ? t('feishu.setup.inferring', 'Reading fields…')
              : t('feishu.setup.bind', 'Bind table')}
          </Button>
        }
      >
        <div className="mt-2 space-y-2">
          <Input
            value={bindingInput}
            onChange={(event) => setBindingInput(event.target.value)}
            placeholder={t(
              'feishu.setup.bindingPlaceholder',
              'https://xxx.feishu.cn/base/bascn…?table=tbl…&view=…'
            )}
            aria-label={t('feishu.setup.bindTitle', 'Bind a Bitable table')}
          />
          {shownMapping ? (
            <div className="rounded-md border border-border/50 bg-muted/40 px-3 py-2 text-xs">
              <div className="mb-1 font-medium text-foreground">
                {t('feishu.setup.mappingTitle', 'Field mapping')}
              </div>
              <ul className="space-y-0.5 text-muted-foreground">
                {mappingSlotList(t, shownMapping).map(({ label, field }) => (
                  <li key={label}>
                    {label}: <span className="text-foreground">{field ?? '—'}</span>
                  </li>
                ))}
              </ul>
              {shownMapping.stateField ? null : (
                <p className="mt-1 text-status-warning-foreground">
                  {t(
                    'feishu.setup.stateMissing',
                    'No single-select column found for state; records stay "open" until mapped.'
                  )}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </TaskSourceStepRow>
      <TaskSourceShowInTasksStep
        index={3}
        providerLabel={t('auto.components.settings.TasksPane.feishu', 'Feishu')}
        visible={props.visible}
        canHide={props.canHide}
        onToggleVisible={props.onToggleVisible}
      />
    </ol>
  )
}

/** Module-level so the component keeps no try/finally (a React Compiler bailout). */
async function connectFeishuApp(
  appId: string,
  appSecret: string,
  closeDialog: () => void,
  onConnected: () => void
): Promise<void> {
  const result = await feishuConnectForTarget(feishuLocalTarget, { appId, appSecret })
  if (!result.ok) {
    toast.error(result.error)
    return
  }
  closeDialog()
  onConnected()
}

/** Module-level so the component keeps no try/finally (a React Compiler bailout). */
async function inferFeishuMapping(binding: {
  appToken: string
  tableId: string
}): Promise<FeishuTableMapping | null> {
  const result = await feishuInferMappingForTarget(feishuLocalTarget, binding)
  if (!result.ok) {
    toast.error(result.error)
    return null
  }
  return result.mapping
}
