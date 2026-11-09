-- migrate:up
-- Sessions (T-2.3, design § 5.2 et § 6.1). L'application ne lit jamais cette table : elle
-- passe par les fonctions ci-dessous. La base ne garde que l'empreinte du jeton.

create table rtdash.sessions (
  id                   uuid primary key default gen_random_uuid(),
  token_hash           bytea not null unique,
  discord_id           text not null check (discord_id ~ '^[0-9]{17,20}$'),
  discord_username     text not null check (char_length(discord_username) between 1 and 100),
  discord_display_name text not null check (char_length(discord_display_name) between 1 and 100),
  created_at           timestamptz not null default now(),
  expires_at           timestamptz not null,
  revoked_at           timestamptz
);
create index sessions_expires_at_idx on rtdash.sessions (expires_at);

create function rtdash.session_token_hash(token text)
  returns bytea
  language sql
  immutable
  strict
  set search_path = ''
  return sha256(convert_to(token, 'UTF8'));

-- Session valide (ni expirée ni fermée) correspondant au jeton.
create function rtdash.find_valid_session(token text)
  returns setof rtdash.sessions
  language sql
  stable
  set search_path = ''
  as $$
    select s.* from rtdash.sessions s
     where s.token_hash = rtdash.session_token_hash(token)
       and s.revoked_at is null
       and s.expires_at > now()
  $$;

-- Ouverte par l'application juste après la vérification auprès de Discord (design § 6.1 :
-- c'est le seul point où la base accepte une identité Discord fournie par l'application).
create function public.open_session(
  token text, discord_id text, discord_username text, discord_display_name text
)
  returns void
  language plpgsql
  security definer
  set search_path = ''
  as $$
  begin
    if token is null or char_length(token) < 43 then
      raise exception 'Jeton de session invalide' using errcode = '22023';
    end if;
    if discord_id is null or discord_id !~ '^[0-9]{17,20}$' then
      raise exception 'ID Discord invalide' using errcode = '22023';
    end if;
    insert into rtdash.sessions (token_hash, discord_id, discord_username, discord_display_name, expires_at)
    values (rtdash.session_token_hash(token), discord_id, discord_username, discord_display_name,
            now() + interval '30 days');
  end
  $$;

create function public.close_session(token text)
  returns void
  language sql
  security definer
  set search_path = ''
  as $$
    update rtdash.sessions set revoked_at = now()
     where token_hash = rtdash.session_token_hash(token) and revoked_at is null
  $$;

-- Appelée au début de chaque transaction faite pour un utilisateur (withSession) : retient
-- le jeton pour la transaction s'il est valide. Les fonctions qui en ont besoin le revérifient.
create function rtdash.use_session(token text)
  returns boolean
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    is_valid boolean := exists (select 1 from rtdash.find_valid_session(token));
  begin
    perform set_config('rtdash.session_token', case when is_valid then token else '' end, true);
    return is_valid;
  end
  $$;

-- Session de la transaction en cours, revérifiée à chaque appel.
create function rtdash.current_session()
  returns setof rtdash.sessions
  language sql
  stable
  security definer
  set search_path = ''
  as $$
    select * from rtdash.find_valid_session(nullif(current_setting('rtdash.session_token', true), ''))
  $$;

-- Profil Discord de la session : pseudo affiché sur « Vous n'avez pas accès » (R-ACC-03).
create function public.current_discord_profile()
  returns table (discord_id text, discord_username text, discord_display_name text)
  language sql
  stable
  security definer
  set search_path = ''
  as $$
    select s.discord_id, s.discord_username, s.discord_display_name from rtdash.current_session() s
  $$;

-- Donnée technique, pas métier : les sessions expirées depuis 90 jours sont purgées.
create function rtdash.purge_expired_sessions()
  returns integer
  language sql
  set search_path = ''
  as $$
    with purged as (
      delete from rtdash.sessions where expires_at < now() - interval '90 days' returning 1
    )
    select count(*)::integer from purged
  $$;

select cron.schedule('rtdash-purge-sessions', '0 3 * * *', 'select rtdash.purge_expired_sessions()');

grant usage on schema rtdash to rtdash_app;
grant execute on function rtdash.use_session(text) to rtdash_app;
grant execute on function public.open_session(text, text, text, text) to rtdash_app;
grant execute on function public.close_session(text) to rtdash_app;
grant execute on function public.current_discord_profile() to rtdash_app;

-- migrate:down
-- Pas de retour arrière : on corrige par une nouvelle migration (design § 14).
