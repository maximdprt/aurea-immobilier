/**
 * Mise en ligne manuelle : relance le déploiement depuis le tableau de bord.
 * En POST uniquement (un lien ou une image distante ne doit pas pouvoir
 * déclencher un build).
 */
import type { APIRoute } from 'astro';
import { hasAdminSession } from '~/lib/server/admin-code';
import { publishSite } from '~/lib/server/publish';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  if (!(await hasAdminSession(cookies))) return redirect('/admin/code/', 303);
  const result = await publishSite();
  return redirect(`/admin/?publication=${result}`, 303);
};

export const GET: APIRoute = ({ redirect }) => redirect('/admin/', 303);
