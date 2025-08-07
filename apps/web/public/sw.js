// Service Worker for Arketic PWA
const CACHE_NAME = 'arketic-v1'
const STATIC_CACHE = 'arketic-static-v1'
const DYNAMIC_CACHE = 'arketic-dynamic-v1'

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
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
  '/api/compliance'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets...')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE
            })
            .map((cacheName) => {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      })
      .then(() => {
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

  // Handle different types of requests
  if (request.method === 'GET') {
    if (isStaticAsset(request.url)) {
      // Cache-first strategy for static assets
      event.respondWith(cacheFirst(request, STATIC_CACHE))
    } else if (isAPIRequest(request.url)) {
      // Network-first strategy for API requests
      event.respondWith(networkFirst(request, DYNAMIC_CACHE))
    } else if (isPageRequest(request)) {
      // Stale-while-revalidate for pages
      event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE))
    }
  }
})

// Caching strategies
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('Cache-first strategy failed:', error)
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('Network failed, trying cache:', error)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  // Fetch in background to update cache
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch(() => {
    // Network failed, but we might have cached response
    return cachedResponse
  })

  // Return cached response immediately if available
  return cachedResponse || fetchPromise
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