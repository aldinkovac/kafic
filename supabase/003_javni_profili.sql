-- Javni profili: podaci o sebi i slike koje vide drugi članovi.
-- Pokreni ovaj fajl u Supabase SQL editoru nakon 002_slike_oglasi.sql (samo jednom).
--
-- Svaki korisnik bira ko vidi njegov profil i slike:
--   'members'  = svi prijavljeni članovi
--   'partners' = samo osobe s kojima je prihvatio privatni chat

alter table public.profiles
  add column gender text check (gender in ('musko', 'zensko')),
  add column birth_year int check (birth_year between 1920 and extract(year from now())::int - 18),
  add column height_cm int check (height_cm between 120 and 230),
  add column weight_kg int check (weight_kg between 35 and 250),
  add column instagram text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  add column visibility text not null default 'members' check (visibility in ('members', 'partners'));

-- Da li trenutni korisnik smije vidjeti cijeli profil i slike drugog korisnika.
create function public.can_see_profile(other text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    auth.uid()::text = other
    or is_chat_partner(other)
    or exists (
      select 1 from profiles p
      where p.id::text = other and p.visibility = 'members'
        and not is_blocked(auth.uid(), p.id)
    )
  );
$$;

-- Pogled koji koriste stranice. Skriveni profili pokazuju samo nadimak i avatar.
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
    p.created_at
  from public.profiles p
  cross join lateral (select public.can_see_profile(p.id::text) as ok) s
  where auth.uid() is not null and not public.is_blocked(auth.uid(), p.id);
grant select on public.public_profiles to authenticated;

-- Slike: vidljive članovima ako je profil javan.
create policy "visible profile photos" on public.profile_photos
  for select using (can_see_profile(user_id::text));

create policy "read visible profile photos" on storage.objects
  for select to authenticated using (
    bucket_id = 'photos'
    and (storage.foldername(name))[2] = 'profile'
    and public.can_see_profile((storage.foldername(name))[1])
  );
