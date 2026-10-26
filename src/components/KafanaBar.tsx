"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Profile } from "@/lib/supabase";
import type { Room } from "@/lib/rooms";

// Traka ispod imena kafane: pozivnica i postavke za vlasnika, ulazak i izlazak za goste.
export function KafanaBar({ room, me, onChange }: { room: Room; me: Profile; onChange: (r: Room) => void }) {
  const sb = supabase();
  const router = useRouter();
  const isOwner = room.owner_id === me.id;
  const [members, setMembers] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  async function loadMembers() {
    const { data } = await sb.from("room_members").select("user_id").eq("room_id", room.id);
    setMembers((data ?? []).map((m: { user_id: string }) => m.user_id));
  }

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/pozivnica/${room.invite_code}` : "";
  const isMember = members.includes(me.id);

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Kopiraj link:", inviteUrl);
    }
  }

  async function toggleOpen() {
    const { data } = await sb.from("rooms").update({ is_open: !room.is_open }).eq("id", room.id).select().single();
    if (data) onChange(data);
  }

  async function newInvite() {
    if (!confirm("Stari link više neće raditi. Napraviti novi?")) return;
    const code = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
    const { data } = await sb.from("rooms").update({ invite_code: code }).eq("id", room.id).select().single();
    if (data) onChange(data);
  }

  async function close() {
    if (!confirm("Zatvoriti kafanu zauvijek? Brišu se i sve poruke u njoj.")) return;
    await sb.from("rooms").delete().eq("id", room.id);
    router.push("/kafic");
  }

  async function join() {
    await sb.from("room_members").insert({ room_id: room.id, user_id: me.id });
    loadMembers();
  }

  async function leave() {
    if (!confirm("Napustiti kafanu?")) return;
    await sb.from("room_members").delete().eq("room_id", room.id).eq("user_id", me.id);
    if (room.is_open) loadMembers();
    else router.push("/kafic");
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Svrati u moju kafanu "${room.name}" na Kafiću: ${inviteUrl}`)}`;

  return (
    <div className="mb-3 space-y-2">
      <p className="text-sm text-stone-500">
        {room.is_open ? "Otvorena kafana" : "Zatvorena kafana"} · stalnih gostiju: {members.length + 1}
        {room.description ? ` · ${room.description}` : ""}
      </p>
      <div className="flex flex-wrap gap-2 text-sm">
        {(isOwner || isMember) && (
          <>
            <button className="btn-light" onClick={copy}>{copied ? "Kopirano ✓" : "🔗 Kopiraj pozivnicu"}</button>
            <a className="btn-light" href={whatsapp} target="_blank" rel="noopener noreferrer">Pozovi preko WhatsAppa</a>
          </>
        )}
        {isOwner && (
          <>
            <button className="btn-light" onClick={toggleOpen}>{room.is_open ? "Zatvori za strance" : "Otvori za sve"}</button>
            <button className="btn-light" onClick={newInvite}>Novi link</button>
            <button className="text-red-700 underline" onClick={close}>Zatvori kafanu</button>
          </>
        )}
        {!isOwner && !isMember && room.is_open && <button className="btn" onClick={join}>Postani stalni gost</button>}
        {!isOwner && isMember && <button className="text-stone-500 underline" onClick={leave}>Napusti kafanu</button>}
      </div>
    </div>
  );
}
