"use client";

import React from "react";
import { useKeyboardAvoidingScroll } from "@/hooks/useKeyboardAvoidingScroll";

/**
 * No visual output — mounts useKeyboardAvoidingScroll once for the whole
 * app so every page gets native-app-style keyboard avoidance without each
 * one wiring it up itself.
 */
export function KeyboardAvoidingProvider({ children }: { children: React.ReactNode }) {
  useKeyboardAvoidingScroll();
  return <>{children}</>;
}

export default KeyboardAvoidingProvider;
