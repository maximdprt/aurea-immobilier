/**
 * Déconnexion du back-office.
 *
 * En POST uniquement : une déconnexion déclenchable par un simple lien ou une
 * image distante serait une CSRF de confort, mais une CSRF quand même.
 */
import type { APIRoute } from 'astro';
import { sessionClient } from '~/lib/server/supabase-session';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = sessionClient(request, cookies);
  // `scope: 'global'` révoque toutes les sessions de l'utilisateur, pas
  // seulement celle de ce navigateur (§20.4 : révocation immédiate).
  await supabase?.auth.signOut({ scope: 'global' });
  return redirect('/admin/connexion/', 303);
};

export const GET: APIRoute = ({ redirect }) => redirect('/admin/', 303);
