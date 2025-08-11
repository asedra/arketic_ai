// Service Worker for Arketic PWA with Comprehensive Cache Strategy
const CACHE_VERSION = 'v1.1.0'
const CACHE_NAMES = {
  static: `arketic-static-${CACHE_VERSION}`,
  dynamic: `arketic-dynamic-${CACHE_VERSION}`,
  images: `arketic-images-${CACHE_VERSION}`,
  api: `arketic-api-${CACHE_VERSION}`,
  fonts: `arketic-fonts-${CACHE_VERSION}`
}

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/favicon.ico',
  '/placeholder.svg',
  '/placeholder.jpg',
  '/placeholder-user.jpg',
  '/placeholder-logo.svg',
  '/placeholder-logo.png'
]

// API endpoints to cache with network-first strategy
const API_ENDPOINTS = [
  '/api/people',
  '/api/organization',
  '/api/compliance',
  '/api/auth/me',
  '/api/chat/chats',
  '/api/knowledge/documents'
]

// Cache TTL settings (in milliseconds)
const CACHE_TTL = {
  api: 5 * 60 * 1000,      // 5 minutes for API responses
  images: 7 * 24 * 60 * 60 * 1000, // 7 days for images
  static: 30 * 24 * 60 * 60 * 1000, // 30 days for static assets
  dynamic: 24 * 60 * 60 * 1000 // 24 hours for dynamic content
}

// Install event - cache static assets with versioning
self.addEventListener('install', (event) => {
  console.log(`Service Worker ${CACHE_VERSION} installing...`)
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then((cache) => {
        console.log('Caching static assets...')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('Static assets cached successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error)
      })
  )
})

// Activate event - clean up old caches with version management
self.addEventListener('activate', (event) => {
  console.log(`Service Worker ${CACHE_VERSION} activating...`)
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete caches that don't match current version
              return !Object.values(CACHE_NAMES).includes(cacheName)
            })
            .map((cacheName) => {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      })
      .then(() => {
        console.log('Old caches cleaned up')
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // Handle different types of requests with appropriate strategies and TTL
  if (request.method === 'GET') {
    if (isStaticAsset(request.url)) {
      // Cache-first strategy for static assets with long TTL
      event.respondWith(cacheFirst(request, CACHE_NAMES.static, CACHE_TTL.static))
    } else if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|avif|gif|ico)$/i)) {
      // Images with dedicated cache and TTL
      event.respondWith(cacheFirst(request, CACHE_NAMES.images, CACHE_TTL.images))
    } else if (isAPIRequest(request.url)) {
      // Network-first strategy for API requests with short TTL
      event.respondWith(networkFirst(request, CACHE_NAMES.api, CACHE_TTL.api))
    } else if (isPageRequest(request)) {
      // Stale-while-revalidate for pages with moderate TTL
      event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.dynamic, CACHE_TTL.dynamic))
    } else {
      // Default strategy for other requests
      event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.dynamic, CACHE_TTL.dynamic))
    }
  }
})

// Enhanced caching strategies with TTL
async function cacheFirst(request, cacheName, ttl = null) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      // Check if cache is still valid based on TTL
      if (ttl && isCacheExpired(cachedResponse, ttl)) {
        // Cache expired, try to fetch new version in background
        fetchAndCache(request, cacheName)
      }
      return cachedResponse
    }

    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      const responseWithTimestamp = await addTimestamp(networkResponse.clone())
      cache.put(request, responseWithTimestamp)
    }
    return networkResponse
  } catch (error) {
    console.error('Cache-first strategy failed:', error)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) return cachedResponse
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request, cacheName, ttl = null) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      const responseWithTimestamp = await addTimestamp(networkResponse.clone())
      cache.put(request, responseWithTimestamp)
    }
    return networkResponse
  } catch (error) {
    console.log('Network failed, trying cache:', error)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      // Check if cached response is still valid
      if (!ttl || !isCacheExpired(cachedResponse, ttl)) {
        return cachedResponse
      }
    }
    return new Response(JSON.stringify({ error: 'Offline', timestamp: Date.now() }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function staleWhileRevalidate(request, cacheName, ttl = null) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  // Fetch in background to update cache
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const responseWithTimestamp = await addTimestamp(networkResponse.clone())
      cache.put(request, responseWithTimestamp)
    }
    return networkResponse
  }).catch(() => {
    // Network failed, but we might have cached response
    return cachedResponse
  })

  // Return cached response immediately if available
  if (cachedResponse) {
    // Check if revalidation is needed based on TTL
    if (ttl && isCacheExpired(cachedResponse, ttl)) {
      return fetchPromise // Force fresh fetch if expired
    }
    return cachedResponse
  }
  
  return fetchPromise
}

// Cache helper functions
function isCacheExpired(response, ttl) {
  const dateHeader = response.headers.get('sw-cache-date')
  if (!dateHeader) return true
  
  const cacheTime = new Date(dateHeader).getTime()
  const now = Date.now()
  return (now - cacheTime) > ttl
}

async function addTimestamp(response) {
  const headers = new Headers(response.headers)
  headers.set('sw-cache-date', new Date().toISOString())
  
  const blob = await response.blob()
  return new Response(blob, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  })
}

async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      const responseWithTimestamp = await addTimestamp(response.clone())
      cache.put(request, responseWithTimestamp)
    }
  } catch (error) {
    console.log('Background fetch failed:', error)
  }
}

// Helper functions
function isStaticAsset(url) {
  return url.includes('/static/') ||
         url.includes('/_next/static/') ||
         url.includes('/images/') ||
         url.includes('/favicon.ico') ||
         url.includes('/manifest.json') ||
         url.endsWith('.png') ||
         url.endsWith('.jpg') ||
         url.endsWith('.jpeg') ||
         url.endsWith('.svg') ||
         url.endsWith('.webp') ||
         url.endsWith('.avif')
}

function isAPIRequest(url) {
  return API_ENDPOINTS.some(endpoint => url.includes(endpoint)) ||
         url.includes('/api/')
}

function isPageRequest(request) {
  return request.headers.get('accept')?.includes('text/html')
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered')
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  // Handle offline actions when back online
  try {
    const offlineActions = await getOfflineActions()
    for (const action of offlineActions) {
      await syncAction(action)
    }
    await clearOfflineActions()
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

async function getOfflineActions() {
  // Retrieve offline actions from IndexedDB
  return []
}

async function syncAction(action) {
  // Sync individual action with server
  console.log('Syncing action:', action)
}

async function clearOfflineActions() {
  // Clear synced actions from IndexedDB
  console.log('Cleared offline actions')
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    image: data.image,
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action) {
    // Handle action button clicks
    console.log('Notification action clicked:', event.action)
  } else {
    // Handle notification click
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    )
  }
})

// Cache management message handlers
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting()
  }
  
  if (event.data.action === 'clearCache') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
      }).then(() => {
        console.log('All caches cleared')
      })
    )
  }

  if (event.data.action === 'getCacheStats') {
    event.waitUntil(
      getCacheStats().then(stats => {
        event.ports[0].postMessage(stats)
      })
    )
  }
})

async function getCacheStats() {
  const cacheNames = await caches.keys()
  const stats = {
    version: CACHE_VERSION,
    caches: {}
  }
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    stats.caches[cacheName] = {
      count: keys.length,
      size: 0, // Size calculation would require iterating through responses
      urls: keys.slice(0, 10).map(req => req.url) // Sample of cached URLs
    }
  }
  
  return stats
}