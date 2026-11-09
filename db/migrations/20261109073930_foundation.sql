-- migrate:up
-- Première migration (T-2.2) : droits par défaut fermés, extensions, schéma interne, types,
-- f_unaccent. Réf. design § 4, § 6.1, § 6.6. Exécutée par rtdash_owner (dbmate).

-- 1. Droits par défaut fermés (design § 6.6).
-- Postgres donne à PUBLIC le droit d'exécuter toute nouvelle fonction : retiré pour toutes
-- les fonctions que créeront les migrations. Tables et séquences naissent déjà sans droit
-- pour les autres rôles ; chaque droit sera accordé explicitement à rtdash_app, objet par objet.
alter default privileges for role rtdash_owner revoke execute on functions from public;

-- 2. Extensions, rangées dans leur propre schéma pour que public ne contienne que nos objets.
-- pg_cron est installé au premier démarrage du conteneur (il exige un superutilisateur).
create schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_cron;

-- 3. Schéma interne : sessions, fonctions de droits, triggers, utilitaires.
-- dbmate l'a peut-être déjà créé pour sa table de suivi (rtdash.schema_migrations).
create schema if not exists rtdash;
revoke all on schema rtdash from public;

-- 4. Types (design § 4).
create type public.app_role as enum (
  'event_manager', 'communication', 'manager', 'hr', 'direction', 'superadmin'
);
create type public.ticket_status as enum ('new', 'in_review', 'accepted', 'refused');
-- Villes et pays : import des fichiers du jeu (initial) ou appris dans l'application (learned).
create type public.data_source as enum ('initial', 'learned');

-- 5. unaccent n'est pas immuable (son dictionnaire pourrait changer) : cette enveloppe l'est,
-- en nommant explicitement le dictionnaire, ce qui la rend utilisable dans un index.
create function rtdash.f_unaccent(value text)
  returns text
  language sql
  immutable
  parallel safe
  strict
  set search_path = ''
  return extensions.unaccent('extensions.unaccent'::regdictionary, value);

-- migrate:down
-- Pas de retour arrière : on corrige par une nouvelle migration (design § 14).
