/**
 * Avis clients : lectures et écritures du back-office (table `reviews`).
 *
 * NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT.
 *
 * Les avis sont copiés mot pour mot depuis Google (§13) : le back-office ne
 * propose aucune « amélioration » du texte.
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

export interface AdminReview {
  id: string;
  author: string;
  body: string;
  rating: number;
  published_on: string | null;
  agent_slug: string | null;
  topic: string | null;
  position: number;
}

const COLS = 'id, author, body, rating, published_on, agent_slug, topic, position';

export async function readReviews(): Promise<AdminReview[]> {
  const { data, error } = await db()
    .from('reviews')
    .select(COLS)
    .order('position', { ascending: true })
    .order('published_on', { ascending: false });
  if (error) throw new AdminDataError('Lecture des avis impossible.', `select reviews : ${error.code}`);
  return (data ?? []) as AdminReview[];
}

export interface ReviewInput {
  author: string;
  body: string;
  rating: number;
  published_on: string | null;
  agent_slug: string | null;
  position: number;
}

export function parseReview(form: FormData): ReviewInput {
  const author = String(form.get('author') ?? '').trim();
  const body = String(form.get('body') ?? '').replace(/\r\n/g, '\n').trim();
  const rating = Number(form.get('rating'));
  const published = String(form.get('published_on') ?? '').trim();
  const agent = String(form.get('agent_slug') ?? '').trim();
  const position = Number(form.get('position') ?? 100);

  if (author.length < 2 || author.length > 80) throw new AdminDataError('Le nom de l’auteur doit faire entre 2 et 80 caractères.');
  if (body.length < 10 || body.length > 3000) throw new AdminDataError('Le texte de l’avis doit faire entre 10 et 3 000 caractères.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AdminDataError('La note doit être comprise entre 1 et 5.');
  if (published && !/^\d{4}-\d{2}-\d{2}$/.test(published)) throw new AdminDataError('La date doit être au format AAAA-MM-JJ.');
  if (agent && !/^[a-z0-9-]{2,80}$/.test(agent)) throw new AdminDataError('Conseiller inconnu.');

  return {
    author,
    body,
    rating,
    published_on: published || null,
    agent_slug: agent || null,
    position: Number.isInteger(position) ? Math.max(0, Math.min(999, position)) : 100,
  };
}

export async function insertReview(input: ReviewInput): Promise<void> {
  const { error } = await db().from('reviews').insert(input);
  if (error) throw new AdminDataError('Enregistrement impossible.', `insert reviews : ${error.code}`);
}

export async function updateReview(id: string, input: ReviewInput): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new AdminDataError('Avis inconnu.');
  const { error } = await db().from('reviews').update(input).eq('id', id);
  if (error) throw new AdminDataError('Enregistrement impossible.', `update reviews ${id} : ${error.code}`);
}

export async function deleteReview(id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new AdminDataError('Avis inconnu.');
  const { error } = await db().from('reviews').delete().eq('id', id);
  if (error) throw new AdminDataError('Suppression impossible.', `delete reviews ${id} : ${error.code}`);
}
