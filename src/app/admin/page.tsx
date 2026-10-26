"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, type Profile } from "@/lib/supabase";
import { RequireProfile } from "@/components/RequireProfile";

type Report = { id: number; reporter: string; reported: string; reason: string; created_at: string; resolved: boolean };
type Person = { id: string; nickname: string; banned_until: string | null };

function Admin({ me }: { me: Profile }) {
  const sb = supabase();
  const [reports, setReports] = useState<Report[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [showResolved, setShowResolved] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const { data } = await sb.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
    const list = (data ?? []) as Report[];
    setReports(list);
    const ids = [...new Set(list.flatMap((r) => [r.reporter, r.reported]))];
    if (ids.length) {
      const { data: ps } = await sb.from("profiles").select("id, nickname, banned_until").in("id", ids);
      setPeople(Object.fromEntries((ps ?? []).map((p: Person) => [p.id, p])));
    }
    const { data: w } = await sb.from("bad_words").select("word").order("word");
    setWords((w ?? []).map((x: { word: string }) => x.word));
  }

  useEffect(() => {
    if (me.is_admin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.is_admin]);

  if (!me.is_admin) return <p className="text-stone-500">Ova stranica je samo za admine.</p>;

  async function resolve(id: number) {
    await sb.from("reports").update({ resolved: true }).eq("id", id);
    load();
  }

  async function ban(userId: string, days: number | null) {
    const until = days === null ? "2999-01-01T00:00:00Z" : new Date(Date.now() + days * 86400000).toISOString();
    const { error } = await sb.from("profiles").update({ banned_until: until }).eq("id", userId);
    setNotice(error ? error.message : days === null ? "Korisnik je trajno blokiran." : `Korisnik je blokiran ${days} dana.`);
    load();
  }

  async function unban(userId: string) {
    await sb.from("profiles").update({ banned_until: null }).eq("id", userId);
    setNotice("Zabrana je skinuta.");
    load();
  }

  async function wipeMessages(userId: string) {
    if (!confirm("Obrisati sve poruke ovog korisnika u sobama i njegove oglase?")) return;
    await sb.from("room_messages").delete().eq("user_id", userId);
    await sb.from("personal_ads").delete().eq("user_id", userId);
    setNotice("Poruke i oglasi su obrisani.");
  }

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    const word = newWord.trim().toLowerCase();
    if (word.length < 3) return setNotice("Riječ mora imati bar 3 slova.");
    await sb.from("bad_words").insert({ word });
    setNewWord("");
    load();
  }

  async function removeWord(word: string) {
    await sb.from("bad_words").delete().eq("word", word);
    load();
  }

  const name = (id: string) => people[id]?.nickname ?? "obrisan korisnik";
  const shown = reports.filter((r) => showResolved || !r.resolved);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Admin</h1>
      {notice && <p className="text-sm text-stone-600 dark:text-stone-300">{notice}</p>}

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="mr-auto text-xl font-semibold">Prijave ({reports.filter((r) => !r.resolved).length} otvorenih)</h2>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Prikaži riješene
          </label>
        </div>
        {shown.length === 0 && <p className="text-sm text-stone-500">Nema prijava. 🎉</p>}
        {shown.map((r) => {
          const target = people[r.reported];
          const banned = target?.banned_until && new Date(target.banned_until) > new Date();
          return (
            <div key={r.id} className={`space-y-2 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900 ${r.resolved ? "opacity-60" : ""}`}>
              <div className="text-sm text-stone-500">
                {new Date(r.created_at).toLocaleString("bs-BA")} · {name(r.reporter)} prijavio/la{" "}
                <Link href={`/clan/${r.reported}`} className="font-semibold text-stone-900 underline dark:text-stone-100">{name(r.reported)}</Link>
                {banned && <span className="ml-2 rounded-full bg-red-100 px-2 text-xs text-red-800">blokiran</span>}
              </div>
              <p>{r.reason}</p>
              <div className="flex flex-wrap gap-2 text-sm">
                {!r.resolved && <button className="btn" onClick={() => resolve(r.id)}>Riješeno</button>}
                {banned ? (
                  <button className="btn-light" onClick={() => unban(r.reported)}>Skini zabranu</button>
                ) : (
                  <>
                    <button className="btn-light" onClick={() => ban(r.reported, 1)}>Blokiraj 1 dan</button>
                    <button className="btn-light" onClick={() => ban(r.reported, 7)}>Blokiraj 7 dana</button>
                    <button className="btn-light" onClick={() => ban(r.reported, null)}>Trajno</button>
                  </>
                )}
                <button className="text-red-700 underline" onClick={() => wipeMessages(r.reported)}>Obriši poruke i oglase</button>
              </div>
            </div>
          );
        })}
      </section>

      <VipGrant />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Filter psovki</h2>
        <p className="text-sm text-stone-500">
          Riječi koje počinju ovako se u sobama i oglasima mijenjaju u ***. Privatne poruke se ne filtriraju.
        </p>
        <div className="flex flex-wrap gap-2">
          {words.map((w) => (
            <span key={w} className="flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-sm dark:bg-stone-800">
              {w}
              <button className="text-stone-400 hover:text-red-600" onClick={() => removeWord(w)}>✕</button>
            </span>
          ))}
        </div>
        <form onSubmit={addWord} className="flex gap-2">
          <input className="input max-w-xs" placeholder="nova riječ" value={newWord} onChange={(e) => setNewWord(e.target.value)} />
          <button className="btn" type="submit">Dodaj</button>
        </form>
      </section>
    </div>
  );
}

type VipRow = { id: string; nickname: string; vip_until: string | null };

// Kad neko uplati, admin ovdje nađe člana po nadimku i produži mu VIP.
function VipGrant() {
  const sb = supabase();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<VipRow[]>([]);
  const [vips, setVips] = useState<VipRow[]>([]);
  const [notice, setNotice] = useState("");

  async function loadVips() {
    const { data } = await sb.from("profiles").select("id, nickname, vip_until").gt("vip_until", new Date().toISOString()).order("vip_until");
    setVips((data ?? []) as VipRow[]);
  }

  useEffect(() => {
    loadVips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await sb.from("profiles").select("id, nickname, vip_until").ilike("nickname", `%${query.trim()}%`).limit(10);
    setFound((data ?? []) as VipRow[]);
  }

  async function extend(row: VipRow, months: number) {
    const start = row.vip_until && new Date(row.vip_until) > new Date() ? new Date(row.vip_until) : new Date();
    start.setMonth(start.getMonth() + months);
    const { error } = await sb.from("profiles").update({ vip_until: start.toISOString() }).eq("id", row.id);
    setNotice(error ? error.message : `${row.nickname} je VIP do ${start.toLocaleDateString("bs-BA")}.`);
    setFound((f) => f.map((x) => (x.id === row.id ? { ...x, vip_until: start.toISOString() } : x)));
    loadVips();
  }

  async function removeVip(row: VipRow) {
    await sb.from("profiles").update({ vip_until: null }).eq("id", row.id);
    loadVips();
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">VIP članovi</h2>
      <form onSubmit={search} className="flex gap-2">
        <input className="input max-w-xs" placeholder="Nadimak člana koji je platio" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn" type="submit">Traži</button>
      </form>
      {found.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 text-sm shadow-sm dark:bg-stone-900">
          <span className="mr-auto font-medium">{r.nickname}{r.vip_until && new Date(r.vip_until) > new Date() ? ` · VIP do ${new Date(r.vip_until).toLocaleDateString("bs-BA")}` : ""}</span>
          <button className="btn-light" onClick={() => extend(r, 1)}>+1 mjesec</button>
          <button className="btn-light" onClick={() => extend(r, 12)}>+1 godina</button>
        </div>
      ))}
      {notice && <p className="text-sm text-stone-600 dark:text-stone-300">{notice}</p>}
      {vips.length > 0 && (
        <ul className="space-y-1 text-sm">
          {vips.map((v) => (
            <li key={v.id}>
              ⭐ {v.nickname}, do {new Date(v.vip_until!).toLocaleDateString("bs-BA")}{" "}
              <button className="text-red-700 underline" onClick={() => removeVip(v)}>ukloni</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminPage() {
  return <RequireProfile>{(me) => <Admin me={me} />}</RequireProfile>;
}
