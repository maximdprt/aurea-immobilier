/**
 * Chargement du catalogue depuis Supabase, avec repli sur le seed.
 *
 * C'est le point où la base devient réellement la source de vérité (§4). Le
 * chargement a lieu **une fois au build** : les pages publiques sont
 * pré-rendues, elles n'interrogent pas la base à chaque visite.
 *
 * Règle de repli, volontairement stricte : on ne remplace le seed que si la
 * base répond ET renvoie des données. Une base joignable mais vide ne doit pas
 * produire un site sans aucun bien.
 */
import type { Agent, ArchivedListing, Commune, Listing } from '~/lib/types';
import { publicClient } from './public';

export interface CatalogSnapshot {
  listings: Listing[] | null;
  agents: Agent[] | null;
  communes: Commune[] | null;
  archives: ArchivedListing[] | null;
  /** D'où viennent réellement les données affichées. */
  origin: 'supabase' | 'seed';
  note: string;
}

const EMPTY: CatalogSnapshot = {
  listings: null,
  agents: null,
  communes: null,
  archives: null,
  origin: 'seed',
  note: '',
};

const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null;

/** « 2026-07-21 » -> « 21/07/2026 », la forme que les formateurs du site attendent. */
const frDate = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};

/** Convertit une ligne SQL (snake_case) en objet du modèle (camelCase). */
function toListing(
  row: Record<string, any>,
  photos: Record<string, any>[],
  communeName: Map<string, string>
): Listing {
  return {
    reference: row.reference,
    legacyProductsId: row.legacy_products_id ?? '',
    legacyCPath: null,
    legacySlug: row.legacy_slug ?? '',
    legacyUrl: row.legacy_url ?? '',
    slug: row.slug,
    title: row.title,
    rawTitle: row.title,
    status: row.status,
    transaction: row.transaction_type,
    propertyType: row.property_type,
    subtype: row.subtype ?? null,
    commune: row.commune_slug ? (communeName.get(row.commune_slug) ?? null) : null,
    communeSlug: row.commune_slug ?? null,
    postalCode: row.postal_code ?? null,
    price: numOrNull(row.price),
    feesPayer: row.fees_payer ?? null,
    rentBase: numOrNull(row.rent_base),
    rentCharges: numOrNull(row.rent_charges),
    rentTotal: numOrNull(row.rent_total),
    tenantFees: numOrNull(row.tenant_fees),
    inventoryFees: numOrNull(row.inventory_fees),
    deposit: numOrNull(row.deposit),
    livingArea: numOrNull(row.living_area),
    landArea: numOrNull(row.land_area),
    livingRoomArea: numOrNull(row.living_room_area),
    rooms: numOrNull(row.rooms),
    bedrooms: numOrNull(row.bedrooms),
    bathrooms: numOrNull(row.bathrooms),
    floor: numOrNull(row.floor_number),
    floors: numOrNull(row.floors),
    yearBuilt: numOrNull(row.year_built),
    heating: row.heating ?? null,
    condition: row.condition ?? null,
    hasGarden: row.has_garden ?? false,
    hasElevator: row.has_elevator ?? false,
    cellars: numOrNull(row.cellars),
    exposure: row.exposure ?? null,
    windows: row.windows ?? null,
    sanitation: row.sanitation ?? null,
    isCondo: row.is_condo ?? false,
    condoLots: numOrNull(row.condo_lots),
    condoHousingLots: numOrNull(row.condo_housing_lots),
    condoAnnualCharges: numOrNull(row.condo_annual_charges),
    propertyTax: numOrNull(row.property_tax),
    rentControlled: row.rent_controlled ?? false,
    dpeClass: row.dpe_class ?? null,
    dpeFinalClass: row.dpe_final_class ?? null,
    dpeValue: numOrNull(row.dpe_value),
    dpeFinalValue: numOrNull(row.dpe_final_value),
    gesClass: row.ges_class ?? null,
    gesValue: numOrNull(row.ges_value),
    energyCostMin: numOrNull(row.energy_cost_min),
    energyCostMax: numOrNull(row.energy_cost_max),
    dpeDate: frDate(row.dpe_date),
    erp: row.erp ?? false,
    erpDate: frDate(row.erp_date),
    transitAccess: row.transit_access ?? null,
    isExclusive: row.is_exclusive ?? false,
    advisorName: row.advisor_name ?? null,
    advisorRole: row.advisor_role ?? null,
    agentSlug: row.agent_slug ?? null,
    description: row.description ?? '',
    photos: photos
      .filter((p) => p.listing_reference === row.reference)
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ file: p.file_name, alt: p.alt ?? '' })),
    characteristics:
      row.characteristics && typeof row.characteristics === 'object' ? row.characteristics : {},
  };
}

/**
 * Interroge la base. Ne lève jamais : un build ne doit pas échouer parce que
 * Supabase est momentanément injoignable.
 */
export async function loadFromSupabase(): Promise<CatalogSnapshot> {
  const db = publicClient();
  if (!db) {
    return { ...EMPTY, note: 'Supabase non configuré — catalogue servi depuis le seed.' };
  }

  try {
    const [listingsRes, photosRes, agentsRes, communesRes, archivesRes] = await Promise.all([
      db.from('listings').select('*').order('reference', { ascending: false }),
      db.from('listing_photos').select('listing_reference, position, file_name, storage_path, alt'),
      db.from('agents').select('*').order('position').order('created_at'),
      db.from('communes').select('*'),
      db.from('archived_listings').select('*'),
    ]);

    const firstError =
      listingsRes.error ?? photosRes.error ?? agentsRes.error ?? communesRes.error ?? archivesRes.error;

    if (firstError) {
      // PGRST205 = table absente du cache de schéma : les migrations n'ont pas
      // encore été appliquées. C'est un état attendu, pas une panne.
      const missingSchema = firstError.code === 'PGRST205';
      return {
        ...EMPTY,
        note: missingSchema
          ? 'Base joignable mais schéma absent : appliquez les migrations. Catalogue servi depuis le seed.'
          : `Lecture Supabase impossible (${firstError.code ?? 'erreur'}) — catalogue servi depuis le seed.`,
      };
    }

    const listings = listingsRes.data ?? [];
    if (listings.length === 0) {
      return {
        ...EMPTY,
        note: 'Base joignable mais catalogue vide : seed conservé plutôt qu’un site sans biens.',
      };
    }

    const communes = communesRes.data ?? [];
    const communeName = new Map<string, string>(communes.map((c) => [c.slug, c.name]));
    const photos = photosRes.data ?? [];

    return {
      listings: listings.map((row) => toListing(row, photos, communeName)),
      agents: (agentsRes.data ?? []).map((a) => ({
        legacyId: a.legacy_id ?? null,
        slug: a.slug,
        name: a.name,
        role: a.role,
        email: a.email ?? null,
        phone: a.phone ?? null,
        bio: a.bio ?? null,
        photo: a.photo_file ?? null,
        legacyUrl: null,
      })),
      communes: communes.map((c) => ({
        name: c.name,
        slug: c.slug,
        postalCode: c.postal_code ?? null,
        activeCount: c.active_count ?? 0,
        soldCount: c.sold_count ?? 0,
        total: (c.active_count ?? 0) + (c.sold_count ?? 0),
      })),
      archives: (archivesRes.data ?? []).map((a) => ({
        reference: a.reference,
        title: a.title,
        commune: a.commune_slug ? (communeName.get(a.commune_slug) ?? null) : null,
        status: a.status,
        rooms: a.rooms ?? null,
        area: numOrNull(a.area),
        isExclusive: false,
        propertyType: a.property_type,
      })),
      origin: 'supabase',
      note: `${listings.length} biens chargés depuis Supabase.`,
    };
  } catch (error) {
    return {
      ...EMPTY,
      note: `Supabase injoignable (${
        error instanceof Error ? error.message : 'erreur réseau'
      }) — catalogue servi depuis le seed.`,
    };
  }
}
