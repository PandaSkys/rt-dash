-- Socle de la base (T-2.1, design § 6.1 et § 13.1) : rôles créés au premier démarrage
-- du conteneur et pg_cron chargé. Lancé par `pnpm db:test` (pg_prove, superutilisateur).
begin;
create extension if not exists pgtap;

select plan(9);

select has_role('rtdash_owner', 'le rôle des migrations existe');
select has_role('rtdash_app', 'le rôle de l''application existe');

select is(
  (select pg_get_userbyid(datdba) from pg_database where datname = current_database()),
  'rtdash_owner',
  'la base appartient à rtdash_owner'
);

select ok(
  not rolsuper and not rolcreaterole and not rolcreatedb and not rolbypassrls,
  'rtdash_app n''a aucun privilège d''administration et ne contourne pas la RLS'
) from pg_roles where rolname = 'rtdash_app';

select ok(
  not rolsuper and not rolbypassrls,
  'rtdash_owner n''est pas superutilisateur et ne contourne pas la RLS'
) from pg_roles where rolname = 'rtdash_owner';

select ok(
  not has_schema_privilege('rtdash_app', 'public', 'CREATE'),
  'rtdash_app ne peut rien créer dans le schéma public'
);

select ok(
  not has_database_privilege('public', current_database(), 'CONNECT'),
  'personne d''autre que les rôles prévus ne peut se connecter à la base'
);

select ok(
  current_setting('shared_preload_libraries') like '%pg_cron%',
  'pg_cron est chargé au démarrage'
);

select has_extension('pg_cron', 'pg_cron est installé dans la base rtdash');

select * from finish();
rollback;
