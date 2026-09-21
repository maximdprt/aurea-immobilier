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
