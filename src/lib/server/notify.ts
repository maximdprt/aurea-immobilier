/**
 * Envoi d'emails (§20.5, étape 7).
 *
 * Le contenu saisi par le visiteur est échappé et n'est jamais injecté dans un
 * en-tête : sujet, destinataire et `reply-to` sont construits par nous.
 * Les erreurs sont journalisées sans donnée personnelle.
 *
 * Le service d'envoi n'est pas encore choisi (§19). Tout passe par `sendEmail`,
 * seul endroit où l'API du prestataire retenu est appelée.
 *
 * Deux usages, à ne pas confondre :
 *  - `notifyAgency` écrit à l'agence (une demande entrante) ;
 *  - `sendToVisitor` écrit à une adresse saisie sur le site. Celle-ci n'est pas
 *    vérifiée au moment de l'envoi — c'est précisément ce que la confirmation
 *    par double opt-in sert à établir.
 */
import { escapeHtml, headerSafe } from './guard';
import { env } from './env';

interface Notification {
  subject: string;
  /** Paires libellé / valeur, échappées avant rendu. */
  fields: [string, string][];
  replyTo?: string;
}

interface Email {
  to: string;
  subject: string;
  /** HTML complet du corps. L'appelant a déjà échappé ce qui vient du visiteur. */
  html: string;
  replyTo?: string;
}

/**
 * Remet un email au prestataire. `false` si l'envoi n'a pas pu avoir lieu —
 * l'appelant décide alors quoi dire au visiteur.
 */
export async function sendEmail(email: Email): Promise<boolean> {
  const apiKey = env('EMAIL_API_KEY');
  const from = env('EMAIL_FROM');

  if (!apiKey || !from) {
    console.warn('[notify] service d’emailing non configuré — email non envoyé');
    return false;
  }

  try {
    // Exemple d'intégration ; à adapter au prestataire retenu.
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: headerSafe(from),
        to: [headerSafe(email.to)],
        subject: headerSafe(email.subject),
        reply_to: email.replyTo ? headerSafe(email.replyTo) : undefined,
        html: email.html,
      }),
    });

    if (!response.ok) {
      console.warn('[notify] envoi refusé', response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[notify] envoi impossible', error instanceof Error ? error.message : 'erreur');
    return false;
  }
}

/** Email à une adresse saisie sur le site, donc pas encore vérifiée. */
export const sendToVisitor = (email: Email): Promise<boolean> => sendEmail(email);

export async function notifyAgency(notification: Notification): Promise<void> {
  const to = env('EMAIL_TO_AGENCY');
  if (!to) {
    // Sans destinataire configuré, la demande est déjà enregistrée en base :
    // aucune donnée n'est perdue, mais le défaut est signalé.
    console.warn('[notify] EMAIL_TO_AGENCY absente — notification non envoyée');
    return;
  }

  const rows = notification.fields
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:4px 12px 4px 0">${escapeHtml(label)}</th>` +
        `<td style="padding:4px 0">${escapeHtml(value).replace(/\n/g, '<br>')}</td></tr>`
    )
    .join('');

  await sendEmail({
    to,
    subject: notification.subject,
    replyTo: notification.replyTo,
    html: `<table style="font-family:system-ui,sans-serif;font-size:14px">${rows}</table>`,
  });
}
