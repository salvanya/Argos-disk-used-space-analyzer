import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent | { matches: boolean }) => setPrefers(e.matches);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange as (e: MediaQueryListEvent) => void);
      return () =>
        mql.removeEventListener("change", onChange as (e: MediaQueryListEvent) => void);
    }
    mql.addListener(onChange as (e: MediaQueryListEvent) => void);
    return () => mql.removeListener(onChange as (e: MediaQueryListEvent) => void);
  }, []);

  return prefers;
}
