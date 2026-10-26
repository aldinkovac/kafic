"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase, ageFromYear, GENDER_LABEL, type Gender, type MemberProfile, type Profile } from "@/lib/supabase";
import { mainPhotos } from "@/lib/members";
import { RequireProfile } from "@/components/RequireProfile";

function Members({ me }: { me: Profile }) {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [gender, setGender] = useState<Gender | "">("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [place, setPlace] = useState("");
  const [onlyPhotos, setOnlyPhotos] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase().from("public_profiles").select("*").neq("id", me.id)
        .order("online", { ascending: false }).order("created_at", { ascending: false }).limit(300);
      const list = (data ?? []) as MemberProfile[];
      setMembers(list);
      setLoaded(true);
      setPhotos(await mainPhotos(list.filter((m) => m.visible).map((m) => m.id)));
    })();
  }, [me.id]);

  const shown = useMemo(() => members.filter((m) => {
    const age = ageFromYear(m.birth_year);
    if (gender && m.gender !== gender) return false;
    if (minAge && (!age || age < Number(minAge))) return false;
    if (maxAge && (!age || age > Number(maxAge))) return false;
    if (place && !(m.city ?? "").toLowerCase().includes(place.toLowerCase())) return false;
    if (onlyPhotos && !photos[m.id]) return false;
    return true;
  }), [members, photos, gender, minAge, maxAge, place, onlyPhotos]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Članovi</h1>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 text-sm shadow-sm dark:bg-stone-900">
        <select className="input w-auto" value={gender} onChange={(e) => setGender(e.target.value as Gender | "")}>
          <option value="">Svi</option>
          {Object.entries(GENDER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="input w-20" type="number" inputMode="numeric" placeholder="od god." value={minAge} onChange={(e) => setMinAge(e.target.value)} />
        <input className="input w-20" type="number" inputMode="numeric" placeholder="do god." value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
        <input className="input w-40 flex-1" placeholder="Mjesto" value={place} onChange={(e) => setPlace(e.target.value)} />
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={onlyPhotos} onChange={(e) => setOnlyPhotos(e.target.checked)} /> Samo sa slikom
        </label>
      </div>

      {loaded && shown.length === 0 && <p className="text-stone-500">Nema članova za ove filtere.</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {shown.map((m) => {
          const age = ageFromYear(m.birth_year);
          return (
            <Link key={m.id} href={`/clan/${m.id}`} className="overflow-hidden rounded-2xl bg-white shadow-sm hover:ring-2 hover:ring-amber-700 dark:bg-stone-900">
              <div className="relative flex aspect-square items-center justify-center bg-amber-100 text-6xl dark:bg-stone-800">
                {photos[m.id]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={photos[m.id]} alt="" className="h-full w-full object-cover" />
                  : <span>{m.avatar}</span>}
                {m.online && <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" title="Online" />}
                {!m.visible && <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">🔒 Privatan profil</span>}
              </div>
              <div className="p-3">
                <div className="truncate font-semibold">{m.nickname}{m.verified ? " ✓" : ""}{age ? `, ${age}` : ""}</div>
                <div className="truncate text-xs text-stone-500">{m.city ?? " "}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function ClanoviPage() {
  return <RequireProfile>{(me) => <Members me={me} />}</RequireProfile>;
}
