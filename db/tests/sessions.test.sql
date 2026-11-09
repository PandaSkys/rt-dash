-- Sessions (T-2.3, design § 5.2 et § 6.1) : la base vérifie elle-même le jeton de session.
-- Les appels sont faits avec le rôle de l'application (rtdash_app), comme en vrai.
begin;
create extension if not exists pgtap;

select plan(18);

-- Jetons de 43 caractères, comme ceux de l'application (32 octets en base64url).
\set token_a 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
\set token_b 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
\set unknown_token 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'

set local role rtdash_app;
select lives_ok(
  $$ select open_session('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '123456789012345678', 'pseudo_a', 'Nom A') $$,
  'l''application ouvre une session après la connexion Discord'
);
select open_session(:'token_b', '223456789012345678', 'pseudo_b', 'Nom B');

-- Ce que la base garde.
reset role;
select is(
  (select token_hash from rtdash.sessions where discord_id = '123456789012345678'),
  sha256(convert_to(:'token_a', 'UTF8')),
  'seule l''empreinte SHA-256 du jeton est stockée'
);
select is_empty(
  $$ select 1 from rtdash.sessions s where row_to_json(s)::text like '%aaaaaaaaaaaaaaaa%' $$,
  'le jeton lui-même n''apparaît nulle part dans la table'
);
select is(
  (select expires_at - created_at from rtdash.sessions where discord_id = '123456789012345678'),
  interval '30 days',
  'une session dure 30 jours'
);

-- Ce que voit l'application.
set local role rtdash_app;
select throws_ok(
  $$ select * from rtdash.sessions $$, '42501', null,
  'l''application ne peut pas lire la table des sessions'
);
select ok(rtdash.use_session(:'token_a'), 'un jeton valide est accepté');
select is(
  (select discord_id from current_discord_profile()), '123456789012345678',
  'le profil Discord vient de la session'
);
select is(
  (select discord_username from current_discord_profile()), 'pseudo_a',
  'le pseudo Discord vient de la session'
);
select ok(not rtdash.use_session(:'unknown_token'), 'un jeton inventé est refusé');
select is_empty($$ select * from current_discord_profile() $$, 'jeton inventé : aucun profil');
select ok(not rtdash.use_session(null), 'sans jeton : refusé');

select close_session(:'token_b');
select ok(not rtdash.use_session(:'token_b'), 'une session fermée est refusée');
select ok(rtdash.use_session(:'token_a'), 'fermer une session ne touche pas aux autres');

reset role;
update rtdash.sessions set expires_at = now() - interval '1 second' where discord_id = '123456789012345678';
set local role rtdash_app;
select ok(not rtdash.use_session(:'token_a'), 'une session expirée est refusée');

select throws_ok(
  $$ select open_session('trop-court', '123456789012345678', 'p', 'N') $$, '22023', null,
  'un jeton trop court est refusé'
);
select throws_ok(
  $$ select open_session('ccccccccccccccccccccccccccccccccccccccccccc', 'pas-un-id', 'p', 'N') $$, '22023', null,
  'un ID Discord invalide est refusé'
);

-- Purge : les sessions expirées depuis plus de 90 jours, et seulement elles.
reset role;
update rtdash.sessions set expires_at = now() - interval '91 days' where discord_id = '223456789012345678';
select rtdash.purge_expired_sessions();
select results_eq(
  $$ select discord_id from rtdash.sessions where discord_id in ('123456789012345678', '223456789012345678') $$,
  $$ values ('123456789012345678'::text) $$,
  'la purge retire les sessions expirées depuis plus de 90 jours, et garde les autres'
);

select isnt_empty(
  $q$ select 1 from cron.job where jobname = 'rtdash-purge-sessions' and database = 'rtdash' $q$,
  'la purge est programmée chaque jour par pg_cron'
);

select * from finish();
rollback;
