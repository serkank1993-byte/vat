"use client";

import { supabase } from "@/lib/supabase";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Takımın bildirim açmış oyuncularına push bildirimi gönderir.
 * Yalnızca ilgili takımın kaptanı/yöneticisi çağırabilir (yetki sunucuda kontrol edilir).
 * Sessizce başarısız olabilir (ör. hiç abone yoksa) — hata döndürür ama akışı bozmaz.
 */
export async function notifyTeam(
  teamId: number,
  title: string,
  body: string,
  url = "/",
): Promise<{ ok: boolean; sent?: number; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: "Oturum yok." };
    const res = await fetch("/api/send-team-notification", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ teamId, title, body, url }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: payload?.error ?? `Hata ${res.status}` };
    return { ok: true, sent: payload?.sent ?? 0 };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getPushSubscriptionState(): Promise<"subscribed" | "unsubscribed" | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  return existing ? "subscribed" : "unsubscribed";
}

export async function subscribeToPush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "Bu cihaz/tarayıcı bildirimleri desteklemiyor." };

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { ok: false, error: "Bildirim servisi yapılandırılmamış." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Bildirim izni verilmedi." };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "Giriş yapmalısın." };

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: "Bildirim aboneliği oluşturulamadı." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: session.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
