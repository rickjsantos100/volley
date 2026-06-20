"use client";

import { useEffect } from "react";

const CACHE_PREFIX = "voley-lisboa-static-";

export function PwaServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      async function clearDevelopmentPwaState() {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations
            .filter((registration) =>
              registration.active?.scriptURL.endsWith("/sw.js"),
            )
            .map((registration) => registration.unregister()),
        );

        if ("caches" in window) {
          const cacheNames = await window.caches.keys();
          await Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX))
              .map((cacheName) => window.caches.delete(cacheName)),
          );
        }
      }

      void clearDevelopmentPwaState();
      return;
    }

    function registerServiceWorker() {
      void navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .catch(() => undefined);
    }

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    window.addEventListener("load", registerServiceWorker, { once: true });

    return () => {
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  return null;
}
