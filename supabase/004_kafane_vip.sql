-- Kafane koje prave korisnici i VIP članstvo.
-- Pokreni ovaj fajl u Supabase SQL editoru nakon 003_javni_profili.sql (samo jednom).

-- VIP ---------------------------------------------------------------------

-- Do kada je član VIP. Postavlja ga samo admin (u Table Editoru ili SQL-om), nikad sam korisnik.
alter table public.profiles add column vip_until timestamptz;

create or replace function public.keep_verified() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.verified := old.verified;
    new.vip_until := old.vip_until;
  end if;
  return new;
end;
$$;

drop policy "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id and verified = false and vip_until is null);

create function public.is_vip(u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select vip_until > now() from profiles where id = u), false);
$$;

create or replace view public.public_profiles with (security_invoker = false) as
  select
    p.id, p.nickname, p.avatar, p.verified,
    case when s.ok then p.city end as city,
    case when s.ok then p.bio end as bio,
    case when s.ok then p.gender end as gender,
    case when s.ok then p.birth_year end as birth_year,
    case when s.ok then p.height_cm end as height_cm,
    case when s.ok then p.weight_kg end as weight_kg,
    case when s.ok then p.instagram end as instagram,
    s.ok as visible,
    p.last_seen_at > now() - interval '5 minutes' as online,
    p.created_at,
    coalesce(p.vip_until > now(), false) as vip
  from public.profiles p
  cross join lateral (select public.can_see_profile(p.id::text) as ok) s
  where auth.uid() is not null and not public.is_blocked(auth.uid(), p.id);

-- Kafane ------------------------------------------------------------------

alter table public.rooms drop constraint rooms_category_check;
alter table public.rooms
  add constraint rooms_category_check check (category in ('kraj', 'tema', 'kafana')),
  add column owner_id uuid references public.profiles on delete cascade,
  add column is_open boolean not null default true,
  add column invite_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 12),
  add column created_at timestamptz not null default now();

create table public.room_members (
  room_id int not null references public.rooms on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- Da li trenutni korisnik smije ući u sobu.
create function public.can_access_room(r int) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from rooms
    where id = r and (
      category <> 'kafana' or is_open or owner_id = auth.uid()
      or exists (select 1 from room_members m where m.room_id = r and m.user_id = auth.uid())
    )
  );
$$;

-- Ulazak u zatvorenu kafanu preko pozivnog koda. Vraća slug kafane.
create function public.join_kafana(code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  r rooms;
begin
  select * into r from rooms where invite_code = code and category = 'kafana';
  if r.id is null then
    raise exception 'Pozivnica ne postoji ili je kafana zatvorena.';
  end if;
  if is_blocked(auth.uid(), r.owner_id) then
    raise exception 'Ne možeš ući u ovu kafanu.';
  end if;
  insert into room_members (room_id, user_id) values (r.id, auth.uid()) on conflict do nothing;
  return r.slug;
end;
$$;

drop policy "rooms readable" on public.rooms;
create policy "rooms readable" on public.rooms
  for select to authenticated using (can_access_room(id));
create policy "open own kafana" on public.rooms
  for insert to authenticated with check (
    owner_id = auth.uid() and category = 'kafana'
    and (select count(*) from rooms where owner_id = auth.uid()) < case when is_vip(auth.uid()) then 5 else 1 end
  );
create policy "edit own kafana" on public.rooms
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid() and category = 'kafana');
create policy "close own kafana" on public.rooms
  for delete using (owner_id = auth.uid());

alter table public.room_members enable row level security;
create policy "see kafana members" on public.room_members
  for select to authenticated using (can_access_room(room_id));
create policy "join open kafana" on public.room_members
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from rooms where id = room_id and category = 'kafana' and is_open)
  );
create policy "leave or remove from kafana" on public.room_members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from rooms where id = room_id and owner_id = auth.uid())
  );

-- Poruke u kafani vide i pišu samo oni koji smiju ući.
drop policy "read room messages" on public.room_messages;
create policy "read room messages" on public.room_messages
  for select to authenticated using (can_access_room(room_id) and not is_blocked(auth.uid(), user_id));
drop policy "post room messages" on public.room_messages;
create policy "post room messages" on public.room_messages
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid())
    and can_access_room(room_id)
  );
