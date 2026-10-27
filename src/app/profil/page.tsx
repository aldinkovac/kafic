"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, takeRememberedPath, isVip, GENDER_LABEL, type Gender, type Profile } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { ProfilePhotos } from "@/components/ProfilePhotos";
import { PushSetup } from "@/components/PushSetup";
import { stopPush } from "@/lib/push";

const AVATARS = ["☕", "🌹", "🌙", "🎸", "📚", "⚽", "🏔️", "🌊", "🦉", "🍀", "🎨", "✈️"];

export default function ProfilPage() {
  const { user, profile, loading, setProfile } = useSession();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [birthYear, setBirthYear] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [instagram, setInstagram] = useState("");
  const [visibility, setVisibility] = useState<Profile["visibility"]>("members");
  const [terms, setTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/prijava");
    if (profile) {
      setNickname(profile.nickname);
      setAvatar(profile.avatar);
      setCity(profile.city ?? "");
      setBio(profile.bio ?? "");
      setGender(profile.gender ?? "");
      setBirthYear(profile.birth_year?.toString() ?? "");
      setHeight(profile.height_cm?.toString() ?? "");
      setWeight(profile.weight_kg?.toString() ?? "");
      setInstagram(profile.instagram ?? "");
      setVisibility(profile.visibility ?? "members");
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (!user) return;
    supabase()
      .from("consents")
      .select("kind, withdrawn_at")
      .then(({ data }: { data: { kind: string; withdrawn_at: string | null }[] | null }) => {
        const active = new Set((data ?? []).filter((c) => !c.withdrawn_at).map((c) => c.kind));
        setTerms(active.has("terms"));
        setNewsletter(active.has("newsletter"));
      });
  }, [user]);

  if (loading || !user) return <p className="text-stone-500">Učitavam…</p>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    if (!terms) {
      setError("Za ulazak u kafić moraš prihvatiti uslove korištenja i politiku privatnosti.");
      return;
    }
    const sb = supabase();
    const num = (v: string) => (v.trim() ? Number(v) : null);
    const row = {
      id: user!.id,
      nickname: nickname.trim(),
      avatar,
      city: city.trim() || null,
      bio: bio.trim() || null,
      gender: gender || null,
      birth_year: num(birthYear),
      height_cm: num(height),
      weight_kg: num(weight),
      instagram: instagram.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") || null,
      visibility,
    };
    const { data, error } = profile
      ? await sb.from("profiles").update(row).eq("id", user!.id).select().single()
      : await sb.from("profiles").insert(row).select().single();
    if (error) {
      const msg = error.code === "23505" ? "Taj nadimak je zauzet, izaberi drugi."
        : /birth_year/.test(error.message) ? "Moraš imati najmanje 18 godina."
        : /height_cm/.test(error.message) ? "Visina mora biti između 120 i 230 cm."
        : /weight_kg/.test(error.message) ? "Težina mora biti između 35 i 250 kg."
        : /instagram/.test(error.message) ? "Instagram ime može imati samo slova, brojeve, tačku i donju crtu."
        : error.message;
      setError(msg);
      return;
    }
    const now = new Date().toISOString();
    await sb.from("consents").upsert([
      { user_id: user!.id, kind: "terms", granted_at: now, withdrawn_at: null },
      { user_id: user!.id, kind: "newsletter", granted_at: now, withdrawn_at: newsletter ? null : now },
    ]);
    setProfile(data);
    setSaved(true);
    if (!profile) router.push(takeRememberedPath("/kafic"));
  }

  async function deleteAccount() {
    if (!confirm("Ovo trajno briše tvoj profil, sve poruke i pristanke. Nastaviti?")) return;
    const sb = supabase();
    // Prvo brišemo fajlove (profilne slike i slike poslane u chat), pa onda nalog.
    const [{ data: own }, { data: sent }] = await Promise.all([
      sb.from("profile_photos").select("path").eq("user_id", user!.id),
      sb.from("private_messages").select("image_path").eq("sender", user!.id).not("image_path", "is", null),
    ]);
    const paths = [...(own ?? []).map((p: { path: string }) => p.path), ...(sent ?? []).map((m: { image_path: string }) => m.image_path)];
    if (paths.length) await sb.storage.from("photos").remove(paths);
    const { error } = await sb.rpc("delete_my_account");
    if (error) return setError(error.message);
    await stopPush();
    await sb.auth.signOut();
    router.push("/");
  }

  return (
    <form onSubmit={save} className="max-w-md space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{profile ? "Tvoj profil" : "Napravi profil"}</h1>
        {profile && (isVip(profile)
          ? <span className="rounded-full bg-amber-400 px-3 py-1 text-sm font-semibold text-stone-900">⭐ VIP do {new Date(profile.vip_until!).toLocaleDateString("bs-BA")}</span>
          : <Link href="/vip" className="text-sm text-amber-800 underline dark:text-amber-300">Postani VIP ⭐</Link>)}
      </div>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        U sobama se vidi nadimak i avatar. Ispod biraš da li tvoj profil i slike vide svi članovi ili samo oni s kojima prihvatiš privatni chat.
      </p>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Nadimak</span>
        <input className="input" required minLength={3} maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} />
        <span className="text-xs text-stone-500">Ne koristi pravo ime ako želiš ostati diskretan.</span>
      </label>

      <div className="space-y-1">
        <span className="text-sm font-medium">Avatar</span>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button type="button" key={a} onClick={() => setAvatar(a)}
              className={`h-10 w-10 rounded-full text-xl ${a === avatar ? "bg-amber-200 ring-2 ring-amber-700 dark:bg-amber-900" : "bg-stone-100 dark:bg-stone-800"}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {profile ? (
        <ProfilePhotos userId={user.id} />
      ) : (
        <p className="text-xs text-stone-500">Slike možeš dodati čim napraviš profil.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Spol</span>
          <select className="input" value={gender} onChange={(e) => setGender(e.target.value as Gender | "")}>
            <option value="">Ne želim reći</option>
            {Object.entries(GENDER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Godina rođenja</span>
          <input className="input" type="number" inputMode="numeric" min={1920} max={new Date().getFullYear() - 18}
            placeholder="npr. 1992" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Visina (cm)</span>
          <input className="input" type="number" inputMode="numeric" min={120} max={230} value={height} onChange={(e) => setHeight(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Težina (kg)</span>
          <input className="input" type="number" inputMode="numeric" min={35} max={250} value={weight} onChange={(e) => setWeight(e.target.value)} />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Odakle si</span>
        <input className="input" maxLength={60} placeholder="npr. Tuzla ili Beč" value={city} onChange={(e) => setCity(e.target.value)} />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Instagram (neobavezno)</span>
        <input className="input" maxLength={60} placeholder="@tvoje.ime" autoCapitalize="none" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        <span className="text-xs text-stone-500">Pazi: Instagram otkriva ko si. Ostavi prazno ako želiš ostati anoniman.</span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Nešto o tebi (neobavezno)</span>
        <textarea className="input" rows={3} maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} />
      </label>

      <fieldset className="space-y-2 rounded-lg border border-stone-200 p-3 text-sm dark:border-stone-800">
        <legend className="px-1 font-medium">Ko vidi moj profil i slike</legend>
        <label className="flex gap-2">
          <input type="radio" name="visibility" checked={visibility === "members"} onChange={() => setVisibility("members")} />
          <span>Svi prijavljeni članovi</span>
        </label>
        <label className="flex gap-2">
          <input type="radio" name="visibility" checked={visibility === "partners"} onChange={() => setVisibility("partners")} />
          <span>Samo osobe s kojima prihvatim privatni chat (ostali vide samo nadimak)</span>
        </label>
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-stone-200 p-3 text-sm dark:border-stone-800">
        <legend className="px-1 font-medium">Pristanci</legend>
        <label className="flex gap-2">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>Prihvatam <Link href="/privatnost" className="underline">uslove korištenja i politiku privatnosti</Link> (obavezno).</span>
        </label>
        <label className="flex gap-2">
          <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
          <span>Želim povremeno primati novosti o Kafiću na email (neobavezno).</span>
        </label>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700">Sačuvano.</p>}
      <button className="btn" type="submit">{profile ? "Sačuvaj" : "Uđi u kafić"}</button>

      {profile && <PushSetup userId={profile.id} />}

      {profile && (
        <div className="space-y-2 border-t border-stone-200 pt-5 dark:border-stone-800">
          <button type="button" className="btn-light mr-2" onClick={() => stopPush().then(() => supabase().auth.signOut()).then(() => router.push("/"))}>Odjavi se</button>
          <a href="/nova-lozinka" className="btn-light mr-2 inline-block">Postavi lozinku</a>
          <button type="button" className="text-sm text-red-700 underline" onClick={deleteAccount}>Obriši profil i sve podatke</button>
        </div>
      )}
    </form>
  );
}
