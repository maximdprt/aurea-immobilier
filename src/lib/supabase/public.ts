/**
 * Client Supabase de lecture publique.
 *
 * Deux ecarts assumes par rapport au guide de demarrage Supabase pour Next.js :
 *
 * 1. Ce projet est en Astro, pas en Next.js. On n'utilise donc ni
 *    `next/headers` ni `NEXT_PUBLIC_*` ; `@supabase/ssr` fonctionne avec
 *    n'importe quel adaptateur de cookies, celui d'Astro est branche dans
 *    `./server.ts`.
 *
 * 2. Le brief impose les nouvelles cles `sb_publishable_` / `sb_secret_`
 *    (§20.1) : les anciennes `anon` / `service_role` disparaissent fin 2026.
 *    La variable s'appelle donc `PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
 *
 * Ce client ne peut lire que ce que la RLS autorise au role `anon`, soit les
 * biens publies, les communes, les conseillers, les avis et les textes legaux.
 * Il n'ecrit jamais : toute ecriture passe par une route serveur (§20.5).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

/**
 * Renvoie le client public, ou `null` si la base n'est pas configuree.
 * Les appelants retombent alors sur le seed extrait du scraping : un build ne
 * doit jamais produire un catalogue vide (voir src/lib/catalog.ts).
 */
export function publicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  client ??= createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'aurea-site' } },
  });
  return client;
}
