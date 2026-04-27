export const sourceLifecycleStates = ["active", "degraded", "paused", "unsupported"] as const;

export type SourceLifecycleState = (typeof sourceLifecycleStates)[number];

const unsupportedSourceUrls = new Set([
  // Railway currently returns a Cloudflare managed challenge to server-side fetches and has no official feed/API.
  "https://railway.com/changelog",
  // Windsurf currently returns server errors for the public changelog from backend fetches.
  "https://windsurf.com/changelog",
]);

export function getRegistryLifecycleState(sourceUrl: string): SourceLifecycleState {
  return unsupportedSourceUrls.has(sourceUrl) ? "unsupported" : "active";
}

export function getEffectiveLifecycleState(source: { lifecycleState?: string; isActive?: boolean }) {
  if (source.lifecycleState && sourceLifecycleStates.includes(source.lifecycleState as SourceLifecycleState)) {
    return source.lifecycleState as SourceLifecycleState;
  }

  return source.isActive === false ? "paused" : "active";
}

export function isMonitoredLifecycleState(state: string | undefined) {
  return state === "active" || state === "degraded";
}

export function shouldPollLifecycleState(source: { lifecycleState?: string; isActive?: boolean }) {
  return isMonitoredLifecycleState(getEffectiveLifecycleState(source));
}

export function getLifecycleStateAfterSuccess(source: { lifecycleState?: string; isActive?: boolean }) {
  const current = getEffectiveLifecycleState(source);
  return isMonitoredLifecycleState(current) ? "active" : current;
}

export function getLifecycleStateAfterFailure(source: { lifecycleState?: string; isActive?: boolean }) {
  const current = getEffectiveLifecycleState(source);
  return isMonitoredLifecycleState(current) ? "degraded" : current;
}
