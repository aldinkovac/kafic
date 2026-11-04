import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Za API rute: provjera ko je prijavljen, preko tokena koji šalje preglednik.
// Vraća klijenta koji radi s pravima tog korisnika (pa važe ista pravila pristupa kao na sajtu).
export async function userFromRequest(req: Request): Promise<{ sb: SupabaseClient; userId: string } | null> {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer /, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!jwt || !url || !anon) return null;
  const sb = createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data } = await sb.auth.getUser(jwt);
  return data.user ? { sb, userId: data.user.id } : null;
}
