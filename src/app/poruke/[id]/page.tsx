"use client";

import { use, useEffect, useRef, useState } from "react";
import { supabase, uniqueChannel, type Profile } from "@/lib/supabase";
import { signedUrls, uploadImage } from "@/lib/photos";
import { RequireProfile } from "@/components/RequireProfile";

type Message = { id: number; sender: string; body: string | null; image_path: string | null; created_at: string };

function PrivateChat({ requestId, me }: { requestId: number; me: Profile }) {
  const sb = supabase();
  const [partner, setPartner] = useState<Profile | null>(null);
  const [partnerPhotos, setPartnerPhotos] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  async function addUrls(paths: (string | null)[]) {
    const fresh = await signedUrls(paths.filter((p): p is string => !!p));
    setUrls((u) => ({ ...u, ...fresh }));
  }

  useEffect(() => {
    (async () => {
      const { data: r } = await sb.from("chat_requests").select("*").eq("id", requestId).single();
      if (!r || r.status !== "accepted") return setError("Ovaj chat ne postoji ili još nije prihvaćen.");
      const partnerId = r.from_user === me.id ? r.to_user : r.from_user;
      const [{ data: p }, { data: photos }, { data }] = await Promise.all([
        sb.from("profiles").select("*").eq("id", partnerId).single(),
        sb.from("profile_photos").select("path").eq("user_id", partnerId).order("created_at"),
        sb.from("private_messages").select("*").eq("request_id", requestId).order("created_at"),
      ]);
      setPartner(p);
      const photoPaths = (photos ?? []).map((x: { path: string }) => x.path);
      setPartnerPhotos(photoPaths);
      const list = (data ?? []) as Message[];
      setMessages(list);
      addUrls([...photoPaths, ...list.map((m) => m.image_path)]);
    })();
    const channel = sb.channel(uniqueChannel(`private-${requestId}`))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages", filter: `request_id=eq.${requestId}` },
        (payload: { new: Message }) => {
          setMessages((m) => (m.some((x) => x.id === payload.new.id) ? m : [...m, payload.new]));
          addUrls([payload.new.image_path]);
        })
      .subscribe();
    return () => { sb.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages.length, urls]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const body = text.trim();
    setText("");
    const { error } = await sb.from("private_messages").insert({ request_id: requestId, sender: me.id, body });
    if (error) setError(error.message);
  }

  async function sendImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSending(true);
    try {
      const image_path = await uploadImage(`chat/${requestId}`, file);
      const { error } = await sb.from("private_messages").insert({ request_id: requestId, sender: me.id, image_path });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Slika nije poslana.");
    }
    setSending(false);
  }

  if (error && !partner) return <p className="text-stone-500">{error}</p>;
  if (!partner) return <p className="text-stone-500">Učitavam…</p>;

  return (
    <div className="flex h-[80vh] flex-col">
      <div className="mb-3 space-y-2">
        <h1 className="text-2xl font-semibold">{partner.avatar} {partner.nickname}{partner.verified ? " ✓" : ""}</h1>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {[partner.city, partner.bio].filter(Boolean).join(" · ") || "Nije napisao/la ništa o sebi."}
        </p>
        {partnerPhotos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {partnerPhotos.map((p) => urls[p] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} src={urls[p]} alt="" onClick={() => setZoom(urls[p])}
                className="h-20 w-20 flex-none cursor-pointer rounded-lg object-cover" />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-stone-200 p-3 dark:border-stone-800">
        {messages.length === 0 && <p className="text-sm text-stone-500">Recite si zdravo. 👋</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === me.id ? "justify-end" : ""}`}>
            {m.image_path ? (
              urls[m.image_path] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[m.image_path]} alt="" onClick={() => setZoom(urls[m.image_path!])}
                  className="max-h-64 max-w-[75%] cursor-pointer rounded-2xl object-cover" />
              ) : <span className="text-sm text-stone-400">slika…</span>
            ) : (
              <span className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender === me.id ? "bg-amber-700 text-white" : "bg-stone-100 dark:bg-stone-800"}`}>
                {m.body}
              </span>
            )}
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={send} className="mt-3 flex gap-2">
        <label className="btn-light flex cursor-pointer items-center px-3" title="Pošalji sliku">
          {sending ? "…" : "📷"}
          <input type="file" accept="image/*" className="hidden" onChange={sendImage} disabled={sending} />
        </label>
        <input className="input" maxLength={2000} placeholder="Poruka…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" type="submit">Pošalji</button>
      </form>

      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

export default function PrivateChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RequireProfile>{(me) => <PrivateChat requestId={Number(id)} me={me} />}</RequireProfile>;
}
