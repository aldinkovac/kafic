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
  gender: Gender | null;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  instagram: string | null;
  visibility: "members" | "partners";
};

export type Gender = "musko" | "zensko";
export const GENDER_LABEL: Record<Gender, string> = { musko: "Muško", zensko: "Žensko" };

export type PublicProfile = Pick<Profile, "id" | "nickname" | "avatar" | "verified">;

// Red iz pogleda public_profiles. Ako je profil skriven, podaci su prazni a visible je false.
export type MemberProfile = PublicProfile &
  Pick<Profile, "city" | "bio" | "gender" | "birth_year" | "height_cm" | "weight_kg" | "instagram"> & {
    visible: boolean;
    online: boolean;
    created_at: string;
  };

export function ageFromYear(year: number | null) {
  return year ? new Date().getFullYear() - year : null;
}

// Svaki realtime kanal dobija jedinstveno ime. Ako se stranica brzo otvori ponovo,
// Supabase bi inače vratio stari, već pokrenuti kanal, a to ruši stranicu.
export function uniqueChannel(base: string) {
  return `${base}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
