/**
 * Lectures et écritures du back-office, EN DIRECT.
 *
 * NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT.
 *
 * Distinction essentielle avec `~/lib/catalog` et `~/lib/content` : ces deux
 * modules capturent un instantané AU BUILD, ce qui est exactement ce qu'il
 * faut pour les pages publiques pré-rendues. Le back-office, lui, doit montrer
 * l'état réel de la base — sans quoi on enregistrerait une modification et la
 * page réafficherait l'ancienne valeur jusqu'au redéploiement, donnant
 * l'impression que rien n'a été pris en compte.
 *
 * D'où ce module : il interroge Supabase à chaque requête, avec la clé dédiée
 * au contenu.
 */
import { contentClient } from './supabase-admin';

export class AdminDataError extends Error {
  constructor(
    message: string,
    /** Détail technique, journalisé, jamais rendu tel quel. */
    readonly internal?: string
  ) {
    super(message);
  }
}

const UNAVAILABLE =
  'La base n’est pas joignable. Vérifiez SUPABASE_SECRET_KEY_CONTENT, puis réessayez.';

function db() {
  const client = contentClient();
  if (!client) throw new AdminDataError(UNAVAILABLE, 'SUPABASE_SECRET_KEY_CONTENT absente');
  return client;
}

/** `true` si l'écriture est possible — sert à prévenir avant toute saisie. */
export const adminDataReady = (): boolean => Boolean(contentClient());

/* ------------------------------------------------------------- Conseillers */

export interface AdminAgent {
  slug: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  photo_file: string | null;
  position: number;
  is_active: boolean;
}

export async function readAgents(): Promise<AdminAgent[]> {
  const { data, error } = await db()
    .from('agents')
    .select('slug, name, role, email, phone, bio, photo_file, position, is_active')
    .order('position', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new AdminDataError(UNAVAILABLE, `select agents : ${error.code}`);
  return (data ?? []) as AdminAgent[];
}

/** Nouveau conseiller. Le slug est dérivé du nom et doit être libre. */
export async function insertAgent(input: Pick<AdminAgent, 'slug' | 'name' | 'role' | 'email' | 'phone' | 'position'>): Promise<void> {
  const { error } = await db().from('agents').insert({ ...input, is_active: true });
  if (error) {
    throw new AdminDataError(
      error.code === '23505'
        ? 'Une fiche porte déjà ce nom : modifiez-la plutôt que d’en créer une seconde.'
        : 'Création impossible.',
      `insert agents ${input.slug} : ${error.code}`
    );
  }
}

export async function updateAgent(slug: string, patch: Partial<AdminAgent>): Promise<void> {
  const { error } = await db().from('agents').update(patch).eq('slug', slug);
  if (error) {
    throw new AdminDataError(
      'Enregistrement impossible. La fiche n’a pas été modifiée.',
      `update agents ${slug} : ${error.code}`
    );
  }
}

/* ------------------------------------------------------------------- Biens */

export interface AdminListing {
  reference: number;
  slug: string;
  title: string;
  status: string;
  transaction_type: string;
  commune_slug: string | null;
  price: number | null;
  rent_total: number | null;
  description: string | null;
  is_exclusive: boolean;
}

export async function readListings(): Promise<AdminListing[]> {
  const { data, error } = await db()
    .from('listings')
    .select(
      'reference, slug, title, status, transaction_type, commune_slug, price, rent_total, description, is_exclusive'
    )
    .order('reference', { ascending: false });

  if (error) throw new AdminDataError(UNAVAILABLE, `select listings : ${error.code}`);
  return (data ?? []) as AdminListing[];
}

export async function updateListing(
  reference: number,
  patch: Partial<AdminListing>
): Promise<void> {
  const { error } = await db().from('listings').update(patch).eq('reference', reference);
  if (error) {
    throw new AdminDataError(
      'Enregistrement impossible. L’annonce n’a pas été modifiée.',
      `update listings ${reference} : ${error.code}`
    );
  }
}

/* -------------------------------------------------- Documents de contenu */

/** Document `site_content`, lu en direct (et non depuis l'instantané du build). */
export async function readDoc(key: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db()
    .from('site_content')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) throw new AdminDataError(UNAVAILABLE, `select site_content ${key} : ${error.code}`);
  const value = data?.value;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function writeDoc(key: string, value: Record<string, unknown>): Promise<void> {
  const { error } = await db()
    .from('site_content')
    .upsert({ key, value, updated_by: 'code', updated_at: new Date().toISOString() },
      { onConflict: 'key' });

  if (error) {
    throw new AdminDataError(
      'Enregistrement impossible. Rien n’a été modifié.',
      `upsert site_content ${key} : ${error.code}`
    );
  }
}

/** Nombre de documents enregistrés — pour le tableau de bord. */
export async function countDocs(): Promise<number> {
  const { count, error } = await db()
    .from('site_content')
    .select('key', { count: 'exact', head: true });
  if (error) return 0;
  return count ?? 0;
}
