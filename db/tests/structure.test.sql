-- Test structurel (design § 6.6) : verrous valables pour toutes les tables et fonctions,
-- y compris celles des phases suivantes. Un oubli de droit ou de RLS fait échouer la CI.
begin;
create extension if not exists pgtap;

select plan(20);

-- 1. Toute table de public a la RLS activée.
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'toute table de public a la RLS activée'
);

-- 2. PUBLIC n'a aucun droit sur les tables, vues et séquences de public et rtdash
-- (hors objets d'extensions, comme les vues de pgTAP installées pour ce test).
select is_empty(
  $$ select n.nspname || '.' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     cross join lateral aclexplode(coalesce(c.relacl, acldefault((case when c.relkind = 'S' then 's' else 'r' end)::"char", c.relowner))) acl
     where n.nspname in ('public', 'rtdash') and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S') and acl.grantee = 0
       and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e') $$,
  'PUBLIC n''a aucun droit sur les tables, vues et séquences'
);

-- 3. PUBLIC ne peut exécuter aucune fonction de public ou rtdash (droit implicite de Postgres retiré).
select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
     where n.nspname in ('public', 'rtdash') and acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') $$,
  'PUBLIC ne peut exécuter aucune fonction'
);

-- 4. rtdash_app n'a ni DELETE ni TRUNCATE sur aucune table de public.
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
       and has_table_privilege('rtdash_app', c.oid, 'DELETE, TRUNCATE') $$,
  'rtdash_app n''a ni DELETE ni TRUNCATE'
);

-- 5. Colonnes de parcours et de traçabilité (design § 6.2) jamais modifiables par rtdash_app.
select is_empty(
  $$ select c.relname || '.' || a.attname from pg_attribute a
     join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
       and a.attnum > 0 and not a.attisdropped
       and a.attname in ('status', 'handler_id', 'handled_at', 'accepted_by', 'accepted_at',
                         'convoy_initialized_at', 'refusal_reason', 'archived_at', 'archived_by',
                         'created_at', 'created_by', 'updated_at', 'updated_by')
       and has_column_privilege('rtdash_app', c.oid, a.attnum, 'UPDATE') $$,
  'aucune colonne protégée n''est modifiable par rtdash_app'
);

-- 6. Toute fonction security definer de public ou rtdash fixe son search_path.
select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'rtdash') and p.prosecdef
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%') $$,
  'toute fonction security definer fixe son search_path'
);

-- 7. rtdash_app ne possède aucun objet : il ne peut donc ni modifier ni contourner leurs droits.
select is_empty(
  $$ select relname from pg_class where relowner = 'rtdash_app'::regrole
     union all select proname from pg_proc where proowner = 'rtdash_app'::regrole
     union all select nspname from pg_namespace where nspowner = 'rtdash_app'::regrole $$,
  'rtdash_app ne possède aucun objet'
);

-- 8. Les tables internes (rtdash : sessions, suivi des migrations…) sont fermées à rtdash_app :
-- il n'y accède que par les fonctions qui lui sont accordées.
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'rtdash' and c.relkind in ('r', 'p', 'v', 'm')
       and has_table_privilege('rtdash_app', c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE') $$,
  'aucune table interne n''est accessible directement à rtdash_app'
);

-- 9 à 11. Droits par défaut fermés : une table, une séquence et une fonction créées comme
-- dans une future migration (rôle rtdash_owner) n'ont aucun droit pour rtdash_app ni PUBLIC.
set local role rtdash_owner;
create table public.default_privileges_probe (id bigint generated always as identity primary key);
create function public.default_privileges_probe_fn() returns int language sql as 'select 1';
reset role;

select ok(
  not has_table_privilege('rtdash_app', 'public.default_privileges_probe', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE'),
  'nouvelle table : aucun droit par défaut pour rtdash_app'
);
select ok(
  not has_sequence_privilege('rtdash_app', 'public.default_privileges_probe_id_seq', 'USAGE, SELECT, UPDATE'),
  'nouvelle séquence : aucun droit par défaut pour rtdash_app'
);
select ok(
  not has_function_privilege('rtdash_app', 'public.default_privileges_probe_fn()', 'EXECUTE'),
  'nouvelle fonction : non exécutable par défaut par rtdash_app ni PUBLIC'
);

-- 12 à 14. Extensions de la première migration.
select has_extension('extensions', 'pg_trgm', 'extension pg_trgm dans le schéma extensions');
select has_extension('extensions', 'unaccent', 'extension unaccent dans le schéma extensions');
select has_extension('pg_cron', 'extension pg_cron installée');

-- 15 et 16. rtdash.f_unaccent : immuable (indexable) et sans accents.
select is(rtdash.f_unaccent('Élève à Besançon'), 'Eleve a Besancon', 'f_unaccent retire les accents');
select is(
  (select provolatile from pg_proc where oid = 'rtdash.f_unaccent(text)'::regprocedure), 'i'::"char",
  'f_unaccent est immuable, donc utilisable dans un index'
);

-- 17 à 19. Types enum (design § 4).
select enum_has_labels('public', 'app_role',
  array['event_manager', 'communication', 'manager', 'hr', 'direction', 'superadmin'], 'type app_role');
select enum_has_labels('public', 'ticket_status',
  array['new', 'in_review', 'accepted', 'refused'], 'type ticket_status');
select enum_has_labels('public', 'data_source', array['initial', 'learned'], 'type data_source');

-- 20. Le schéma interne n'est ouvert à personne d'autre que son propriétaire.
select ok(not has_schema_privilege('public', 'rtdash', 'USAGE'), 'PUBLIC n''a pas accès au schéma rtdash');

select * from finish();
rollback;
