/**
 * Désinscription effective — appelée par le bouton de /desabonnement/.
 *
 * Pourquoi une route POST plutôt qu'un simple lien qui agirait au chargement :
 * les messageries (Gmail, Outlook, passerelles antivirus) VISITENT les liens
 * contenus dans un email pour les inspecter. Un désabonnement déclenché par un
 * GET partirait donc tout seul, sans que personne n'ait cliqué, et la personne
 * cesserait de recevoir ses alertes sans comprendre pourquoi. Le lien de
 * l'email ouvre donc une page, et c'est le bouton de cette page qui agit.
 *
 * La suppression est définitive : le §21.2 demande l'effacement, pas un
 * drapeau « désinscrit » qui conserverait l'adresse.
 */
import type { APIRoute } from 'astro';
import { formsClient } from '~/lib/server/supabase-admin';
import { hashToken } from '~/lib/server/tokens';

export const prerender = false;

/** Redirige vers la page, en lui passant le résultat — jamais le jeton. */
const back = (url: URL, state: 'ok' | 'invalide' | 'panne'): Response =>
  new Response(null, {
    status: 303,
    headers: { location: new URL(`/desabonnement/?etat=${state}`, url).toString() },
  });

export const POST: APIRoute = async ({ request, url }) => {
  /*
   * Contrôle d'origine : le POST doit venir de notre page. On ne passe pas par
   * `readForm`, qui impose la chaîne anti-spam complète (Turnstile, quota) —
   * elle a sa place sur un formulaire public, pas sur un désabonnement, qu'il
   * faut au contraire rendre aussi simple que possible.
   */
  const origin = request.headers.get('origin');
  if (origin) {
    const allowed = [
      import.meta.env.PUBLIC_SITE_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      import.meta.env.DEV ? 'http://localhost:4321' : null,
    ].filter(Boolean) as string[];
    if (!allowed.some((base) => origin === base.replace(/\/$/, ''))) {
      console.warn('[alerte] désabonnement refusé — origine', origin);
      return back(url, 'invalide');
    }
  }

  let token = '';
  try {
    const form = await request.formData();
    token = String(form.get('jeton') ?? '').trim();
  } catch {
    return back(url, 'invalide');
  }

  if (!token || token.length > 64) return back(url, 'invalide');

  const db = formsClient();
  if (!db) {
    console.warn('[alerte] désabonnement impossible : client Supabase non configuré');
    return back(url, 'panne');
  }

  const { error } = await db
    .from('alert_subscriptions')
    .delete()
    .eq('unsubscribe_token_hash', await hashToken(token));

  if (error) {
    console.warn('[alerte] suppression impossible', error.code);
    return back(url, 'panne');
  }

  /*
   * On ne regarde pas combien de lignes ont disparu. Zéro signifierait « jeton
   * inconnu » ou « déjà désinscrit » ; dans les deux cas l'objectif de la
   * personne — ne plus rien recevoir — est atteint, et l'annoncer différemment
   * renseignerait qui teste des jetons.
   */
  return back(url, 'ok');
};

export const ALL: APIRoute = () =>
  new Response(null, { status: 405, headers: { allow: 'POST' } });
