# Alertes calendrier — Photo Club Lucéen

Prévient les utilisateurs sur leur iPhone quand un événement du calendrier
du club (http://clubphotoluceen.wifeo.com/) tombe dans 2 jours. Ne prévient
jamais pour les événements contenant le mot "Vacances".

## Fichiers

- `parseCalendar.js` — logique pure (parsing, filtre de dates, filtre "Vacances")
- `check-calendar.js` — script à exécuter chaque nuit à 2h00
- `sendNotifications.js` — envoie les notifications à tous les abonnés
- `server.js` — sert la page d'abonnement + enregistre les abonnements
- `public/` — la page web que les utilisateurs ouvrent pour s'abonner
- `generate-vapid-keys.js` — génère les clés nécessaires aux notifications
- `test.js` — tests automatiques (`npm test`)

## Déploiement (étapes)

1. **Créer un compte** sur un hébergeur gratuit qui supporte Node.js et le
   stockage de fichiers persistant, par exemple [Render.com](https://render.com)
   (offre gratuite "Web Service").
2. **Mettre ce dossier sur GitHub** (créer un dépôt, y pousser ces fichiers)
   puis relier ce dépôt à Render.
3. **Installer les dépendances** : Render exécute automatiquement
   `npm install`, ce qui installera `web-push`.
4. **Générer les clés VAPID** une seule fois (déjà fait ci-dessous, tu peux
   les réutiliser ou en regénérer avec `npm run generate-vapid-keys`).
5. **Configurer les variables d'environnement** sur Render :
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_CONTACT_EMAIL` (ex. `mailto:tonadresse@example.com`)
6. **Lancer le serveur web** (`npm start`) — c'est lui qui sert la page
   d'abonnement en continu.
7. **Programmer la vérification quotidienne** : sur Render, ajouter un
   "Cron Job" séparé qui exécute `npm run check` tous les jours à 2h00
   (Render propose ça nativement ; sinon, cron-job.org peut appeler une
   URL déclenchant la vérification).
8. **Partager le lien** de la page (`https://ton-app.onrender.com`) aux
   membres du club : ils l'ouvrent sur iPhone, l'ajoutent à l'écran
   d'accueil (bouton Partager → "Sur l'écran d'accueil"), la rouvrent
   depuis l'écran d'accueil, puis appuient sur "Activer les notifications".

## Clés VAPID déjà générées pour ce projet

```
VAPID_PUBLIC_KEY=BN_o9ublZ7HOq6zTrpFWA60tW7SRqsS6jjXV1_luBM2FlW8PK8u9jJ3Io8C-FiQozZ0q5Uejp0voge3KtsUiFh8
VAPID_PRIVATE_KEY=sfe3KwiuyaA0FPPpxEsrwalftKLYg3M32DozVam0nUU
```

⚠️ La clé **privée** ne doit jamais être publiée ni partagée — mets-la
uniquement dans les variables d'environnement du serveur.

## Point à vérifier une fois en ligne

Le parsing (`parseCalendar.js`) a été testé avec une reconstitution du HTML
du site, mais pas avec le vrai code source de la page (je n'ai pas pu y
accéder directement depuis cet environnement). Une fois hébergé, lance
`npm run check` une fois manuellement et vérifie dans les logs que les
événements sont bien détectés — si ce n'est pas le cas, il suffira
d'ajuster les expressions régulières dans `parseCalendar.js` en fonction
du HTML réel.
