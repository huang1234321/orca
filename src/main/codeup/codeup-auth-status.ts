import { getAuthConfig, requestJson } from './client'
import type { CodeupRepoRef } from './repository-ref'

export type CodeupAuthStatus = {
  configured: boolean
  authenticated: boolean
  account: string | null
  baseUrl: string
  tokenConfigured: boolean
}

export async function getCodeupAuthStatus(): Promise<CodeupAuthStatus> {
  const config = getAuthConfig()
  const tokenConfigured = config.token !== null
  if (!tokenConfigured) {
    return {
      configured: false,
      authenticated: false,
      account: null,
      baseUrl: config.apiBaseUrl,
      tokenConfigured
    }
  }
  const probeRepo: CodeupRepoRef = {
    host: 'codeup.aliyun.com',
    organizationId: config.organizationId ?? '',
    repoPath: '',
    webBaseUrl: 'https://codeup.aliyun.com'
  }
  if (!probeRepo.organizationId) {
    return {
      configured: true,
      authenticated: true,
      account: null,
      baseUrl: config.apiBaseUrl,
      tokenConfigured
    }
  }
  // A codeup-scoped PAT cannot read /oapi/v1/platform/user (403), so probe org repo access.
  const user = await requestJson<unknown[]>(
    `/oapi/v1/codeup/organizations/${encodeURIComponent(probeRepo.organizationId)}/repositories`,
    { searchParams: { page: 1, perPage: 1 }, timeoutMs: 4000 }
  )
  return {
    configured: true,
    authenticated: user !== null,
    account: null,
    baseUrl: config.apiBaseUrl,
    tokenConfigured
  }
}
