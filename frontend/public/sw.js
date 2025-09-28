/* Service worker for push notifications */
self.addEventListener('push', function(event) {
  console.log('[sw] push event received', event)
  let data = { title: 'Notification', body: '' };
  if (event.data) {
    try {
      data = event.data.json();
      console.log('[sw] parsed push data JSON', data)
    } catch (e) {
      data.body = event.data.text();
      console.log('[sw] push event data text', data.body)
    }
  } else {
    console.log('[sw] push event had no data')
  }

  const title = data.title || 'Notification'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon.png',
    data: data
  }

  // Show a system notification with provided title/body
  event.waitUntil(
    (async () => {
      console.log('[sw] showing notification', title, options)
      await self.registration.showNotification(title, options)
    })()
  )
})

self.addEventListener('notificationclick', function(event) {
  console.log('[sw] notificationclick', event.notification && event.notification.data)
  event.notification.close()
  event.waitUntil(clients.matchAll({ type: 'window' }).then(windowClients => {
    for (let client of windowClients) {
      if (client.url && 'focus' in client) return client.focus()
    }
    if (clients.openWindow) return clients.openWindow('/')
  }))
})
