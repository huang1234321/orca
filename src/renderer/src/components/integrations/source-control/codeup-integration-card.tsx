import { ExternalLink, GitPullRequestArrow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  IntegrationCardDetails,
  IntegrationCardShell
} from '../presentation/integration-card-shell'
import { usePreflightCardStatuses } from './source-control-preflight-card-status'
import { useTranslate } from '@/i18n/use-translate'
import { tokenProviderStatusLabel } from './token-source-control-status'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'

export function CodeupIntegrationCard(): React.JSX.Element {
  const t = useTranslate()
  const { statuses, unavailable, refresh } = usePreflightCardStatuses('codeup')
  const status = unavailable ? 'unavailable' : statuses.codeupStatus
  const configured = status === 'configured'

  return (
    <IntegrationCardShell
      icon={<GitPullRequestArrow className="size-5" />}
      name="Codeup"
      description={
        configured
          ? statuses.codeupAccount
            ? t(
                'auto.components.settings.token.source.control.integration.cards.8ae786d652',
                '{{value0}} · Merge requests and status',
                { value0: statuses.codeupAccount }
              )
            : statuses.codeupBaseUrl
              ? t(
                  'auto.components.settings.token.source.control.integration.cards.8ae786d652',
                  '{{value0}} · Merge requests and status',
                  { value0: statuses.codeupBaseUrl }
                )
              : t(
                  'auto.components.settings.token.source.control.integration.cards.f7de222239',
                  'Merge requests for detected repositories'
                )
          : t(
              'auto.components.settings.token.source.control.integration.cards.b7c3f537ea',
              'Merge requests via the Aliyun Codeup OpenAPI.'
            )
      }
      checking={status === 'checking'}
      statusTone={configured ? 'connected' : 'attention'}
      statusLabel={tokenProviderStatusLabel(
        {
          configured,
          hasAccount: Boolean(statuses.codeupAccount),
          status,
          optional: true
        },
        t
      )}
    >
      {status !== 'checking' && !configured ? (
        <IntegrationCardDetails>
          <p className="text-xs text-muted-foreground">
            {status === 'unavailable' ? (
              t(
                'auto.components.settings.token.source.control.integration.cards.0f18013726',
                'Codeup status is not available in this runtime yet.'
              )
            ) : status === 'not-configured' ? (
              <>
                {t(
                  'auto.components.settings.token.source.control.integration.cards.a782a83520',
                  'Public repositories are detected from their git remote. Set'
                )}{' '}
                <span className="font-mono text-[11px]">
                  {t(
                    'auto.components.settings.token.source.control.integration.cards.0662796c5d',
                    'ORCA_CODEUP_TOKEN'
                  )}
                </span>{' '}
                {t(
                  'auto.components.settings.token.source.control.integration.cards.9f6bc3fae8',
                  'for private repositories, and set'
                )}{' '}
                <span className="font-mono text-[11px]">
                  {t(
                    'auto.components.settings.token.source.control.integration.cards.9347782103',
                    'ORCA_CODEUP_API_BASE_URL'
                  )}
                </span>{' '}
                {t(
                  'auto.components.settings.token.source.control.integration.cards.46927f98c8',
                  'only when using a non-default endpoint; set ORCA_CODEUP_ORGANIZATION_ID to override the organization derived from the remote.'
                )}
              </>
            ) : (
              t(
                'auto.components.settings.token.source.control.integration.cards.f70f0053eb',
                'Codeup credentials are configured but could not authenticate. Check the personal access token, organization ID, and repository permissions, then restart Orca if environment variables changed.'
              )
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(event) =>
                openAppHttpLink(
                  'https://next.api.alibabacloud.com/document/devops/2021-06-25/CreateMergeRequest',
                  { event }
                )
              }
            >
              <ExternalLink className="size-3.5 mr-1.5" />
              {t(
                'auto.components.settings.token.source.control.integration.cards.8efd23fbc9',
                'Learn more'
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={refresh}>
              {t(
                'auto.components.settings.token.source.control.integration.cards.a827d1cad8',
                'Re-check'
              )}
            </Button>
          </div>
        </IntegrationCardDetails>
      ) : null}
    </IntegrationCardShell>
  )
}
