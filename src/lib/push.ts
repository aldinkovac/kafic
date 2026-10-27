import { supabase } from "./supabase";

// Obavještenja na telefon/računar (web push) i instalacija sajta kao aplikacije.

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isInstalled() {
  return matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function keyBytes(base64: string) {
  const s = atob((base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

export async function pushState(): Promise<PushState> {
  if (!VAPID_PUBLIC_KEY) return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return isIOS() && !isInstalled() ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

export async function startPush(userId: string): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON();
  const { error } = await supabase().from("push_subscriptions").upsert({
    endpoint: sub.endpoint, user_id: userId, p256dh: json.keys?.p256dh, auth: json.keys?.auth,
  });
  if (error) throw error;
  return "on";
}

// Na odjavi i kad korisnik isključi: ovaj uređaj više ne dobija obavještenja.
export async function stopPush() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await supabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  } catch {
    // Ništa: odjava mora proći i ako ovo ne uspije.
  }
}
