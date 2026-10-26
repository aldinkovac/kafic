"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase, uniqueChannel, type Profile, type PublicProfile } from "@/lib/supabase";
import { RequireProfile } from "@/components/RequireProfile";
import { KafanaBar } from "@/components/KafanaBar";
import type { Room as RoomRow } from "@/lib/rooms";

type Message = { id: number; user_id: string; body: string; created_at: string };

function Room({ slug, me }: { slug: string; me: Profile }) {
  const sb = supabase();
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [people, setPeople] = useState<Record<string, PublicProfile>>({});
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<PublicProfile | null>(null);
  const [notice, setNotice] = useState("");
  const [missing, setMissing] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  async function loadPeople(ids: string[]) {
    const missing = ids.filter((id) => !people[id]);
    if (!missing.length) return;
    const { data } = await sb.from("public_profiles").select("*").in("id", missing);
    setPeople((p) => ({ ...p, ...Object.fromEntries((data ?? []).map((u: PublicProfile) => [u.id, u])) }));
  }

  useEffect(() => {
    let channel: ReturnType<typeof sb.channel> | undefined;
    let cancelled = false;
    (async () => {
      const { data: r } = await sb.from("rooms").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      if (!r) return setMissing(true);
      setRoom(r);
      const { data } = await sb.from("room_messages").select("*").eq("room_id", r.id)
        .order("created_at", { ascending: false }).limit(100);
      const list = ((data ?? []) as Message[]).reverse();
      setMessages(list);
      loadPeople(list.map((m) => m.user_id));
      if (cancelled) return;
      channel = sb.channel(uniqueChannel(`room-${r.id}`))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${r.id}` },
          (payload: { new: Message }) => {
            setMessages((m) => [...m, payload.new]);
            loadPeople([payload.new.user_id]);
          })
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!room || !text.trim()) return;
    const body = text.trim();
    setText("");
    const { error } = await sb.from("room_messages").insert({ room_id: room.id, user_id: me.id, body });
    if (error) setNotice(error.message);
  }

  async function deleteMessage(id: number) {
    await sb.from("room_messages").delete().eq("id", id);
    setMessages((list) => list.filter((m) => m.id !== id));
  }

  async function requestChat(to: PublicProfile) {
    const { error } = await sb.from("chat_requests").insert({ from_user: me.id, to_user: to.id });
    setNotice(error
      ? error.code === "23505" ? `Već si poslao zahtjev korisniku ${to.nickname}.` : error.message
      : `Zahtjev za privatni chat poslan korisniku ${to.nickname}.`);
    setSelected(null);
  }

  async function block(u: PublicProfile) {
    await sb.from("blocks").insert({ blocker: me.id, blocked: u.id });
    setMessages((m) => m.filter((x) => x.user_id !== u.id));
    setNotice(`${u.nickname} je blokiran. Više ne vidite poruke jedno drugog.`);
    setSelected(null);
  }

  async function report(u: PublicProfile) {
    const reason = prompt(`Zašto prijavljuješ korisnika ${u.nickname}?`);
    if (!reason) return;
    await sb.from("reports").insert({ reporter: me.id, reported: u.id, reason: reason.slice(0, 500) });
    setNotice("Hvala, prijava je poslana moderatoru.");
    setSelected(null);
  }

  if (missing) return <p className="text-stone-500">Ova kafana ne postoji ili je zatvorena. U zatvorenu kafanu se ulazi samo preko pozivnice.</p>;
  if (!room) return <p className="text-stone-500">Učitavam sobu…</p>;

  return (
    <div className="flex h-[75vh] flex-col">
      <h1 className="mb-1 text-2xl font-semibold">{room.name}</h1>
      {room.category === "kafana" && <KafanaBar room={room} me={me} onChange={setRoom} />}
      <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-stone-200 p-3 dark:border-stone-800">
        {messages.length === 0 && <p className="text-sm text-stone-500">Još je tiho. Budi prvi koji će nešto reći.</p>}
        {messages.map((m) => {
          const u = people[m.user_id];
          return (
            <div key={m.id} className="text-sm">
              <button className="font-semibold text-amber-800 hover:underline dark:text-amber-300"
                onClick={() => u && u.id !== me.id && setSelected(u)}>
                {u ? `${u.avatar} ${u.nickname}${u.verified ? " ✓" : ""}` : "…"}
              </button>{" "}
              <span>{m.body}</span>
              {me.is_admin && (
                <button className="ml-2 text-xs text-red-600 underline" onClick={() => deleteMessage(m.id)}>obriši</button>
              )}
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {selected && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm dark:bg-stone-800">
          <span className="mr-auto font-medium">{selected.avatar} {selected.nickname}</span>
          <Link className="btn-light" href={`/clan/${selected.id}`}>Pogledaj profil</Link>
          <button className="btn" onClick={() => requestChat(selected)}>Pozovi na privatni chat</button>
          <button className="btn-light" onClick={() => block(selected)}>Blokiraj</button>
          <button className="text-red-700 underline" onClick={() => report(selected)}>Prijavi</button>
          <button className="text-stone-500" onClick={() => setSelected(null)}>Zatvori</button>
        </div>
      )}
      {notice && <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{notice}</p>}

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input className="input" maxLength={500} placeholder="Napiši nešto za sto…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" type="submit">Pošalji</button>
      </form>
    </div>
  );
}

export default function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <RequireProfile>{(me) => <Room slug={slug} me={me} />}</RequireProfile>;
}
