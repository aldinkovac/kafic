"use client";

import { supabase } from "./supabase";

const MAX_SIDE = 1280;

// Smanji sliku i pretvori je u JPEG. Usput se brišu EXIF podaci (npr. lokacija s telefona).
export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Slika se ne može obraditi."))), "image/jpeg", 0.85),
  );
}

export async function uploadImage(folder: string, file: File): Promise<string> {
  const blob = await prepareImage(file);
  const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${folder}/${id}.jpg`;
  const { error } = await supabase().storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

// Privremeni linkovi do slika (važe sat vremena), jer je spremište privatno.
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase().storage.from("photos").createSignedUrls(paths, 3600);
  return Object.fromEntries((data ?? []).filter((d) => d.path && d.signedUrl).map((d) => [d.path as string, d.signedUrl as string]));
}
