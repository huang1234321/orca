import { toast } from 'sonner'
import type { FeishuWorkItem } from '../../../../../../shared/feishu/feishu-types'
import type { Repo } from '../../../../../../shared/repository/repo-types'
import { translate } from '@/i18n/i18n'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'
import { useAppStore } from '@/store/index'
import { launchWorkItemDirect } from './launch-work-item-direct'
import type { LaunchableWorkItem } from './launch-work-item-direct-types'

function normalizeRepoUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^[^/@]+@/, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')
}

/** Path-only fallback so web URLs match clone remotes regardless of host spelling. */
function repoUrlPath(url: string): string {
  const normalized = normalizeRepoUrl(url)
  const slash = normalized.indexOf('/')
  return slash === -1 ? normalized : normalized.slice(slash)
}

/** Match the row's 仓库链接 against catalog repo remotes, ignoring protocol and .git suffixes. */
function findRepoIdByRemoteUrl(repos: readonly Repo[], repoUrl: string): string | null {
  const wanted = normalizeRepoUrl(repoUrl)
  if (!wanted) {
    return null
  }
  const wantedPath = repoUrlPath(repoUrl)
  for (const repo of repos) {
    const remote = repo.gitRemoteIdentity?.remoteUrl
    if (remote && normalizeRepoUrl(remote) === wanted) {
      return repo.id
    }
  }
  for (const repo of repos) {
    const remote = repo.gitRemoteIdentity?.remoteUrl
    if (remote && repoUrlPath(remote) === wantedPath) {
      return repo.id
    }
  }
  return null
}

/**
 * Start a workspace from a Feishu record. The row's repo link resolves the
 * source repository; without a match the record opens in the browser and the
 * user launches from the new-workspace flow.
 */
export async function launchFeishuRecordWorkspace(record: FeishuWorkItem): Promise<void> {
  const openModalFallback = (): void => {
    openAppHttpLink(record.url)
  }
  const repos = useAppStore.getState().repos ?? []
  const repoId = record.repoUrl ? findRepoIdByRemoteUrl(repos, record.repoUrl) : null
  if (!repoId) {
    toast.info(
      translate(
        'feishu.launch.repoUnmatched',
        'Repository not matched in Orca; add the repo or fix the row link, then retry'
      )
    )
    openModalFallback()
    return
  }
  const item: LaunchableWorkItem = {
    provider: 'feishu',
    title: record.title,
    url: record.url,
    type: 'issue',
    number: null
  }
  await launchWorkItemDirect({
    item,
    repoId,
    launchSource: 'task_page',
    openModalFallback
  })
}
