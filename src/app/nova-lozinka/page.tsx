"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Ovdje vodi link iz emaila "zaboravljena lozinka". Korisnik je već prijavljen preko linka.
export default function NovaLozinka() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase().auth.updateUser({ password });
    if (error) setError(error.message);
    else router.push("/kafic");
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">Nova lozinka</h1>
      <input className="input" type="password" required minLength={8} placeholder="Nova lozinka (najmanje 8 znakova)"
        autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn" type="submit">Sačuvaj lozinku</button>
    </form>
  );
}
