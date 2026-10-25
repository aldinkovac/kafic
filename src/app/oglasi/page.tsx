"use client";

import { useEffect, useState } from "react";
import { supabase, type Profile, type PublicProfile } from "@/lib/supabase";
import { RequireProfile } from "@/components/RequireProfile";

type Ad = {
  id: number;
  user_id: string;
  title: string;
  body: string;
  looking_for: "veza" | "prijateljstvo" | "druženje";
  region: string | null;
  created_at: string;
};

const LOOKING_FOR: Record<Ad["looking_for"], string> = {
  veza: "Traži vezu",
  prijateljstvo: "Traži prijateljstvo",
  druženje: "Traži druženje",
};

function Ads({ me }: { me: Profile }) {
  const sb = supabase();
  const [ads, setAds] = useState<Ad[]>([]);
  const [people, setPeople] = useState<Record<string, PublicProfile>>({});
  const [filter, setFilter] = useState<"" | Ad["looking_for"]>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", looking_for: "veza" as Ad["looking_for"], region: "" });
  const [notice, setNotice] = useState("");

  async function load() {
    const { data } = await sb.from("personal_ads").select("*").order("created_at", { ascending: false }).limit(100);
    const list = (data ?? []) as Ad[];
    setAds(list);
    const ids = [...new Set(list.map((a) => a.user_id))];
    if (ids.length) {
      const { data: ps } = await sb.from("public_profiles").select("*").in("id", ids);
      setPeople(Object.fromEntries((ps ?? []).map((p: PublicProfile) => [p.id, p])));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb.from("personal_ads").insert({
      user_id: me.id,
      title: form.title.trim(),
      body: form.body.trim(),
      looking_for: form.looking_for,
      region: form.region.trim() || null,
    });
    if (error) {
      setNotice(error.code === "42501" ? "Možeš imati najviše 3 oglasa. Obriši neki stari." : error.message);
      return;
    }
    setForm({ title: "", body: "", looking_for: "veza", region: "" });
    setShowForm(false);
    setNotice("Oglas je objavljen.");
    load();
  }

  async function remove(id: number) {
    await sb.from("personal_ads").delete().eq("id", id);
    load();
  }

  async function reply(ad: Ad) {
    const { error } = await sb.from("chat_requests").insert({ from_user: me.id, to_user: ad.user_id });
    const name = people[ad.user_id]?.nickname ?? "korisniku";
    setNotice(error
      ? error.code === "23505" ? `Već si poslao zahtjev korisniku ${name}.` : error.message
      : `Zahtjev za privatni chat poslan korisniku ${name}.`);
  }

  const shown = filter ? ads.filter((a) => a.looking_for === filter) : ads;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">Lični oglasi</h1>
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="">Svi oglasi</option>
          {Object.entries(LOOKING_FOR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>{showForm ? "Zatvori" : "Objavi oglas"}</button>
      </div>

      {showForm && (
        <form onSubmit={post} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
          <input className="input" required minLength={3} maxLength={80} placeholder="Naslov, npr. Tražim društvo za kafu u Mostaru"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="input" required minLength={10} maxLength={1000} rows={4} placeholder="Napiši nešto o sebi i koga tražiš…"
            value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div className="flex flex-wrap gap-3">
            <select className="input w-auto" value={form.looking_for} onChange={(e) => setForm({ ...form, looking_for: e.target.value as Ad["looking_for"] })}>
              {Object.entries(LOOKING_FOR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className="input flex-1" maxLength={60} placeholder="Kraj (neobavezno), npr. Krajina ili Beč"
              value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
          <p className="text-xs text-stone-500">Oglas se objavljuje pod tvojim nadimkom. Ne piši pravo ime, broj telefona ni adresu.</p>
          <button className="btn" type="submit">Objavi</button>
        </form>
      )}

      {notice && <p className="text-sm text-stone-600 dark:text-stone-300">{notice}</p>}
      {shown.length === 0 && <p className="text-stone-500">Još nema oglasa. Budi prvi.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((ad) => {
          const u = people[ad.user_id];
          return (
            <article key={ad.id} className="space-y-2 rounded-2xl bg-white p-5 shadow-sm dark:bg-stone-900">
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <span>{u ? `${u.avatar} ${u.nickname}${u.verified ? " ✓" : ""}` : "…"}</span>
                <span>·</span>
                <span>{new Date(ad.created_at).toLocaleDateString("bs-BA")}</span>
              </div>
              <h2 className="text-lg font-semibold">{ad.title}</h2>
              <p className="whitespace-pre-line text-sm">{ad.body}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">{LOOKING_FOR[ad.looking_for]}</span>
                {ad.region && <span className="rounded-full bg-stone-100 px-3 py-1 text-xs dark:bg-stone-800">📍 {ad.region}</span>}
                <span className="ml-auto" />
                {ad.user_id === me.id
                  ? <button className="text-sm text-red-700 underline" onClick={() => remove(ad.id)}>Obriši</button>
                  : <button className="btn text-sm" onClick={() => reply(ad)}>Javi se</button>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function OglasiPage() {
  return <RequireProfile>{(me) => <Ads me={me} />}</RequireProfile>;
}
