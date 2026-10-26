"use client";

import { useEffect } from "react";
import { supabase, rememberPath } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import type { Profile } from "@/lib/supabase";

// Pušta dalje samo prijavljene korisnike koji su napravili profil.
export function RequireProfile({ children }: { children: (profile: Profile) => React.ReactNode }) {
  const { user, profile, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) rememberPath(window.location.pathname);
    if (!user) router.replace("/prijava");
    else if (!profile) router.replace("/profil");
  }, [loading, user, profile, router]);

  // Javlja da je korisnik online (za brojač na naslovnoj).
  useEffect(() => {
    if (!profile) return;
    const ping = () => supabase().from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", profile.id).then();
    ping();
    const timer = setInterval(ping, 2 * 60 * 1000);
    return () => clearInterval(timer);
  }, [profile]);

  if (loading || !profile) return <p className="p-6 text-stone-500">Učitavam…</p>;
  const banned = profile.banned_until && new Date(profile.banned_until) > new Date();
  return (
    <>
      {banned && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          Zbog prijava ti je zabranjeno pisanje do {new Date(profile.banned_until!).toLocaleString("bs-BA")}. Možeš čitati, ali ne i pisati.
        </p>
      )}
      {children(profile)}
    </>
  );
}
