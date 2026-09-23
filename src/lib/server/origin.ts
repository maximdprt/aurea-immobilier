/**
 * Contrôle d'origine (protection CSRF), partagé par toutes les requêtes qui
 * modifient quelque chose : formulaires publics, back-office, désabonnement.
 *
 * NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT.
 *
 * Règle : une requête POST est acceptée si son en-tête `Origin` désigne le
 * même hôte que celui auquel le navigateur s'adresse (`X-Forwarded-Host` posé
 * par Vercel, sinon `Host`). Un site tiers ne peut pas forger l'en-tête
 * `Origin` depuis un navigateur : la comparaison suffit.
 *
 * Le site est servi sous plusieurs noms — le domaine final, l'alias
 * `*.vercel.app`, l'URL propre à chaque déploiement — et une liste figée en
 * oubliait toujours un : c'est ce qui faisait refuser la connexion au
 * back-office sur `aurea-immobilier.vercel.app`. Comparer à l'hôte de la
 * requête couvre tous les cas sans liste à tenir.
 */
import { env } from './env';

const isLocalHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

/** `true` si `value` est une origine locale (développement). */
export const isLocalOrigin = (value: string): boolean => {
  try {
    return isLocalHost(new URL(value).hostname);
  } catch {
    return false;
  }
};

/** Hôte auquel le navigateur s'est adressé. */
function requestHost(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  return (forwarded || request.headers.get('host') || new URL(request.url).host).toLowerCase();
}

/**
 * `true` si la requête vient de notre site. Sans en-tête `Origin` (vieux
 * navigateurs, requêtes serveur à serveur), on laisse passer : les autres
 * protections (cookie SameSite, jeton, anti-spam) restent en place.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (url.host.toLowerCase() === requestHost(request)) return true;

  const known = [env('PUBLIC_SITE_URL'), env('VERCEL_URL') ? `https://${env('VERCEL_URL')}` : null]
    .filter(Boolean)
    .map((b) => (b as string).replace(/\/$/, ''));
  if (known.includes(origin)) return true;

  return Boolean(import.meta.env.DEV) && isLocalHost(url.hostname);
}
