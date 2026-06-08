"use client";
import { useEffect, useState } from "react";

type Perm = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function NotificationsButton() {
  const [perm, setPerm] = useState<Perm>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPerm("unsupported"); return;
    }
    setPerm(Notification.permission as Perm);
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function enable() {
    if (!publicKey) { setMsg("Brak klucza VAPID na serwerze."); return; }
    setWorking(true); setMsg(null);
    try {
      const result = await Notification.requestPermission();
      setPerm(result as Perm);
      if (result !== "granted") { setWorking(false); return; }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setSubscribed(true);
      setMsg("✅ Powiadomienia włączone");
    } catch (e) {
      setMsg("Coś poszło nie tak. Spróbuj ponownie.");
    } finally {
      setWorking(false);
    }
  }

  async function disable() {
    setWorking(true); setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg("Powiadomienia wyłączone.");
    } finally { setWorking(false); }
  }

  async function test() {
    setWorking(true); setMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const json = await res.json();
      setMsg(json.sent > 0 ? "📨 Wysłano test" : "Brak aktywnej subskrypcji");
    } finally { setWorking(false); }
  }

  if (perm === "unsupported") {
    return <div className="text-xs text-app-subtle">Twoja przeglądarka nie wspiera powiadomień push.</div>;
  }
  if (perm === "denied") {
    return <div className="text-xs text-app-subtle">Powiadomienia zablokowane w przeglądarce. Odblokuj w ustawieniach strony.</div>;
  }

  return (
    <div className="space-y-2">
      {!subscribed ? (
        <button onClick={enable} disabled={working} type="button" className="btn-ghost w-full text-sm disabled:opacity-50">
          {working ? "Włączam..." : "🔔 Włącz powiadomienia"}
        </button>
      ) : (
        <>
          <div className="flex gap-2">
            <button onClick={test} disabled={working} type="button" className="btn-ghost flex-1 text-sm">
              🧪 Test
            </button>
            <button onClick={disable} disabled={working} type="button" className="btn-ghost flex-1 text-sm">
              🔕 Wyłącz
            </button>
          </div>
          <div className="text-xs text-wc-green">🔔 Powiadomienia aktywne</div>
        </>
      )}
      {msg && <div className="text-xs text-app-muted">{msg}</div>}
    </div>
  );
}
