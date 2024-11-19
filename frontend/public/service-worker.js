self.addEventListener('push', (event) => {
    const data = event.data.json();
    console.log('Получено push-уведомление:', data);

    const options = {
        body: data.body,
        icon: '/icon.png',
        data: data.url, // URL для перехода
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data;
    if (url) {
        event.waitUntil(clients.openWindow(url));
    }
});
