/**
 * Criteres d'une alerte email.
 *
 * Forme exacte de la colonne `criteria` (jsonb) de `alert_subscriptions`. Elle
 * est partagee par la route qui enregistre, les pages qui rendent compte et,
 * plus tard, le travail qui enverra les alertes : une seule definition, pour
 * que les trois ne divergent pas.
 *
 * Aucun secret ici — ce module est importable cote client.
 */
import type { PropertyType } from '~/lib/types';
import { money } from '~/lib/format';

export interface AlertCriteria {
  transaction: 'vente' | 'location';
  /** Absent = tous les types. */
  propertyType?: PropertyType;
  /** Slug de commune. Absent = tout le secteur de l'agence. */
  commune?: string;
  /** Nom lisible de la commune, fige a l'inscription pour les emails. */
  communeName?: string;
  budgetMax?: number;
  areaMin?: number;
  roomsMin?: number;
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  maison: 'Maison',
  appartement: 'Appartement',
  immeuble: 'Immeuble',
  terrain: 'Terrain',
  local: 'Local commercial',
};

/**
 * Phrase decrivant une alerte, en francais, telle qu'on la relit a la personne
 * dans l'email de confirmation et sur la page de confirmation.
 *
 * Elle ne mentionne que les criteres reellement choisis : enumerer les champs
 * laisses vides (« budget : aucun ») ne renseigne personne et allonge l'email.
 */
export function describeCriteria(criteria: AlertCriteria): string {
  const bien = criteria.propertyType
    ? PROPERTY_TYPE_LABELS[criteria.propertyType].toLowerCase()
    : 'bien';

  const parts: string[] = [
    criteria.transaction === 'location' ? `${bien} à louer` : `${bien} à vendre`,
  ];

  parts.push(criteria.communeName ? `à ${criteria.communeName}` : 'dans le Mantois');

  const details: string[] = [];
  if (criteria.roomsMin) {
    details.push(`${criteria.roomsMin} pièce${criteria.roomsMin > 1 ? 's' : ''} minimum`);
  }
  if (criteria.areaMin) details.push(`à partir de ${criteria.areaMin} m²`);
  if (criteria.budgetMax) {
    details.push(
      criteria.transaction === 'location'
        ? `jusqu’à ${money(criteria.budgetMax)} par mois`
        : `jusqu’à ${money(criteria.budgetMax)}`
    );
  }

  const phrase = parts.join(' ');
  return details.length ? `${phrase}, ${details.join(', ')}` : phrase;
}

/**
 * Relit une valeur `jsonb` venue de la base. Le contenu a ete valide a
 * l'ecriture, mais il vient d'une colonne libre : on ne lui fait pas confiance
 * au point de l'afficher sans verifier sa forme.
 */
export function readCriteria(value: unknown): AlertCriteria | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (raw.transaction !== 'vente' && raw.transaction !== 'location') return null;

  const text = (v: unknown): string | undefined =>
    typeof v === 'string' && v.length > 0 && v.length <= 120 ? v : undefined;
  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;

  const propertyType = text(raw.propertyType);
  return {
    transaction: raw.transaction,
    propertyType:
      propertyType && propertyType in PROPERTY_TYPE_LABELS
        ? (propertyType as PropertyType)
        : undefined,
    commune: text(raw.commune),
    communeName: text(raw.communeName),
    budgetMax: num(raw.budgetMax),
    areaMin: num(raw.areaMin),
    roomsMin: num(raw.roomsMin),
  };
}
