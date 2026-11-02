const CACHE_NAME = "mijn-bedrijf-v3";
const SCOPE_URL = self.registration.scope;
const scopedUrl = (path = "") => new URL(path, SCOPE_URL).href;
const APP_SHELL = [
  scopedUrl(),
  scopedUrl("manifest.webmanifest"),
  scopedUrl("favicon.ico"),
  scopedUrl("og.png"),
  scopedUrl("assets/creative-studio.png"),
  scopedUrl("assets/webshop-stockroom.png"),
  scopedUrl("assets/coffee-bar.png"),
];

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const documentResponse = await fetch(SCOPE_URL);
  if (!documentResponse.ok) throw new Error("Kon de app-shell niet ophalen.");

  await cache.put(SCOPE_URL, documentResponse.clone());
  const html = await documentResponse.text();
  const generatedAssets = [...html.matchAll(/\b(?:src|href)=["']([^"'#]+)["']/g)]
    .map((match) => new URL(match[1], SCOPE_URL))
    .filter((url) => url.origin === self.location.origin && url.href.startsWith(SCOPE_URL))
    .map((url) => url.href);

  const routeManifestUrl = generatedAssets.find((url) => /\/assets\/manifest-[^/]+\.js$/.test(url));
  const routeAssets = routeManifestUrl
    ? await fetch(routeManifestUrl)
      .then((response) => response.ok ? response.text() : "")
      .then((source) => [...source.matchAll(/["']((?:\/|https?:\/\/)[^"']+)["']/g)]
        .map((match) => new URL(match[1], SCOPE_URL))
        .filter((url) => url.origin === self.location.origin && url.href.startsWith(SCOPE_URL))
        .map((url) => url.href))
    : [];

  await cache.addAll([...new Set([...APP_SHELL.slice(1), ...generatedAssets, ...routeAssets])]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET"
    || !event.request.url.startsWith(self.location.origin)
    || !event.request.url.startsWith(SCOPE_URL)
  ) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") return caches.match(SCOPE_URL);
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }),
  );
});
