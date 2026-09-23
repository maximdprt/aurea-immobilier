/**
 * Déconnexion du back-office de contenu.
 *
 * En POST uniquement : une déconnexion déclenchable par un lien ou une image
 * distante serait une CSRF de confort, mais une CSRF quand même — c'est la
 * même règle que `/admin/deconnexion/` pour l'espace des demandes.
 */
import type { APIRoute } from 'astro';
import { closeAdminSession } from '~/lib/server/admin-code';

export const prerender = false;

export const POST: APIRoute = ({ cookies, redirect }) => {
  closeAdminSession(cookies);
  return redirect('/admin/code/', 303);
};

export const GET: APIRoute = ({ redirect }) => redirect('/admin/', 303);
