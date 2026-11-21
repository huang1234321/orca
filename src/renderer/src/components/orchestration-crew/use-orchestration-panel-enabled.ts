import { useAppStore } from '../../store/index'

/**
 * Reads the experimental opt-in; upstream suspended the default after
 * performance regressions, so the panel stays off unless explicitly enabled.
 */
export function useOrchestrationPanelEnabled(): boolean {
  return useAppStore((s) => s.settings?.experimentalOrchestrationPanel === true)
}
