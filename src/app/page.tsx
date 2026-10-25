import Link from "next/link";
import Image from "next/image";
import { SiteStats } from "@/components/SiteStats";

const FEATURES = [
  "Komuniciraj privatnim porukama",
  "Objavi, razmijeni i pogledaj fotografije",
  "Pregledaj i objavi lične oglase",
  "Pronađi osobe sličnih razmišljanja",
];

const STEPS = [
  ["1", "Sjedni za sto", "Izaberi sobu po svom kraju ili temi: Sarajevo, Krajina, Dijaspora, Muzika, 30+…"],
  ["2", "Opusti se u razgovoru", "Dopisuj se s ljudima u sobi. Svi vide samo tvoj nadimak i avatar."],
  ["3", "Pozovi na kafu udvoje", "Kad ti se neko svidi, pošalji zahtjev za privatni chat. Tek tad se vide slike."],
];

const PROMISES = [
  ["🤫", "Niko iz mahale ne zna", "Bez pravog imena, bez Facebooka. U sobama se vidi samo nadimak."],
  ["🖼️", "Slike samo za odabrane", "Tvoje slike vidi samo osoba s kojom prihvatiš privatni chat. Brišemo i skrivene podatke iz slike, npr. lokaciju."],
  ["🙋", "Stvarni ljudi", "Nema lažnih profila ni botova. Jedan čovjek, jedan profil."],
  ["🗑️", "Odlaziš kad hoćeš", "Jedan klik briše profil, poruke i slike. Zauvijek."],
];

const ROOMS = ["Sarajevo", "Krajina", "Hercegovina", "Tuzla i Zenica", "Dijaspora", "Muzika", "Putovanja", "30+", "Ozbiljne veze"];

export default function Home() {
  return (
    <div className="space-y-16 pb-8">
      <section className="grid items-center gap-8 pt-4 md:grid-cols-2">
        <div className="space-y-5">
          <p className="inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            ☕ Kafić · za naše ljude u BiH i dijaspori
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Potpuna<br />
            <span className="text-amber-700 dark:text-amber-400">anonimnost.</span>
          </h1>
          <p className="text-lg text-stone-600 dark:text-stone-300">
            Bez pravog imena, bez Facebooka. Tvoje slike vide samo oni kojima ti dozvoliš.
          </p>
          <ul className="space-y-2 text-lg">
            {FEATURES.map((f) => (
              <li key={f} className="flex gap-3">
                <span className="mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-amber-700 text-sm text-white">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/prijava" className="btn text-lg">Napravi besplatan profil</Link>
            <a href="#kako" className="btn-light text-lg">Kako radi</a>
          </div>
        </div>
        <Image src="/hero.svg" alt="Bosanska kafa za dvoje: džezva, dva fildžana i rahat lokum kraj prozora" width={640} height={480}
          className="w-full rounded-3xl shadow-xl shadow-amber-900/10" priority />
      </section>

      <SiteStats />

      <section id="kako" className="space-y-6">
        <h2 className="text-3xl font-bold">Kako radi</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-stone-900">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-700 font-bold text-white">{n}</div>
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl font-bold">Stolovi u kafiću</h2>
        <div className="flex flex-wrap gap-2">
          {ROOMS.map((r) => (
            <span key={r} className="rounded-full border border-amber-700/30 bg-amber-50 px-4 py-2 text-sm dark:bg-stone-900">☕ {r}</span>
          ))}
        </div>
      </section>

      <section className="space-y-6 rounded-3xl bg-stone-900 p-8 text-stone-100 dark:bg-stone-800">
        <h2 className="text-3xl font-bold">Tvoja privatnost je na prvom mjestu</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {PROMISES.map(([icon, t, d]) => (
            <div key={t} className="flex gap-3">
              <span className="text-3xl">{icon}</span>
              <div>
                <h3 className="font-semibold">{t}</h3>
                <p className="text-sm text-stone-300">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 text-center">
        <h2 className="text-3xl font-bold">Kafa se hladi.</h2>
        <Link href="/prijava" className="btn inline-block text-lg">Uđi u kafić</Link>
      </section>
    </div>
  );
}
