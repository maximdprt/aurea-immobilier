/**
 * Chargement du catalogue depuis Supabase, avec repli sur le seed.
 *
 * C'est le point où la base devient réellement la source de vérité (§4). Le
 * chargement a lieu **une fois au build** : les pages publiques sont
 * pré-rendues, elles n'interrogent pas la base à chaque visite.
 *
 * Règle de repli, volontairement stricte : on ne remplace le seed que si la
 * base répond ET renvoie des données. Une base joignable mais vide — cas exact
 * du projet tant que les migrations ne sont pas appliquées — ne doit pas
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

/** Convertit une ligne SQL (snake_case) en objet du modèle (camelCase). */
function toListing(row: Record<string, any>, photos: Record<string, any>[]): Listing {
  return {
    reference: row.reference,
    legacyProductsId: row.legacy_products_id ?? '',
    legacyCPath: null,
    legacySlug: '',
    legacyUrl: '',
    slug: row.slug,
    title: row.title,
    rawTitle: row.title,
    status: row.status,
    transaction: row.transaction_type,
    propertyType: row.property_type,
    subtype: null,
    commune: row.communes?.name ?? null,
    communeSlug: row.commune_slug ?? null,
    postalCode: row.postal_code ?? null,
    price: row.price,
    feesPayer: row.fees_payer ?? null,
    rentBase: row.rent_base ?? null,
    rentCharges: row.rent_charges ?? null,
    rentTotal: row.rent_total ?? null,
    tenantFees: row.tenant_fees ?? null,
    inventoryFees: null,
    deposit: row.deposit ?? null,
    livingArea: row.living_area,
    landArea: row.land_area,
    livingRoomArea: null,
    rooms: row.rooms,
    bedrooms: row.bedrooms,
    bathrooms: null,
    floor: row.floor_number,
    floors: null,
    yearBuilt: row.year_built,
    heating: row.heating,
    condition: null,
    hasGarden: false,
    hasElevator: false,
    cellars: null,
    exposure: null,
    windows: null,
    sanitation: null,
    isCondo: row.is_condo ?? false,
    condoLots: row.condo_lots,
    condoHousingLots: null,
    condoAnnualCharges: row.condo_annual_charges,
    propertyTax: row.property_tax,
    rentControlled: false,
    dpeClass: row.dpe_class,
    dpeFinalClass: null,
    dpeValue: row.dpe_value,
    dpeFinalValue: null,
    gesClass: row.ges_class,
    gesValue: row.ges_value,
    energyCostMin: row.energy_cost_min,
    energyCostMax: row.energy_cost_max,
    dpeDate: row.dpe_date,
    erp: row.erp ?? false,
    erpDate: null,
    transitAccess: null,
    isExclusive: row.is_exclusive ?? false,
    advisorName: null,
    advisorRole: null,
    agentSlug: row.agent_slug ?? null,
    description: row.description ?? '',
    photos: photos
      .filter((p) => p.listing_reference === row.reference)
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ file: p.file_name, alt: p.alt ?? '' })),
    characteristics: {},
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
      db.from('listings').select('*, communes(name)').order('reference', { ascending: false }),
      db.from('listing_photos').select('listing_reference, position, file_name, alt'),
      db.from('agents').select('*').order('position'),
      db.from('communes').select('*'),
      db.from('archived_listings').select('*'),
    ]);

    const firstError =
      listingsRes.error ?? agentsRes.error ?? communesRes.error ?? archivesRes.error;

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

    const photos = photosRes.data ?? [];

    return {
      listings: listings.map((row) => toListing(row, photos)),
      agents: (agentsRes.data ?? []).map((a) => ({
        legacyId: a.legacy_id ?? null,
        slug: a.slug,
        name: a.name,
        role: a.role,
        email: a.email ?? null,
        phone: a.phone ?? null,
        photo: a.photo_file ?? null,
        legacyUrl: null,
      })),
      communes: (communesRes.data ?? []).map((c) => ({
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
        commune: null,
        status: a.status,
        rooms: a.rooms ?? null,
        area: a.area ?? null,
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
