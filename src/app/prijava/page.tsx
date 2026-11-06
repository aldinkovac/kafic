"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase, takeRememberedPath } from "@/lib/supabase";
import { PHOTOS } from "@/lib/stock-photos";

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
  const [emailInput, setEmail] = useState("");
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
    // Mobilne tastature zna dodati razmak ili veliko slovo na početku.
    const email = emailInput.trim().toLowerCase();
    let result: { error: { message: string } | null } = { error: null };

    if (mode === "login") {
      result = await auth.signInWithPassword({ email, password });
      if (!result.error) router.push(takeRememberedPath("/kafic"));
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
      <AuthShell>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Provjeri email</h1>
        <p className="text-stone-600 dark:text-stone-400">{sent}</p>
      </div>
      </AuthShell>
    );
  }

  const needsPassword = mode === "login" || mode === "register";

  return (
    <AuthShell>
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-3xl font-extrabold tracking-tight">{TITLES[mode]}</h1>
      <p className="text-sm text-stone-600 dark:text-stone-400">Bez Facebooka. Tvoj email niko drugi ne vidi.</p>

      <input className="input" type="email" required placeholder="tvoj@email.com" autoComplete="email"
        value={emailInput} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" />
      {needsPassword && (
        <input className="input" type="password" autoCapitalize="none" autoCorrect="off" required minLength={8} placeholder="Lozinka (najmanje 8 znakova)"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password} onChange={(e) => setPassword(e.target.value)} />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn w-full py-3" type="submit" disabled={busy}>
        {busy ? "…" : { login: "Prijavi se", register: "Napravi nalog", link: "Pošalji link", forgot: "Pošalji link za novu lozinku" }[mode]}
      </button>

      <div className="space-y-2 border-t border-stone-200 pt-4 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-400">
        {mode !== "login" && <button type="button" className="block hover:text-stone-950 hover:underline dark:hover:text-white" onClick={() => setMode("login")}>Imam nalog, prijavi me lozinkom</button>}
        {mode !== "register" && <button type="button" className="block hover:text-stone-950 hover:underline dark:hover:text-white" onClick={() => setMode("register")}>Nemam nalog, napravi novi</button>}
        {mode === "login" && <button type="button" className="block hover:text-stone-950 hover:underline dark:hover:text-white" onClick={() => setMode("forgot")}>Zaboravio/la sam lozinku</button>}
        {mode !== "link" && <button type="button" className="block text-stone-500 hover:underline" onClick={() => setMode("link")}>Uđi bez lozinke, linkom na email</button>}
      </div>
    </form>
    </AuthShell>
  );
}

// Forma lijevo, fotografija desno (na telefonu samo forma).
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[70vh] items-stretch gap-6 md:grid-cols-2">
      <div className="flex items-center justify-center">
        <div className="card w-full max-w-sm p-7 shadow-xl shadow-stone-900/5">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden rounded-[2rem] bg-stone-200 md:block dark:bg-stone-800">
        <Image src={PHOTOS.prijateljice.src} alt={PHOTOS.prijateljice.alt} fill sizes="560px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
        <p className="absolute inset-x-8 bottom-8 text-3xl font-extrabold leading-tight text-white">Tvoje ime ostaje tvoje.<br />Društvo je ovdje.</p>
      </div>
    </div>
  );
}
