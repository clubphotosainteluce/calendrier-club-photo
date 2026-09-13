// public/app.js
const btn = document.getElementById("subscribeBtn");
const status = document.getElementById("status");

function setStatus(msg) {
  status.textContent = msg;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function subscribe() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    setStatus("Les notifications ne sont pas supportées sur ce navigateur.");
    return;
  }

  btn.disabled = true;
  setStatus("Activation en cours...");

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("Notifications refusées. Tu peux les réactiver dans les réglages.");
      btn.disabled = false;
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");

    const { publicKey } = await fetch("/api/vapid-public-key").then((r) => r.json());

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    setStatus("✅ Notifications activées ! Tu recevras une alerte 2 jours avant chaque événement.");
  } catch (err) {
    console.error(err);
    setStatus("Une erreur est survenue : " + err.message);
    btn.disabled = false;
  }
}

btn.addEventListener("click", subscribe);
