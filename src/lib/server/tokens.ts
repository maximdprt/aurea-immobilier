/**
 * Jetons des alertes email (prompt v3 §20.2).
 *
 * NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT : ce module lit le secret
 * serveur `ALERT_TOKEN_SECRET`.
 *
 * Deux jetons par inscription, construits differemment parce qu'ils n'ont pas
 * la meme duree de vie :
 *
 *  - CONFIRMATION — aleatoire, a usage unique. Il prouve que la personne qui a
 *    rempli le formulaire releve bien cette boite. Il est efface des qu'il a
 *    servi.
 *
 *  - DESABONNEMENT — derive du secret serveur et de l'identifiant de la ligne
 *    (HMAC-SHA256). Il doit etre RECALCULABLE a chaque envoi d'alerte, des mois
 *    plus tard : la base ne garde que des empreintes, donc un jeton aleatoire
 *    serait perdu en clair des le premier envoi et plus aucun email ne pourrait
 *    porter son lien de desinscription. La derivation resout cela sans stocker
 *    quoi que ce soit d'exploitable.
 *
 * Dans les deux cas la base ne stocke que l'empreinte SHA-256 du jeton : une
 * fuite de `alert_subscriptions` ne permet ni de confirmer ni de desabonner une
 * adresse.
 */
import { env } from './env';

const enc = new TextEncoder();

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/** Jeton de confirmation : 256 bits d'alea, hors de portee d'une recherche exhaustive. */
export function newConfirmToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/**
 * Empreinte stockee en base. Pas de sel : le jeton fait deja 256 bits d'alea
 * (ou provient d'un HMAC), il n'y a pas de dictionnaire a lui opposer, et
 * l'empreinte doit rester calculable pour retrouver la ligne.
 */
export async function hashToken(token: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(token)));
}

/** `true` si le secret necessaire aux liens de desabonnement est configure. */
export const isAlertSecretConfigured = (): boolean =>
  Boolean(env('ALERT_TOKEN_SECRET'));

/**
 * Jeton de desabonnement d'une inscription, identique a chaque appel.
 *
 * Le prefixe `desabonnement:` enferme l'usage : si un autre lien derive un jour
 * du meme secret, son prefixe different produira un jeton different, et l'un ne
 * pourra pas servir a la place de l'autre.
 */
export async function unsubscribeToken(subscriptionId: string): Promise<string | null> {
  const secret = env('ALERT_TOKEN_SECRET');
  if (!secret) return null;

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(`desabonnement:${subscriptionId}`)
  );
  return toBase64Url(new Uint8Array(signature));
}
