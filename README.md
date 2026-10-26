# ☕ Kafić

Diskretno mjesto za upoznavanje za naše ljude u BiH i dijaspori. Ljudi se dopisuju u javnim sobama po kraju i temi, a kad se nekom svide, prelaze u privatni chat.

## Šta radi prva verzija

- Prijava emailom i lozinkom (radi s bilo kog uređaja) ili linkom na email, bez Facebooka.
- Profil s nadimkom i avatarom. Grad i opis vidi samo osoba s kojom prihvatiš privatni chat.
- Odvojeni pristanci (uslovi korištenja, novosti), s datumom davanja i povlačenja.
- Javne sobe po kraju (Sarajevo, Krajina, Hercegovina, Tuzla i Zenica, Dijaspora) i temi (Muzika, Putovanja, 30+, Ozbiljne veze), s porukama uživo.
- Zahtjev za privatni chat, koji druga osoba prihvati ili odbije.
- Privatni chat uživo.
- Lični oglasi (najviše 3 po osobi), na koje se javlja zahtjevom za privatni chat.
- Profil sa slikama (do 6) i podacima: spol, godina rođenja, visina, težina, mjesto, Instagram.
- Stranica "Članovi" s filterima (spol, godine, mjesto, samo sa slikom) i stranica profila svakog člana.
- Korisnik bira ko vidi njegov profil i slike: svi članovi ili samo osobe s kojima je prihvatio privatni chat.
- Slanje slika u privatnom chatu. Slike se smanjuju i iz njih se brišu skriveni podaci (npr. lokacija).
- Brojači na naslovnoj (članovi, slike, oglasi, online). Prikazuju se tek kad ima 50 članova.
- Kafane: svaki član može otvoriti svoju kafanu (VIP do 5), zatvorenu ili otvorenu, i pozvati raju linkom ili preko WhatsAppa.
- VIP članstvo: zvjezdica, prvo mjesto među članovima, više kafana. Stranica `/vip`.
- Blokiranje i prijava korisnika.
- Admin stranica `/admin`: prijave, zabrana pisanja (1 dan, 7 dana, trajno), brisanje poruka i oglasa, lista psovki.
- Filter psovki u sobama i oglasima.
- Brisanje profila i svih podataka jednim klikom.

Pravila pristupa su u bazi (row level security), pa niko ne može čitati tuđe privatne poruke ni sam sebi dati oznaku "verifikovan".

## Pokretanje (jednom)

1. Napravi besplatan projekat na [supabase.com](https://supabase.com). Za regiju izaberi Frankfurt (EU).
2. U Supabase otvori **SQL Editor**, zalijepi cijeli sadržaj `supabase/schema.sql` i klikni **Run**. Zatim isto uradi s fajlovima `supabase/002_slike_oglasi.sql`, `supabase/003_javni_profili.sql`, `supabase/004_kafane_vip.sql`, `supabase/005_moderacija.sql` i `supabase/006_vip_admin.sql`. Svaki fajl se pokreće samo jednom, redom po broju.
3. U **Authentication > URL Configuration** upiši adresu sajta (npr. `https://kafic.vercel.app`) kao Site URL i dodaj `https://kafic.vercel.app/**` u Redirect URLs.
4. Na [vercel.com](https://vercel.com) se prijavi GitHubom i uvezi repozitorij `kafic`.
5. U Vercelu dodaj dvije varijable iz Supabase **Settings > API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Klikni **Deploy**.

## Slanje emailova (obavezno prije lansiranja)

Supabase-ov ugrađeni email šalje samo nekoliko poruka na sat, pa se brzo pojavi greška "email rate limit exceeded". Za pravi sajt treba vlastiti SMTP:

1. Napravi besplatan nalog na [resend.com](https://resend.com) (3.000 emailova mjesečno besplatno) i dodaj svoju domenu.
2. U Resendu napravi API ključ.
3. U Supabase otvori **Authentication > Emails > SMTP Settings**, uključi "Custom SMTP" i upiši: host `smtp.resend.com`, port `465`, korisnik `resend`, lozinka = API ključ, pošiljalac npr. `kafic@tvoja-domena.ba`.
4. U **Authentication > Rate Limits** povećaj broj emailova na sat.

## Kako postati admin

U Supabase SQL Editoru pokreni (sa svojim emailom):

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'tvoj@email.com');
```

Poslije toga u meniju vidiš link **Admin**.

## Kako aktivirati VIP člana (dok nema online plaćanja)

Na stranici **Admin**, u dijelu "VIP članovi", nađi člana po nadimku i klikni "+1 mjesec" ili "+1 godina".

Cijenu i tekst o plaćanju mijenjaš u fajlu `src/lib/vip.ts`.

## Lokalno

```bash
cp .env.example .env.local   # upiši svoje Supabase vrijednosti
npm install
npm run dev
```

## Sljedeće

- Selfie verifikacija (Didit, 500 besplatnih provjera mjesečno).
- Mobilna aplikacija (skrivanje od kontakata, blokada snimaka ekrana).
