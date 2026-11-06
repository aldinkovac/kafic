import Link from "next/link";
import Image from "next/image";
import { SiteStats } from "@/components/SiteStats";
import { Opening } from "@/components/Opening";
import { PHOTOS } from "@/lib/stock-photos";

const STEPS = [
  { n: "01", t: "Sjedni za sto", d: "Izaberi sobu po svom kraju ili temi: Sarajevo, Krajina, Dijaspora, Muzika, 30+…", photo: PHOTOS.sto },
  { n: "02", t: "Opusti se u razgovoru", d: "Dopisuj se s ljudima u sobi. Svi vide samo tvoj nadimak i avatar.", photo: PHOTOS.prijateljice },
  { n: "03", t: "Pozovi na kafu udvoje", d: "Kad ti se neko svidi, pošalji zahtjev za privatni chat. Slike se otvaraju tek kad oboje želite.", photo: PHOTOS.par },
];

const PROMISES = [
  { t: "Niko iz mahale ne zna", d: "Bez pravog imena, bez Facebooka. Profil vide samo prijavljeni članovi.", icon: "M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" },
  { t: "Ti biraš ko vidi slike", d: "Svi članovi ili samo oni s kojima si u privatnom chatu. Iz slika brišemo lokaciju.", icon: "M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" },
  { t: "Stvarni ljudi", d: "Nema lažnih profila. Jedini bot je Konobar i uvijek piše da je bot.", icon: "M8 12.5 11 15.5 16.5 9M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" },
  { t: "Odlaziš kad hoćeš", d: "Jedan klik briše profil, poruke i slike. Zauvijek.", icon: "M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" },
];

const ROOMS = ["Sarajevo", "Krajina", "Hercegovina", "Tuzla i Zenica", "Dijaspora", "Muzika", "Putovanja", "30+", "Ozbiljne veze"];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="space-y-24 pb-8 md:space-y-32">
      {/* Uvod */}
      <section className="grid items-center gap-10 pt-4 md:grid-cols-[1.05fr_1fr] md:pt-12">
        <div className="space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
            Za našu raju u BiH i dijaspori
          </p>
          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight md:text-7xl">
            Upoznaj nekog<br />
            <span className="text-amber-600">uz kafu.</span>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-stone-600 dark:text-stone-400">
            Opušteno, diskretno i bez pritiska. Bez pravog imena, bez Facebooka, a slike vide samo oni kojima ti dozvoliš.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/prijava" className="btn-accent px-7 py-3.5 text-base">Napravi besplatan profil</Link>
            <a href="#kako" className="btn-light px-6 py-3.5 text-base">Kako radi</a>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500">
            <span>🔒 Potpuna anonimnost</span>
            <span>✓ Stvarni ljudi</span>
            <span>✕ Brisanje jednim klikom</span>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-stone-200 shadow-2xl shadow-stone-900/10 dark:bg-stone-800 md:aspect-[5/6]">
            <Image src={PHOTOS.selfie.src} alt={PHOTOS.selfie.alt} fill priority sizes="(min-width: 768px) 520px, 100vw" className="object-cover" />
          </div>
          {/* Mali "isječci" iz aplikacije, da se vidi kako izgleda. */}
          <div className="absolute -left-3 bottom-10 flex items-center gap-3 rounded-2xl bg-white/95 p-3 pr-5 shadow-xl backdrop-blur dark:bg-stone-900/95 md:-left-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-xl dark:bg-amber-950">☕</span>
            <div className="text-sm">
              <div className="font-semibold">Poziv na kafu prihvaćen</div>
              <div className="text-stone-500">Privatni chat je otvoren</div>
            </div>
          </div>
          <div className="absolute -right-2 top-8 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-xl dark:bg-white dark:text-stone-950 md:-right-5">
            🔒 Slike samo za tvoje
          </div>
        </div>
      </section>

      <Opening />

      <SiteStats />

      {/* Kako radi */}
      <section id="kako" className="scroll-mt-24 space-y-10">
        <div className="max-w-xl space-y-3">
          <p className="eyebrow">Kako radi</p>
          <h2 className="text-4xl font-extrabold md:text-5xl">Kao u kafiću. Samo s telefona.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <article key={s.n} className="group card overflow-hidden">
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-200 dark:bg-stone-800">
                <Image src={s.photo.src} alt={s.photo.alt} fill sizes="(min-width: 768px) 360px, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="space-y-2 p-6">
                <span className="text-sm font-bold text-amber-600">{s.n}</span>
                <h3 className="text-xl font-bold">{s.t}</h3>
                <p className="text-stone-600 dark:text-stone-400">{s.d}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Sobe */}
      <section className="card space-y-6 p-8 text-center md:p-14">
        <p className="eyebrow">Stolovi u kafiću</p>
        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold md:text-4xl">Nađi svoj sto, po kraju ili po onome što voliš.</h2>
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
          {ROOMS.map((r) => (
            <span key={r} className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium transition hover:border-stone-950 dark:border-stone-700 dark:hover:border-white">
              {r}
            </span>
          ))}
        </div>
      </section>

      {/* Kafana */}
      <section className="grid items-center gap-10 md:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-stone-200 dark:bg-stone-800">
          <Image src={PHOTOS.raja.src} alt={PHOTOS.raja.alt} fill sizes="(min-width: 768px) 560px, 100vw" className="object-cover" />
        </div>
        <div className="space-y-5">
          <p className="eyebrow">Za tvoju raju</p>
          <h2 className="text-4xl font-extrabold md:text-5xl">Otvori svoju kafanu.</h2>
          <p className="text-lg leading-relaxed text-stone-600 dark:text-stone-400">
            Daj joj ime, pozovi društvo linkom preko WhatsAppa i družite se kao u staroj kafani.
            Može biti zatvorena samo za vaše ili otvorena za sve.
          </p>
          <Link href="/kafic" className="btn px-6 py-3">Otvori kafanu</Link>
        </div>
      </section>

      {/* Privatnost */}
      <section className="overflow-hidden rounded-[2rem] bg-stone-950 p-8 text-white md:p-14">
        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Privatnost na prvom mjestu</p>
            <h2 className="text-4xl font-extrabold md:text-5xl">Ono što se desi u kafiću, ostaje u kafiću.</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            {PROMISES.map((p) => (
              <div key={p.t} className="space-y-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-amber-400"><Icon d={p.icon} /></span>
                <h3 className="font-bold">{p.t}</h3>
                <p className="text-sm leading-relaxed text-stone-400">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Završni poziv */}
      <section className="relative overflow-hidden rounded-[2rem] bg-stone-800">
        <Image src={PHOTOS.smijeh.src} alt={PHOTOS.smijeh.alt} fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        <div className="relative flex min-h-[420px] flex-col items-center justify-end gap-5 p-8 text-center text-white md:min-h-[520px] md:p-14">
          <h2 className="text-5xl font-extrabold md:text-7xl">Kafa se hladi.</h2>
          <p className="max-w-md text-lg text-white/80">Profil praviš za minut. Besplatno.</p>
          <Link href="/prijava" className="btn-accent px-8 py-4 text-base">Uđi u kafić</Link>
        </div>
      </section>

      <p className="text-center text-xs text-stone-400">
        Fotografije: Unsplash ({[...new Set(Object.values(PHOTOS).map((p) => p.author))].join(", ")}). Osobe na fotografijama su modeli, a ne članovi Kafića.
      </p>
    </div>
  );
}
