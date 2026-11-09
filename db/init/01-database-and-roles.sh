#!/bin/bash
# Premier démarrage du conteneur seulement (volume vide) : base « rtdash » et ses deux rôles
# (design § 6.1). Le superutilisateur « postgres » ne sert qu'ici.
#   rtdash_owner : propriétaire du schéma, utilisé par les migrations (dbmate) ;
#   rtdash_app   : rôle de l'application, soumis à la RLS, sans droit sur le schéma.
set -euo pipefail

: "${RTDASH_OWNER_PASSWORD:?RTDASH_OWNER_PASSWORD manquant}"
: "${RTDASH_APP_PASSWORD:?RTDASH_APP_PASSWORD manquant}"

psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres \
  -v owner_password="$RTDASH_OWNER_PASSWORD" -v app_password="$RTDASH_APP_PASSWORD" <<'SQL'
create role rtdash_owner login password :'owner_password';
create role rtdash_app login nobypassrls password :'app_password';
create database rtdash owner rtdash_owner;
revoke all on database rtdash from public;
grant connect on database rtdash to rtdash_app;
SQL

psql -v ON_ERROR_STOP=1 --username postgres --dbname rtdash <<'SQL'
-- Le schéma public appartient au propriétaire de la base (Postgres 15+) ;
-- l'application peut seulement y accéder, jamais y créer d'objet.
revoke all on schema public from public;
grant usage on schema public to rtdash_app;

-- pg_cron exige un superutilisateur pour être installé : fait ici, une fois pour toutes.
-- Les migrations (rtdash_owner) programment ensuite leurs tâches.
create extension if not exists pg_cron;
grant usage on schema cron to rtdash_owner;
SQL
