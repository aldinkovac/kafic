"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import type { Profile } from "@/lib/supabase";

// Pušta dalje samo prijavljene korisnike koji su napravili profil.
export function RequireProfile({ children }: { children: (profile: Profile) => React.ReactNode }) {
  const { user, profile, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/prijava");
    else if (!profile) router.replace("/profil");
  }, [loading, user, profile, router]);

  if (loading || !profile) return <p className="p-6 text-stone-500">Učitavam…</p>;
  return <>{children(profile)}</>;
}
