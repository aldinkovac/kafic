-- Moderacija: admini, zabrana pisanja (ban) i filter psovki.
-- Pokreni ovaj fajl u Supabase SQL editoru nakon 004_kafane_vip.sql (samo jednom).
--
-- Da sebe postaviš za admina, poslije ovoga pokreni (sa svojim emailom):
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'tvoj@email.com');

alter table public.profiles
  add column is_admin boolean not null default false,
  add column banned_until timestamptz;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create function public.is_banned(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select banned_until > now() from profiles where id = u), false);
$$;

-- Korisnik ne može sam sebi dati verifikaciju, VIP, admina ni skinuti ban. Admin može drugima.
create or replace function public.keep_verified() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.verified := old.verified;
    new.vip_until := old.vip_until;
    new.is_admin := old.is_admin;
    if not public.is_admin() or new.id = auth.uid() then
      new.banned_until := old.banned_until;
    end if;
  end if;
  return new;
end;
$$;

drop policy "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert with check (
    auth.uid() = id and verified = false and vip_until is null and is_admin = false and banned_until is null
  );

-- Admin vidi sve profile i smije banovati druge (trigger iznad pušta samo banned_until).
create policy "admin reads profiles" on public.profiles
  for select using (public.is_admin());
create policy "admin bans" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- Banovani ne mogu pisati ni slati zahtjeve (restrictive = važi uz sva ostala pravila).
create policy "no posting when banned" on public.room_messages
  as restrictive for insert to authenticated with check (not public.is_banned(auth.uid()));
create policy "no private messages when banned" on public.private_messages
  as restrictive for insert to authenticated with check (not public.is_banned(auth.uid()));
create policy "no ads when banned" on public.personal_ads
  as restrictive for insert to authenticated with check (not public.is_banned(auth.uid()));
create policy "no requests when banned" on public.chat_requests
  as restrictive for insert to authenticated with check (not public.is_banned(auth.uid()));
create policy "no kafane when banned" on public.rooms
  as restrictive for insert to authenticated with check (not public.is_banned(auth.uid()));

-- Prijave vidi i rješava admin.
alter table public.reports add column resolved boolean not null default false;
create policy "admin reads reports" on public.reports
  for select using (public.is_admin());
create policy "admin resolves reports" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- Admin briše bilo koju poruku u sobi ili oglas.
create policy "admin deletes room messages" on public.room_messages
  for delete using (public.is_admin());
create policy "admin deletes ads" on public.personal_ads
  for delete using (public.is_admin());

-- Filter psovki: riječi (ili njihov početak) iz ove liste se u sobama i oglasima mijenjaju u ***.
create table public.bad_words (word text primary key check (word = lower(word) and char_length(word) >= 3));
insert into public.bad_words (word) values
  ('jeb'), ('pičk'), ('picka'), ('picke'), ('pizd'), ('kurac'), ('kurc'), ('kurv'),
  ('drolj'), ('peder'), ('šupak'), ('supak'), ('balij');

alter table public.bad_words enable row level security;
create policy "admin reads bad words" on public.bad_words for select using (public.is_admin());
create policy "admin edits bad words" on public.bad_words for all using (public.is_admin()) with check (public.is_admin());

create function public.censor(t text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  w text;
begin
  if t is null then return null; end if;
  for w in select word from bad_words loop
    t := regexp_replace(t, '\m' || w || '\w*', '***', 'gi');
  end loop;
  return t;
end;
$$;

create function public.censor_room_message() returns trigger
language plpgsql as $$
begin
  new.body := public.censor(new.body);
  return new;
end;
$$;
create trigger censor_room_message before insert on public.room_messages
  for each row execute function public.censor_room_message();

create function public.censor_ad() returns trigger
language plpgsql as $$
begin
  new.title := public.censor(new.title);
  new.body := public.censor(new.body);
  return new;
end;
$$;
create trigger censor_ad before insert on public.personal_ads
  for each row execute function public.censor_ad();
