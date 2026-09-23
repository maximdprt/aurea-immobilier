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
import { isSameOrigin } from './origin';

export class AdminGuardError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Vérifie la session et l'origine, puis rend le JSON du corps. */
export async function readAdminJson<T = Record<string, unknown>>(context: APIContext): Promise<T> {
  const { request, cookies } = context;
  if (request.method !== 'POST') throw new AdminGuardError('Méthode non autorisée.', 405);
  if (!(await hasAdminSession(cookies))) throw new AdminGuardError('Session expirée : reconnectez-vous.', 401);

  if (!isSameOrigin(request)) throw new AdminGuardError('Requête refusée.', 403);

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
