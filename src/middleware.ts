/**
 * Contrôle d'origine sur toutes les requêtes qui modifient quelque chose.
 *
 * Remplace la vérification intégrée d'Astro (`security.checkOrigin`,
 * désactivée dans astro.config.mjs) : celle-ci compare l'origine à l'URL
 * reconstruite par l'adaptateur Vercel, qui ne correspond pas à l'alias
 * `*.vercel.app` — la connexion au back-office y était refusée avec
 * « Cross-site POST form submissions are forbidden ». La règle appliquée ici
 * est la même, mais compare à l'hôte réellement demandé par le navigateur.
 */
import { defineMiddleware } from 'astro:middleware';
import { isSameOrigin } from '~/lib/server/origin';

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const onRequest = defineMiddleware((context, next) => {
  // Les pages pré-rendues n'ont pas de requête réelle à contrôler.
  if (context.isPrerendered) return next();
  if (UNSAFE.has(context.request.method) && !isSameOrigin(context.request)) {
    return new Response('Requête refusée : origine inconnue.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  return next();
});
