import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function supabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}

export type Profile = {
  id: string;
  nickname: string;
  avatar: string;
  city: string | null;
  bio: string | null;
  verified: boolean;
  hide_from_city: boolean;
};

export type PublicProfile = Pick<Profile, "id" | "nickname" | "avatar" | "verified">;

// Svaki realtime kanal dobija jedinstveno ime. Ako se stranica brzo otvori ponovo,
// Supabase bi inače vratio stari, već pokrenuti kanal, a to ruši stranicu.
export function uniqueChannel(base: string) {
  return `${base}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
