/**
 * Prix de marché DVF par commune, produits par `scripts/fetch-dvf.mjs`.
 * Aucun chiffre n'est calculé ici : ce module ne fait que lire le fichier et
 * exposer ce qui a assez de ventes pour être publié.
 */
import raw from '~/data/dvf.json';
import { money } from '~/lib/format';

export interface DvfStat {
  medianPerSqm: number | null;
  medianPrice: number | null;
  medianSurface: number | null;
  count: number;
}

export interface DvfCommune {
  name: string;
  insee: string;
  maison: DvfStat;
  appartement: DvfStat;
  byYear: Record<string, { maison: number | null; appartement: number | null }>;
}

const data = raw as unknown as {
  source: string;
  sourceUrl: string;
  extractedAt: string;
  period: string;
  lastSaleDate: string | null;
  method: string;
  communes: Record<string, DvfCommune>;
};

export const dvfMeta = () => ({
  source: data.source,
  sourceUrl: data.sourceUrl,
  extractedAt: data.extractedAt,
  period: data.period,
  lastSaleDate: data.lastSaleDate,
  method: data.method,
});

/** Données d'une commune, ou `null` si aucune statistique n'est publiable. */
export function dvfFor(slug: string | null | undefined): DvfCommune | null {
  const c = slug ? data.communes[slug] : undefined;
  if (!c) return null;
  return c.maison.medianPerSqm || c.appartement.medianPerSqm ? c : null;
}

export const allDvf = (): [string, DvfCommune][] =>
  Object.entries(data.communes)
    .filter(([, c]) => c.maison.medianPerSqm || c.appartement.medianPerSqm)
    .sort((a, b) => a[1].name.localeCompare(b[1].name, 'fr'));

export const perSqm = (v: number | null): string => (v ? `${money(v)} / m²` : '—');

/**
 * Évolution entre la première et la dernière année disponibles, en %, ou
 * `null` si l'une des deux manque.
 */
export function evolution(c: DvfCommune, type: 'maison' | 'appartement'): number | null {
  const years = Object.keys(c.byYear).sort();
  const first = c.byYear[years[0]]?.[type];
  const last = c.byYear[years[years.length - 1]]?.[type];
  if (!first || !last) return null;
  return Math.round(((last - first) / first) * 1000) / 10;
}

/** « 23 septembre 2026 » à partir d'une date ISO. */
export const frDay = (iso: string | null): string =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
