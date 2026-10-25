"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "register" | "link" | "forgot";

const TITLES: Record<Mode, string> = {
  login: "Uđi u kafić",
  register: "Napravi nalog",
  link: "Uđi linkom na email",
  forgot: "Zaboravljena lozinka",
};

function translate(message: string) {
  if (/rate limit/i.test(message)) return "Poslali smo previše emailova u kratkom vremenu. Probaj ponovo za sat vremena ili se prijavi lozinkom.";
  if (/invalid login credentials/i.test(message)) return "Pogrešan email ili lozinka.";
  if (/email not confirmed/i.test(message)) return "Email još nije potvrđen. Klikni na link koji smo ti poslali.";
  if (/already registered/i.test(message)) return "Taj email već ima nalog. Prijavi se lozinkom.";
  if (/password should be at least/i.test(message)) return "Lozinka mora imati najmanje 8 znakova.";
  return message;
}

export default function Prijava() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const auth = supabase().auth;
    const origin = window.location.origin;
    let result: { error: { message: string } | null } = { error: null };

    if (mode === "login") {
      result = await auth.signInWithPassword({ email, password });
      if (!result.error) router.push("/kafic");
    } else if (mode === "register") {
      const r = await auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/kafic` } });
      result = r;
      if (!r.error) {
        if (r.data.session) router.push("/profil");
        else setSent("Poslali smo ti email za potvrdu. Klikni na link i nalog je spreman. Poslije se prijavljuješ samo lozinkom, s bilo kog uređaja.");
      }
    } else if (mode === "link") {
      result = await auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/kafic` } });
      if (!result.error) setSent(`Poslali smo ti link za ulazak na ${email}. Otvori ga na ovom uređaju.`);
    } else {
      result = await auth.resetPasswordForEmail(email, { redirectTo: `${origin}/nova-lozinka` });
      if (!result.error) setSent(`Poslali smo ti link za novu lozinku na ${email}.`);
    }

    if (result.error) setError(translate(result.error.message));
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="max-w-sm space-y-2">
        <h1 className="text-2xl font-semibold">Provjeri email</h1>
        <p>{sent}</p>
      </div>
    );
  }

  const needsPassword = mode === "login" || mode === "register";

  return (
    <form onSubmit={submit} className="max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">{TITLES[mode]}</h1>
      <p className="text-sm text-stone-600 dark:text-stone-400">Bez Facebooka. Tvoj email niko drugi ne vidi.</p>

      <input className="input" type="email" required placeholder="tvoj@email.com" autoComplete="email"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      {needsPassword && (
        <input className="input" type="password" required minLength={8} placeholder="Lozinka (najmanje 8 znakova)"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password} onChange={(e) => setPassword(e.target.value)} />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn w-full" type="submit" disabled={busy}>
        {busy ? "…" : { login: "Prijavi se", register: "Napravi nalog", link: "Pošalji link", forgot: "Pošalji link za novu lozinku" }[mode]}
      </button>

      <div className="space-y-1 text-sm">
        {mode !== "login" && <button type="button" className="block underline" onClick={() => setMode("login")}>Imam nalog, prijavi me lozinkom</button>}
        {mode !== "register" && <button type="button" className="block underline" onClick={() => setMode("register")}>Nemam nalog, napravi novi</button>}
        {mode === "login" && <button type="button" className="block underline" onClick={() => setMode("forgot")}>Zaboravio/la sam lozinku</button>}
        {mode !== "link" && <button type="button" className="block text-stone-500 underline" onClick={() => setMode("link")}>Uđi bez lozinke, linkom na email</button>}
      </div>
    </form>
  );
}
