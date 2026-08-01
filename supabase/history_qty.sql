-- Verlauf: Menge + Einheit mitspeichern, damit im Verlauf z. B. "3", "600 g" oder "❄️" steht.
-- Einmalig im Supabase SQL-Editor ausführen (Projekt: ynkvoujaqqoslbzslbvb).
-- Bestehende RLS-Policies gelten spaltenübergreifend weiter; keine Policy-Änderung nötig.

alter table public.history
  add column if not exists qty  numeric,
  add column if not exists unit text;
