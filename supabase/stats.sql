-- Häufigkeits-/"Zuletzt gekauft"-Statistik für die Einkaufsliste (Schritt 4)
-- EINMALIG im Supabase-Dashboard → SQL Editor einfügen und auf "Run" klicken.
-- Setzt voraus, dass die Funktion public.is_member() aus Schritt 2 existiert.

-- 1) Tabelle: pro Produktname ein Zähler + Zeitpunkt des letzten Kaufs
create table if not exists public.stats (
  name      text primary key,
  emo       text,
  buys      integer not null default 0,
  last_buy  timestamptz
);

-- 2) Zugriffsschutz: nur Mitglieder (Bastian + Simone) dürfen lesen/schreiben
alter table public.stats enable row level security;

drop policy if exists "stats_select" on public.stats;
create policy "stats_select" on public.stats for select using (public.is_member());

drop policy if exists "stats_insert" on public.stats;
create policy "stats_insert" on public.stats for insert with check (public.is_member());

drop policy if exists "stats_update" on public.stats;
create policy "stats_update" on public.stats for update using (public.is_member()) with check (public.is_member());

-- 3) Atomarer Zähler: +1 bei jedem Abhaken (wird vom Client per rpc('bump_stat') aufgerufen)
create or replace function public.bump_stat(p_name text, p_emo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_member() then
    raise exception 'not a member';
  end if;
  insert into public.stats (name, emo, buys, last_buy)
  values (p_name, p_emo, 1, now())
  on conflict (name) do update
    set buys     = public.stats.buys + 1,
        last_buy = now(),
        emo      = coalesce(public.stats.emo, excluded.emo);
end;
$$;

-- 4) Realtime aktivieren (damit beide live dieselbe Reihenfolge sehen); doppeltes Hinzufügen ignorieren
do $$
begin
  alter publication supabase_realtime add table public.stats;
exception when duplicate_object then null;
end $$;
