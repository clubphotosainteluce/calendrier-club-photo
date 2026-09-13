// generate-vapid-keys.js
// Génère une paire de clés VAPID (clé publique / clé privée), au même
// format que la fonction webpush.generateVAPIDKeys() de la librairie
// "web-push". Ces clés servent à prouver au navigateur/à Apple que les
// notifications envoyées viennent bien de ton serveur.
//
// La clé PUBLIQUE va dans la page web (visible de tous, ce n'est pas grave).
// La clé PRIVÉE reste uniquement sur le serveur, ne jamais la partager.

const { generateKeyPairSync } = require("crypto");

function base64url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});

const publicJwk = publicKey.export({ format: "jwk" });
const privateJwk = privateKey.export({ format: "jwk" });

// Point public non compressé : 0x04 + x (32 octets) + y (32 octets)
const x = Buffer.from(publicJwk.x, "base64");
const y = Buffer.from(publicJwk.y, "base64");
const rawPublicKey = Buffer.concat([Buffer.from([0x04]), x, y]);

const vapidPublicKey = base64url(rawPublicKey);
const vapidPrivateKey = base64url(Buffer.from(privateJwk.d, "base64"));

console.log("VAPID_PUBLIC_KEY=" + vapidPublicKey);
console.log("VAPID_PRIVATE_KEY=" + vapidPrivateKey);
