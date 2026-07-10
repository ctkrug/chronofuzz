import { describe, expect, it } from "vitest";
import { lockdownNetworkGlobals, NetworkAccessBlockedError } from "../src/sandbox/networkLockdown";

function fakeScope() {
  return {
    fetch: () => "real fetch",
    XMLHttpRequest: class {},
    WebSocket: class {},
    unrelated: () => "untouched",
  };
}

describe("lockdownNetworkGlobals", () => {
  it("makes fetch throw NetworkAccessBlockedError instead of returning", () => {
    const scope = fakeScope();
    lockdownNetworkGlobals(scope);
    expect(() => scope.fetch()).toThrow(NetworkAccessBlockedError);
  });

  it("makes constructing XMLHttpRequest throw", () => {
    const scope = fakeScope();
    lockdownNetworkGlobals(scope);
    expect(() => new scope.XMLHttpRequest()).toThrow(NetworkAccessBlockedError);
  });

  it("makes constructing WebSocket throw", () => {
    const scope = fakeScope();
    lockdownNetworkGlobals(scope);
    expect(() => new scope.WebSocket()).toThrow(NetworkAccessBlockedError);
  });

  it("includes the blocked API's name in the error message", () => {
    const scope = fakeScope();
    lockdownNetworkGlobals(scope);
    expect(() => scope.fetch()).toThrow(/fetch/);
  });

  it("leaves unrelated globals on the scope untouched", () => {
    const scope = fakeScope();
    lockdownNetworkGlobals(scope);
    expect(scope.unrelated()).toBe("untouched");
  });

  it("does nothing, and does not throw, for a scope missing all network globals", () => {
    const scope: Record<string, unknown> = {};
    expect(() => lockdownNetworkGlobals(scope)).not.toThrow();
    expect(Object.keys(scope)).toHaveLength(0);
  });

  it("re-locking down an already-locked scope does not throw", () => {
    const scope = fakeScope();
    lockdownNetworkGlobals(scope);
    expect(() => lockdownNetworkGlobals(scope)).not.toThrow();
  });
});
