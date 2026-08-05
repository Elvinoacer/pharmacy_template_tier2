"use client";

import { useEffect } from "react";

/**
 * After staff open a How-do-you-feel thread (server marks related alerts read),
 * force the sidebar badge / bell to re-poll immediately instead of waiting 20s.
 */
export default function FeelAttentionRefresh() {
  useEffect(() => {
    window.dispatchEvent(new Event("aether:attention-refresh"));
  }, []);
  return null;
}
