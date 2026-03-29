/* ================================================
   잘잘못 — Service Worker v4.0.0
   전략: 캐시 완전 비활성화 (항상 네트워크)
   ================================================ */

const CACHE_NAME = 'jjj-v4.0.0';

// ===== INSTALL: 캐시 아무것도 저장 안 함 =====
self.addEventListener('install', event => {
  self.skipWaiting();
});

// ===== ACTIVATE: 존재하는 모든 캐시 전부 삭제 =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => {
        console.log('[SW] 캐시 삭제:', k);
        return caches.delete(k);
      })))
      .then(() => self.clients.claim())
  );
});

// ===== FETCH: 항상 네트워크 (캐시 절대 사용 안 함) =====
self.addEventListener('fetch', event => {
  // API 요청(tables/)은 절대 캐시하지 않음
  if (event.request.url.includes('/tables/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  // 나머지도 네트워크 우선
  event.respondWith(
    fetch(event.request).catch(() => new Response('오프라인 상태입니다.', { status: 503 }))
  );
});
