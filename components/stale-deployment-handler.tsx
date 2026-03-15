"use client";

import { useEffect } from "react";

/**
 * Catches unhandled "Failed to find Server Action" errors that occur when
 * a user's browser still has JS from a previous ECS deployment and tries
 * to invoke a server action that no longer exists. Forces a full page
 * reload so the client picks up the new build.
 */
export function StaleDeploymentHandler() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      if (event.message.includes("Failed to find Server Action")) {
        console.warn(
          "[StaleDeploymentHandler] Detected stale server action — reloading page.",
        );
        globalThis.location.reload();
      }
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const msg =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason ?? "");
      if (msg.includes("Failed to find Server Action")) {
        console.warn(
          "[StaleDeploymentHandler] Detected stale server action (unhandled rejection) — reloading page.",
        );
        globalThis.location.reload();
      }
    }

    globalThis.addEventListener("error", handleError);
    globalThis.addEventListener("unhandledrejection", handleRejection);
    return () => {
      globalThis.removeEventListener("error", handleError);
      globalThis.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
