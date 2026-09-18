"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";

type NavigationStage = "idle" | "subtle" | "progress";

type NavigationProgressState = {
  isNavigating: boolean;
  targetHref: string | null;
  destinationLabel: string | null;
  stage: NavigationStage;
  startNavigation: (href: string, label?: string) => void;
  completeNavigation: () => void;
};

const NavigationProgressContext = createContext<NavigationProgressState>({
  isNavigating: false,
  targetHref: null,
  destinationLabel: null,
  stage: "idle",
  startNavigation: () => {},
  completeNavigation: () => {},
});

export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const [destinationLabel, setDestinationLabel] = useState<string | null>(null);
  const [stage, setStage] = useState<NavigationStage>("idle");

  const subtleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (subtleTimerRef.current) clearTimeout(subtleTimerRef.current);
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    subtleTimerRef.current = null;
    progressTimerRef.current = null;
  }, []);

  const completeNavigation = useCallback(() => {
    clearTimers();
    setStage("idle");
    setTargetHref(null);
    setDestinationLabel(null);
  }, [clearTimers]);

  const startNavigation = useCallback(
    (href: string, label?: string) => {
      if (href === pathname) {
        completeNavigation();
        return;
      }
      clearTimers();
      setTargetHref(href);
      setDestinationLabel(label || null);

      // Layered feedback:
      // <100ms: show nothing
      // >100ms: subtle indicator on clicked item
      subtleTimerRef.current = setTimeout(() => {
        setStage("subtle");
      }, 100);

      // >250ms: thin progress line on command/header bar
      progressTimerRef.current = setTimeout(() => {
        setStage("progress");
      }, 250);
    },
    [pathname, clearTimers, completeNavigation],
  );

  // When pathname changes, navigation has resolved!
  useEffect(() => {
    completeNavigation();
  }, [pathname, completeNavigation]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return (
    <NavigationProgressContext.Provider
      value={{
        isNavigating: stage !== "idle",
        targetHref,
        destinationLabel,
        stage,
        startNavigation,
        completeNavigation,
      }}
    >
      {children}
    </NavigationProgressContext.Provider>
  );
}

export const useNavigationProgress = () => useContext(NavigationProgressContext);

/**
 * Very thin progress line displayed at the top of the header/command surface
 * only when a navigation transition takes longer than ~250ms.
 */
export function NavigationProgressBar() {
  const { stage, destinationLabel } = useNavigationProgress();

  if (stage !== "progress") return null;

  return (
    <div
      role="progressbar"
      aria-label={destinationLabel ? `Opening ${destinationLabel}…` : "Loading page…"}
      aria-busy="true"
      className="afyvia-nav-progress-bar"
    >
      <div className="afyvia-nav-progress-indicator" />
      {destinationLabel && (
        <span className="sr-only">Opening {destinationLabel}…</span>
      )}
    </div>
  );
}
