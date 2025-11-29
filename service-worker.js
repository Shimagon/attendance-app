// Service Worker for Attendance App PWA
const CACHE_NAME = 'attendance-app-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// インストール時のキャッシュ
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// アクティベーション時の古いキャッシュ削除
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// フェッチイベント - Cache First戦略（静的リソース）、Network First戦略（API）
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API呼び出しの場合はNetwork First
    if (url.pathname.includes('/api/') || request.method !== 'GET') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // オフライン時は何もしない（アプリ側でキューに追加）
                    return new Response(
                        JSON.stringify({ error: 'Network unavailable' }),
                        {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
        return;
    }

    // 静的リソースの場合はCache First
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // キャッシュがある場合は返す
                    return cachedResponse;
                }

                // キャッシュがない場合はネットワークから取得
                return fetch(request)
                    .then((response) => {
                        // レスポンスが有効な場合のみキャッシュ
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // オフライン時でキャッシュもない場合
                        // HTMLページの場合はindex.htmlを返す
                        if (request.headers.get('accept').includes('text/html')) {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// バックグラウンド同期（将来の拡張用）
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered');
    if (event.tag === 'sync-attendance') {
        event.waitUntil(
            // 未送信データの同期処理（アプリ側で実装）
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'SYNC_PENDING_DATA'
                    });
                });
            })
        );
    }
});

// プッシュ通知（将来の拡張用）
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push notification received');
    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification('勤怠管理アプリ', options)
    );
});
