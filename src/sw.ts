import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkOnly } from "serwist";

// Define the type for the precache manifest
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // RÈGLE DE SÉCURITÉ PWA : Bypasser le Service Worker pour toutes les requêtes de Next.js Server Actions
    {
      matcher: ({ request }) => {
        return !!(request && (request.headers.get("next-action") || request.headers.get("Next-Action")));
      },
      handler: new NetworkOnly(),
    },
    // Stratégies de cache par défaut de Serwist
    ...defaultCache,
  ],
});

serwist.addEventListeners();
