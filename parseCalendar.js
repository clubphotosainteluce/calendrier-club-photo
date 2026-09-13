// parseCalendar.js
// Transforme le HTML brut de la page calendrier-{mois}-{annee}.html
// en une liste d'événements exploitables, puis filtre ceux qui tombent
// exactement dans N jours.

/**
 * Nettoie le HTML : retire scripts/styles, remplace les liens
 * "Plus d'informations" par un marqueur [LIEN:url] (pour ne pas les
 * perdre au moment de retirer les balises), puis convertit les balises
 * de bloc en sauts de ligne et retire toutes les balises restantes.
 */
function stripHtmlKeepLinks(html) {
  let text = html;

  // Retirer scripts / styles
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");

  // Conserver les liens "Plus d'informations" sous forme de marqueur
  text = text.replace(
    /<a\s+[^>]*href="([^"]+)"[^>]*>\s*Plus d'informations\s*<\/a>/gi,
    "\n[LIEN:$1]\n"
  );

  // Transformer les balises de bloc courantes en sauts de ligne
  text = text.replace(/<\/(h1|h2|h3|h4|h5|p|div|li|tr|br)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Retirer toutes les balises restantes
  text = text.replace(/<[^>]+>/g, "");

  // Décoder les entités HTML les plus courantes
  const entities = {
    "&amp;": "&",
    "&eacute;": "é",
    "&egrave;": "è",
    "&agrave;": "à",
    "&ccedil;": "ç",
    "&ocirc;": "ô",
    "&ecirc;": "ê",
    "&nbsp;": " ",
    "&#039;": "'",
    "&quot;": '"',
  };
  for (const [entity, char] of Object.entries(entities)) {
    text = text.split(entity).join(char);
  }

  // Réduire les lignes vides multiples
  text = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");

  return text;
}

/**
 * Extrait les événements d'un texte déjà nettoyé (voir stripHtmlKeepLinks).
 * Repère les blocs du type :
 *   Titre de l'événement
 *   Le 5/9/2026 de 9:00 à 13:00
 *   Description (optionnelle)
 *   [LIEN:http://...]
 *
 * Retourne un tableau de { title, date (Date), rawDate, time, description, url }
 */
function extractEvents(text) {
  const lines = text.split("\n");
  const events = [];

  for (let i = 0; i < lines.length; i++) {
    const dateMatch = lines[i].match(
      /^Le (\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*(?:de|à)?\s*([\d:hà\s]+))?$/
    );
    if (!dateMatch) continue;

    const [, day, month, year, timePart] = dateMatch;
    const title = (lines[i - 1] || "").trim();

    // Chercher la description et le lien dans les lignes suivantes
    let description = "";
    let url = "";
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const lienMatch = lines[j].match(/^\[LIEN:(.+)\]$/);
      if (lienMatch) {
        url = lienMatch[1];
        break;
      }
      if (!description) description = lines[j];
    }

    events.push({
      title,
      rawDate: `${day}/${month}/${year}`,
      time: (timePart || "").trim(),
      description,
      url,
      date: new Date(Number(year), Number(month) - 1, Number(day)),
    });
  }

  return events;
}

/**
 * Construit l'URL de la page calendrier pour un mois/une année donnés.
 */
function getCalendarUrl(year, month /* 1-12 */) {
  return `http://clubphotoluceen.wifeo.com/calendrier-${month}-${year}.html`;
}

/**
 * Compare deux dates (ignorant l'heure) : renvoie true si elles tombent
 * le même jour calendaire.
 */
function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Filtre les événements qui tombent exactement `daysAhead` jours
 * après `today`.
 */
function getEventsInDays(events, today, daysAhead) {
  const target = new Date(today);
  target.setDate(target.getDate() + daysAhead);
  return events.filter((e) => isSameDay(e.date, target));
}

/**
 * Retire les événements dont le titre ou la description contient
 * le mot "Vacances" (insensible à la casse) : ces événements ne
 * doivent jamais déclencher de notification.
 */
function excludeVacances(events) {
  return events.filter(
    (e) =>
      !/vacances/i.test(e.title) && !/vacances/i.test(e.description || "")
  );
}

module.exports = {
  stripHtmlKeepLinks,
  extractEvents,
  getCalendarUrl,
  isSameDay,
  getEventsInDays,
  excludeVacances,
};
