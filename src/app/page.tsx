import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-4 py-8">
        <h1 className="text-4xl font-bold">Svrati na kafu.</h1>
        <p className="text-lg text-stone-600 dark:text-stone-300">
          Kafić je mjesto gdje se naši ljudi iz BiH i dijaspore upoznaju opušteno: u javnim sobama po kraju
          i temi, a kad se nekom svidiš, nastavite u privatnom chatu.
        </p>
        <div className="flex gap-3">
          <Link href="/prijava" className="btn">Uđi u kafić</Link>
          <Link href="/privatnost" className="btn-light">Kako čuvamo privatnost</Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Samo nadimak", "U sobama se vidi samo tvoj nadimak i avatar. Pravo ime i slike niko ne vidi."],
          ["Ti biraš ko piše", "Privatni chat počinje tek kad prihvatiš zahtjev."],
          ["Stvarni ljudi", "Nema lažnih profila ni botova. Svako u kafiću je stvarna osoba."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
