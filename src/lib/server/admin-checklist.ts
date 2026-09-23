/**
 * Ce qui manque encore, vu depuis le back-office.
 *
 * NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT.
 *
 * Deux natures d'éléments :
 *  - ce que l'agence peut faire elle-même dans le back-office (renseigner la
 *    note Google, saisir des avis, compléter le barème…) — avec le lien ;
 *  - ce qui relève de la configuration serveur (clés, emailing, anti-spam),
 *    listé pour être transmis à la personne qui déploie le site.
 *
 * Le site public, lui, n'affiche jamais un « à fournir » : c'est ici, et
 * seulement ici, que le manque est visible.
 */
import { env } from './env';
import { readDoc, adminDataReady } from './admin-data';
import { readReviews } from './admin-reviews';

export interface ChecklistItem {
  label: string;
  detail: string;
  href?: string;
  done: boolean;
}

export async function contentChecklist(): Promise<ChecklistItem[]> {
  if (!adminDataReady()) return [];
  const [avis, honoraires, reviews] = await Promise.all([
    readDoc('agence.avis').catch(() => null),
    readDoc('agence.honoraires').catch(() => null),
    readReviews().catch(() => []),
  ]);

  const note = typeof avis?.note === 'string' && avis.note.trim() !== '';
  const location = Array.isArray(honoraires?.location) && honoraires.location.length > 0;
  const gestion = Array.isArray(honoraires?.gestion) && honoraires.gestion.length > 0;

  return [
    {
      label: 'Note Google et nombre d’avis',
      detail: 'Relevés sur la fiche Google Business ; affichés sur l’accueil et la page Avis.',
      href: '/admin/avis/',
      done: note,
    },
    {
      label: 'Au moins trois avis clients',
      detail: 'Copiés mot pour mot depuis Google. Tant qu’il n’y en a aucun, la section reste masquée.',
      href: '/admin/avis/',
      done: reviews.length >= 3,
    },
    {
      label: 'Barème des honoraires de location',
      detail: 'Obligation légale d’affichage. Sans lui, la page indique « communiqué sur demande ».',
      href: '/admin/honoraires/',
      done: location,
    },
    {
      label: 'Barème de la gestion locative',
      detail: 'Taux de gestion courante et option garantie loyers impayés.',
      href: '/admin/honoraires/',
      done: gestion,
    },
  ];
}

export function configChecklist(): ChecklistItem[] {
  const has = (name: string) => Boolean(env(name));
  return [
    {
      label: 'Clé serveur du contenu (SUPABASE_SECRET_KEY_CONTENT)',
      detail: 'Sans elle, aucune modification ne peut être enregistrée depuis ce back-office.',
      done: has('SUPABASE_SECRET_KEY_CONTENT'),
    },
    {
      label: 'Clé serveur des formulaires (SUPABASE_SECRET_KEY_FORMS)',
      detail: 'Sans elle, les formulaires de contact, d’estimation et d’alerte répondent « service indisponible ».',
      done: has('SUPABASE_SECRET_KEY_FORMS'),
    },
    {
      label: 'Mise en ligne automatique (VERCEL_DEPLOY_HOOK_URL)',
      detail: 'Sans elle, une modification n’apparaît qu’au prochain déploiement manuel.',
      done: has('VERCEL_DEPLOY_HOOK_URL'),
    },
    {
      label: 'Service d’emails (EMAIL_API_KEY, EMAIL_FROM, EMAIL_TO_AGENCY)',
      detail: 'Nécessaire pour recevoir les demandes par email et confirmer les alertes.',
      done: has('EMAIL_API_KEY') && has('EMAIL_FROM') && has('EMAIL_TO_AGENCY'),
    },
    {
      label: 'Anti-spam Turnstile (PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY)',
      detail: 'Protège les formulaires publics des robots.',
      done: has('PUBLIC_TURNSTILE_SITE_KEY') && has('TURNSTILE_SECRET_KEY'),
    },
    {
      label: 'Sel de hachage des adresses IP (IP_HASH_SALT)',
      detail: 'Sert à la limitation de débit sans stocker d’adresse IP en clair.',
      done: has('IP_HASH_SALT'),
    },
  ];
}
