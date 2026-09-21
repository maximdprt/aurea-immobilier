-- =============================================================================
-- Custom Access Token Hook, journal d'audit et purges planifiees
-- Prompt v3 §20.3, §20.8
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Le role metier est place dans le JWT au moment de l'emission du jeton.
-- Sans ce hook, chaque politique devrait faire une sous-requete sur `profiles`
-- pour chaque ligne evaluee.
-- -----------------------------------------------------------------------------

create or replace function private.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims jsonb;
  user_role text;
begin
  select p.role::text into user_role
  from public.profiles p
  where p.id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  if user_role is not null then
    claims := jsonb_set(claims, '{app_role}', to_jsonb(user_role));
  else
    claims := jsonb_set(claims, '{app_role}', 'null'::jsonb);
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function private.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function private.custom_access_token_hook(jsonb) from authenticated, anon, public;

grant usage on schema private to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;

create policy "auth_admin_reads_profiles" on public.profiles
  for select to supabase_auth_admin using (true);

-- -----------------------------------------------------------------------------
-- Journal d'audit : qui a fait quoi, sur quelle ligne, quand
-- -----------------------------------------------------------------------------

create or replace function private.write_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_identifier text;
begin
  row_identifier := coalesce(
    (to_jsonb(coalesce(new, old)) ->> 'id'),
    (to_jsonb(coalesce(new, old)) ->> 'reference')
  );

  insert into private.audit_log (table_name, row_id, action, actor, actor_role, changes)
  values (
    tg_table_name,
    row_identifier,
    tg_op,
    (select auth.uid()),
    (select auth.jwt() ->> 'app_role'),
    case
      when tg_op = 'DELETE' then jsonb_build_object('old', to_jsonb(old))
      when tg_op = 'INSERT' then jsonb_build_object('new', to_jsonb(new))
      else jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
    end
  );

  return coalesce(new, old);
end;
$$;

create trigger leads_audit
  after insert or update or delete on public.leads
  for each row execute function private.write_audit();

create trigger listings_audit
  after insert or update or delete on public.listings
  for each row execute function private.write_audit();

create trigger profiles_audit
  after insert or update or delete on public.profiles
  for each row execute function private.write_audit();

-- Lecture du journal reservee aux administrateurs, via une fonction dediee
create or replace function public.read_audit_log(limit_count integer default 200)
returns setof private.audit_log
language sql
stable
security definer
set search_path = ''
as $$
  select *
  from private.audit_log
  where (select auth.jwt() ->> 'app_role') = 'admin'
    and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
  order by occurred_at desc
  limit least(coalesce(limit_count, 200), 1000);
$$;

revoke execute on function public.read_audit_log(integer) from public, anon;
grant execute on function public.read_audit_log(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Purges planifiees (§20.8)
-- -----------------------------------------------------------------------------

create extension if not exists pg_cron;

create or replace function private.run_retention()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged_leads integer;
  purged_alerts integer;
begin
  -- Demandes dont la duree de conservation est echue (3 ans, §21.2)
  delete from public.leads where purge_after < now();
  get diagnostics purged_leads = row_count;

  -- Inscriptions aux alertes jamais confirmees au bout de 7 jours,
  -- et alertes sans interaction depuis 3 ans
  delete from public.alert_subscriptions
  where (confirmed_at is null and created_at < now() - interval '7 days')
     or (confirmed_at is not null and coalesce(last_sent_at, created_at) < now() - interval '3 years');
  get diagnostics purged_alerts = row_count;

  -- Journaux techniques
  delete from private.rate_limits where window_start < now() - interval '7 days';
  delete from private.audit_log where occurred_at < now() - interval '1 year';
  delete from private.import_runs where started_at < now() - interval '1 year';

  -- La purge est elle-meme journalisee
  insert into private.audit_log (table_name, action, changes)
  values (
    'retention',
    'PURGE',
    jsonb_build_object('leads', purged_leads, 'alerts', purged_alerts)
  );
end;
$$;

revoke execute on function private.run_retention() from public, anon, authenticated;

select cron.schedule(
  'aurea-retention',
  '15 3 * * *',
  $$select private.run_retention();$$
);
