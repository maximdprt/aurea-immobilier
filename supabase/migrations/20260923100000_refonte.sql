-- =============================================================================
-- AUREA Immobilier — refonte du site (septembre 2026)
--
-- 1. `listings` : colonnes que le seed connaissait mais que la base ignorait.
--    Sans elles, basculer la source de verite sur Supabase faisait DISPARAITRE
--    de la fiche l'exposition, les transports, l'etat general, la cave, etc.
-- 2. `media_assets` : photos importees depuis le back-office (hero, equipe,
--    biens, actualites). Le fichier vit dans le bucket Storage `media`, la
--    ligne dit quelle cle du site il remplace. Le pipeline images les recupere
--    AU BUILD et produit les memes variantes AVIF/WebP que pour le scraping.
-- 3. `news` : les actualites de l'agence, redigees dans le back-office.
-- 4. Le bucket Storage `media`, public en lecture, et sa politique.
--
-- Tout est rejouable (if not exists / or replace / on conflict).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Biens : colonnes complementaires
-- -----------------------------------------------------------------------------

alter table public.listings
  add column if not exists subtype text,
  add column if not exists bathrooms smallint check (bathrooms is null or bathrooms between 0 and 20),
  add column if not exists floors smallint check (floors is null or floors between 0 and 60),
  add column if not exists living_room_area numeric(8, 2),
  add column if not exists condition text,
  add column if not exists has_garden boolean not null default false,
  add column if not exists has_elevator boolean not null default false,
  add column if not exists cellars smallint check (cellars is null or cellars between 0 and 20),
  add column if not exists exposure text,
  add column if not exists windows text,
  add column if not exists sanitation text,
  add column if not exists condo_housing_lots integer,
  add column if not exists rent_controlled boolean not null default false,
  add column if not exists dpe_final_class public.energy_class,
  add column if not exists dpe_final_value numeric(8, 2),
  add column if not exists erp_date date,
  add column if not exists inventory_fees numeric(10, 2),
  add column if not exists transit_access text,
  add column if not exists advisor_name text,
  add column if not exists advisor_role text,
  add column if not exists characteristics jsonb not null default '{}'::jsonb,
  add column if not exists legacy_slug text,
  add column if not exists legacy_url text;

-- Aucune de ces colonnes n'est sensible : elles figurent deja sur l'annonce
-- publique. L'adresse exacte et ses coordonnees restent, elles, inaccessibles.
grant select (
  subtype, bathrooms, floors, living_room_area, condition, has_garden,
  has_elevator, cellars, exposure, windows, sanitation, condo_housing_lots,
  rent_controlled, dpe_final_class, dpe_final_value, erp_date, inventory_fees,
  transit_access, advisor_name, advisor_role, characteristics, legacy_slug,
  legacy_url, archived_at, created_at, updated_at
) on public.listings to anon;

-- -----------------------------------------------------------------------------
-- 2. Medias importes depuis le back-office
-- -----------------------------------------------------------------------------

create table if not exists public.media_assets (
  -- Cle du visuel remplace : `editorial:hero-accueil`, `agent:oriane-cherel`,
  -- `bien:1002:0` (photo n 0 de la reference 1002), `actu:<slug>`, `logo`.
  key text primary key
    check (key ~ '^[a-z]+(:[a-z0-9-]+){0,2}$' and char_length(key) between 3 and 120),
  -- Chemin dans le bucket `media`.
  storage_path text not null,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  bytes integer not null check (bytes > 0),
  alt text check (alt is null or char_length(alt) <= 300),
  updated_by text not null default 'code',
  updated_at timestamptz not null default now()
);

alter table public.media_assets enable row level security;

drop policy if exists "media_public_read" on public.media_assets;
create policy "media_public_read" on public.media_assets
  for select to anon, authenticated using (true);

grant select on public.media_assets to anon, authenticated;

drop trigger if exists media_assets_touch on public.media_assets;
create trigger media_assets_touch before update on public.media_assets
  for each row execute function private.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Actualites
-- -----------------------------------------------------------------------------

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 120),
  title text not null check (char_length(title) between 3 and 160),
  excerpt text check (excerpt is null or char_length(excerpt) <= 400),
  -- Texte au format simple (paragraphes, ## titres, - listes, **gras**).
  body text not null default '' check (char_length(body) <= 30000),
  -- Cle `media_assets` de l'image de couverture (`actu:<slug>`), si fournie.
  cover_key text,
  author_slug text references public.agents (slug) on delete set null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_published_idx on public.news (is_published, published_at desc);

alter table public.news enable row level security;

drop policy if exists "news_public_read" on public.news;
create policy "news_public_read" on public.news
  for select to anon, authenticated
  using (is_published and published_at is not null and published_at <= now());

grant select on public.news to anon, authenticated;

drop trigger if exists news_touch on public.news;
create trigger news_touch before update on public.news
  for each row execute function private.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Bucket Storage `media` : lecture publique, ecriture serveur uniquement
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 26214400, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media_bucket_public_read" on storage.objects;
create policy "media_bucket_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

-- Aucune politique d'ecriture pour anon/authenticated : les televersements
-- passent par une URL signee creee cote serveur avec la cle secrete, apres
-- verification du code d'acces du back-office.

-- -----------------------------------------------------------------------------
-- 5. Historique des migrations, pour que `supabase migration list` soit juste
-- -----------------------------------------------------------------------------

create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
insert into supabase_migrations.schema_migrations (version, name) values
  ('20260921090000', 'schema'),
  ('20260921091000', 'rls'),
  ('20260921092000', 'hooks_and_cron'),
  ('20260922100000', 'alert_token_indexes'),
  ('20260922180000', 'site_content'),
  ('20260923100000', 'refonte')
on conflict (version) do nothing;
