-- OPTIONAL: erlaubt echtes Löschen von Einträgen aus "⭐ Oft gekauft"
-- (Kachel lange gedrückt halten). Ohne diese Policy setzt die App den Zähler
-- nur auf 0 zurück – die Kachel verschwindet dann genauso, die Zeile bleibt
-- aber als Leiche in der Tabelle stehen.
-- EINMALIG im Supabase-Dashboard → SQL Editor einfügen und auf "Run" klicken.

drop policy if exists "stats_delete" on public.stats;
create policy "stats_delete" on public.stats for delete using (public.is_member());
