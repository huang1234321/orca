import type { TaskProvider } from '../../../../shared/work-items/task-providers'

export type TaskPageListChromeVisibilityState = {
  taskSource: TaskProvider
  hasGitHubDetail: boolean
  hasGitLabDetail: boolean
  hasJiraDetail: boolean
  hasFeishuDetail: boolean
  hasLinearIssueDetail: boolean
  hasLinearProjectContext: boolean
  hasLinearViewContext: boolean
}

export function shouldHideTaskPageListChrome({
  taskSource,
  hasGitHubDetail,
  hasGitLabDetail,
  hasJiraDetail,
  hasFeishuDetail,
  hasLinearIssueDetail,
  hasLinearProjectContext,
  hasLinearViewContext
}: TaskPageListChromeVisibilityState): boolean {
  // Selections survive provider switches; another provider’s retained detail must not hide the active list chrome.
  switch (taskSource) {
    case 'github':
      return hasGitHubDetail
    case 'gitlab':
      return hasGitLabDetail
    case 'jira':
      return hasJiraDetail
    case 'feishu':
      return hasFeishuDetail
    case 'linear':
      return hasLinearIssueDetail || hasLinearProjectContext || hasLinearViewContext
  }
}
