/**
 * service-worker.ts -- Service worker for the flashcard PWA.
 *
 * Implements a multi-strategy caching approach optimised for a study
 * application that must work reliably offline:
 *
 *   - **Cache-first** for static assets (JS, CSS, images, fonts).
 *     These change only on deployment, so serving from cache gives
 *     near-instant load times with a background refresh.
 *
 *   - **Network-first** for API calls. The freshest data is always
 *     preferred, but cached responses are used as a fallback when
 *     the device is offline.
 *
 *   - **Offline fallback** page. If both cache and network fail for
 *     navigation requests, a pre-cached offline page is served.
 *
 *   - **Background sync** for review submissions. When a user reviews
 *     cards while offline, the review actions are queued and replayed
 *     to the server when connectivity is restored.
 *
 * This file is written as a standard service worker script. It uses
 * the Service Worker API directly (no Workbox dependency) to keep
 * the bundle size minimal and give full control over caching logic.
 */

/// <reference lib="webworker" />

// Cast self to ServiceWorkerGlobalScope for proper typing
declare const self: ServiceWorkerGlobalScope;

// ---------------------------------------------------------------------------
// Cache Names
// ---------------------------------------------------------------------------

/** Version-stamped cache name for static assets. */
const STATIC_CACHE = 'flashcard-static-v1';

/** Cache for API responses. */
const API_CACHE = 'flashcard-api-v1';

/** Cache for the offline fallback page. */
const OFFLINE_CACHE = 'flashcard-offline-v1';

/** All cache names managed by this service worker. */
const ALL_CACHES = [STATIC_CACHE, API_CACHE, OFFLINE_CACHE];

// ---------------------------------------------------------------------------
// Pre-cached Resources
// ---------------------------------------------------------------------------

/**
 * Static resources to pre-cache during installation.
 *
 * These are loaded into the static cache immediately so the app shell
 * is available offline from the first visit.
 */
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
];

/**
 * URL patterns that should use cache-first strategy.
 * Matched against the request URL pathname.
 */
const STATIC_ASSET_PATTERNS = [
  /\/_next\/static\//,     // Next.js static assets
  /\/static\//,            // Custom static files
  /\.(?:js|css|woff2?|ttf|eot|ico|svg|png|jpg|jpeg|webp|avif|gif)$/,
];

/**
 * URL patterns that identify API requests (network-first strategy).
 */
const API_PATTERNS = [
  /\/api\//,
  /\/trpc\//,
];

/**
 * API paths that should be synced in the background when offline.
 * These are typically write operations (POST/PUT/DELETE).
 */
const SYNC_API_PATTERNS = [
  /\/api\/reviews/,
  /\/api\/cards/,
  /\/api\/sync/,
];

// ---------------------------------------------------------------------------
// Background Sync Queue
// ---------------------------------------------------------------------------

/**
 * Tag used for the Background Sync API registration.
 */
const SYNC_TAG = 'flashcard-review-sync';

/**
 * In-memory queue of requests to replay when online.
 * These are serialised to IndexedDB via the offline queue service.
 */
interface QueuedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Install Event
// ---------------------------------------------------------------------------

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // Pre-cache the app shell and offline fallback
      const staticCache = await caches.open(STATIC_CACHE);
      await staticCache.addAll(PRECACHE_URLS);

      // Create the offline fallback cache
      const offlineCache = await caches.open(OFFLINE_CACHE);
      await offlineCache.add('/offline');

      // Skip waiting so the new service worker activates immediately
      // (when triggered by the SKIP_WAITING message from usePWA)
      // We do NOT auto-skip; activation is controlled by the app
    })(),
  );
});

// ---------------------------------------------------------------------------
// Activate Event
// ---------------------------------------------------------------------------

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches from previous versions
      const cacheNames = await caches.keys();
      const staleNames = cacheNames.filter(
        (name) => !ALL_CACHES.includes(name),
      );

      await Promise.all(staleNames.map((name) => caches.delete(name)));

      // Take control of all open clients immediately
      await self.clients.claim();
    })(),
  );
});

// ---------------------------------------------------------------------------
// Fetch Event
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle requests from our own origin
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation requests: try network, fall back to cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // API requests: network-first with cache fallback
  if (isAPIRequest(url)) {
    // Write operations: queue for background sync if offline
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      event.respondWith(handleMutationRequest(request));
      return;
    }

    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Static assets: cache-first with network fallback
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

// ---------------------------------------------------------------------------
// Message Event
// ---------------------------------------------------------------------------

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ---------------------------------------------------------------------------
// Background Sync Event
// ---------------------------------------------------------------------------

self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processBackgroundSync());
  }
});

// ---------------------------------------------------------------------------
// Strategy Handlers
// ---------------------------------------------------------------------------

/**
 * Handle navigation requests with a network-first strategy.
 *
 * Falls back to the cached version of the page, and ultimately to
 * the offline fallback page if nothing is available.
 */
async function handleNavigationRequest(request: Request): Promise<Response> {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache the response for future offline use
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // Network failed; try the cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Nothing in cache; serve the offline fallback
    const offlineResponse = await caches.match('/offline');
    if (offlineResponse) {
      return offlineResponse;
    }

    // Absolute last resort
    return new Response('Offline - Please check your connection', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Handle static asset requests with a cache-first strategy.
 *
 * Static assets rarely change, so serving from cache is optimal.
 * On cache miss, the response is fetched from the network and cached.
 */
async function handleStaticRequest(request: Request): Promise<Response> {
  // Check cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Optionally refresh the cache in the background (stale-while-revalidate)
    refreshCacheInBackground(request);
    return cachedResponse;
  }

  // Cache miss: fetch from network
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // If both cache and network fail for a static asset, return 404
    return new Response('Not Found', {
      status: 404,
      statusText: 'Not Found',
    });
  }
}

/**
 * Handle API GET requests with a network-first strategy.
 *
 * API data should be as fresh as possible. The cache serves as a
 * fallback when the device is offline.
 */
async function handleAPIRequest(request: Request): Promise<Response> {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful GET responses
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // Network failed; try the cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // No cached response available
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'You are offline and this data is not cached.',
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

/**
 * Handle API mutation requests (POST, PUT, DELETE).
 *
 * If the network is available, the request is forwarded directly.
 * If offline, the request is queued for background sync and an
 * optimistic response is returned.
 */
async function handleMutationRequest(request: Request): Promise<Response> {
  try {
    // Try the network first
    const networkResponse = await fetch(request.clone());
    return networkResponse;
  } catch {
    // Network is unavailable; queue for background sync
    const shouldSync = SYNC_API_PATTERNS.some((pattern) =>
      pattern.test(new URL(request.url).pathname),
    );

    if (shouldSync) {
      await queueForSync(request);

      // Register for background sync
      const reg = await self.registration;
      if ('sync' in reg) {
        try {
          await (reg as ServiceWorkerRegistration & {
            sync: { register(tag: string): Promise<void> };
          }).sync.register(SYNC_TAG);
        } catch {
          // Background Sync API not supported; will retry on next online event
        }
      }

      // Return an optimistic response
      return new Response(
        JSON.stringify({
          queued: true,
          message: 'Your action has been saved and will sync when online.',
        }),
        {
          status: 202,
          statusText: 'Accepted',
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Non-syncable mutation while offline
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'This action requires an internet connection.',
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Background Sync Helpers
// ---------------------------------------------------------------------------

/**
 * Queue a failed request for later replay via background sync.
 *
 * The request is serialised and stored in the service worker's
 * IDB-backed queue (via the Broadcast Channel to the main thread)
 * or in a simple in-memory queue for this worker's lifetime.
 */
async function queueForSync(request: Request): Promise<void> {
  const body = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const queuedRequest: QueuedRequest = {
    url: request.url,
    method: request.method,
    headers,
    body: body || null,
    timestamp: Date.now(),
  };

  // Store in IndexedDB for persistence
  await storeInIDB(queuedRequest);

  // Notify the main thread that a request was queued
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({
      type: 'SYNC_QUEUED',
      payload: {
        url: queuedRequest.url,
        method: queuedRequest.method,
        timestamp: queuedRequest.timestamp,
      },
    });
  }
}

/**
 * Process all queued requests during a background sync event.
 */
async function processBackgroundSync(): Promise<void> {
  const queue = await getQueueFromIDB();

  const failed: QueuedRequest[] = [];

  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });

      if (!response.ok && response.status >= 500) {
        // Server error; keep in queue for retry
        failed.push(item);
      }
      // 4xx errors are not retried (client error)
    } catch {
      // Network still unavailable; keep in queue
      failed.push(item);
    }
  }

  // Replace the queue with only the failed items
  await replaceQueueInIDB(failed);

  // Notify the main thread of sync completion
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      payload: {
        processed: queue.length - failed.length,
        remaining: failed.length,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// IndexedDB Helpers (for sync queue persistence)
// ---------------------------------------------------------------------------

const IDB_NAME = 'flashcard-sw-queue';
const IDB_STORE = 'sync-queue';
const IDB_VERSION = 1;

/**
 * Open the service worker's IndexedDB database.
 */
function openSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, {
          keyPath: 'timestamp',
        });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = () => {
      reject(new Error(`Failed to open sync DB: ${request.error?.message}`));
    };
  });
}

/**
 * Store a queued request in IndexedDB.
 */
async function storeInIDB(item: QueuedRequest): Promise<void> {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const request = store.add(item);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(new Error(`Failed to store sync item: ${request.error?.message}`));

    tx.oncomplete = () => db.close();
  });
}

/**
 * Retrieve all queued requests from IndexedDB, ordered by timestamp.
 */
async function getQueueFromIDB(): Promise<QueuedRequest[]> {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const items = (request.result as QueuedRequest[]).sort(
        (a, b) => a.timestamp - b.timestamp,
      );
      resolve(items);
    };

    request.onerror = () =>
      reject(
        new Error(`Failed to read sync queue: ${request.error?.message}`),
      );

    tx.oncomplete = () => db.close();
  });
}

/**
 * Replace the entire sync queue with a new set of items.
 */
async function replaceQueueInIDB(items: QueuedRequest[]): Promise<void> {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);

    // Clear existing items
    store.clear();

    // Add the remaining items
    for (const item of items) {
      store.add(item);
    }

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(new Error(`Failed to replace sync queue: ${tx.error?.message}`));
    };
  });
}

// ---------------------------------------------------------------------------
// Utility Helpers
// ---------------------------------------------------------------------------

/**
 * Check if a URL matches one of the static asset patterns.
 */
function isStaticAsset(url: URL): boolean {
  return STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

/**
 * Check if a URL matches one of the API patterns.
 */
function isAPIRequest(url: URL): boolean {
  return API_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

/**
 * Refresh a cached static asset in the background.
 *
 * This implements a stale-while-revalidate pattern: the cached
 * response is served immediately, and the cache is updated in the
 * background for the next request.
 */
function refreshCacheInBackground(request: Request): void {
  fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, response);
      }
    })
    .catch(() => {
      // Network failure during background refresh is expected when
      // offline; silently ignore.
    });
}

// ---------------------------------------------------------------------------
// SyncEvent type augmentation (not in standard TS lib)
// ---------------------------------------------------------------------------

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

declare global {
  interface ServiceWorkerGlobalScopeEventMap {
    sync: SyncEvent;
  }
}
