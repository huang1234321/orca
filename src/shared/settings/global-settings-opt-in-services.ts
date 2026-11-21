import type { TelemetrySettings } from '../telemetry/telemetry-settings-types'
import type { VoiceSettings } from '../speech/speech-types'
import type { AiVaultSearchSettings } from '../ai-vault/search/ai-vault-search-settings'

/**
 * Opt-in service settings split out of global-settings-types.ts only to hold
 * the file under the line ratchet. Intersected into GlobalSettings, so every
 * field stays flat in the persisted settings shape.
 */
export type OptInServiceSettings = {
  /** Anonymous telemetry consent, identity, frozen experiments, and daily usage limits; optional before migration. */
  telemetry?: TelemetrySettings
  /** Voice/dictation settings; persistence merge hydrates getDefaultSettings() values for older profiles. */
  voice?: VoiceSettings
  /** One-shot migration flag for the Auto dictation-mode default; after migration an explicit Toggle sticks. */
  voiceDictationModeDefaultedToAuto?: boolean
  /** Transcript full-text search consent + retention. Absent means off; nothing indexes until the user opts in. */
  aiVaultSearch?: AiVaultSearchSettings
}
