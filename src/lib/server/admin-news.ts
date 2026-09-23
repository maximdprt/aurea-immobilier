/**
 * Actualités : lectures et écritures du back-office (table `news`).
 *
 * NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT.
 */
import { contentClient } from './supabase-admin';
import { AdminDataError } from './admin-data';

function db() {
  const client = contentClient();
  if (!client) {
    throw new AdminDataError(
      'La base n’est pas joignable. Vérifiez SUPABASE_SECRET_KEY_CONTENT, puis réessayez.',
      'SUPABASE_SECRET_KEY_CONTENT absente'
    );
  }
  return client;
}

export interface AdminNews {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_key: string | null;
  author_slug: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLS = 'id, slug, title, excerpt, body, cover_key, author_slug, is_published, published_at, created_at, updated_at';

export async function readNews(): Promise<AdminNews[]> {
  const { data, error } = await db().from('news').select(COLS).order('created_at', { ascending: false });
  if (error) throw new AdminDataError('Lecture des actualités impossible.', `select news : ${error.code}`);
  return (data ?? []) as AdminNews[];
}

export async function readNewsById(id: string): Promise<AdminNews | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data, error } = await db().from('news').select(COLS).eq('id', id).maybeSingle();
  if (error) throw new AdminDataError('Lecture impossible.', `select news ${id} : ${error.code}`);
  return (data as AdminNews | null) ?? null;
}

/** « Une belle vente à Limay ! » -> « une-belle-vente-a-limay » */
export const slugify = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

export async function createNews(title: string): Promise<AdminNews> {
  const clean = title.trim();
  if (clean.length < 3 || clean.length > 160) {
    throw new AdminDataError('Le titre doit faire entre 3 et 160 caractères.');
  }
  let base = slugify(clean);
  if (base.length < 3) base = `actualite-${Date.now()}`;

  // Un slug déjà pris reçoit un suffixe numérique : jamais deux articles à la
  // même adresse, jamais d'erreur obscure pour la personne qui écrit.
  const { data: taken } = await db().from('news').select('slug').like('slug', `${base}%`);
  const existing = new Set((taken ?? []).map((r) => r.slug as string));
  let slug = base;
  for (let i = 2; existing.has(slug); i++) slug = `${base}-${i}`;

  const { data, error } = await db()
    .from('news')
    .insert({ slug, title: clean, body: '', is_published: false })
    .select(COLS)
    .single();
  if (error || !data) throw new AdminDataError('Création impossible.', `insert news : ${error?.code}`);
  return data as AdminNews;
}

export async function updateNews(
  id: string,
  patch: Partial<Pick<AdminNews, 'title' | 'excerpt' | 'body' | 'author_slug' | 'is_published' | 'published_at' | 'cover_key'>>
): Promise<void> {
  const { error } = await db().from('news').update(patch).eq('id', id);
  if (error) {
    throw new AdminDataError('Enregistrement impossible. L’actualité n’a pas été modifiée.', `update news ${id} : ${error.code}`);
  }
}

export async function deleteNews(id: string): Promise<void> {
  const { error } = await db().from('news').delete().eq('id', id);
  if (error) throw new AdminDataError('Suppression impossible.', `delete news ${id} : ${error.code}`);
}
