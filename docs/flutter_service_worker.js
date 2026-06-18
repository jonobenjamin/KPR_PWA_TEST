'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {"flutter_bootstrap.js": "1a976b47d5c6ba87627e18257cd80040",
"version.json": "954e0901788d4c159b41e9c4f779f3f5",
"index.html": "cbb956f6720a915b5fedf77b41245137",
"/": "cbb956f6720a915b5fedf77b41245137",
"main.dart.js": "adbcd074f2a7ced220d583ba964f8e05",
"flutter.js": "24bc71911b75b5f8135c949e27a2984e",
"favicon.png": "5dcef449791fa27946b3d35ad8803796",
"icons/Icon-192.png": "0658615ef1bdea8a662d5bb1c68d97b6",
"icons/Icon-maskable-192.png": "0658615ef1bdea8a662d5bb1c68d97b6",
"icons/Icon-maskable-512.png": "f47886b0a99aeb0b6fc9ee305d3b4975",
"icons/KPR_icon.png": "893ac2e2763c1ad90322d3bf662fc931",
"icons/Icon-512.png": "f47886b0a99aeb0b6fc9ee305d3b4975",
"manifest.json": "e7e1d6ba00518b730832bc6b0ebdb37f",
"assets/NOTICES": "1dfb230874a1d1ddfd0e78ffc1cd7570",
"assets/FontManifest.json": "dc3d03800ccca4601324923c0b1d6d57",
"assets/AssetManifest.bin.json": "480ec6d3fe9fa8600d79200ae94e864f",
"assets/packages/cupertino_icons/assets/CupertinoIcons.ttf": "33b7d9392238c04c131b6ce224e13711",
"assets/packages/flutter_map/lib/assets/flutter_map_logo.png": "208d63cc917af9713fc9572bd5c09362",
"assets/shaders/ink_sparkle.frag": "ecc85a2e95f5e9f53123dcaf8cb9b6ce",
"assets/shaders/stretch_effect.frag": "40d68efbbf360632f614c731219e95f0",
"assets/AssetManifest.bin": "a8cbe03b08af68d0a2398439d21835e9",
"assets/fonts/MaterialIcons-Regular.otf": "35f40c8ced3723f3791272fee7c76bf5",
"assets/assets/Consession_boundary.geojson": "7f04e0566b20c6e8e96feca2a9a4031e",
"assets/assets/images/KPR_logo.png": "f70391debeb086a102e3f8fe1a447937",
"assets/assets/images/KPR_PWA_Background_image.png": "72e974e963f2e43a63b6b259b330fbae",
"assets/assets/Camps.geojson": "ab9813ab5ca1bf58bb571440ec5edc06",
"assets/assets/KPR.svg": "36a2ad74d4133532d672f08066458352",
"assets/assets/icons/tree.svg": "a64a5421522c58a811991d921d845b8f",
"assets/assets/KPR_roads.geojson": "15db746ca6531e390dc09b7401888720",
"assets/assets/KPR_POI.geojson": "a5ed803d7f2aa48f3d43e5d31aca7a26",
"canvaskit/skwasm.js": "8060d46e9a4901ca9991edd3a26be4f0",
"canvaskit/skwasm_heavy.js": "740d43a6b8240ef9e23eed8c48840da4",
"canvaskit/skwasm.js.symbols": "3a4aadf4e8141f284bd524976b1d6bdc",
"canvaskit/canvaskit.js.symbols": "a3c9f77715b642d0437d9c275caba91e",
"canvaskit/skwasm_heavy.js.symbols": "0755b4fb399918388d71b59ad390b055",
"canvaskit/skwasm.wasm": "7e5f3afdd3b0747a1fd4517cea239898",
"canvaskit/chromium/canvaskit.js.symbols": "e2d09f0e434bc118bf67dae526737d07",
"canvaskit/chromium/canvaskit.js": "a80c765aaa8af8645c9fb1aae53f9abf",
"canvaskit/chromium/canvaskit.wasm": "a726e3f75a84fcdf495a15817c63a35d",
"canvaskit/canvaskit.js": "8331fe38e66b3a898c4f37648aaf7ee2",
"canvaskit/canvaskit.wasm": "9b6a7830bf26959b200594729d73538e",
"canvaskit/skwasm_heavy.wasm": "b0be7910760d205ea4e011458df6ee01"};
// The application shell files that are downloaded before a service worker can
// start.
const CORE = ["main.dart.js",
"index.html",
"flutter_bootstrap.js",
"assets/AssetManifest.bin.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return addAllResilient(cache, CORE);
    })
  );
});
// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');
      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        // Claim client to enable caching on first launch
        self.clients.claim();
        return;
      }
      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key.startsWith('KPR_PWA_TEST/')) key = key.substring(13);
      if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      // Claim client to enable caching on first launch
      self.clients.claim();
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});
// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Cache OSM tiles for offline use (network-first when online; cache when offline)
  if (event.request.url.startsWith('https://tile.openstreetmap.org/')) {
    event.respondWith(
      caches.open('osm-tiles').then(function(cache) {
        return fetch(event.request).then(function(response) {
          if (response && response.ok) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(function() {
          return cache.match(event.request).then(function(cached) {
            if (cached) return cached;
            return new Response('', { status: 503, statusText: 'Offline — map tile not cached yet' });
          });
        });
      })
    );
    return;
  }

  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  const BASE_PATH = 'KPR_PWA_TEST';
  // Normalize key for base path deployment (Flutter RESOURCES use paths without base)
  if (key.startsWith(BASE_PATH + '/')) {
    key = key.substring(BASE_PATH.length + 1);
  }
  // Redirect URLs to the index.html
  if (key.indexOf('?v=') != -1) {
    key = key.split('?v=')[0];
  }
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#') || key == '') {
    key = '/';
  }
  // If the URL is not the RESOURCE list then return to signal that the
  // browser should take over.
  if (!RESOURCES[key]) {
    return;
  }
  // If the URL is the index.html, perform an online-first request.
  if (key == '/') {
    // Serve app shell from cache instantly — never block on network for the HTML.
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(event.request).then(function(cached) {
          if (cached) {
            // Refresh cache in background when online.
            if (navigator.onLine !== false) {
              fetch(event.request).then(function(res) {
                if (res && res.ok) cache.put(event.request, res.clone());
              }).catch(function(){});
            }
            return cached;
          }
          // Nothing in cache yet — go to network.
          return fetch(event.request).then(function(res) {
            if (res && res.ok) cache.put(event.request, res.clone());
            return res;
          });
        });
      })
    );
    return;
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache only if the resource was successfully fetched.
        return response || fetch(event.request).then((response) => {
          if (response && Boolean(response.ok)) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    })
  );
});

function lon2tile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}
function lat2tile(lat, zoom) {
  var latRad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));
}
async function precacheConcessionTiles() {
  var cache = await caches.open('osm-tiles');
  var minLat = -19.25, maxLat = -18.65, minLon = 23.45, maxLon = 23.95;
  for (var z = 10; z <= 13; z++) {
    var xMin = lon2tile(minLon, z), xMax = lon2tile(maxLon, z);
    var yMin = lat2tile(maxLat, z), yMax = lat2tile(minLat, z);
    for (var x = xMin; x <= xMax; x++) {
      for (var y = yMin; y <= yMax; y++) {
        var url = 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
        try {
          var existing = await cache.match(url);
          if (existing) continue;
          var res = await fetch(url);
          if (res && res.ok) await cache.put(url, res);
        } catch (e) { /* skip failed tile */ }
      }
    }
  }
}


async function addAllResilient(cache, resourceKeys) {
  var origin = self.location.origin;
  var basePath = 'KPR_PWA_TEST';
  await Promise.all(resourceKeys.map(async function(key) {
    var url = origin + '/' + basePath + '/' + key;
    try {
      var response = await fetch(url, { cache: 'reload' });
      if (response && response.ok) {
        await cache.put(url, response);
      }
    } catch (e) {
      console.warn('SW precache skipped:', key, e);
    }
  }));
}

self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'downloadOffline' || (event.data && event.data.type === 'downloadOffline')) {
    downloadOffline();
    return;
  }
  if (event.data === 'precacheConcessionTiles' || (event.data && event.data.type === 'precacheConcessionTiles')) {
    event.waitUntil(precacheConcessionTiles());
    return;
  }
});
// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var origin = self.location.origin;
  var basePath = 'KPR_PWA_TEST';
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key.startsWith(basePath + '/')) key = key.substring(basePath.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey of Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return addAllResilient(contentCache, resources);
}
// Attempt to download the resource online before falling back to
// the offline cache.
function onlineFirst(event) {
  return event.respondWith(
    fetch(event.request).then((response) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch((error) => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response != null) {
            return response;
          }
          throw error;
        });
      });
    })
  );
}
