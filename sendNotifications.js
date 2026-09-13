// sendNotifications.js
// Nécessite le paquet "web-push" (à installer sur ton serveur avec :
// npm install web-push — impossible à faire ici, sandbox sans accès réseau).
//
// Variables d'environnement attendues :
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  (générées par generate-vapid-keys.js)
//   VAPID_CONTACT_EMAIL                  (ex. "mailto:toncontact@example.com")

const fs = require("fs");
const path = require("path");

const SUBSCRIPTIONS_FILE = path.join(__dirname, "subscriptions.json");

function loadSubscriptions() {
  if (!fs.existsSync(SUBSCRIPTIONS_FILE)) return [];
  return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, "utf8"));
}

function removeSubscription(endpoint) {
  const subs = loadSubscriptions().filter((s) => s.endpoint !== endpoint);
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2));
}

async function sendNotificationToAll(title, body, url) {
  const webpush = require("web-push"); // installé sur le serveur réel

  webpush.setVapidDetails(
    process.env.VAPID_CONTACT_EMAIL || "mailto:contact@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const subscriptions = loadSubscriptions();
  const payload = JSON.stringify({ title, body, url });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err) {
        // 410/404 = l'utilisateur s'est désabonné ou a désinstallé :
        // on nettoie automatiquement la liste.
        if (err.statusCode === 410 || err.statusCode === 404) {
          removeSubscription(sub.endpoint);
        } else {
          console.error("Échec d'envoi à un abonné :", err.message);
        }
      }
    })
  );
}

module.exports = { sendNotificationToAll };
