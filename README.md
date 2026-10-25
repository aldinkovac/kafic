# ☕ Kafić

Diskretno mjesto za upoznavanje za naše ljude u BiH i dijaspori. Ljudi se dopisuju u javnim sobama po kraju i temi, a kad se nekom svide, prelaze u privatni chat.

## Šta radi prva verzija

- Prijava linkom na email, bez lozinke i bez Facebooka.
- Profil s nadimkom i avatarom. Grad i opis vidi samo osoba s kojom prihvatiš privatni chat.
- Odvojeni pristanci (uslovi korištenja, novosti), s datumom davanja i povlačenja.
- Javne sobe po kraju (Sarajevo, Krajina, Hercegovina, Tuzla i Zenica, Dijaspora) i temi (Muzika, Putovanja, 30+, Ozbiljne veze), s porukama uživo.
- Zahtjev za privatni chat, koji druga osoba prihvati ili odbije.
- Privatni chat uživo.
- Lični oglasi (najviše 3 po osobi), na koje se javlja zahtjevom za privatni chat.
- Do 6 slika u profilu. Vidi ih samo osoba s kojom je prihvaćen privatni chat.
- Slanje slika u privatnom chatu. Slike se smanjuju i iz njih se brišu skriveni podaci (npr. lokacija).
- Brojači na naslovnoj (članovi, slike, oglasi, online). Prikazuju se tek kad ima 50 članova.
- Blokiranje i prijava korisnika.
- Brisanje profila i svih podataka jednim klikom.

Pravila pristupa su u bazi (row level security), pa niko ne može čitati tuđe privatne poruke ni sam sebi dati oznaku "verifikovan".

## Pokretanje (jednom)

1. Napravi besplatan projekat na [supabase.com](https://supabase.com). Za regiju izaberi Frankfurt (EU).
2. U Supabase otvori **SQL Editor**, zalijepi cijeli sadržaj `supabase/schema.sql` i klikni **Run**. Zatim isto uradi s fajlom `supabase/002_slike_oglasi.sql`. Svaki fajl se pokreće samo jednom, redom po broju.
3. U **Authentication > URL Configuration** upiši adresu sajta (npr. `https://kafic.vercel.app`) kao Site URL i dodaj `https://kafic.vercel.app/**` u Redirect URLs.
4. Na [vercel.com](https://vercel.com) se prijavi GitHubom i uvezi repozitorij `kafic`.
5. U Vercelu dodaj dvije varijable iz Supabase **Settings > API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Klikni **Deploy**.

## Lokalno

```bash
cp .env.example .env.local   # upiši svoje Supabase vrijednosti
npm install
npm run dev
```

## Sljedeće

- Selfie verifikacija (Didit, 500 besplatnih provjera mjesečno).
- Automatski filter psovki i spama u sobama.
- Mobilna aplikacija (skrivanje od kontakata, blokada snimaka ekrana).
