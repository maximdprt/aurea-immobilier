/**
 * Accès au back-office de contenu, par code unique.
 *
 * NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT.
 *
 * ── Ce que ce garde protège, et ce qu'il ne protège PAS ──────────────────────
 *
 * Il ouvre l'édition du CONTENU du site (textes, équipe, biens, coordonnées).
 * Il ne donne accès ni aux demandes entrantes, ni aux inscriptions aux
 * alertes : ces données personnelles restent derrière `/admin/demandes/`, qui
 * exige un compte nominatif Supabase et un second facteur (§20.4). Une fuite
 * du code expose donc le contenu public du site, jamais les données d'un
 * client.
 *
 * ── Pourquoi le code n'est pas dans le dépôt ─────────────────────────────────
 *
 * Il est lu dans `ADMIN_CODE`. Écrit dans un fichier versionné, il resterait
 * dans l'historique Git même après avoir été changé, et serait lisible par
 * quiconque obtient une copie du dépôt.
 *
 * ── La session ───────────────────────────────────────────────────────────────
 *
 * Un cookie signé (HMAC-SHA256), pas le code lui-même : le code ne circule
 * qu'une fois, à la connexion. La clé de signature est DÉRIVÉE du code, ce qui
 * donne une propriété utile gratuitement — changer `ADMIN_CODE` invalide
 * immédiatement toutes les sessions ouvertes.
 */
import { SignJWT, jwtVerify } from 'jose';
import type { AstroCookies } from 'astro';
import { env } from './env';

const COOKIE = 'aurea_admin';
/** Huit heures : une journée de travail, pas davantage. */
const MAX_AGE_SECONDS = 8 * 60 * 60;
const ISSUER = 'aurea:admin-contenu';

const enc = new TextEncoder();

export const isAdminCodeConfigured = (): boolean => {
  const code = env('ADMIN_CODE') ?? '';
  return code.length >= 8;
};

/** Clé de signature dérivée du code. Jamais exposée, jamais journalisée. */
async function signingKey(): Promise<Uint8Array | null> {
  const code = env('ADMIN_CODE');
  if (!code) return null;
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(`admin-session:${code}`));
  return new Uint8Array(digest);
}

/**
 * Comparaison à temps constant.
 *
 * Un `===` sur des chaînes s'arrête au premier caractère qui diffère : le temps
 * de réponse trahit alors combien de caractères sont justes, et le code se
 * devine caractère par caractère. On compare donc les empreintes, de longueur
 * fixe, et on parcourt tous les octets quoi qu'il arrive.
 */
async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** `true` si le code saisi est le bon. */
export async function verifyAdminCode(submitted: string): Promise<boolean> {
  const expected = env('ADMIN_CODE');
  if (!expected || !submitted) return false;
  return constantTimeEqual(submitted, expected);
}

/** Pose le cookie de session après une saisie correcte. */
export async function openAdminSession(cookies: AstroCookies): Promise<boolean> {
  const key = await signingKey();
  if (!key) return false;

  const token = await new SignJWT({ scope: 'contenu' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key);

  cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // `import.meta.env.DEV` est figé à la compilation : en production le cookie
    // n'est transmis qu'en HTTPS.
    secure: !import.meta.env.DEV,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

export function closeAdminSession(cookies: AstroCookies): void {
  cookies.delete(COOKIE, { path: '/' });
}

/** `true` si la requête porte une session de contenu valide. */
export async function hasAdminSession(cookies: AstroCookies): Promise<boolean> {
  const token = cookies.get(COOKIE)?.value;
  const key = await signingKey();
  if (!token || !key) return false;

  try {
    await jwtVerify(token, key, { issuer: ISSUER });
    return true;
  } catch {
    // Signature invalide, jeton expiré, ou code changé depuis : dans tous les
    // cas la session ne vaut plus rien, et on ne distingue pas les causes.
    return false;
  }
}
