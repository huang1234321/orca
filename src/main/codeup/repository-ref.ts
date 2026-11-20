import { createRemoteRefProbeCache } from '../git/remotes/remote-ref-probe-cache'

export type CodeupRepoRef = {
  host: string
  /** First path segment of the remote: the devops organization the API requires. */
  organizationId: string
  /** Full slash-joined path below the organization (groups + repo), used to resolve repositoryId. */
  repoPath: string
  webBaseUrl: string
}

type LocalGitExecOptions = {
  wslDistro?: string
}

const CODEUP_HOST = 'codeup.aliyun.com'

const repoRefProbeCache = createRemoteRefProbeCache(parseCodeupRepoRef)

/** @internal - exposed for tests only */
export function _resetCodeupRepoRefCache(): void {
  repoRefProbeCache.clear()
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function parsePath(pathname: string): { organizationId: string; repoPath: string } | null {
  const withoutSuffix = pathname.replace(/\/+$/, '').replace(/\.git$/i, '')
  const parts = withoutSuffix
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
  // Remote paths are always /{organizationId}/{groups}/{repo}.
  if (parts.length < 2) {
    return null
  }

  const organizationId = decodeSegment(parts[0] ?? '')
  const repoPath = parts
    .slice(1)
    .map((part) => decodeSegment(part))
    .filter(Boolean)
    .join('/')
  if (!organizationId || !repoPath) {
    return null
  }
  return { organizationId, repoPath }
}

function makeRepoRef(host: string, path: string): CodeupRepoRef | null {
  if (host.toLowerCase() !== CODEUP_HOST) {
    return null
  }
  const parsed = parsePath(path)
  if (!parsed) {
    return null
  }
  return {
    host: CODEUP_HOST,
    organizationId: parsed.organizationId,
    repoPath: parsed.repoPath,
    webBaseUrl: `https://${CODEUP_HOST}`
  }
}

export function parseCodeupRepoRef(remoteUrl: string): CodeupRepoRef | null {
  const trimmed = remoteUrl.trim()
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    const scpLike = trimmed.match(/^(?:[^@/:]+@)?([^:\s/]+):([^\s]+?)(?:\.git)?$/)
    if (scpLike) {
      return makeRepoRef(scpLike[1] ?? '', scpLike[2] ?? '')
    }
  }

  try {
    const url = new URL(trimmed)
    const protocol = url.protocol.toLowerCase()
    if (!['http:', 'https:', 'ssh:', 'git+ssh:'].includes(protocol)) {
      return null
    }
    return makeRepoRef(url.hostname, url.pathname)
  } catch {
    return null
  }
}

export async function getCodeupRepoRefForRemote(
  repoPath: string,
  remoteName: string,
  connectionId?: string | null,
  localGitOptions: LocalGitExecOptions = {}
): Promise<CodeupRepoRef | null> {
  return repoRefProbeCache.get(repoPath, remoteName, connectionId, localGitOptions)
}

export async function getCodeupRepoRef(
  repoPath: string,
  connectionId?: string | null,
  localGitOptions: LocalGitExecOptions = {}
): Promise<CodeupRepoRef | null> {
  return getCodeupRepoRefForRemote(repoPath, 'origin', connectionId, localGitOptions)
}
