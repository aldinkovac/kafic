import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Baza (008_neprocitano_obavjestenja.sql) javi ovdje kad stigne poruka ili zahtjev za chat.
// U obavještenju nikad ne pišemo ime ni tekst poruke, jer telefon može vidjeti neko drugi.

export const runtime = "nodejs";

const TEXT = {
  private_messages: { body: "Imaš novu poruku ☕", url: "/poruke" },
  chat_requests: { body: "Neko te zove na kafu (privatni chat) ☕", url: "/poruke" },
} as const;

type Kind = keyof typeof TEXT;
type Sub = { endpoint: string; p256dh: string; auth: string };

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!url || !key || !vapidPublic || !vapidPrivate) return Response.json({ ok: false, reason: "not configured" });

  const { kind, id } = (await req.json().catch(() => ({}))) as { kind?: string; id?: number };
  if (!(kind === "private_messages" || kind === "chat_requests") || !Number.isInteger(id)) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const recent = new Date(Date.now() - 5 * 60_000).toISOString();

  // Označi kao poslano. Ako je već poslano ili je staro, ne radi ništa (zato ovu adresu niko ne može zloupotrijebiti).
  const { data: row } = await sb.from(kind).update({ pushed_at: new Date().toISOString() })
    .eq("id", id).is("pushed_at", null).gt("created_at", recent)
    .select("*").maybeSingle();
  if (!row) return Response.json({ ok: true, sent: 0 });

  let recipient: string;
  if (kind === "private_messages") {
    const { data: r } = await sb.from("chat_requests").select("from_user, to_user").eq("id", row.request_id).single();
    if (!r) return Response.json({ ok: true, sent: 0 });
    recipient = r.from_user === row.sender ? r.to_user : r.from_user;
    // Najviše jedno obavještenje u 10 minuta po chatu.
    const { count } = await sb.from("private_messages").select("id", { count: "exact", head: true })
      .eq("request_id", row.request_id).neq("id", id)
      .gt("pushed_at", new Date(Date.now() - 10 * 60_000).toISOString());
    if (count) return Response.json({ ok: true, sent: 0 });
  } else {
    recipient = row.to_user;
  }

  const { data: subs } = await sb.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", recipient);
  webpush.setVapidDetails("https://kafic.vercel.app", vapidPublic, vapidPrivate);
  const payload = JSON.stringify({ title: "Kafić", ...TEXT[kind as Kind] });

  let sent = 0;
  await Promise.all(((subs ?? []) as Sub[]).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }));
  return Response.json({ ok: true, sent });
}
