export class NetworkAccessBlockedError extends Error {
  constructor(api: string) {
    super(`Pasted code attempted to use ${api}, which is blocked inside the sandbox.`);
    this.name = "NetworkAccessBlockedError";
  }
}

const BLOCKED_APIS = ["fetch", "XMLHttpRequest", "WebSocket"] as const;

/**
 * Overrides network-capable globals on the given scope so pasted code can't
 * make outbound requests or exfiltrate data — even though the sandbox already
 * runs in an isolated Worker with no access to the host page's state, this
 * closes off the network as an exfiltration channel entirely (story 4.1).
 * Takes the scope as a parameter, rather than mutating `globalThis` directly,
 * so this stays a pure function: `jsWorker.ts` calls it once with its own
 * `self` before evaluating any pasted source; tests pass a plain fake object.
 * Silently skips any name the scope doesn't already have, so it never
 * fabricates a global that wasn't there to begin with.
 */
export function lockdownNetworkGlobals(scope: Record<string, unknown>): void {
  for (const name of BLOCKED_APIS) {
    if (!(name in scope)) continue;
    Object.defineProperty(scope, name, {
      configurable: false,
      get(): never {
        throw new NetworkAccessBlockedError(name);
      },
    });
  }
}
