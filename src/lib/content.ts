/**
 * Textes editables du site.
 *
 * Meme principe que le catalogue (`catalog.ts`) : un chargement UNIQUE au
 * build, jamais une requete par visite. Les pages restent pre-rendues, et une
 * modification passe en ligne par le redeploiement declenche a l'enregistrement.
 *
 * Lecture avec la cle PUBLIQUE : `site_content` est lisible par tous (ce sont
 * les textes affiches), donc le build n'a besoin d'aucun secret pour les
 * recuperer — un build Vercel sans cle secrete produit bien le site a jour.
 *
 * Regle de repli : quand une cle n'existe pas en base, on rend le texte du
 * registre (`content-schema.ts`). Une base vide — ou injoignable au moment du
 * build — produit donc exactement le site par defaut, jamais une page trouee.
 */
import { publicClient } from '~/lib/supabase/public';
import { findField, splitPair } from '~/lib/content-schema';
import { CONTACT, OPENING_HOURS, formatRanges } from '~/lib/site';

/** Document edite dans le back-office : un ensemble de champs nommes. */
export type ContentDoc = Record<string, unknown>;

async function load(): Promise<{ docs: Map<string, ContentDoc>; note: string | null }> {
  const db = publicClient();
  if (!db) {
    return { docs: new Map(), note: 'contenu : base non configuree, textes par defaut' };
  }

  try {
    const { data, error } = await db.from('site_content').select('key, value');
    if (error) {
      return { docs: new Map(), note: `contenu : lecture impossible (${error.code})` };
    }
    const docs = new Map<string, ContentDoc>();
    for (const row of data ?? []) {
      if (row.value && typeof row.value === 'object' && !Array.isArray(row.value)) {
        docs.set(row.key as string, row.value as ContentDoc);
      }
    }
    return { docs, note: docs.size ? null : 'contenu : aucun texte personnalise' };
  } catch (error) {
    return {
      docs: new Map(),
      note: `contenu : base injoignable (${error instanceof Error ? error.message : 'erreur'})`,
    };
  }
}

const snapshot = await load();
if (snapshot.note) console.log(`[contenu] ${snapshot.note}`);

/** Document complet, ou `null`. */
export const doc = (key: string): ContentDoc | null => snapshot.docs.get(key) ?? null;

/** Un champ texte libre, avec son repli explicite. */
export function text(docKey: string, field: string, fallback: string): string {
  const value = snapshot.docs.get(docKey)?.[field];
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

/** Liste de chaines, avec repli explicite. */
export function list(docKey: string, field: string, fallback: string[]): string[] {
  const value = snapshot.docs.get(docKey)?.[field];
  if (!Array.isArray(value)) return fallback;
  const clean = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  return clean.length ? clean : fallback;
}

/** Nombre, avec repli. */
export function num(docKey: string, field: string, fallback: number): number {
  const value = snapshot.docs.get(docKey)?.[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** D'ou viennent les textes affiches : repris par le tableau de bord. */
export const contentOrigin = () => ({ count: snapshot.docs.size, note: snapshot.note });

/**
 * Champ declare dans le registre : la valeur enregistree, sinon le repli ecrit
 * dans `content-schema.ts`. C'est la forme a utiliser dans les pages.
 */
export function field(docKey: string, name: string): string {
  const saved = snapshot.docs.get(docKey)?.[name];
  if (typeof saved === 'string' && saved.trim() !== '') return saved;
  return findField(docKey, name)?.fallback ?? '';
}

/** Champ de type liste, meme principe de repli. */
export function fieldList(docKey: string, name: string): string[] {
  const saved = snapshot.docs.get(docKey)?.[name];
  if (Array.isArray(saved)) {
    const clean = saved.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
    if (clean.length) return clean;
  }
  return findField(docKey, name)?.fallbackList ?? [];
}

/**
 * Liste « a deux ou trois colonnes » (etapes, arguments) : chaque ligne est
 * decoupee sur « | ». Une ligne sans separateur donne un titre seul.
 */
export const fieldPairs = (docKey: string, name: string): string[][] =>
  fieldList(docKey, name).map(splitPair);

/** Paragraphes d'un champ « paragraphe » : une ligne vide separe deux paragraphes. */
export const paragraphs = (value: string): string[] =>
  value
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/* ------------------------------------------------------- Coordonnees ---- */

export interface AgencyContact {
  phone: string;
  phoneE164: string;
  email: string;
  street: string;
  postalCode: string;
  city: string;
  /** Lignes d'horaires telles qu'affichees. */
  hours: string[];
}

/**
 * Coordonnees et horaires : les valeurs saisies dans le back-office, sinon
 * celles du code. Une seule source pour l'en-tete, le pied de page, la page
 * contact et les donnees structurees — c'est ce qui garantit la coherence NAP.
 */
export function agency(): AgencyContact {
  const e164 = text('agence.coordonnees', 'telephone_e164', CONTACT.phoneE164).replace(/\s+/g, '');
  return {
    phone: text('agence.coordonnees', 'telephone', CONTACT.phone),
    phoneE164: /^\+\d{8,15}$/.test(e164) ? e164 : CONTACT.phoneE164,
    email: text('agence.coordonnees', 'email', CONTACT.email),
    street: text('agence.coordonnees', 'rue', CONTACT.street),
    postalCode: text('agence.coordonnees', 'code_postal', CONTACT.postalCode),
    city: text('agence.coordonnees', 'ville', CONTACT.city),
    hours: list(
      'agence.horaires',
      'lignes',
      OPENING_HOURS.map((d) => `${d.label} : ${formatRanges(d)}`)
    ),
  };
}
