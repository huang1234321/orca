import { readFeishuApp, readFeishuAppSecret } from './feishu-credential-store'

const API_BASE = 'https://open.feishu.cn'
export const REQUEST_TIMEOUT_MS = 10_000

type TenantTokenResponse = {
  code?: number
  msg?: string
  tenant_access_token?: string
  expire_in?: number
}

type Envelope<T> = {
  code?: number
  msg?: string
  data?: T
}

let tokenState: { token: string; expiresAt: number } | null = null

export function forgetFeishuTenantToken(): void {
  tokenState = null
}

export async function getTenantToken(): Promise<string | null> {
  if (tokenState && tokenState.expiresAt > Date.now() + 60_000) {
    return tokenState.token
  }
  const app = await readFeishuApp()
  const secret = app ? await readFeishuAppSecret() : null
  if (!app || !secret) {
    return null
  }
  const response = await fetch(`${API_BASE}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: app.appId, app_secret: secret }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  })
  const json: TenantTokenResponse = await response.json()
  if (json.code !== 0 || !json.tenant_access_token) {
    tokenState = null
    return null
  }
  tokenState = {
    token: json.tenant_access_token,
    expiresAt: Date.now() + (json.expire_in ?? 5400) * 1000
  }
  return tokenState.token
}

export async function feishuRequest<T>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<{ ok: true; data: T } | { ok: false; code: number | 'network'; msg: string }> {
  const token = await getTenantToken()
  if (!token) {
    return { ok: false, code: 'network', msg: 'Feishu app is not connected' }
  }
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
    const json: Envelope<T> = await response.json()
    if (json.code !== 0) {
      return {
        ok: false,
        code: json.code ?? response.status,
        msg: json.msg ?? `HTTP ${response.status}`
      }
    }
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: Bitable omits `data` on empty results; callers treat every field as optional.
    const data: T = json.data ?? ({} as T)
    return { ok: true, data }
  } catch (error) {
    return {
      ok: false,
      code: 'network',
      msg: error instanceof Error ? error.message : String(error)
    }
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Bitable text columns read back as [{type:'text', text}] segments; writes accept plain strings. */
export function joinTextSegments(value: unknown): string | null {
  if (typeof value === 'string') {
    return value || null
  }
  if (!Array.isArray(value)) {
    return null
  }
  const joined = value
    .map((segment) => (isRecord(segment) && typeof segment.text === 'string' ? segment.text : ''))
    .join('')
  return joined.trim() ? joined : null
}

export function toIsoTimestamp(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString()
  }
  return null
}

export type FeishuRequest = typeof feishuRequest

const appTokenCache = new Map<string, string>()

/**
 * Wiki URLs carry the wiki node token, but Bitable APIs need the node's obj_token.
 * Resolve once per token; non-wiki (base) tokens pass through unchanged.
 */
export async function resolveFeishuAppToken(appToken: string): Promise<string> {
  const cached = appTokenCache.get(appToken)
  if (cached) {
    return cached
  }
  const resolved = await feishuRequest<{
    node?: { obj_type?: unknown; obj_token?: unknown }
  }>(`/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(appToken)}`)
  const node = resolved.ok ? resolved.data.node : undefined
  const objToken =
    node?.obj_type === 'bitable' && typeof node.obj_token === 'string' ? node.obj_token : null
  const finalToken = objToken ?? appToken
  appTokenCache.set(appToken, finalToken)
  return finalToken
}
