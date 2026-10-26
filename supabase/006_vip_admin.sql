-- Admin može dati VIP članstvo drugima direktno sa admin stranice.
-- Pokreni ovaj fajl u Supabase SQL editoru nakon 005_moderacija.sql (samo jednom).

create or replace function public.keep_verified() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.verified := old.verified;
    new.is_admin := old.is_admin;
    if not public.is_admin() or new.id = auth.uid() then
      new.vip_until := old.vip_until;
      new.banned_until := old.banned_until;
    end if;
  end if;
  return new;
end;
$$;
