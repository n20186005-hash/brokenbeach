// Retire the legacy offline page shell so errors and consent retain current network behaviour.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>/broken|bb-/i.test(k)).map(k=>caches.delete(k)))).then(()=>self.registration.unregister())));
