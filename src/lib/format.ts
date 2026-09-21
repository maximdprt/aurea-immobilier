/** Formateurs d'affichage, en francais, sans dependance externe. */
import type { EnergyClass, Listing } from './types';

const eur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

export const money = (v: number | null | undefined): string =>
  v == null ? '—' : eur.format(v);

export const area = (v: number | null | undefined): string =>
  v == null ? '—' : `${nf.format(v)} m²`;

export const plural = (n: number, one: string, many = `${one}s`): string =>
  `${n} ${n > 1 ? many : one}`;

/** « 21/07/2026 » ou ISO -> « 21 juillet 2026 ». */
export function frDate(input: string | Date | null | undefined): string | null {
  if (!input) return null;
  let d: Date;
  if (input instanceof Date) d = input;
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [dd, mm, yyyy] = input.split('/');
    d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  } else d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const isoDate = (input: string | Date | null | undefined): string | null => {
  if (!input) return null;
  if (input instanceof Date) return input.toISOString().slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [dd, mm, yyyy] = input.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

/* --------------------------------------------------------------- Biens --- */

export const statusLabel = (l: Pick<Listing, 'status' | 'transaction'>): string =>
  ({
    published: l.transaction === 'location' ? 'À louer' : 'À vendre',
    under_offer: 'Sous compromis',
    sold: 'Vendu',
    rented: 'Loué',
    draft: 'Brouillon',
  })[l.status] ?? '';

export const propertyTypeLabel = (t: Listing['propertyType']): string =>
  ({
    maison: 'Maison',
    appartement: 'Appartement',
    immeuble: 'Immeuble',
    terrain: 'Terrain',
    local: 'Local',
  })[t] ?? 'Bien';

export const feesPayerLabel = (p: Listing['feesPayer']): string | null =>
  p === 'vendeur'
    ? 'Honoraires à la charge du vendeur'
    : p === 'acquereur'
      ? "Honoraires à la charge de l'acquéreur"
      : p === 'locataire'
        ? 'Honoraires à la charge du locataire'
        : null;

/** Prix affiche : vente = prix honoraires inclus, location = loyer CC. */
export function priceLine(l: Listing): string {
  if (l.price == null) return 'Prix sur demande';
  return l.transaction === 'location' ? `${money(l.price)} /mois` : money(l.price);
}

export const pricePerSqm = (l: Listing): number | null =>
  l.transaction === 'vente' && l.price && l.livingArea
    ? Math.round(l.price / l.livingArea)
    : null;

/**
 * Titre de fiche : type + pieces + surface + commune, un seul H1 (§8).
 * On prefere une formulation reconstruite au titre criard de l'ancien site.
 */
export function listingHeading(l: Listing): string {
  const parts = [propertyTypeLabel(l.propertyType)];
  if (l.rooms) parts.push(plural(l.rooms, 'pièce'));
  if (l.livingArea) parts.push(`de ${area(l.livingArea)}`);
  if (l.commune) parts.push(`à ${l.commune}`);
  return parts.join(' ');
}

/** Resume factuel court, pour les cartes et les meta descriptions. */
export function listingSummary(l: Listing): string {
  const bits: string[] = [];
  if (l.rooms) bits.push(plural(l.rooms, 'pièce'));
  if (l.bedrooms) bits.push(plural(l.bedrooms, 'chambre'));
  if (l.livingArea) bits.push(area(l.livingArea));
  if (l.landArea) bits.push(`terrain de ${area(l.landArea)}`);
  return bits.join(' · ');
}

export const energyClasses: EnergyClass[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/**
 * Logement qualifie de passoire energetique : le calendrier d'interdiction de
 * location est un vrai sujet pour les bailleurs (§8, page gestion locative).
 */
export const isEnergySieve = (c: EnergyClass | null): boolean => c === 'F' || c === 'G';

/* ------------------------------------------------------------- Textes ---- */

/** Coupe proprement une description en une meta description de 140-155 signes. */
export function clampDescription(text: string, max = 155): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', '), cut.lastIndexOf(' '));
  return `${cut.slice(0, stop > max * 0.6 ? stop : cut.length).trim()}…`;
}

/**
 * Decoupe la description d'annonce en paragraphes lisibles. Les descriptions de
 * l'ancien site utilisent des lignes toutes en majuscules comme sous-titres
 * (« AU REZ DE CHAUSSEE ») : on les transforme en intertitres.
 */
export function descriptionBlocks(
  description: string
): { type: 'heading' | 'paragraph' | 'list'; text?: string; items?: string[] }[] {
  const lines = description
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const blocks: { type: 'heading' | 'paragraph' | 'list'; text?: string; items?: string[] }[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (bullets.length) {
      blocks.push({ type: 'list', items: bullets });
      bullets = [];
    }
  };

  for (const line of lines) {
    if (/^[-•*]\s*/.test(line)) {
      bullets.push(line.replace(/^[-•*]\s*/, ''));
      continue;
    }
    flush();
    const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, '');
    const isShoutedHeading =
      letters.length > 2 &&
      letters.length < 40 &&
      letters === letters.toUpperCase() &&
      !/\d{3,}/.test(line);
    if (isShoutedHeading) {
      blocks.push({ type: 'heading', text: sentenceCase(line.replace(/\s*:\s*$/, '')) });
    } else {
      blocks.push({ type: 'paragraph', text: line });
    }
  }
  flush();
  return blocks;
}

export const sentenceCase = (s: string): string => {
  const lower = s.toLocaleLowerCase('fr-FR');
  return lower.charAt(0).toLocaleUpperCase('fr-FR') + lower.slice(1);
};

/** Retire les coordonnees personnelles glissees dans une description. */
export function stripContacts(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '')
    .replace(/(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/g, '')
    .replace(/\*{2,}/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Compose une meta description dans la fenêtre 140-158 caractères (§8).
 *
 * `parts` est une liste de clauses par ordre de priorité : on en ajoute tant
 * qu'on n'a pas atteint le minimum, et on s'arrête avant de dépasser le
 * maximum. Écrire ces descriptions à la main page par page produit
 * inévitablement des longueurs hors bornes sur des pages générées.
 */
export function composeDescription(
  parts: (string | null | undefined | false)[],
  { min = 140, max = 158 }: { min?: number; max?: number } = {}
): string {
  const clauses = parts.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
  let out = '';

  for (const clause of clauses) {
    const candidate = out ? `${out} ${clause.trim()}` : clause.trim();
    if (candidate.length > max) {
      // La clause ne rentre pas : on continue, une clause plus courte suivra
      // peut-être et complétera la description.
      if (out.length >= min) break;
      continue;
    }
    out = candidate;
    if (out.length >= min) break;
  }

  return out || clampDescription(clauses.join(' '), max);
}

/**
 * Compose un title dans la limite de 65 caractères (§8).
 *
 * La marque est ajoutée seulement si elle tient ; sur une page dont le mot-clé
 * principal est déjà long, mieux vaut un titre lisible en entier dans les
 * résultats qu'un titre tronqué qui perd sa fin.
 */
export function composeTitle(main: string, brand = 'AUREA Immobilier', max = 65): string {
  const withBrand = `${main} – ${brand}`;
  return withBrand.length <= max ? withBrand : main.slice(0, max);
}

/**
 * « 06 33 63 02 55 » -> « +33633630255 », pour les liens `tel:` et schema.org.
 * Renvoie null si le numero n'a pas la forme d'un numero francais a 10 chiffres,
 * plutot que de produire un lien qui n'appellerait personne.
 */
export const toE164 = (phone: string | null | undefined): string | null => {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!/^0[1-9]\d{8}$/.test(digits)) return null;
  return `+33${digits.slice(1)}`;
};
