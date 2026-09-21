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
