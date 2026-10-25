"use client";

import { use, useEffect, useRef, useState } from "react";
import { supabase, type Profile } from "@/lib/supabase";
import { RequireProfile } from "@/components/RequireProfile";

type Message = { id: number; sender: string; body: string; created_at: string };

function PrivateChat({ requestId, me }: { requestId: number; me: Profile }) {
  const sb = supabase();
  const [partner, setPartner] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: r } = await sb.from("chat_requests").select("*").eq("id", requestId).single();
      if (!r || r.status !== "accepted") return setError("Ovaj chat ne postoji ili još nije prihvaćen.");
      const partnerId = r.from_user === me.id ? r.to_user : r.from_user;
      const { data: p } = await sb.from("profiles").select("*").eq("id", partnerId).single();
      setPartner(p);
      const { data } = await sb.from("private_messages").select("*").eq("request_id", requestId).order("created_at");
      setMessages((data ?? []) as Message[]);
    })();
    const channel = sb.channel(`private-${requestId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages", filter: `request_id=eq.${requestId}` },
        (payload: { new: Message }) => setMessages((m) => [...m, payload.new]))
      .subscribe();
    return () => { sb.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const body = text.trim();
    setText("");
    const { error } = await sb.from("private_messages").insert({ request_id: requestId, sender: me.id, body });
    if (error) setError(error.message);
  }

  if (error) return <p className="text-stone-500">{error}</p>;
  if (!partner) return <p className="text-stone-500">Učitavam…</p>;

  return (
    <div className="flex h-[75vh] flex-col">
      <div className="mb-3">
        <h1 className="text-2xl font-semibold">{partner.avatar} {partner.nickname}{partner.verified ? " ✓" : ""}</h1>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {[partner.city, partner.bio].filter(Boolean).join(" · ") || "Nije napisao/la ništa o sebi."}
        </p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-stone-200 p-3 dark:border-stone-800">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === me.id ? "justify-end" : ""}`}>
            <span className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender === me.id ? "bg-amber-700 text-white" : "bg-stone-100 dark:bg-stone-800"}`}>
              {m.body}
            </span>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input className="input" maxLength={2000} placeholder="Poruka…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" type="submit">Pošalji</button>
      </form>
    </div>
  );
}

export default function PrivateChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RequireProfile>{(me) => <PrivateChat requestId={Number(id)} me={me} />}</RequireProfile>;
}
