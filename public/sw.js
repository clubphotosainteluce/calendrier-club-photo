// sw.js
// Ce fichier tourne en arrière-plan, géré par le système (pas par ton code),
// et se réveille uniquement quand une notification push arrive.

self.addEventListener("push", (event) => {
  let data = { title: "Calendrier Photo Club", body: "Nouvel événement à venir" };
  try {
    data = event.data.json();
  } catch (e) {
    // ignore, on garde les valeurs par défaut
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.png",
      data: { url: data.url || "/" },
    })
  );
});

// Ouvre le lien de l'événement quand l'utilisateur tape sur la notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
});
