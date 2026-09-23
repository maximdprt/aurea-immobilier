/**
 * Garde des routes JSON du back-office (téléversements).
 *
 * NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT.
 *
 * Trois contrôles : session de contenu valide, méthode POST, en-tête Origin
 * du site lui-même. Les réponses d'erreur ne détaillent jamais la cause
 * interne, qui est journalisée.
 */
import type { APIContext } from 'astro';
import { hasAdminSession } from './admin-code';
import { AdminDataError } from './admin-data';
import { env } from './env';

export class AdminGuardError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const isLocalOrigin = (value: string): boolean => {
  try {
    const { hostname } = new URL(value);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
};

/** Vérifie la session et l'origine, puis rend le JSON du corps. */
export async function readAdminJson<T = Record<string, unknown>>(context: APIContext): Promise<T> {
  const { request, cookies } = context;
  if (request.method !== 'POST') throw new AdminGuardError('Méthode non autorisée.', 405);
  if (!(await hasAdminSession(cookies))) throw new AdminGuardError('Session expirée : reconnectez-vous.', 401);

  const origin = request.headers.get('origin');
  if (origin) {
    const allowed = [env('PUBLIC_SITE_URL'), env('VERCEL_URL') ? `https://${env('VERCEL_URL')}` : null]
      .filter(Boolean)
      .map((b) => (b as string).replace(/\/$/, ''));
    const ok = allowed.includes(origin) || (import.meta.env.DEV && isLocalOrigin(origin));
    if (!ok) throw new AdminGuardError('Requête refusée.', 403);
  }

  try {
    return (await request.json()) as T;
  } catch {
    throw new AdminGuardError('Corps de requête invalide.', 400);
  }
}

export const adminJson = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const adminJsonError = (error: unknown): Response => {
  if (error instanceof AdminGuardError) return adminJson({ message: error.message }, error.status);
  if (error instanceof AdminDataError) {
    if (error.internal) console.warn('[admin/api]', error.internal);
    return adminJson({ message: error.message }, 400);
  }
  console.error('[admin/api] erreur inattendue', error instanceof Error ? error.message : error);
  return adminJson({ message: 'Une erreur est survenue.' }, 500);
};
