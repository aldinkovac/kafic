"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signedUrls, uploadImage } from "@/lib/photos";

const MAX_PHOTOS = 6;

type Photo = { id: number; path: string };

export function ProfilePhotos({ userId }: { userId: string }) {
  const sb = supabase();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data } = await sb.from("profile_photos").select("id, path").eq("user_id", userId).order("created_at");
    const list = (data ?? []) as Photo[];
    setPhotos(list);
    setUrls(await signedUrls(list.map((p) => p.path)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const path = await uploadImage(`${userId}/profile`, file);
      const { error } = await sb.from("profile_photos").insert({ user_id: userId, path });
      if (error) throw error;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Slika nije spremljena.");
    }
    setBusy(false);
  }

  async function remove(photo: Photo) {
    await sb.storage.from("photos").remove([photo.path]);
    await sb.from("profile_photos").delete().eq("id", photo.id);
    load();
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Tvoje slike</span>
      <p className="text-xs text-stone-500">
        Ko vidi slike biraš ispod, u dijelu &quot;Ko vidi moj profil i slike&quot;. Prva slika je glavna.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg bg-stone-200 dark:bg-stone-800">
            {urls[p.path] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[p.path]} alt="" className="h-full w-full object-cover" />
            )}
            <button type="button" onClick={() => remove(p)}
              className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-sm text-white">✕</button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-3xl text-stone-400 hover:border-amber-700 dark:border-stone-700">
            {busy ? "…" : "+"}
            <input type="file" accept="image/*" className="hidden" onChange={add} disabled={busy} />
          </label>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
