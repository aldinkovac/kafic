"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, type Profile, type PublicProfile } from "@/lib/supabase";
import { RequireProfile } from "@/components/RequireProfile";

type Request = { id: number; from_user: string; to_user: string; status: "pending" | "accepted" | "declined" };

function Inbox({ me }: { me: Profile }) {
  const sb = supabase();
  const [requests, setRequests] = useState<Request[]>([]);
  const [people, setPeople] = useState<Record<string, PublicProfile>>({});

  async function load() {
    const { data } = await sb.from("chat_requests").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as Request[];
    setRequests(list);
    const ids = [...new Set(list.map((r) => (r.from_user === me.id ? r.to_user : r.from_user)))];
    if (ids.length) {
      const { data: ps } = await sb.from("public_profiles").select("*").in("id", ids);
      setPeople(Object.fromEntries((ps ?? []).map((p: PublicProfile) => [p.id, p])));
    }
  }

  useEffect(() => {
    load();
    const channel = sb.channel("requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_requests" }, () => load())
      .subscribe();
    return () => { sb.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function answer(id: number, status: "accepted" | "declined") {
    await sb.from("chat_requests").update({ status }).eq("id", id);
    load();
  }

  const other = (r: Request) => people[r.from_user === me.id ? r.to_user : r.from_user];
  const name = (p?: PublicProfile) => (p ? `${p.avatar} ${p.nickname}${p.verified ? " ✓" : ""}` : "…");
  const incoming = requests.filter((r) => r.status === "pending" && r.to_user === me.id);
  const outgoing = requests.filter((r) => r.status === "pending" && r.from_user === me.id);
  const chats = requests.filter((r) => r.status === "accepted");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Poruke</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Zahtjevi za tebe</h2>
        {incoming.length === 0 && <p className="text-sm text-stone-500">Nema novih zahtjeva.</p>}
        {incoming.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded-xl border border-stone-200 p-3 dark:border-stone-800">
            <span className="mr-auto">{name(other(r))} te zove na privatni chat</span>
            <button className="btn" onClick={() => answer(r.id, "accepted")}>Prihvati</button>
            <button className="btn-light" onClick={() => answer(r.id, "declined")}>Odbij</button>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Privatni chatovi</h2>
        {chats.length === 0 && <p className="text-sm text-stone-500">Još nemaš privatnih chatova. Pozovi nekog iz sobe.</p>}
        {chats.map((r) => (
          <Link key={r.id} href={`/poruke/${r.id}`} className="block rounded-xl border border-stone-200 p-3 hover:border-amber-700 dark:border-stone-800">
            {name(other(r))}
          </Link>
        ))}
      </section>

      {outgoing.length > 0 && (
        <section className="space-y-1">
          <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Čeka odgovor</h2>
          {outgoing.map((r) => <p key={r.id} className="text-sm">{name(other(r))}</p>)}
        </section>
      )}
    </div>
  );
}

export default function PorukePage() {
  return <RequireProfile>{(me) => <Inbox me={me} />}</RequireProfile>;
}
