/**
 * Notification par email du conseiller (§20.5, étape 7).
 *
 * Le contenu saisi par le visiteur est échappé et n'est jamais injecté dans un
 * en-tête : sujet, destinataire et `reply-to` sont construits par nous.
 * Les erreurs sont journalisées sans donnée personnelle.
 *
 * Le service d'envoi n'est pas encore choisi (§19). La fonction reste
 * volontairement générique : on branche l'API retenue à un seul endroit.
 */
import { escapeHtml, headerSafe } from './guard';

interface Notification {
  subject: string;
  /** Paires libellé / valeur, échappées avant rendu. */
  fields: [string, string][];
  replyTo?: string;
}

export async function notifyAgency(notification: Notification): Promise<void> {
  const apiKey = process.env.EMAIL_API_KEY;
  const to = process.env.EMAIL_TO_AGENCY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !to || !from) {
    // Sans service configuré, la demande est déjà enregistrée en base :
    // aucune donnée n'est perdue, mais le défaut est signalé.
    console.warn('[notify] service d’emailing non configuré — notification non envoyée');
    return;
  }

  const rows = notification.fields
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:4px 12px 4px 0">${escapeHtml(label)}</th>` +
        `<td style="padding:4px 0">${escapeHtml(value).replace(/\n/g, '<br>')}</td></tr>`
    )
    .join('');

  const html = `<table style="font-family:system-ui,sans-serif;font-size:14px">${rows}</table>`;

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
        to: [headerSafe(to)],
        subject: headerSafe(notification.subject),
        reply_to: notification.replyTo ? headerSafe(notification.replyTo) : undefined,
        html,
      }),
    });

    if (!response.ok) {
      console.warn('[notify] envoi refusé', response.status);
    }
  } catch (error) {
    console.warn('[notify] envoi impossible', error instanceof Error ? error.message : 'erreur');
  }
}
