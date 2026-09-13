// check-calendar.js
// À exécuter une fois par jour (ex. 2h00 du matin) par un déclencheur
// planifié (cron / GitHub Actions / cron-job.org...).
//
// 1. Récupère la page du calendrier du mois en cours ET du mois suivant
//    (pour ne jamais rater un événement à cheval sur un changement de mois).
// 2. Cherche les événements qui tombent exactement dans 2 jours.
// 3. S'il y en a : envoie une notification. Sinon : ne fait rien.

const {
  stripHtmlKeepLinks,
  extractEvents,
  getCalendarUrl,
  getEventsInDays,
  excludeVacances,
} = require("./parseCalendar");
const { sendNotificationToAll } = require("./sendNotifications");

const DAYS_AHEAD = 4;

async function fetchEvents(year, month) {
  const url = getCalendarUrl(year, month);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Impossible de récupérer ${url} (${res.status})`);
    return [];
  }
  const html = await res.text();
  const text = stripHtmlKeepLinks(html);
  return extractEvents(text);
}

async function runCheck() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mois à vérifier : celui d'aujourd'hui + celui de "aujourd'hui + 2 jours"
  // (utile en fin de mois, quand l'événement dans 2 jours tombe le mois suivant)
  const in2Days = new Date(today);
  in2Days.setDate(in2Days.getDate() + DAYS_AHEAD);

  const monthsToCheck = new Set([
    `${today.getFullYear()}-${today.getMonth() + 1}`,
    `${in2Days.getFullYear()}-${in2Days.getMonth() + 1}`,
  ]);

  let allEvents = [];
  for (const key of monthsToCheck) {
    const [year, month] = key.split("-").map(Number);
    const events = await fetchEvents(year, month);
    allEvents = allEvents.concat(events);
  }

  const matches = excludeVacances(getEventsInDays(allEvents, today, DAYS_AHEAD));

  if (matches.length === 0) {
    const msg = `Aucun événement le ${in2Days.toLocaleDateString("fr-FR")}. Rien à envoyer.`;
    console.log(msg);
    return { sent: 0, message: msg };
  }

  for (const event of matches) {
    const message = `${event.title} — le ${event.rawDate}${
      event.time ? " " + event.time : ""
    }`;
    console.log("Notification à envoyer :", message);
    await sendNotificationToAll(
      "Calendrier Photo Club",
      message,
      event.url || "http://clubphotoluceen.wifeo.com/service-calendrier.html"
    );
  }

  return { sent: matches.length, events: matches.map((e) => e.title) };
}

module.exports = { runCheck };

// Permet aussi de lancer ce fichier directement en ligne de commande
// (ex. npm run check), en plus de l'utiliser comme module depuis server.js.
if (require.main === module) {
  runCheck().catch((err) => {
    console.error("Erreur lors de la vérification du calendrier :", err);
    process.exit(1);
  });
}
