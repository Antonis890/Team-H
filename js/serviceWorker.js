const cacheName = 'Treasure-hunt-teamH';
const filesToCache = [
    '/',
    'index.html',
    'app.html',
    'css/index.css',
    'css/app.css',
    'js/app.js',
    'js/instascan.min.js',
    'js/main.js',
    'media/teamH.png'
];
//Start the service worker and cache all of the app's content.
self.addEventListener('install', function(e) {
    e.waitUntil (
        caches.open(cacheName).then(function(cache) {
            return cache.addAll(filesToCache);
        })
    );
});

//Define which content to retrieve when the app is offline
self.addEventListener('fetch', function(e) {
    e.respondWith(
        caches.match(e.request).then(function(response) {
            return response || fetch(e.request);
        })
    );
});