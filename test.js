const assert = require("assert");
const {
  stripHtmlKeepLinks,
  extractEvents,
  getCalendarUrl,
  getEventsInDays,
  excludeVacances,
} = require("./parseCalendar");

// Exemple de HTML reconstitué (structure plausible : h3 = titre, h4 = date,
// p = description, a = lien "Plus d'informations"), basé sur le contenu
// réel observé sur clubphotoluceen.wifeo.com pour septembre 2026.
const sampleHtml = `
<div class="event">
  <h3>Journée association Club</h3>
  <h4>Le 5/9/2026 de 9:00 à 13:00</h4>
  <p>Inscription des nouveaux - Ligéria</p>
  <a href="http://clubphotoluceen.wifeo.com/calendrier-113253.html">Plus d'informations</a>
</div>
<div class="event">
  <h3>Sortie festival photos la Gacilly Sortie</h3>
  <h4>Le 13/9/2026 à 8:19</h4>
  <a href="http://clubphotoluceen.wifeo.com/calendrier-113685.html">Plus d'informations</a>
</div>
<div class="event">
  <h3>Réunion de rentrée Club</h3>
  <h4>Le 10/9/2026 à 20:00</h4>
  <p>Réunion de rentrée : présentation des nouveaux</p>
  <a href="http://clubphotoluceen.wifeo.com/calendrier-113249.html">Plus d'informations</a>
</div>
`;

// --- Test 1 : extraction ---
const text = stripHtmlKeepLinks(sampleHtml);
const events = extractEvents(text);

assert.strictEqual(events.length, 3, "3 événements attendus");
assert.strictEqual(events[0].title, "Journée association Club");
assert.strictEqual(events[0].rawDate, "5/9/2026");
assert.strictEqual(
  events[0].url,
  "http://clubphotoluceen.wifeo.com/calendrier-113253.html"
);
console.log("✅ Extraction des événements OK :", events);

// --- Test 2 : aucun événement dans 2 jours (silence attendu) ---
const today1 = new Date(2026, 8, 13); // 13/9/2026
const inTwoDays1 = getEventsInDays(events, today1, 2); // -> 15/9/2026
assert.strictEqual(
  inTwoDays1.length,
  0,
  "aucun événement le 15/9 => pas de notification"
);
console.log("✅ Cas silencieux OK (aucun événement dans 2 jours)");

// --- Test 3 : un événement exactement dans 2 jours (notification attendue) ---
const today2 = new Date(2026, 8, 11); // 11/9/2026
const inTwoDays2 = getEventsInDays(events, today2, 2); // -> 13/9/2026
assert.strictEqual(inTwoDays2.length, 1, "1 événement le 13/9 attendu");
assert.strictEqual(inTwoDays2[0].title, "Sortie festival photos la Gacilly Sortie");
console.log("✅ Cas notification OK :", inTwoDays2[0].title);

// --- Test 4 : construction de l'URL, y compris changement de mois ---
assert.strictEqual(
  getCalendarUrl(2026, 9),
  "http://clubphotoluceen.wifeo.com/calendrier-9-2026.html"
);
console.log("✅ Construction d'URL OK");

// --- Test 5 : un événement "Vacances" ne doit jamais déclencher de notification ---
const eventsWithVacances = [
  ...events,
  {
    title: "Vacances de la Toussaint",
    rawDate: "13/9/2026",
    time: "",
    description: "Le club est fermé",
    url: "",
    date: new Date(2026, 8, 13),
  },
];
const today3 = new Date(2026, 8, 11); // 11/9/2026 -> cible le 13/9
const inTwoDays3 = excludeVacances(
  getEventsInDays(eventsWithVacances, today3, 2)
);
assert.strictEqual(
  inTwoDays3.length,
  1,
  "seul l'événement non-Vacances doit rester"
);
assert.strictEqual(inTwoDays3[0].title, "Sortie festival photos la Gacilly Sortie");
console.log("✅ Filtre \"Vacances\" OK (aucune notification pour ces événements)");

console.log("\nTous les tests sont passés 🎉");
