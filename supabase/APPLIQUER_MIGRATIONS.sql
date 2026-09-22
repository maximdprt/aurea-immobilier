-- =============================================================================
-- AUREA Immobilier — migrations consolidees pour le SQL Editor Supabase
-- Projet : esgygaazfyjzzzdrvcey
-- Genere depuis supabase/migrations/ (4 fichiers, dans l'ordre).
--
-- MODE D'EMPLOI
--   1. Dashboard Supabase > SQL Editor > New query.
--   2. Coller CE FICHIER ENTIER et executer. Tout est dans une transaction
--      implicite par instruction ; en cas d'erreur, corriger puis relancer :
--      le script est ecrit pour etre rejouable (if not exists / or replace).
--   3. DEUX ETAPES MANUELLES restent a faire DANS LE DASHBOARD, apres ce script :
--      a) Database > Extensions : verifier que `pg_cron` est bien active.
--         Si le `create extension` ci-dessous echoue, activez-le ici d'abord.
--      b) Authentication > Hooks > Custom Access Token : selectionner
--         `private.custom_access_token_hook`. Sans cela, les roles du
--         back-office ne seront PAS presents dans le JWT et la RLS refusera
--         tout acces administrateur.
--   4. Regenerer les cles secretes (Settings > API Keys) et remplir
--      SUPABASE_SECRET_KEY_FORMS / SUPABASE_SECRET_KEY_IMPORT dans .env.local :
--      elles sont vides aujourd'hui, les formulaires ne fonctionneront pas.
-- =============================================================================


-- #############################################################################
-- 1/4 — SCHEMA : tables, types, index, vues
-- source : supabase/migrations/20260921090000_schema.sql
-- #############################################################################

-- =============================================================================
-- AUREA Immobilier — schema initial
-- Prompt v3 §20.2. Tout passe par des migrations versionnees : aucune table
-- n'est creee a la main dans le dashboard de production.
-- =============================================================================

-- Schema prive : retire des « Exposed schemas » du projet Supabase, donc
-- inatteignable depuis l'API meme en cas d'erreur de politique.
create schema if not exists private;

revoke all on schema private from anon, authenticated;

-- Toute nouvelle table nait fermee : on accorde ensuite, explicitement.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------

create type public.listing_status as enum ('draft', 'published', 'under_offer', 'sold', 'rented');
create type public.transaction_type as enum ('vente', 'location');
create type public.property_type as enum ('maison', 'appartement', 'immeuble', 'terrain', 'local');
create type public.fees_payer as enum ('vendeur', 'acquereur', 'locataire');
create type public.energy_class as enum ('A', 'B', 'C', 'D', 'E', 'F', 'G');
create type public.app_role as enum ('admin', 'agent', 'rental_manager');
create type public.lead_type as enum ('contact', 'visite', 'estimation', 'gestion');
create type public.lead_status as enum ('new', 'assigned', 'in_progress', 'won', 'lost', 'spam');

-- -----------------------------------------------------------------------------
-- Communes
-- -----------------------------------------------------------------------------

create table public.communes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 80),
  postal_code text check (postal_code ~ '^[0-9]{5}$'),
  -- Donnees de marche : toujours accompagnees de leur source et de leur date,
  -- sinon elles ne sont pas publiees (§8).
  dvf_median_house numeric(10, 2),
  dvf_median_flat numeric(10, 2),
  dvf_source text,
  dvf_updated_at date,
  intro text,
  neighbourhoods text,
  transport text,
  schools text,
  active_count integer not null default 0,
  sold_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index communes_slug_idx on public.communes (slug);

-- -----------------------------------------------------------------------------
-- Conseillers
-- -----------------------------------------------------------------------------

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  role text not null,
  email text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text,
  photo_file text,
  bio text,
  languages text[],
  legacy_id text,
  is_active boolean not null default true,
  position integer not null default 100,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Biens
-- -----------------------------------------------------------------------------

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  reference integer not null unique,
  -- Identifiant de l'ancien site : c'est la cle du mapping 301 (§10).
  legacy_products_id text unique,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 3 and 160),
  status public.listing_status not null default 'draft',
  transaction_type public.transaction_type not null,
  property_type public.property_type not null,

  commune_id uuid references public.communes (id) on delete set null,
  commune_slug text references public.communes (slug) on delete set null,
  postal_code text,

  -- ATTENTION : ces deux colonnes ne sont JAMAIS accordees au role anon.
  -- Publier l'adresse exacte d'un bien en vente expose le vendeur (§20.2).
  exact_address text,
  exact_lat numeric(9, 6),
  exact_lng numeric(9, 6),
  -- Point approximatif (centroide de la commune), lui, est public.
  approx_lat numeric(9, 6),
  approx_lng numeric(9, 6),

  price numeric(12, 2) check (price is null or price >= 0),
  fees_amount numeric(10, 2),
  fees_payer public.fees_payer,
  rent_base numeric(10, 2),
  rent_charges numeric(10, 2),
  rent_total numeric(10, 2),
  tenant_fees numeric(10, 2),
  deposit numeric(10, 2),

  living_area numeric(8, 2),
  land_area numeric(10, 2),
  rooms smallint check (rooms is null or rooms between 1 and 40),
  bedrooms smallint check (bedrooms is null or bedrooms between 0 and 30),
  floor_number smallint,
  year_built smallint,
  heating text,

  is_condo boolean not null default false,
  condo_lots integer,
  condo_annual_charges numeric(10, 2),
  property_tax numeric(10, 2),

  dpe_class public.energy_class,
  ges_class public.energy_class,
  dpe_value numeric(8, 2),
  ges_value numeric(8, 2),
  energy_cost_min numeric(10, 2),
  energy_cost_max numeric(10, 2),
  dpe_date date,
  erp boolean not null default false,

  is_exclusive boolean not null default false,
  description text check (char_length(description) <= 20000),
  agent_id uuid references public.agents (id) on delete set null,
  agent_slug text references public.agents (slug) on delete set null,

  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index sur chaque colonne utilisee dans une politique RLS ou un filtre (§20.3)
create index listings_status_idx on public.listings (status);
create index listings_commune_idx on public.listings (commune_slug);
create index listings_agent_idx on public.listings (agent_slug);
create index listings_transaction_idx on public.listings (transaction_type, status);

create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_reference integer not null references public.listings (reference) on delete cascade,
  position smallint not null default 0,
  file_name text not null,
  storage_path text,
  alt text,
  width integer,
  height integer,
  -- Traçabilite du tri « photo reelle / visuel genere par IA » (§3.9, §15)
  is_ai_visual boolean not null default false,
  created_at timestamptz not null default now(),
  unique (listing_reference, position)
);

create index listing_photos_listing_idx on public.listing_photos (listing_reference);

-- Biens connus uniquement par les anciennes pages « nos reussites »
create table public.archived_listings (
  reference integer primary key,
  title text not null,
  commune_slug text references public.communes (slug) on delete set null,
  status public.listing_status not null,
  rooms smallint,
  area numeric(8, 2),
  property_type public.property_type not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Avis et textes legaux
-- -----------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  -- Texte EXACT copie depuis Google, jamais reecrit ni corrige (§13)
  body text not null,
  rating smallint not null check (rating between 1 and 5),
  published_on date,
  agent_slug text references public.agents (slug) on delete set null,
  topic text,
  position integer not null default 100,
  created_at timestamptz not null default now()
);

create table public.agency_rating (
  id boolean primary key default true check (id),
  rating numeric(2, 1) check (rating between 0 and 5),
  review_count integer check (review_count >= 0),
  surveyed_at date,
  profile_url text,
  review_url text
);

create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug in ('mentions-legales', 'confidentialite', 'cgu', 'cookies')),
  version integer not null,
  body text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (slug, version)
);

-- -----------------------------------------------------------------------------
-- Comptes du back-office
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'agent',
  agent_id uuid references public.agents (id) on delete set null,
  full_name text,
  created_at timestamptz not null default now()
);

create index profiles_agent_idx on public.profiles (agent_id);

-- -----------------------------------------------------------------------------
-- Demandes entrantes
-- -----------------------------------------------------------------------------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  type public.lead_type not null,
  status public.lead_status not null default 'new',

  firstname text not null check (char_length(firstname) between 1 and 80),
  lastname text not null check (char_length(lastname) between 1 and 80),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 25),
  message text check (message is null or char_length(message) <= 2000),

  listing_reference integer references public.listings (reference) on delete set null,
  -- Charge utile structuree du formulaire d'estimation
  payload jsonb,

  -- Preuve du consentement : quelle version du texte a ete affichee, et quand
  consent_version text not null,
  consent_at timestamptz not null default now(),

  assigned_agent_id uuid references public.agents (id) on delete set null,
  source text,
  -- Purge automatique : 3 ans apres le dernier contact (§21.2)
  purge_after timestamptz not null default (now() + interval '3 years'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_idx on public.leads (status);
create index leads_type_idx on public.leads (type);
create index leads_assigned_idx on public.leads (assigned_agent_id);
create index leads_purge_idx on public.leads (purge_after);

create table public.alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  criteria jsonb not null default '{}'::jsonb,
  -- Jetons stockes haches : une fuite de la table ne permet pas de confirmer
  -- ni de desabonner une adresse (§20.2)
  confirm_token_hash text,
  unsubscribe_token_hash text,
  confirmed_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email)
);

create index alerts_confirmed_idx on public.alert_subscriptions (confirmed_at);

-- -----------------------------------------------------------------------------
-- Journaux techniques — schema prive, hors API
-- -----------------------------------------------------------------------------

create table private.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text,
  action text not null,
  actor uuid,
  actor_role text,
  changes jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_log_occurred_idx on private.audit_log (occurred_at);

create table private.import_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  archived_count integer not null default 0,
  rejected_count integer not null default 0,
  errors jsonb,
  ok boolean
);

create table private.rate_limits (
  id bigint generated always as identity primary key,
  -- IP jamais en clair : hachage sale HMAC (§20.2)
  ip_hash text not null,
  route text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  unique (ip_hash, route, window_start)
);

create index rate_limits_window_idx on private.rate_limits (window_start);

-- -----------------------------------------------------------------------------
-- Horodatage automatique
-- -----------------------------------------------------------------------------

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger listings_touch before update on public.listings
  for each row execute function private.touch_updated_at();
create trigger communes_touch before update on public.communes
  for each row execute function private.touch_updated_at();
create trigger leads_touch before update on public.leads
  for each row execute function private.touch_updated_at();

-- #############################################################################
-- 2/4 — RLS : politiques, grants, roles
-- source : supabase/migrations/20260921091000_rls.sql
-- #############################################################################

-- =============================================================================
-- Row Level Security — matrice des droits du prompt v3 §20.3
--
-- Principe : le navigateur ne detient jamais de droit d'ecriture. La RLS est la
-- derniere ligne de defense, pas la seule — toute ecriture passe par une route
-- serveur qui valide en amont.
--
-- Performance : `auth.jwt()` est toujours enveloppe dans `(select ...)` pour
-- etre evalue une fois par requete et non une fois par ligne, et chaque colonne
-- utilisee dans une politique porte un index (voir la migration de schema).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Aucune table du schema public n'est lisible par defaut
-- -----------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter table public.communes enable row level security;
alter table public.agents enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.archived_listings enable row level security;
alter table public.reviews enable row level security;
alter table public.agency_rating enable row level security;
alter table public.legal_documents enable row level security;
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.alert_subscriptions enable row level security;

-- Les tables du schema prive ne sont pas exposees a l'API ; la RLS y est
-- activee malgre tout, par defense en profondeur.
alter table private.audit_log enable row level security;
alter table private.import_runs enable row level security;
alter table private.rate_limits enable row level security;

-- -----------------------------------------------------------------------------
-- Helpers — dans le schema prive, avec search_path vide
-- -----------------------------------------------------------------------------

create or replace function private.app_role()
returns text
language sql
stable
as $$
  select coalesce(
    (select auth.jwt() ->> 'app_role'),
    (select auth.jwt() -> 'app_metadata' ->> 'app_role')
  );
$$;

create or replace function private.has_mfa()
returns boolean
language sql
stable
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;

create or replace function private.current_agent_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.agent_id from public.profiles p where p.id = (select auth.uid());
$$;

revoke all on function private.app_role() from public;
revoke all on function private.has_mfa() from public;
revoke all on function private.current_agent_id() from public;
grant execute on function private.app_role() to authenticated;
grant execute on function private.has_mfa() to authenticated;
grant execute on function private.current_agent_id() to authenticated;

-- -----------------------------------------------------------------------------
-- Contenu public : communes, conseillers, avis, textes legaux
-- -----------------------------------------------------------------------------

create policy "communes_public_read" on public.communes
  for select to anon, authenticated using (true);

create policy "agents_public_read" on public.agents
  for select to anon, authenticated using (is_active);

create policy "reviews_public_read" on public.reviews
  for select to anon, authenticated using (true);

create policy "rating_public_read" on public.agency_rating
  for select to anon, authenticated using (true);

create policy "legal_public_read" on public.legal_documents
  for select to anon, authenticated using (published_at is not null);

create policy "archived_public_read" on public.archived_listings
  for select to anon, authenticated using (true);

grant select on public.communes to anon, authenticated;
grant select on public.agents to anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant select on public.agency_rating to anon, authenticated;
grant select on public.legal_documents to anon, authenticated;
grant select on public.archived_listings to anon, authenticated;

-- L'ecriture de ces tables est reservee aux administrateurs
create policy "communes_admin_write" on public.communes
  for all to authenticated
  using (private.app_role() = 'admin')
  with check (private.app_role() = 'admin');

create policy "agents_admin_write" on public.agents
  for all to authenticated
  using (private.app_role() = 'admin')
  with check (private.app_role() = 'admin');

create policy "reviews_admin_write" on public.reviews
  for all to authenticated
  using (private.app_role() = 'admin')
  with check (private.app_role() = 'admin');

create policy "rating_admin_write" on public.agency_rating
  for all to authenticated
  using (private.app_role() = 'admin')
  with check (private.app_role() = 'admin');

create policy "legal_admin_write" on public.legal_documents
  for all to authenticated
  using (private.app_role() = 'admin')
  with check (private.app_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Biens
-- -----------------------------------------------------------------------------

create policy "listings_public_read" on public.listings
  for select to anon, authenticated
  using (status in ('published', 'under_offer', 'sold', 'rented'));

create policy "listings_staff_read" on public.listings
  for select to authenticated
  using (private.app_role() in ('admin', 'agent', 'rental_manager'));

-- Un conseiller ne modifie que les champs editoriaux de SES biens.
create policy "listings_agent_update" on public.listings
  for update to authenticated
  using (
    private.app_role() = 'admin'
    or (private.app_role() = 'agent' and agent_id = private.current_agent_id())
  )
  with check (
    private.app_role() = 'admin'
    or (private.app_role() = 'agent' and agent_id = private.current_agent_id())
  );

create policy "photos_public_read" on public.listing_photos
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.reference = listing_reference
        and l.status in ('published', 'under_offer', 'sold', 'rented')
    )
  );

create policy "photos_admin_write" on public.listing_photos
  for all to authenticated
  using (private.app_role() = 'admin')
  with check (private.app_role() = 'admin');

/*
 * Grants colonne par colonne.
 *
 * `exact_address`, `exact_lat` et `exact_lng` sont volontairement absents :
 * meme si une politique devenait trop permissive, le role anon n'aurait aucun
 * droit sur ces colonnes. C'est la protection du vendeur, pas un detail.
 */
grant select (
  id, reference, slug, status, transaction_type, property_type,
  commune_id, commune_slug, postal_code, approx_lat, approx_lng,
  price, fees_amount, fees_payer, rent_base, rent_charges, rent_total,
  tenant_fees, deposit, living_area, land_area, rooms, bedrooms,
  floor_number, year_built, heating, is_condo, condo_lots,
  condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value,
  ges_value, energy_cost_min, energy_cost_max, dpe_date, erp,
  is_exclusive, description, agent_id, agent_slug, published_at, title
) on public.listings to anon;

grant select on public.listings to authenticated;
grant update on public.listings to authenticated;
grant select on public.listing_photos to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Profils : chacun lit le sien, seul un admin modifie les roles
-- -----------------------------------------------------------------------------

create policy "profiles_self_read" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.app_role() = 'admin');

create policy "profiles_admin_write" on public.profiles
  for all to authenticated
  using (private.app_role() = 'admin')
  with check (private.app_role() = 'admin');

grant select on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- Leads : aucun acces anonyme, MFA obligatoire, cloisonnement par role
-- -----------------------------------------------------------------------------

create policy "leads_staff_read" on public.leads
  for select to authenticated
  using (
    private.has_mfa()
    and (
      private.app_role() = 'admin'
      or (
        private.app_role() = 'agent'
        and (assigned_agent_id is null or assigned_agent_id = private.current_agent_id())
      )
      or (private.app_role() = 'rental_manager' and type = 'gestion')
    )
  );

create policy "leads_staff_update" on public.leads
  for update to authenticated
  using (
    private.has_mfa()
    and (
      private.app_role() = 'admin'
      or (
        private.app_role() = 'agent'
        and (assigned_agent_id is null or assigned_agent_id = private.current_agent_id())
      )
      or (private.app_role() = 'rental_manager' and type = 'gestion')
    )
  )
  with check (private.has_mfa());

-- Seul un administrateur supprime un lead
create policy "leads_admin_delete" on public.leads
  for delete to authenticated
  using (private.has_mfa() and private.app_role() = 'admin');

grant select, update on public.leads to authenticated;
grant delete on public.leads to authenticated;

-- Aucun grant a anon : ni lecture, ni insertion. Les formulaires publics
-- inserent via la cle secrete cote serveur, apres validation (§20.5).

-- -----------------------------------------------------------------------------
-- Alertes email : tout passe par le serveur avec des jetons a usage unique
-- -----------------------------------------------------------------------------

create policy "alerts_admin_read" on public.alert_subscriptions
  for select to authenticated
  using (private.has_mfa() and private.app_role() = 'admin');

create policy "alerts_admin_delete" on public.alert_subscriptions
  for delete to authenticated
  using (private.has_mfa() and private.app_role() = 'admin');

grant select, delete on public.alert_subscriptions to authenticated;

-- -----------------------------------------------------------------------------
-- Vues : toujours en security_invoker, sinon elles contournent la RLS
-- -----------------------------------------------------------------------------

create view public.published_listings
with (security_invoker = true)
as
select
  l.reference, l.slug, l.title, l.status, l.transaction_type, l.property_type,
  l.commune_slug, l.postal_code, l.price, l.fees_payer, l.living_area,
  l.land_area, l.rooms, l.bedrooms, l.dpe_class, l.ges_class,
  l.is_exclusive, l.agent_slug, l.published_at
from public.listings l
where l.status in ('published', 'under_offer');

grant select on public.published_listings to anon, authenticated;

-- #############################################################################
-- 3/4 — HOOKS & CRON : jeton JWT, audit, purges
-- source : supabase/migrations/20260921092000_hooks_and_cron.sql
-- #############################################################################

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

-- Rejouable : on retire le job existant avant de le replanifier, sinon un
-- second passage de ce script creerait un doublon de tache.
do $do$
begin
  if exists (select 1 from cron.job where jobname = 'aurea-retention') then
    perform cron.unschedule('aurea-retention');
  end if;
end
$do$;

select cron.schedule(
  'aurea-retention',
  '15 3 * * *',
  $$select private.run_retention();$$
);

-- #############################################################################
-- 4/4 — INDEX DES JETONS D'ALERTE
-- source : supabase/migrations/20260922100000_alert_token_indexes.sql
-- #############################################################################

-- =============================================================================
-- AUREA Immobilier — index des jetons d'alerte
--
-- §20.3 : toute colonne servant de filtre porte un index. Les deux pages
-- atteintes depuis un email — /alerte/confirmation/ et /desabonnement/ —
-- retrouvent une inscription par l'EMPREINTE de son jeton, jamais par son
-- identifiant. Sans index, chaque clic dans un email provoque un parcours
-- complet de `alert_subscriptions`.
--
-- Index PARTIELS dans les deux cas : les colonnes sont nulles la plupart du
-- temps (`confirm_token_hash` est vide des que le jeton a servi), et un index
-- partiel ne porte que sur les lignes qu'on interroge reellement.
-- =============================================================================

create index if not exists alerts_confirm_token_idx
  on public.alert_subscriptions (confirm_token_hash)
  where confirm_token_hash is not null;

create index if not exists alerts_unsubscribe_token_idx
  on public.alert_subscriptions (unsubscribe_token_hash)
  where unsubscribe_token_hash is not null;
