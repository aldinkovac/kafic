"use client";

import { supabase } from "./supabase";
import { signedUrls } from "./photos";

// Prva (glavna) slika za svakog člana kojeg trenutni korisnik smije vidjeti.
export async function mainPhotos(userIds: string[]): Promise<Record<string, string>> {
  if (!userIds.length) return {};
  const { data } = await supabase().from("profile_photos").select("user_id, path").in("user_id", userIds).order("created_at");
  const first: Record<string, string> = {};
  for (const p of (data ?? []) as { user_id: string; path: string }[]) {
    if (!first[p.user_id]) first[p.user_id] = p.path;
  }
  const urls = await signedUrls(Object.values(first));
  return Object.fromEntries(Object.entries(first).filter(([, path]) => urls[path]).map(([id, path]) => [id, urls[path]]));
}
