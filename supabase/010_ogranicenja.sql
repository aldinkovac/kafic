-- Zaštita od spama: koliko čega jedan korisnik smije poslati u kratkom vremenu.
-- Pokreni ovaj fajl u Supabase SQL editoru nakon 009_lajkovi.sql (samo jednom).
--
-- Brojeve mijenjaš u "create trigger" linijama ispod: kolona korisnika, najviše komada, u koliko vremena.

create function public.rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  who uuid;
  n int;
begin
  -- Konobar i sistem (bez prijavljenog korisnika) nemaju ograničenje.
  if auth.uid() is null then return new; end if;
  who := (to_jsonb(new) ->> tg_argv[0])::uuid;
  if who is null then return new; end if;

  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - $2::interval',
    tg_table_schema, tg_table_name, tg_argv[0]
  ) into n using who, tg_argv[2];

  if n >= tg_argv[1]::int then
    raise exception '%', tg_argv[3] using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Brže brojanje.
create index on public.room_messages (user_id, created_at);
create index on public.private_messages (sender, created_at);
create index on public.chat_requests (from_user, created_at);
create index on public.room_reactions (user_id, created_at);
create index on public.private_reactions (user_id, created_at);
create index on public.reports (reporter, created_at);

create trigger rate_limit before insert on public.room_messages
  for each row execute function public.rate_limit('user_id', '8', '30 seconds',
    'Polako 🙂 Šalješ poruke prebrzo. Sačekaj par sekundi.');
create trigger rate_limit before insert on public.private_messages
  for each row execute function public.rate_limit('sender', '20', '1 minute',
    'Polako 🙂 Šalješ poruke prebrzo. Sačekaj par sekundi.');
create trigger rate_limit before insert on public.chat_requests
  for each row execute function public.rate_limit('from_user', '15', '1 hour',
    'Poslao/la si puno zahtjeva za chat. Probaj ponovo za sat vremena.');
create trigger rate_limit_day before insert on public.chat_requests
  for each row execute function public.rate_limit('from_user', '40', '1 day',
    'Dosta zahtjeva za danas 🙂 Probaj ponovo sutra.');
create trigger rate_limit before insert on public.room_reactions
  for each row execute function public.rate_limit('user_id', '40', '1 minute',
    'Previše lajkova odjednom. Sačekaj malo.');
create trigger rate_limit before insert on public.private_reactions
  for each row execute function public.rate_limit('user_id', '40', '1 minute',
    'Previše lajkova odjednom. Sačekaj malo.');
create trigger rate_limit before insert on public.reports
  for each row execute function public.rate_limit('reporter', '10', '1 day',
    'Poslao/la si puno prijava danas. Admin će ih pregledati.');

-- Najviše 6 slika na profilu (isto kao na stranici Profil).
create trigger rate_limit before insert on public.profile_photos
  for each row execute function public.rate_limit('user_id', '6', '1000 years',
    'Možeš imati najviše 6 slika na profilu. Obriši neku pa dodaj novu.');
