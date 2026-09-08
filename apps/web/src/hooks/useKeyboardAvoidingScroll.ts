"use client";

import { useEffect, useRef } from "react";

/**
 * Mirrors React Native's KeyboardAvoidingView for the web. When the
 * on-screen keyboard opens on a touch device, the currently focused
 * <input>/<textarea>/<select> is scrolled into view so it isn't left
 * hidden behind the keyboard — necessary because the app shell scrolls
 * inside a nested <main> container (not the document), which a mobile
 * browser's own "scroll focused field into view" heuristic doesn't
 * always reach, and because `interactive-widget=resizes-content` support
 * (see app/layout.tsx viewport export) isn't universal yet either.
 *
 * Reacts only to the visual viewport actually shrinking — the signal a
 * keyboard opened — never to a plain focus/click, so this is a no-op on
 * desktop, where focusing a field doesn't change the viewport at all.
 */
export function useKeyboardAvoidingScroll() {
  const baselineHeightRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const viewport = window.visualViewport;
    baselineHeightRef.current = viewport.height;

    const handleResize = () => {
      const baseline = baselineHeightRef.current;
      if (baseline == null) return;

      const shrunkBy = baseline - viewport.height;

      // A minor fluctuation (browser chrome show/hide, orientation change)
      // isn't a keyboard opening. If the viewport grew instead (keyboard
      // closing), just re-baseline for the next open.
      if (shrunkBy < 100) {
        if (shrunkBy < 0) baselineHeightRef.current = viewport.height;
        return;
      }

      const active = document.activeElement as HTMLElement | null;
      if (!active) return;
      if (!["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;

      // Let the keyboard-open animation and layout settle before measuring.
      requestAnimationFrame(() => {
        active.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    };

    viewport.addEventListener("resize", handleResize);
    return () => viewport.removeEventListener("resize", handleResize);
  }, []);
}

export default useKeyboardAvoidingScroll;
