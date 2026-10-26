export default function Privatnost() {
  return (
    <article className="max-w-2xl space-y-4 text-sm leading-6">
      <h1 className="text-2xl font-semibold">Privatnost i uslovi korištenja</h1>
      <p className="rounded-lg bg-amber-50 p-3 dark:bg-stone-800">
        Nacrt. Prije javnog lansiranja ovaj tekst treba pregledati advokat, u skladu sa Zakonom o zaštiti ličnih podataka BiH (Službeni glasnik BiH 12/25).
      </p>
      <h2 className="text-lg font-semibold">Koje podatke čuvamo</h2>
      <ul className="list-disc pl-5">
        <li>Email, samo za prijavu. Niko drugi ga ne vidi.</li>
        <li>Nadimak i avatar, koje vide svi u sobama.</li>
        <li>Podaci o sebi koje sam uneseš: spol, godina rođenja, visina, težina, mjesto, Instagram i opis.</li>
        <li>Slike u profilu.</li>
        <li>Ti biraš ko vidi tvoj profil i slike: svi prijavljeni članovi ili samo osobe s kojima prihvatiš privatni chat. Neprijavljeni posjetioci ne vide ništa.</li>
        <li>Lični oglasi, koje vide svi prijavljeni članovi, pod tvojim nadimkom.</li>
        <li>Poruke i slike u sobama i privatnim chatovima. Iz slika brišemo skrivene podatke, npr. lokaciju.</li>
        <li>Vrijeme zadnje aktivnosti, da bismo mogli prikazati koliko je članova online.</li>
        <li>Tvoje pristanke, s datumom kad si ih dao ili povukao.</li>
      </ul>
      <h2 className="text-lg font-semibold">Tvoja prava</h2>
      <ul className="list-disc pl-5">
        <li>Možeš u svakom trenutku povući pristanak za novosti u svom profilu.</li>
        <li>Možeš obrisati profil jednim klikom. Tada trajno brišemo profil, poruke, slike, oglase i pristanke.</li>
        <li>Možeš tražiti kopiju svojih podataka.</li>
      </ul>
      <h2 className="text-lg font-semibold">Pravila kafića</h2>
      <ul className="list-disc pl-5">
        <li>Moraš imati najmanje 18 godina.</li>
        <li>Jedan profil po osobi. Lažni profili i botovi nisu dozvoljeni.</li>
        <li>Bez uznemiravanja, prijetnji, mržnje i neželjenih eksplicitnih poruka. Takve profile brišemo.</li>
        <li>Objavljuj samo svoje slike, i samo one za koje imaš pravo. Bez tuđih slika i bez slika maloljetnika.</li>
        <li>Nikome ne šalji novac koga nisi upoznao uživo.</li>
      </ul>
    </article>
  );
}
