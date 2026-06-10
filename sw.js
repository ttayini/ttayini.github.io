/**
 * GitHub Pages Repository Browser - Service Worker
 * Provides basic offline functionality and caching
 */

const CACHE_NAME = 'github-pages-browser-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/github-pages.css',
  '/github-pages.js'
];

const API_CACHE_NAME = 'github-api-cache-v1';
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle GitHub API requests with caching
  if (url.hostname === 'api.github.com') {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static assets
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              // Don't cache non-successful responses
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clone the response
              const responseToCache = response.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });

              return response;
            })
            .catch(() => {
              // Return offline page or fallback
              return new Response(
                JSON.stringify({
                  error: 'offline',
                  message: 'You are currently offline. Please check your internet connection.'
                }),
                {
                  headers: { 'Content-Type': 'application/json' },
                  status: 503,
                  statusText: 'Service Unavailable'
                }
              );
            });
        })
    );
  }
});

/**
 * Handle GitHub API requests with intelligent caching
 */
async function handleAPIRequest(request) {
  try {
    // Try to get fresh data first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      const responseToCache = networkResponse.clone();
      
      // Add timestamp for cache expiration
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: {
          ...Object.fromEntries(responseToCache.headers),
          'sw-cached-at': Date.now().toString()
        }
      });
      
      await cache.put(request, modifiedResponse);
      return networkResponse;
    }
    
    throw new Error(`HTTP ${networkResponse.status}`);
  } catch (error) {
    console.log('Network request failed, trying cache:', error);
    
    // Try to serve from cache
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      const isExpired = cachedAt && (Date.now() - parseInt(cachedAt) > API_CACHE_DURATION);
      
      if (!isExpired) {
        console.log('Serving from cache');
        return cachedResponse;
      } else {
        console.log('Cache expired, removing entry');
        await cache.delete(request);
      }
    }
    
    // Return error response
    return new Response(
      JSON.stringify({
        error: 'network_error',
        message: 'Unable to fetch repository data. Please check your internet connection.',
        offline: !navigator.onLine
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 503,
        statusText: 'Service Unavailable'
      }
    );
  }
}

// Handle background sync for future enhancement
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'github-data-sync') {
    event.waitUntil(syncGitHubData());
  }
});

/**
 * Background sync for GitHub data
 */
async function syncGitHubData() {
  try {
    // Implementation for background data sync
    console.log('Syncing GitHub data in background...');
    
    // This could refresh cached repository data
    // when the user comes back online
    
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Send message to client
function sendMessageToClient(client, message) {
  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };
    
    client.postMessage(message, [messageChannel.port2]);
  });
}