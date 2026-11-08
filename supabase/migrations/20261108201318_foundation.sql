-- Première migration (T-2.2) : extensions, schéma interne, types, droits par défaut fermés,
-- bucket des images de trajet. Réf. design § 4, § 6.1, § 6.6 ; décision P2-b.

-- 1. Droits par défaut fermés (design § 6.6).
-- Supabase accorde par défaut tous les droits à anon et authenticated sur chaque nouvelle
-- table, séquence et fonction de public. On les retire : chaque droit sera accordé
-- explicitement, objet par objet, dans la migration qui crée l'objet.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, public;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, public;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, public;
-- Postgres donne aussi à PUBLIC le droit d'exécuter toute nouvelle fonction, quel que soit
-- le schéma : retiré pour toutes les fonctions créées par les migrations.
alter default privileges for role postgres revoke execute on functions from public;

-- 2. Extensions (schéma extensions de Supabase ; pg_cron impose pg_catalog).
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- 3. Schéma interne : fonctions de droits, triggers et utilitaires, jamais exposé par l'API.
create schema rtdash;
revoke all on schema rtdash from public, anon, authenticated;

-- 4. Types (design § 4).
create type public.app_role as enum (
  'event_manager', 'communication', 'manager', 'hr', 'direction', 'superadmin'
);
create type public.ticket_status as enum ('new', 'in_review', 'accepted', 'refused');
-- Villes et pays : import des fichiers du jeu (initial) ou appris dans l'application (learned).
create type public.data_source as enum ('initial', 'learned');

-- 5. unaccent n'est pas immuable (son dictionnaire pourrait changer) : cette enveloppe
-- l'est, en nommant explicitement le dictionnaire, ce qui la rend utilisable dans un index.
create function rtdash.f_unaccent(value text)
  returns text
  language sql
  immutable
  parallel safe
  strict
  set search_path = ''
  return extensions.unaccent('extensions.unaccent'::regdictionary, value);

-- 6. Bucket privé des images de trajet (P2-b). Ses règles d'accès arrivent avec l'outil (phase 5).
insert into storage.buckets (id, name, public)
values ('route-images', 'route-images', false)
on conflict (id) do nothing;
