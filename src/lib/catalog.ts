/**
 * Acces au catalogue.
 *
 * En production, la source de verite est Supabase, alimente par l'import
 * quotidien du flux Orisha (prompt v3 §4 et §20.7). Tant que la base n'est pas
 * branchee — ou si elle est injoignable au moment du build — on retombe sur le
 * seed extrait du scraping, ce qui garantit qu'un deploiement ne peut jamais
 * produire un catalogue vide.
 */
import rawListings from '~/data/listings.json';
import rawArchives from '~/data/archives.json';
import rawAgents from '~/data/agents.json';
import rawCommunes from '~/data/communes.json';
import rawMedia from '~/data/media.json';
import type {
  Agent,
  ArchivedListing,
  Commune,
  Listing,
  ListingMedia,
  MediaVariant,
  PropertyType,
} from './types';

import { loadFromSupabase } from './supabase/catalog-source';

const media = rawMedia as unknown as Record<string, ListingMedia | MediaVariant | string>;

/**
 * Chargement unique, au build : les pages publiques sont pre-rendues, elles
 * n'interrogent pas la base a chaque visite. Le `await` de premier niveau est
 * volontaire — il garantit que toutes les pages voient la meme source.
 */
const snapshot = await loadFromSupabase();

if (snapshot.note) {
  console.log(`[catalogue] ${snapshot.note}`);
}

const listings = snapshot.listings ?? (rawListings as unknown as Listing[]);
const archives = snapshot.archives ?? (rawArchives as unknown as ArchivedListing[]);
const agents = snapshot.agents ?? (rawAgents as unknown as Agent[]);
const communes = snapshot.communes ?? (rawCommunes as unknown as Commune[]);

/** D'ou viennent les donnees affichees : repris par /plan-du-site/. */
export const catalogOrigin = () => ({ origin: snapshot.origin, note: snapshot.note });

/** Statuts visibles publiquement (§20.3 : jamais un brouillon). */
const PUBLIC_STATUSES = new Set(['published', 'under_offer', 'sold', 'rented']);

export const allListings = (): Listing[] =>
  listings.filter((l) => PUBLIC_STATUSES.has(l.status));

export const activeListings = (transaction?: 'vente' | 'location'): Listing[] =>
  allListings()
    .filter((l) => l.status === 'published' || l.status === 'under_offer')
    .filter((l) => (transaction ? l.transaction === transaction : true))
    .sort(sortByInterest);

export const soldListings = (): Listing[] =>
  allListings()
    .filter((l) => l.status === 'sold' || l.status === 'rented')
    .sort((a, b) => b.reference - a.reference);

export const listingBySlug = (slug: string): Listing | undefined =>
  allListings().find((l) => l.slug === slug);

export const listingsByCommune = (communeSlug: string): Listing[] =>
  allListings().filter((l) => l.communeSlug === communeSlug);

export const listingsByAgent = (agentSlug: string): Listing[] =>
  allListings().filter((l) => l.agentSlug === agentSlug);

export const archivedListings = (): ArchivedListing[] => archives;

export const archivedByCommune = (communeName: string): ArchivedListing[] =>
  archives.filter((a) => a.commune === communeName);

export const allAgents = (): Agent[] => agents;
export const agentBySlug = (slug: string): Agent | undefined =>
  agents.find((a) => a.slug === slug);

export const allCommunes = (): Commune[] => communes;
export const communeBySlug = (slug: string): Commune | undefined =>
  communes.find((c) => c.slug === slug);

/**
 * Communes eligibles a une page dediee : le brief interdit de creer une page
 * la ou l'agence n'a pas de presence reelle (§8, regle anti doorway page).
 */
export const communesWithPage = (): Commune[] =>
  communes.filter((c) => c.activeCount > 0 || c.soldCount >= 2);

/**
 * Une page commune n'existe pas forcement : ne jamais lier vers elle sans
 * verifier, sous peine de produire des 404 internes — exactement le defaut de
 * l'ancien site (§3.3).
 */
const pagedCommuneSlugs = new Set(communesWithPage().map((c) => c.slug));
export const hasCommunePage = (slug: string | null | undefined): boolean =>
  Boolean(slug && pagedCommuneSlugs.has(slug));

/** Commune liée uniquement si sa page existe, sinon `null`. */
export const linkedCommune = (slug: string | null | undefined): Commune | null =>
  hasCommunePage(slug) ? (communeBySlug(slug!) ?? null) : null;

/**
 * Pages « type x commune » eligibles.
 *
 * Meme regle que pour les pages communes, en plus strict : au moins deux biens
 * actifs du type dans la commune, ou un bien actif plus deux ventes realisees.
 * La regle vit ici, et pas dans le template, pour que la page qui genere ces
 * URL et les pages qui les lient ne puissent pas diverger — une page generee
 * sans lien entrant est une page orpheline, une page liee sans etre generee est
 * une 404 interne.
 */
export function typeCommunePages(): { type: PropertyType; commune: Commune; listings: Listing[]; soldCount: number }[] {
  const out: { type: PropertyType; commune: Commune; listings: Listing[]; soldCount: number }[] = [];
  for (const commune of communesWithPage()) {
    for (const type of ['maison', 'appartement'] as PropertyType[]) {
      const items = activeListings('vente').filter(
        (l) => l.communeSlug === commune.slug && l.propertyType === type
      );
      const soldCount = archivedByCommune(commune.name).filter((a) => a.propertyType === type).length;
      if (items.length >= 2 || (items.length >= 1 && soldCount >= 2)) {
        out.push({ type, commune, listings: items, soldCount });
      }
    }
  }
  return out;
}

/** Pages type x commune generees pour une commune donnee. */
export const typeCommunePagesFor = (communeSlug: string) =>
  typeCommunePages().filter((p) => p.commune.slug === communeSlug);

/** Exclusivites d'abord, puis les biens les plus recemment referencés. */
function sortByInterest(a: Listing, b: Listing): number {
  if (a.isExclusive !== b.isExclusive) return a.isExclusive ? -1 : 1;
  return b.reference - a.reference;
}

/* --------------------------------------------------------------- Medias -- */

export const listingMedia = (reference: number): ListingMedia | null =>
  (media[`bien:${reference}`] as ListingMedia) ?? null;

export const agentMedia = (slug: string): MediaVariant | null =>
  (media[`agent:${slug}`] as MediaVariant) ?? null;

export const editorialMedia = (name: string): MediaVariant | null =>
  (media[`editorial:${name}`] as MediaVariant) ?? null;

export const logoMedia = (): MediaVariant | null => (media['logo'] as MediaVariant) ?? null;

export const defaultOgImage = (): string =>
  (media['og:default'] as string) ?? '/media/editorial/default-og.jpg';

/* ----------------------------------------------------- Biens similaires -- */

export function similarListings(listing: Listing, limit = 3): Listing[] {
  const pool = activeListings().filter((l) => l.reference !== listing.reference);
  const score = (l: Listing) =>
    (l.communeSlug === listing.communeSlug ? 4 : 0) +
    (l.propertyType === listing.propertyType ? 2 : 0) +
    (l.transaction === listing.transaction ? 2 : 0) +
    (listing.price && l.price && Math.abs(l.price - listing.price) / listing.price < 0.3 ? 1 : 0);
  return pool
    .map((l) => ({ l, s: score(l) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.l.reference - a.l.reference)
    .slice(0, limit)
    .map((x) => x.l);
}

/* ------------------------------------------------ Detection de doublons -- */

/**
 * L'ancien site affichait le meme bien sous deux references (§4). La meme regle
 * de rapprochement — commune + type + surface a 2 m2 pres + prix a 2 % pres —
 * est appliquee a l'import Orisha et ici, en garde-fou a l'affichage.
 */
export function findDuplicates(items: Listing[] = allListings()): Listing[][] {
  const groups: Listing[][] = [];
  const used = new Set<number>();
  for (const a of items) {
    if (used.has(a.reference)) continue;
    const group = [a];
    for (const b of items) {
      if (b.reference === a.reference || used.has(b.reference)) continue;
      const sameArea =
        a.livingArea != null && b.livingArea != null && Math.abs(a.livingArea - b.livingArea) <= 2;
      const samePrice =
        a.price != null && b.price != null && Math.abs(a.price - b.price) / a.price <= 0.02;
      if (
        a.communeSlug === b.communeSlug &&
        a.propertyType === b.propertyType &&
        sameArea &&
        samePrice
      ) {
        group.push(b);
        used.add(b.reference);
      }
    }
    if (group.length > 1) {
      used.add(a.reference);
      groups.push(group);
    }
  }
  return groups;
}

/* ------------------------------------------------------------ Compteurs -- */

import report from '~/data/scraping-report.json';

export const catalogStats = () => ({
  active: activeListings().length,
  forSale: activeListings('vente').length,
  forRent: activeListings('location').length,
  /** Total du portefeuille archive annonce par l'ancien site. */
  archivedTotal: (report as { announcedArchivedTotal: number | null }).announcedArchivedTotal,
  /** Ce que le scraping a effectivement permis de reconstituer. */
  archivedKnown: soldListings().length + archives.length,
  communes: communesWithPage().length,
});

/**
 * Phrase de presentation d'un conseiller pour les grilles d'equipe.
 *
 * Deux membres seulement ont redige la leur sur le site de l'agence ; elle est
 * alors reprise telle quelle. Pour les autres, on decrit la FONCTION — ce que
 * la personne fait dans l'agence — et le secteur reellement couvert d'apres le
 * catalogue. On n'ecrit jamais de parcours, de diplome ni d'annees
 * d'experience : ce sont des faits sur une personne reelle, ils ne
 * s'inventent pas.
 */
export function agentIntro(agent: Agent): { text: string; sourced: boolean } {
  if (agent.bio) return { text: agent.bio, sourced: true };

  const byRole = /gestionnaire/i.test(agent.role)
    ? 'Suit les locations de bout en bout : recherche du locataire, bail, états des lieux, encaissement des loyers et suivi des travaux.'
    : /direct/i.test(agent.role)
      ? 'Dirige l’agence et accompagne les projets de vente et d’acquisition sur le Mantois.'
      : 'Accompagne vendeurs et acquéreurs sur le Mantois, de la première estimation à la signature chez le notaire.';

  /*
   * Le secteur se deduit des biens suivis, mais un seul bien ne fait pas un
   * secteur : il donne la commune de ce bien, pas le territoire de la
   * personne. Sous deux biens on se tait donc — la carte affiche deja
   * « 1 bien suivi » juste en dessous. Plusieurs biens dans une meme commune
   * restent un signal valable : c'est le nombre de biens qu'on exige, pas le
   * nombre de communes.
   */
  const suivis = listingsByAgent(agent.slug);
  const communes =
    suivis.length < 2
      ? []
      : [...new Set(suivis.map((l) => l.commune).filter((c): c is string => Boolean(c)))];

  // Les points de suspension tiennent lieu de ponctuation finale : « Andresy…. »
  // avec les deux serait une faute.
  const secteur =
    communes.length === 0
      ? ''
      : communes.length > 3
        ? ` Secteur : ${communes.slice(0, 3).join(', ')}…`
        : ` Secteur : ${communes.join(', ')}.`;

  return { text: byRole + secteur, sourced: false };
}
