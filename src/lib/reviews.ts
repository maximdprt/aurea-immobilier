/**
 * Avis clients (table `reviews`) et note Google (document `agence.avis`).
 *
 * Les avis sont saisis dans le back-office, copiés mot pour mot depuis Google
 * (§13). Chargement unique au build avec la clé publique. Aucun balisage
 * Review / AggregateRating n'est émis : consigne explicite du §12.
 */
import { publicClient } from '~/lib/supabase/public';
import { field } from '~/lib/content';

export interface Review {
  id: string;
  author: string;
  body: string;
  rating: number;
  publishedOn: string | null;
  agentSlug: string | null;
  topic: string | null;
}

async function load(): Promise<Review[]> {
  const db = publicClient();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from('reviews')
      .select('id, author, body, rating, published_on, agent_slug, topic, position')
      .order('position', { ascending: true })
      .order('published_on', { ascending: false });
    if (error) {
      console.log(`[avis] lecture impossible (${error.code})`);
      return [];
    }
    return (data ?? []).map((r) => ({
      id: r.id,
      author: r.author,
      body: r.body,
      rating: r.rating,
      publishedOn: r.published_on ?? null,
      agentSlug: r.agent_slug ?? null,
      topic: r.topic ?? null,
    }));
  } catch {
    return [];
  }
}

const items = await load();

export const allReviews = (): Review[] => items;
export const reviewsByAgent = (slug: string): Review[] => items.filter((r) => r.agentSlug === slug);

export interface GoogleRating {
  rating: string;
  count: string;
  surveyedAt: string | null;
  profileUrl: string | null;
  reviewUrl: string | null;
}

/**
 * Note Google, uniquement si l'agence l'a renseignée : on n'affiche jamais un
 * chiffre inventé. `null` tant que la note ou le nombre d'avis manquent.
 */
export function googleRating(): GoogleRating | null {
  const rating = field('agence.avis', 'note').replace('.', ',');
  const count = field('agence.avis', 'nombre');
  if (!/^[0-5](,\d)?$/.test(rating) || !/^\d+$/.test(count)) return null;
  const url = (v: string) => (/^https?:\/\//.test(v) ? v : null);
  return {
    rating,
    count,
    surveyedAt: field('agence.avis', 'releve_le') || null,
    profileUrl: url(field('agence.avis', 'url_fiche')),
    reviewUrl: url(field('agence.avis', 'url_avis')),
  };
}
