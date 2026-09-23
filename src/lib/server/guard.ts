/**
 * Garde commune aux routes de formulaire (prompt v3 §20.5).
 *
 * Ordre imposé, et appliqué dans cet ordre :
 *  1. POST uniquement, type de contenu attendu, corps <= 16 Ko
 *  2. contrôle de l'en-tête Origin (protection CSRF)
 *  3. vérification serveur du jeton Turnstile et du honeypot
 *  4. limitation de débit
 *  5. validation Zod stricte (le schéma est fourni par l'appelant)
 *  6. insertion avec le client serveur
 *  7. notification, contenu échappé
 *  8. réponse générique, journalisation sans donnée personnelle
 */
import { formsClient, hashIp } from './supabase-admin';
import { env } from './env';

const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT = { max: 5, windowSeconds: 60 };

export class GuardError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Détail technique, journalisé mais jamais renvoyé au client. */
    readonly internal?: string
  ) {
    super(message);
  }
}

/**
 * Sans JavaScript, le formulaire est soumis en navigation classique : le
 * navigateur n'attend pas du JSON mais une page. On le renvoie alors vers
 * /merci/ avec l'état, plutôt que de lui afficher un objet brut.
 */
const wantsHtml = (request?: Request): boolean =>
  Boolean(request) && !(request!.headers.get('accept') ?? '').includes('application/json');

const redirectTo = (path: string): Response =>
  new Response(null, { status: 303, headers: { location: path } });

/** Réponse générique : jamais de détail interne côté client. */
export const jsonError = (error: unknown, request?: Request): Response => {
  const guard = error instanceof GuardError ? error : null;
  if (!guard) {
    console.error('[form] erreur inattendue', error instanceof Error ? error.message : error);
  } else if (guard.internal) {
    console.warn('[form] rejet', guard.internal);
  }
  if (wantsHtml(request)) return redirectTo('/merci/?etat=erreur');
  return new Response(
    JSON.stringify({ message: guard?.message ?? 'Envoi impossible pour le moment.' }),
    {
      status: guard?.status ?? 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    }
  );
};

export const jsonOk = (request?: Request): Response =>
  wantsHtml(request)
    ? redirectTo('/merci/?etat=ok')
    : new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

/**
 * Origine locale, quel que soit le port.
 *
 * Le serveur de développement choisit son port : 4321 s'il est libre, 4322,
 * 4331… sinon. Un port codé en dur condamnait donc les formulaires à répondre
 * 403 dès que le port par défaut était pris, et ce pour les trois formulaires
 * du site.
 *
 * Deux précautions :
 *  - on compare le NOM D'HÔTE après analyse de l'URL, jamais le préfixe de la
 *    chaîne — `http://localhost.attaquant.fr` commence par `http://localhost` ;
 *  - l'appelant ne consulte cette fonction que sous `import.meta.env.DEV`, figé
 *    à la compilation : la tolérance n'existe pas dans le build de production.
 */
export const isLocalOrigin = (value: string): boolean => {
  try {
    const { hostname } = new URL(value);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    // En-tête `Origin` qui n'est pas une URL : rien à autoriser.
    return false;
  }
};

/** 1 et 2 — méthode, taille, origine. */
export async function readForm(request: Request): Promise<FormData> {
  if (request.method !== 'POST') {
    throw new GuardError('Méthode non autorisée.', 405, `méthode ${request.method}`);
  }

  const type = request.headers.get('content-type') ?? '';
  if (!type.includes('form-data') && !type.includes('x-www-form-urlencoded')) {
    throw new GuardError('Requête invalide.', 415, `content-type ${type}`);
  }

  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) {
    throw new GuardError('Message trop long.', 413, `corps de ${length} octets`);
  }

  const origin = request.headers.get('origin');
  if (origin) {
    const allowed = [
      env('PUBLIC_SITE_URL'),
      env('VERCEL_URL') ? `https://${env('VERCEL_URL')}` : null,
    ].filter(Boolean) as string[];

    const ok =
      allowed.some((base) => origin === base.replace(/\/$/, '')) ||
      (import.meta.env.DEV && isLocalOrigin(origin));

    if (!ok) {
      throw new GuardError('Requête refusée.', 403, `origine ${origin}`);
    }
  }

  return request.formData();
}

/** 3 — honeypot puis Turnstile, vérifié côté serveur. */
export async function checkAntiSpam(form: FormData, ip: string): Promise<void> {
  // Un humain ne voit pas ce champ et ne le remplit donc jamais.
  if (String(form.get('website') ?? '').trim() !== '') {
    throw new GuardError('Envoi impossible.', 400, 'honeypot rempli');
  }

  const secret = env('TURNSTILE_SECRET_KEY');
  if (!secret) {
    // Sans clé configurée, on ne bloque pas le formulaire, mais on le signale :
    // partir en production sans Turnstile est un défaut de recette (§18).
    console.warn('[form] TURNSTILE_SECRET_KEY absente — anti-spam non vérifié');
    return;
  }

  const token = String(form.get('cf-turnstile-response') ?? '');
  if (!token) {
    throw new GuardError('Vérification anti-spam manquante.', 400, 'jeton Turnstile absent');
  }

  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);

  const result = (await (
    await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    })
  ).json()) as { success: boolean; 'error-codes'?: string[] };

  if (!result.success) {
    throw new GuardError(
      'La vérification anti-spam a échoué. Rechargez la page et réessayez.',
      403,
      `turnstile ${result['error-codes']?.join(',') ?? 'refus'}`
    );
  }
}

/**
 * 4 — limitation de débit applicative, en complément de la règle Vercel
 * Firewall. L'IP n'est jamais stockée en clair.
 */
export async function checkRateLimit(ip: string, route: string): Promise<void> {
  const db = formsClient();
  if (!db || !ip) return;

  const ipHash = await hashIp(ip);
  const windowStart = new Date(
    Math.floor(Date.now() / (RATE_LIMIT.windowSeconds * 1000)) * RATE_LIMIT.windowSeconds * 1000
  ).toISOString();

  const { data, error } = await db
    .schema('private')
    .from('rate_limits')
    .upsert(
      { ip_hash: ipHash, route, window_start: windowStart, hits: 1 },
      { onConflict: 'ip_hash,route,window_start', ignoreDuplicates: false }
    )
    .select('hits')
    .single();

  if (error) {
    // Un échec de compteur ne doit pas bloquer un envoi légitime, mais il est tracé.
    console.warn('[form] limitation de débit indisponible', error.message);
    return;
  }

  if ((data?.hits ?? 0) > RATE_LIMIT.max) {
    throw new GuardError(
      'Trop de demandes envoyées. Réessayez dans une minute.',
      429,
      `quota dépassé sur ${route}`
    );
  }
}

/** Adresse IP du client, telle que transmise par le proxy Vercel. */
export const clientIp = (request: Request): string =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
  request.headers.get('x-real-ip') ??
  '';

/** Échappement HTML, pour n'injecter aucun contenu utilisateur brut dans un email. */
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Nettoie une valeur destinée à un en-tête d'email : aucun retour à la ligne,
 * sous peine d'injection d'en-tête.
 */
export const headerSafe = (value: string): string =>
  value.replace(/[\r\n]+/g, ' ').slice(0, 200);
