"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, type Profile } from "./supabase";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = supabase();
    async function load(u: User | null) {
      setUser(u);
      if (u) {
        const { data } = await sb.from("profiles").select("*").eq("id", u.id).maybeSingle();
        setProfile(data);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }
    sb.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => load(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, profile, loading, setProfile };
}
