/**
 * Mise en ligne après un enregistrement.
 *
 * NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT : l'URL du hook vaut un droit
 * de déclencher un déploiement, c'est un secret.
 *
 * Le site est entièrement pré-rendu (§6) : une modification en base n'apparaît
 * donc qu'au build suivant. Plutôt que de sacrifier le pré-rendu, on relance
 * le build — Vercel expose pour cela une URL de « Deploy Hook » qu'un simple
 * POST déclenche.
 *
 * Conséquence à assumer : une modification met une à deux minutes à
 * apparaître, pas quelques secondes. C'est le prix du pré-rendu, et c'est
 * l'arbitrage retenu.
 */
import { env } from './env';

/** `true` si le déclenchement automatique est configuré. */
export const deployConfigured = (): boolean => Boolean(env('VERCEL_DEPLOY_HOOK_URL'));

export type PublishResult = 'lance' | 'non-configure' | 'echec';

/**
 * Demande un nouveau déploiement.
 *
 * N'échoue jamais bruyamment : l'enregistrement en base a déjà eu lieu quand
 * on arrive ici, et perdre la publication ne doit pas faire croire que la
 * saisie est perdue. L'appelant rend compte des deux séparément.
 */
export async function publishSite(): Promise<PublishResult> {
  const url = env('VERCEL_DEPLOY_HOOK_URL');
  if (!url) return 'non-configure';

  try {
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      console.warn('[publication] hook refusé', response.status);
      return 'echec';
    }
    return 'lance';
  } catch (error) {
    console.warn(
      '[publication] hook injoignable',
      error instanceof Error ? error.message : 'erreur'
    );
    return 'echec';
  }
}

/** Phrase rendue au navigateur après un enregistrement. */
export const publishMessage = (result: PublishResult): string =>
  result === 'lance'
    ? 'Enregistré. La mise en ligne est lancée : comptez une à deux minutes.'
    : result === 'non-configure'
      ? 'Enregistré. La mise en ligne automatique n’étant pas configurée, la modification apparaîtra au prochain déploiement.'
      : 'Enregistré, mais la mise en ligne n’a pas pu être lancée. Réessayez, ou déclenchez un déploiement depuis Vercel.';
