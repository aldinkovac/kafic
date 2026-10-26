"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase, ageFromYear, GENDER_LABEL, type MemberProfile, type Profile } from "@/lib/supabase";
import { signedUrls } from "@/lib/photos";
import { RequireProfile } from "@/components/RequireProfile";

type Request = { id: number; status: string; from_user: string };

function Member({ id, me }: { id: string; me: Profile }) {
  const sb = supabase();
  const [m, setM] = useState<MemberProfile | null | undefined>(undefined);
  const [photos, setPhotos] = useState<string[]>([]);
  const [request, setRequest] = useState<Request | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function loadRequest() {
    const { data } = await sb.from("chat_requests").select("id, status, from_user")
      .or(`and(from_user.eq.${me.id},to_user.eq.${id}),and(from_user.eq.${id},to_user.eq.${me.id})`).limit(1);
    setRequest(data?.[0] ?? null);
  }

  useEffect(() => {
    (async () => {
      const { data } = await sb.from("public_profiles").select("*").eq("id", id).maybeSingle();
      setM(data);
      const { data: ph } = await sb.from("profile_photos").select("path").eq("user_id", id).order("created_at");
      const paths = (ph ?? []).map((p: { path: string }) => p.path);
      const urls = await signedUrls(paths);
      setPhotos(paths.map((p: string) => urls[p]).filter(Boolean));
      loadRequest();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function invite() {
    const { error } = await sb.from("chat_requests").insert({ from_user: me.id, to_user: id });
    setNotice(error ? error.message : "Zahtjev za privatni chat je poslan.");
    loadRequest();
  }

  async function block() {
    if (!confirm("Blokirati ovog korisnika? Više se nećete vidjeti nigdje na sajtu.")) return;
    await sb.from("blocks").insert({ blocker: me.id, blocked: id });
    setM(null);
  }

  async function report() {
    const reason = prompt("Zašto prijavljuješ ovaj profil?");
    if (!reason) return;
    await sb.from("reports").insert({ reporter: me.id, reported: id, reason: reason.slice(0, 500) });
    setNotice("Hvala, prijava je poslana moderatoru.");
  }

  if (m === undefined) return <p className="text-stone-500">Učitavam…</p>;
  if (m === null) return <p className="text-stone-500">Ovaj profil ne postoji ili nije dostupan.</p>;

  const age = ageFromYear(m.birth_year);
  const facts: [string, string | null][] = [
    ["Spol", m.gender ? GENDER_LABEL[m.gender] : null],
    ["Godine", age ? `${age}` : null],
    ["Visina", m.height_cm ? `${m.height_cm} cm` : null],
    ["Težina", m.weight_kg ? `${m.weight_kg} kg` : null],
    ["Odakle", m.city],
  ];
  const isMe = id === me.id;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-full bg-amber-100 text-5xl dark:bg-stone-800">
          {photos[0]
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={photos[0]} alt="" className="h-full w-full object-cover" />
            : m.avatar}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{m.vip ? "⭐ " : ""}{m.nickname}{m.verified ? " ✓" : ""}{age ? `, ${age}` : ""}</h1>
          <p className="text-sm text-stone-500">{m.online ? "🟢 Online" : "Offline"}{m.city ? ` · ${m.city}` : ""}</p>
        </div>
      </div>

      {!m.visible && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm dark:bg-stone-800">
          🔒 Ovaj profil je privatan. Slike i podatke ćeš vidjeti kad {m.nickname} prihvati tvoj zahtjev za privatni chat.
        </p>
      )}

      {m.visible && (
        <>
          <div className="flex flex-wrap gap-2">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <span key={k} className="rounded-full bg-white px-3 py-1 text-sm shadow-sm dark:bg-stone-900">
                <span className="text-stone-500">{k}:</span> {v}
              </span>
            ))}
            {m.instagram && (
              <a href={`https://instagram.com/${m.instagram}`} target="_blank" rel="noopener noreferrer nofollow"
                className="rounded-full bg-white px-3 py-1 text-sm text-amber-800 underline shadow-sm dark:bg-stone-900 dark:text-amber-300">
                📷 @{m.instagram}
              </a>
            )}
          </div>
          {m.bio && <p className="whitespace-pre-line">{m.bio}</p>}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" onClick={() => setZoom(url)}
                  className="aspect-square w-full cursor-pointer rounded-xl object-cover" />
              ))}
            </div>
          )}
        </>
      )}

      {isMe ? (
        <Link href="/profil" className="btn inline-block">Uredi svoj profil</Link>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {request?.status === "accepted" ? (
            <Link href={`/poruke/${request.id}`} className="btn">Otvori privatni chat</Link>
          ) : request?.status === "pending" ? (
            <span className="text-sm text-stone-500">
              {request.from_user === me.id ? "Zahtjev za chat čeka odgovor." : "Ova osoba te zove na chat. Odgovori u Porukama."}
            </span>
          ) : request?.status === "declined" ? (
            <span className="text-sm text-stone-500">Zahtjev za chat je odbijen.</span>
          ) : (
            <button className="btn" onClick={invite}>Pozovi na privatni chat</button>
          )}
          <button className="btn-light" onClick={block}>Blokiraj</button>
          <button className="text-sm text-red-700 underline" onClick={report}>Prijavi</button>
        </div>
      )}
      {notice && <p className="text-sm text-stone-600 dark:text-stone-300">{notice}</p>}

      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

export default function ClanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <RequireProfile>{(me) => <Member id={id} me={me} />}</RequireProfile>;
}
