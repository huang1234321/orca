import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createIntegrationStateFileCache } from '../credentials/integration-state-file-cache'
import { createIntegrationTokenFileCache } from '../credentials/integration-token-file-cache'
import { writeEncryptedCredential } from '../credentials/integration-credential-file'
import { inCredentialFileOrder } from '../credentials/credential-file-io'

export type FeishuAppRecord = {
  appId: string
}

function feishuDir(): string {
  return join(homedir(), '.orca')
}

function appFilePath(): string {
  return join(feishuDir(), 'feishu-app.json')
}

function tokenFilePath(_appId: string): string {
  return join(feishuDir(), 'feishu-app-secret.enc')
}

const appFileCache = createIntegrationStateFileCache<FeishuAppRecord | null>({
  filePath: appFilePath,
  readFromDisk: (): FeishuAppRecord | null => {
    try {
      const parsed: { appId?: unknown } = JSON.parse(readFileSync(appFilePath(), 'utf8'))
      return typeof parsed.appId === 'string' && parsed.appId.trim()
        ? { appId: parsed.appId.trim() }
        : null
    } catch {
      return null
    }
  }
})

const tokenCache = createIntegrationTokenFileCache({ service: 'Feishu', filePath: tokenFilePath })

export function readFeishuApp(): Promise<FeishuAppRecord | null> {
  return appFileCache.get()
}

export function readFeishuAppSecret(): Promise<string | null> {
  return tokenCache.read('app')
}

export function feishuCredentialError(): Promise<string | undefined> {
  return tokenCache.error('app')
}

export async function saveFeishuApp(appId: string, appSecret: string): Promise<void> {
  await inCredentialFileOrder(`${tokenFilePath(appId)}.mutation`, async () => {
    await writeEncryptedCredential('Feishu', tokenFilePath(appId), appSecret)
    writeFileSync(appFilePath(), `${JSON.stringify({ appId }, null, 2)}\n`, { mode: 0o600 })
    appFileCache.invalidate()
  })
  tokenCache.forget('app')
}

export function forgetFeishuCredentials(): void {
  tokenCache.forget('app')
}
