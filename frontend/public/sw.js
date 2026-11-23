// AB BusinessHub service worker.
//
// Makes the app installable and quick to open on slow connections:
// - Pages: always try the network first (so a new version shows at once);
//   with no connection, open the last saved copy of the app.
// - App files in /assets/ never change once built (their names include a
//   hash), so they are kept and served from the phone.
// - API calls (/api/...) and other websites are never stored: business data
//   always comes fresh from the server.
const VERSION = "v1";
const SHELL = `abh-shell-${VERSION}`;
const ASSETS = `abh-assets-${VERSION}`;

// On install, save the app page and the app files it loads, so the app
// opens even without a connection from the first time it was visited.
async function saveApp() {
  const shell = await caches.open(SHELL);
  await shell.addAll(["/manifest.webmanifest", "/icons/icon-192.png"]);
  const res = await fetch("/", { cache: "no-cache" });
  if (!res.ok) return;
  const html = await res.clone().text();
  await shell.put("/", res);
  const files = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  if (files.length) await (await caches.open(ASSETS)).addAll(files);
}

self.addEventListener("install", (event) => {
  event.waitUntil(saveApp().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts etc.: browser handles them
  if (url.pathname.startsWith("/api/")) return; // business data: never stored

  // Opening a page: network first, saved app when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put("/", copy));
          }
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || Response.error()))
    );
    return;
  }

  // Built app files: from the phone when we have them.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(ASSETS).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
