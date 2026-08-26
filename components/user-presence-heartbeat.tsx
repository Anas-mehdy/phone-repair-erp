"use client";

import { useEffect, useRef } from "react";

/**
 * High-performance, zero-overhead user presence heartbeat component.
 * Sends a lightweight heartbeat ping every 60 seconds only when the tab is actively visible.
 */
export function UserPresenceHeartbeat() {
  const lastPingRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sendHeartbeat = async () => {
      // Avoid sending pings if document is hidden (user minimized or switched tabs)
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();
      // Enforce client-side minimum spacing of 30 seconds
      if (now - lastPingRef.current < 30000) {
        return;
      }

      lastPingRef.current = now;

      try {
        await fetch("/api/presence/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          keepalive: true,
          cache: "no-store",
        });
      } catch {
        // Silently swallow network errors so client UI is never interrupted
      }
    };

    // Initial ping after 3 seconds of page landing
    const initialTimeout = setTimeout(() => {
      sendHeartbeat();
    }, 3000);

    // Periodic heartbeat every 60 seconds
    const startInterval = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(sendHeartbeat, 60000);
    };

    startInterval();

    // Listen to visibility changes (tab focus/unfocus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        // If more than 60 seconds passed since last ping, ping immediately upon returning
        if (now - lastPingRef.current >= 60000) {
          sendHeartbeat();
        }
        startInterval();
      } else {
        // Clear interval while hidden to conserve client & server resources
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(initialTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
