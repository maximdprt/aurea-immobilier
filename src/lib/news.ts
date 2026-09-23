/**
 * Actualites de l'agence, redigees dans le back-office (table `news`).
 *
 * Chargement unique au build, avec la cle publique : seules les actualites
 * publiees sont lisibles par le role anonyme, la RLS s'en charge. Une base
 * absente donne simplement une liste vide : la page « Actualites » explique
 * alors qu'il n'y a rien a lire pour le moment.
 */
import { publicClient } from '~/lib/supabase/public';
import { renderSimpleMarkdown } from '~/lib/markdown';

export interface NewsItem {
  slug: string;
  title: string;
  excerpt: string | null;
  /** Texte source (format simple). */
  body: string;
  /** HTML sur, rendu par `renderSimpleMarkdown`. */
  html: string;
  coverKey: string | null;
  authorSlug: string | null;
  publishedAt: string;
  updatedAt: string;
}

async function load(): Promise<NewsItem[]> {
  const db = publicClient();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from('news')
      .select('slug, title, excerpt, body, cover_key, author_slug, published_at, updated_at')
      .order('published_at', { ascending: false });
    if (error) {
      console.log(`[actualites] lecture impossible (${error.code})`);
      return [];
    }
    return (data ?? []).map((n) => ({
      slug: n.slug,
      title: n.title,
      excerpt: n.excerpt ?? null,
      body: n.body ?? '',
      html: renderSimpleMarkdown(n.body ?? ''),
      coverKey: n.cover_key ?? null,
      authorSlug: n.author_slug ?? null,
      publishedAt: n.published_at,
      updatedAt: n.updated_at,
    }));
  } catch (error) {
    console.log(`[actualites] base injoignable (${error instanceof Error ? error.message : 'erreur'})`);
    return [];
  }
}

const items = await load();

export const allNews = (): NewsItem[] => items;
export const latestNews = (n = 3): NewsItem[] => items.slice(0, n);
export const newsBySlug = (slug: string): NewsItem | undefined => items.find((i) => i.slug === slug);
