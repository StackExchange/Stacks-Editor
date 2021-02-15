/// <reference lib="webworker" />
// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-vars
interface Window extends ServiceWorkerGlobalScope {}

self.addEventListener("activate", function () {
    void self.clients.claim();
});

const images: { [key: number]: File } = {};

// when the site loads an image, it'll post a message to us so we can serve it back later
self.addEventListener("message", function (event) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    images[event.data.id] = event.data.content;
});

// if a requested url is our local image hack, intercept it and serve a stored image instead
self.addEventListener("fetch", function (event: FetchEvent) {
    const match = /^https:\/\/images\.local\/(\d+?)$/.exec(event.request.url);
    if (match) {
        const file = images[+match[1]];
        if (file) {
            const response = new Response(file, { status: 200 });
            event.respondWith(response);
        }
    }
});
