-- Test structurel (design § 6.6) : verrous valables pour toutes les tables et fonctions,
-- y compris celles des phases suivantes. Un oubli de droit ou de RLS fait échouer la CI.
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

-- 1. Toute table de public a la RLS activée.
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'toute table de public a la RLS activée'
);

-- 2. anon n'a aucun droit sur les tables, vues et séquences de public et rtdash.
select is_empty(
  $$ select n.nspname || '.' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public', 'rtdash') and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
       and (has_table_privilege('anon', c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
            or (c.relkind = 'S' and has_sequence_privilege('anon', c.oid, 'USAGE, SELECT, UPDATE'))) $$,
  'anon n''a aucun droit sur les tables, vues et séquences'
);

-- 3. anon ne peut exécuter aucune fonction de public ou rtdash (hors fonctions d'extension).
select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'rtdash')
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
       and has_function_privilege('anon', p.oid, 'EXECUTE') $$,
  'anon ne peut exécuter aucune fonction'
);

-- 4. PUBLIC ne peut exécuter aucune fonction de public ou rtdash (droit implicite de Postgres retiré).
select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
     where n.nspname in ('public', 'rtdash') and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') $$,
  'PUBLIC ne peut exécuter aucune fonction'
);

-- 5. authenticated n'a ni DELETE ni TRUNCATE sur aucune table de public.
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
       and has_table_privilege('authenticated', c.oid, 'DELETE, TRUNCATE') $$,
  'authenticated n''a ni DELETE ni TRUNCATE'
);

-- 6. Colonnes de parcours et de traçabilité (design § 6.2) jamais modifiables par authenticated.
select is_empty(
  $$ select c.relname || '.' || a.attname from pg_attribute a
     join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
       and a.attnum > 0 and not a.attisdropped
       and a.attname in ('status', 'handler_id', 'handled_at', 'accepted_by', 'accepted_at',
                         'convoy_initialized_at', 'refusal_reason', 'archived_at', 'archived_by',
                         'created_at', 'created_by', 'updated_at', 'updated_by')
       and has_column_privilege('authenticated', c.oid, a.attnum, 'UPDATE') $$,
  'aucune colonne protégée n''est modifiable par authenticated'
);

-- 7. Toute fonction security definer de public ou rtdash fixe son search_path.
select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'rtdash') and p.prosecdef
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%') $$,
  'toute fonction security definer fixe son search_path'
);

-- 8. anon n'a pas accès au schéma interne rtdash.
select ok(not has_schema_privilege('anon', 'rtdash', 'USAGE'), 'anon n''a pas accès au schéma rtdash');

-- 9 à 11. Droits par défaut fermés : une table, une séquence et une fonction créées
-- comme dans une future migration (rôle postgres) n'ont aucun droit pour anon, authenticated ni PUBLIC.
set local role postgres;
create table public.default_privileges_probe (id bigint generated always as identity primary key);
create function public.default_privileges_probe_fn() returns int language sql as 'select 1';
reset role;

select ok(
  not has_table_privilege('anon', 'public.default_privileges_probe', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE')
  and not has_table_privilege('authenticated', 'public.default_privileges_probe', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE'),
  'nouvelle table : aucun droit par défaut pour anon et authenticated'
);
select ok(
  not has_sequence_privilege('anon', 'public.default_privileges_probe_id_seq', 'USAGE, SELECT, UPDATE')
  and not has_sequence_privilege('authenticated', 'public.default_privileges_probe_id_seq', 'USAGE, SELECT, UPDATE'),
  'nouvelle séquence : aucun droit par défaut pour anon et authenticated'
);
select ok(
  not has_function_privilege('anon', 'public.default_privileges_probe_fn()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.default_privileges_probe_fn()', 'EXECUTE'),
  'nouvelle fonction : non exécutable par défaut par anon, authenticated ni PUBLIC'
);

-- 12 à 14. Extensions de la première migration.
select ok(exists (select 1 from pg_extension where extname = 'pg_trgm'), 'extension pg_trgm installée');
select ok(exists (select 1 from pg_extension where extname = 'unaccent'), 'extension unaccent installée');
select ok(exists (select 1 from pg_extension where extname = 'pg_cron'), 'extension pg_cron installée');

-- 15. f_unaccent : immuable (indexable) et sans accents ni majuscules perdues.
select is(rtdash.f_unaccent('Élève à Besançon'), 'Eleve a Besancon', 'f_unaccent retire les accents');
select is(
  (select provolatile from pg_proc where oid = 'rtdash.f_unaccent(text)'::regprocedure), 'i'::"char",
  'f_unaccent est immuable, donc utilisable dans un index'
);

-- 18 à 20. Types enum (design § 4).
select enum_has_labels('public', 'app_role',
  array['event_manager', 'communication', 'manager', 'hr', 'direction', 'superadmin'], 'type app_role');
select enum_has_labels('public', 'ticket_status',
  array['new', 'in_review', 'accepted', 'refused'], 'type ticket_status');
select enum_has_labels('public', 'data_source', array['initial', 'learned'], 'type data_source');

-- 21. Bucket privé des images de trajet (P2-b).
select ok(
  exists (select 1 from storage.buckets where id = 'route-images' and not public),
  'bucket route-images présent et privé'
);

select * from finish();
rollback;
