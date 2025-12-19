const CACHE_NAME = "homeskids-v2";

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
    // Basic pass-through fetch for now
    event.respondWith(fetch(event.request));
});

// Handle incoming push notifications
self.addEventListener("push", (event) => {
    if (!event.data) {
        console.log("Push event but no data");
        return;
    }

    let data;
    try {
        data = event.data.json();
    } catch (e) {
        console.error("Failed to parse push data:", e);
        data = {
            title: "homes.kids",
            body: event.data.text(),
        };
    }

    const options = {
        body: data.body || "You have a new notification",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag || "default",
        renotify: data.renotify || false,
        requireInteraction: data.requireInteraction || false,
        data: {
            url: data.url || "/",
            type: data.type || "general",
            payload: data.payload || {},
        },
        actions: data.actions || [],
        vibrate: [100, 50, 100],
    };

    event.waitUntil(
        self.registration.showNotification(data.title || "homes.kids", options)
    );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || "/";

    // Handle action button clicks
    if (event.action) {
        // Custom action handling can be added here
        console.log("Notification action clicked:", event.action);
    }

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window open
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    // Navigate existing window to the URL
                    client.postMessage({
                        type: "NOTIFICATION_CLICK",
                        url: urlToOpen,
                        payload: event.notification.data?.payload,
                    });
                    return client.focus();
                }
            }
            // No window open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Handle notification close (for analytics if needed)
self.addEventListener("notificationclose", (event) => {
    console.log("Notification closed:", event.notification.tag);
});

// Handle push subscription change (e.g., when browser updates keys)
self.addEventListener("pushsubscriptionchange", (event) => {
    console.log("Push subscription changed");
    
    event.waitUntil(
        // Re-subscribe and update server
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: self.VAPID_PUBLIC_KEY,
        }).then((subscription) => {
            // Send new subscription to server
            return fetch("/api/push/subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    oldEndpoint: event.oldSubscription?.endpoint,
                    newSubscription: subscription.toJSON(),
                }),
            });
        })
    );
});
