// Minimaler Service Worker.
// Zweck: macht die Seite als PWA installierbar ("Zum Home-Bildschirm") – das ist
// die Voraussetzung dafür, dass die App als Teilen-Ziel ("Teilen → Einkaufsliste")
// auf Android erscheint. Absichtlich OHNE Caching, damit die Live-Liste immer
// frisch aus dem Netz kommt (kein Stale-Bug beim gemeinsamen Sync).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // absichtlich leer: alle Anfragen gehen normal ans Netz (Pass-through).
  // Ein registrierter fetch-Handler ist aber nötig, damit Chrome die PWA
  // als installierbar einstuft.
});
