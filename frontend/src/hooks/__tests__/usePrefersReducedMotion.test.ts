import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";

type Listener = (event: { matches: boolean }) => void;

function installMatchMedia(initial: boolean): {
  set: (v: boolean) => void;
  restore: () => void;
} {
  const listeners = new Set<Listener>();
  let matches = initial;
  const original = globalThis.matchMedia;
  globalThis.matchMedia = ((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addListener: (cb: Listener) => listeners.add(cb),
    removeListener: (cb: Listener) => listeners.delete(cb),
    addEventListener: (_: string, cb: Listener) => listeners.add(cb),
    removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
    dispatchEvent: () => false,
  })) as unknown as typeof matchMedia;
  return {
    set: (v: boolean) => {
      matches = v;
      listeners.forEach((cb) => cb({ matches: v }));
    },
    restore: () => {
      globalThis.matchMedia = original;
    },
  };
}

describe("usePrefersReducedMotion", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns false when the OS does not request reduced motion", () => {
    const mm = installMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    mm.restore();
  });

  it("returns true when the OS requests reduced motion", () => {
    const mm = installMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
    mm.restore();
  });

  it("updates when the media query changes", () => {
    const mm = installMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    act(() => mm.set(true));
    expect(result.current).toBe(true);
    mm.restore();
  });
});
