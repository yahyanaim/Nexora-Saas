import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/**
 * False during server rendering and hydration, true afterwards. Use it to
 * render time-dependent text (relative dates, "now") only in the browser so
 * server and client markup match.
 */
export function useHasMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
