/**
 * Clients Supabase cote serveur. NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT.
 *
 * La cle `sb_secret_` contourne totalement la RLS (§20.1). Elle ne doit
 * apparaitre ni dans le bundle client, ni dans le depot, ni dans les logs.
 * `scripts/check-build-secrets.mjs` fait echouer la CI si la chaine
 * `sb_secret_` se retrouve dans la sortie du build.
 *
 * Une cle par usage, pour pouvoir en revoquer une seule :
 *  - FORMS  : insertions depuis les formulaires publics
 *  - IMPORT : import quotidien du flux Orisha
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.PUBLIC_SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL;

function make(secret: string | undefined, label: string): SupabaseClient | null {
  if (!url || !secret) return null;
  if (!secret.startsWith('sb_secret_')) {
    // Refus explicite : une ancienne cle `service_role` ou une cle publiable
    // utilisee ici passerait inapercue et casserait le modele de securite.
    throw new Error(
      `[supabase-admin] ${label} : clé attendue au format sb_secret_… (voir prompt v3 §20.1)`
    );
  }
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': `aurea-${label}` } },
  });
}

/** Client utilise par les routes de formulaire. Insertions uniquement. */
export const formsClient = (): SupabaseClient | null =>
  make(process.env.SUPABASE_SECRET_KEY_FORMS, 'forms');

/** Client utilise par le cron d'import du flux Orisha. */
export const importClient = (): SupabaseClient | null =>
  make(process.env.SUPABASE_SECRET_KEY_IMPORT, 'import');

/**
 * Hachage sale d'une adresse IP : la limitation de debit a besoin d'un
 * identifiant stable, pas de l'IP en clair (§20.2).
 */
export async function hashIp(ip: string): Promise<string> {
  const salt = process.env.IP_HASH_SALT ?? '';
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}
