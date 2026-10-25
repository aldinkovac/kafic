"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Prijava() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/kafic` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Provjeri email</h1>
        <p>Poslali smo ti link za ulazak na {email}. Klikni na njega i ulaziš u kafić.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">Uđi u kafić</h1>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Bez lozinke i bez Facebooka. Pošaljemo ti link na email, a email niko drugi ne vidi.
      </p>
      <input className="input" type="email" required placeholder="tvoj@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn" type="submit">Pošalji link</button>
    </form>
  );
}
