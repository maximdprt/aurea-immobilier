/** Modele de donnees du catalogue, partage entre le seed et Supabase. */

export type ListingStatus = 'published' | 'under_offer' | 'sold' | 'rented' | 'draft';
export type TransactionType = 'vente' | 'location';
export type PropertyType = 'maison' | 'appartement' | 'immeuble' | 'terrain' | 'local';
export type FeesPayer = 'vendeur' | 'acquereur' | 'locataire';
export type EnergyClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface ListingPhoto {
  /** Nom du fichier source dans scrapper_aurea/images/ */
  file: string;
  alt: string;
}

export interface Listing {
  reference: number;
  /** Identifiant de l'ancien site, conserve pour le raccordement 301 (§10). */
  legacyProductsId: string;
  legacyCPath: string | null;
  legacySlug: string;
  legacyUrl: string;

  slug: string;
  title: string;
  rawTitle: string;
  status: ListingStatus;
  transaction: TransactionType;
  propertyType: PropertyType;
  subtype: string | null;

  commune: string | null;
  communeSlug: string | null;
  postalCode: string | null;

  /** Vente : prix honoraires inclus. Location : loyer charges comprises. */
  price: number | null;
  feesPayer: FeesPayer | null;
  rentBase: number | null;
  rentCharges: number | null;
  rentTotal: number | null;
  tenantFees: number | null;
  inventoryFees: number | null;
  deposit: number | null;

  livingArea: number | null;
  landArea: number | null;
  livingRoomArea: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  floors: number | null;
  yearBuilt: number | null;

  heating: string | null;
  condition: string | null;
  hasGarden: boolean;
  hasElevator: boolean;
  cellars: number | null;
  exposure: string | null;
  windows: string | null;
  sanitation: string | null;

  isCondo: boolean;
  condoLots: number | null;
  condoHousingLots: number | null;
  condoAnnualCharges: number | null;
  propertyTax: number | null;
  rentControlled: boolean;

  dpeClass: EnergyClass | null;
  dpeFinalClass: EnergyClass | null;
  dpeValue: number | null;
  dpeFinalValue: number | null;
  gesClass: EnergyClass | null;
  gesValue: number | null;
  energyCostMin: number | null;
  energyCostMax: number | null;
  dpeDate: string | null;
  erp: boolean;
  erpDate: string | null;

  transitAccess: string | null;
  isExclusive: boolean;

  advisorName: string | null;
  advisorRole: string | null;
  agentSlug: string | null;

  description: string;
  photos: ListingPhoto[];
  /** Tableau brut « Caracteristiques detaillees » de l'ancien site. */
  characteristics: Record<string, string>;
}

/** Bien vendu ou loue connu uniquement par les pages « Nos reussites ». */
export interface ArchivedListing {
  reference: number;
  title: string;
  commune: string | null;
  status: 'sold' | 'rented';
  rooms: number | null;
  area: number | null;
  isExclusive: boolean;
  propertyType: PropertyType;
}

export interface Agent {
  legacyId: string | null;
  slug: string;
  name: string;
  role: string;
  email: string | null;
  /** Ligne directe publiee sur l'ancienne page « Notre agence ». */
  phone: string | null;
  photo: string | null;
  legacyUrl: string | null;
}

export interface Commune {
  name: string;
  slug: string;
  postalCode: string | null;
  activeCount: number;
  soldCount: number;
  total: number;
}

export interface MediaVariant {
  base: string;
  widths: number[];
  /** Largeur de l'unique image WebP de repli servie en `src`. */
  fallbackWidth?: number;
  width: number;
  height: number;
  ratio: number;
}

export interface ListingMedia {
  photos: (MediaVariant & { index: number; alt: string })[];
  og: string | null;
}

export interface Redirect {
  source: string;
  destination: string;
  statusCode: number;
  note: string;
}
