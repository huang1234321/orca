import type { AgentDashboardMode } from '../ui-chrome/ui-chrome-types'

/**
 * Experimental/agents-view feature switches, split out of global-settings-types.ts
 * only to hold the file under the line ratchet. Intersected into GlobalSettings,
 * so every field stays flat in the persisted settings shape.
 */
export type ExperimentalAgentViewSettings = {
  /** Experimental: panel beside chats and terminals listing the agents each agent works with; off mounts nothing. */
  experimentalOrchestrationPanel?: boolean
  /** Experimental: icon-only app rail left of the workspace list for switching between Orca destinations. */
  experimentalAppRail?: boolean
  /** Set after the one-time legacy Agents tab introduction has been acknowledged. */
  agentsSidebarIntroShown?: boolean
  /** True when the profile previously opted into the legacy Agents view. */
  agentsSidebarMigratedFromExperimental?: boolean
  /** How the Agent Dashboard opens: an in-window companion board or a separate pop-out window. Defaults to in-window. */
  experimentalAgentDashboardMode?: AgentDashboardMode
  /** Includes stale quiet agents as a fourth Agent Dashboard column. */
  experimentalAgentDashboardShowIdle?: boolean
  /** One-shot migration guard for defaulting the Agents view off; later explicit opt-ins persist normally. */
  experimentalActivityDefaultedOffForAllUsers?: boolean
  /** Experimental: persistent terminal-pane attention ring for bell + agent-completion events. Opt-in while tuning signal/noise. */
  experimentalTerminalAttention: boolean
  /** Experimental: automatically sleep completed, resumable background agent terminals. */
  experimentalAgentHibernation?: boolean
  /** Milliseconds a completed agent must stay idle before hibernation can be considered. */
  agentHibernationIdleMs?: number
  /** Experimental: opt-in preview of the updated worktree-card layout and metadata behavior. */
  experimentalNewWorktreeCardStyle?: boolean
  /** Plugin frames as isolated guests (default on); main-only kill switch, see plugin-frame-isolation.ts. */
  experimentalPluginIsolatedFrames?: boolean
  /** Experimental: per-workspace on-demand environment recipes and setup surface. */
  experimentalEphemeralVms?: boolean
  /** Experimental (Windows): add WSL distros as hosts, each running its own Orca server. */
  experimentalWslHosts?: boolean
  /** Declined the add-project offer to run a `\\wsl.localhost` project's distro as a host. */
  wslHostOfferDismissed?: boolean
  /** Compact worktree cards: hide the metadata row when title and branch say the same thing. */
  compactWorktreeCards: boolean
  /** Legacy persisted key from the Experimental rollout; new writes use compactWorktreeCards. */
  experimentalCompactWorktreeCards?: boolean
}
