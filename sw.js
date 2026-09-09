/* Anatomy Studio service worker.
   Purpose: a campus lab of sixty machines should pull 35 MB once, not sixty times,
   and a lecture should not die because the wifi did. The shell is precached at
   install; the geometry is cached the first time it is actually fetched, so a
   student who only opens the page never silently downloads the whole model. */
const V = 'anatomy-studio-v4.2.3';
const SHELL = [
  './', './index.html',
  './src/main.js', './src/scene.js', './src/data.js', './src/exam.js', './src/tour.js', './src/brand.js',
  './vendor/three.module.js', './vendor/OrbitControls.js',
  './vendor/space-grotesk.css', './vendor/sg-latin.woff2', './vendor/sg-latin-ext.woff2',
  './data/manifest.json', './data/derived.json', './data/anatomy.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* geometry never changes within a version: cache first, and strip the retry
     query so a retried chunk still hits the cached copy */
  if (/\/data\/geo-\d+\.js/.test(url.pathname)) {
    const key = new Request(url.origin + url.pathname);
    e.respondWith(
      caches.match(key).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(key, copy)); }
        return res;
      }))
    );
    return;
  }

  /* everything else: network first so an updated build lands, cache as fallback
     so an unplugged network still opens the app */
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
