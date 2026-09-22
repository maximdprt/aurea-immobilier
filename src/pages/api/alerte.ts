/**
 * Inscription à une alerte email — première étape du double opt-in (§20.5).
 *
 * Même chaîne de contrôles que /api/leads : méthode, origine, honeypot,
 * Turnstile, limitation de débit, validation Zod stricte, écriture avec la clé
 * serveur. Rien n'est actif au terme de cette route : la ligne créée est
 * *non confirmée*, et seul le clic sur le lien envoyé par email l'active.
 *
 * ── Deux règles qui expliquent la forme du code ─────────────────────────────
 *
 * 1. La réponse est IDENTIQUE dans tous les cas. Dire « cette adresse est déjà
 *    inscrite » transformerait le formulaire en oracle : n'importe qui pourrait
 *    tester une adresse et savoir si elle est cliente. On répond donc toujours
 *    « un email vient de partir », que l'adresse soit nouvelle, en attente ou
 *    déjà confirmée.
 *
 * 2. Une inscription DÉJÀ CONFIRMÉE n'est jamais modifiée ici. Sans cela,
 *    quiconque connaît une adresse pourrait changer les critères de quelqu'un
 *    d'autre, ou — pire — remettre son inscription en attente et lui couper
 *    silencieusement ses alertes. L'adresse reçoit à la place un rappel de ses
 *    critères actuels et le lien pour se désinscrire : changer de critères
 *    suppose de passer par sa propre boîte email, donc d'en être le titulaire.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  GuardError,
  checkAntiSpam,
  checkRateLimit,
  clientIp,
  escapeHtml,
  jsonError,
  jsonOk,
  readForm,
} from '~/lib/server/guard';
import { formsClient } from '~/lib/server/supabase-admin';
import { sendToVisitor } from '~/lib/server/notify';
import {
  hashToken,
  isAlertSecretConfigured,
  newConfirmToken,
  unsubscribeToken,
} from '~/lib/server/tokens';
import { describeCriteria, readCriteria, type AlertCriteria } from '~/lib/alerts';
import { communeBySlug } from '~/lib/catalog';
import { SITE_URL, COMPANY, CONTACT } from '~/lib/site';

export const prerender = false;

/**
 * Champ numérique facultatif. `z.coerce.number()` seul transformerait une
 * chaîne vide en `0`, et un budget « 0 € » serait enregistré comme un vrai
 * critère : on ramène donc le vide à `undefined` avant toute conversion.
 */
const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(min).max(max).optional()
  );

const schema = z
  .object({
    email: z.string().trim().email().max(254),
    transaction: z.enum(['vente', 'location']),
    property_type: z
      .enum(['maison', 'appartement', 'immeuble', 'terrain', 'local'])
      .optional()
      .or(z.literal('')),
    commune: z
      .string()
      .trim()
      .max(80)
      .regex(/^[a-z0-9-]*$/, 'Commune invalide')
      .optional()
      .or(z.literal('')),
    budget_max: optionalNumber(1, 100_000_000),
    area_min: optionalNumber(1, 10_000),
    rooms_min: optionalNumber(1, 20),
    consent: z.literal('1', { errorMap: () => ({ message: 'Consentement requis' }) }),
    consent_version: z.string().trim().min(4).max(32),
  })
  .strict();

const layout = (title: string, body: string): string => `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:560px">
  <h1 style="font-size:19px;color:#001F41;margin:0 0 16px">${escapeHtml(title)}</h1>
  ${body}
  <p style="margin-top:28px;padding-top:16px;border-top:1px solid #e3e3e3;font-size:13px;color:#666">
    ${escapeHtml(COMPANY.name)} — ${escapeHtml(CONTACT.street)}, ${escapeHtml(CONTACT.postalCode)} ${escapeHtml(CONTACT.city)} — ${escapeHtml(CONTACT.phone)}
  </p>
</div>`;

const button = (href: string, label: string): string =>
  `<p style="margin:24px 0"><a href="${href}" style="display:inline-block;background:#001F41;color:#ffffff;padding:12px 22px;text-decoration:none;font-weight:600">${escapeHtml(label)}</a></p>`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await readForm(request);
    const ip = clientIp(request);

    await checkAntiSpam(form, ip);
    await checkRateLimit(ip, '/api/alerte');

    const raw = Object.fromEntries(
      [...form.entries()].filter(([key]) => !['website', 'cf-turnstile-response'].includes(key))
    );

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new GuardError(
        'Merci de vérifier les champs du formulaire.',
        400,
        parsed.error.issues.map((i) => i.path.join('.')).join(', ')
      );
    }
    const data = parsed.data;

    /** Panne côté serveur : message unique, détail technique journalisé. */
    const unavailable = (internal: string) =>
      new GuardError(
        `Le service est momentanément indisponible. Vous pouvez nous appeler au ${CONTACT.phone}.`,
        503,
        internal
      );

    const db = formsClient();
    if (!db) throw unavailable('client Supabase non configuré');
    if (!isAlertSecretConfigured()) {
      // Sans ce secret, aucun lien de désinscription ne peut être produit : on
      // refuse d'inscrire plutôt que de créer une alerte dont on ne pourrait
      // plus sortir.
      throw unavailable('ALERT_TOKEN_SECRET absente');
    }

    const email = data.email.toLowerCase();
    const commune = data.commune ? communeBySlug(data.commune) : undefined;
    const criteria: AlertCriteria = {
      transaction: data.transaction,
      ...(data.property_type ? { propertyType: data.property_type } : {}),
      ...(commune ? { commune: commune.slug, communeName: commune.name } : {}),
      ...(data.budget_max ? { budgetMax: data.budget_max } : {}),
      ...(data.area_min ? { areaMin: data.area_min } : {}),
      ...(data.rooms_min ? { roomsMin: data.rooms_min } : {}),
    };

    const { data: existing, error: readError } = await db
      .from('alert_subscriptions')
      .select('id, confirmed_at, criteria')
      .eq('email', email)
      .maybeSingle();

    if (readError) throw unavailable(`select alert_subscriptions : ${readError.code}`);

    /* Cas 3 — déjà confirmée : on ne touche à rien (voir l'en-tête, règle 2). */
    if (existing?.confirmed_at) {
      const current = readCriteria(existing.criteria);
      const token = await unsubscribeToken(existing.id);
      await sendToVisitor({
        to: email,
        subject: 'Vous recevez déjà nos alertes',
        html: layout(
          'Votre alerte est déjà active',
          `<p>Cette adresse reçoit déjà nos nouveautés${
            current ? `&nbsp;: <strong>${escapeHtml(describeCriteria(current))}</strong>` : ''
          }.</p>
           <p>Nous n’avons donc rien changé. Pour suivre une autre recherche, désinscrivez-vous
           d’abord avec le lien ci-dessous, puis réinscrivez-vous avec vos nouveaux critères.</p>
           ${token ? button(`${SITE_URL}/desabonnement/?jeton=${encodeURIComponent(token)}`, 'Me désinscrire') : ''}
           <p style="font-size:13px;color:#666">Si vous n’êtes à l’origine d’aucune demande,
           ignorez ce message : rien n’a été modifié.</p>`
        ),
      });
      return jsonOk();
    }

    /* Cas 1 et 2 — nouvelle inscription, ou inscription encore en attente : on
       (ré)écrit les critères et on repart sur un jeton neuf. */
    const confirmToken = newConfirmToken();
    const confirmHash = await hashToken(confirmToken);

    const row = {
      email,
      criteria,
      confirm_token_hash: confirmHash,
      confirmed_at: null,
    };

    const { data: saved, error: writeError } = await db
      .from('alert_subscriptions')
      .upsert(row, { onConflict: 'email' })
      .select('id')
      .single();

    if (writeError || !saved) {
      throw unavailable(`upsert alert_subscriptions : ${writeError?.code ?? 'sans ligne'}`);
    }

    /* L'empreinte du jeton de désinscription ne peut être calculée qu'une fois
       l'identifiant de la ligne connu : elle est écrite juste après. */
    const unsubToken = await unsubscribeToken(saved.id);
    if (unsubToken) {
      const { error } = await db
        .from('alert_subscriptions')
        .update({ unsubscribe_token_hash: await hashToken(unsubToken) })
        .eq('id', saved.id);
      if (error) console.warn('[alerte] empreinte de désinscription non écrite', error.code);
    }

    const sent = await sendToVisitor({
      to: email,
      subject: 'Confirmez votre alerte AUREA Immobilier',
      html: layout(
        'Plus qu’une étape',
        `<p>Vous souhaitez être prévenu dès qu’un bien correspond à cette recherche&nbsp;:</p>
         <p style="padding:12px 16px;background:#f6f6f4;border-left:3px solid #E0AE5E">
           <strong>${escapeHtml(describeCriteria(criteria))}</strong>
         </p>
         <p>Confirmez pour l’activer. Sans ce clic, aucune alerte ne partira, et votre
         adresse sera effacée sous sept jours.</p>
         ${button(`${SITE_URL}/alerte/confirmation/?jeton=${encodeURIComponent(confirmToken)}`, 'Confirmer mon alerte')}
         <p style="font-size:13px;color:#666">Vous n’êtes à l’origine d’aucune demande&nbsp;?
         Ignorez ce message : sans confirmation de votre part, rien ne sera envoyé.</p>`
      ),
    });

    if (!sent) {
      // La ligne existe mais restera non confirmée, donc muette, et la purge des
      // 7 jours l'effacera. On le dit plutôt que d'annoncer un email fantôme.
      throw new GuardError(
        `L’email de confirmation n’a pas pu être envoyé. Réessayez plus tard ou appelez-nous au ${CONTACT.phone}.`,
        502,
        'envoi de confirmation refusé'
      );
    }

    return jsonOk();
  } catch (error) {
    return jsonError(error);
  }
};

/** Toute autre méthode est refusée explicitement. */
export const ALL: APIRoute = () =>
  new Response(null, { status: 405, headers: { allow: 'POST' } });
