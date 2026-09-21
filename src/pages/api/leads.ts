/**
 * Route de réception des formulaires de contact, visite et gestion locative.
 *
 * Le navigateur n'écrit jamais directement en base (§20.5). Cette route valide,
 * filtre, limite le débit, puis insère avec le client serveur.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  GuardError,
  checkAntiSpam,
  checkRateLimit,
  clientIp,
  jsonError,
  jsonOk,
  readForm,
} from '~/lib/server/guard';
import { formsClient } from '~/lib/server/supabase-admin';
import { notifyAgency } from '~/lib/server/notify';

export const prerender = false;

/**
 * Validation stricte : liste blanche de champs, aucun champ inconnu accepté.
 * Les mêmes bornes sont répliquées en contraintes `check` dans la base — le
 * formulaire n'est pas la seule barrière (§20.2).
 */
const schema = z
  .object({
    type: z.enum(['contact', 'visite', 'gestion']),
    firstname: z.string().trim().min(1).max(80),
    lastname: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(254),
    phone: z
      .string()
      .trim()
      .max(25)
      .regex(/^[0-9+().\s-]*$/, 'Numéro de téléphone invalide')
      .optional()
      .or(z.literal('')),
    message: z.string().trim().min(1).max(2000),
    reference: z.coerce.number().int().positive().optional(),
    consent: z.literal('1', { errorMap: () => ({ message: 'Consentement requis' }) }),
    consent_version: z.string().trim().min(4).max(32),
  })
  .strict();

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await readForm(request);
    const ip = clientIp(request);

    await checkAntiSpam(form, ip);
    await checkRateLimit(ip, '/api/leads');

    // On ne transmet à Zod que les champs attendus : `website` (honeypot) et
    // `cf-turnstile-response` sont consommés en amont et écartés ici.
    const raw = Object.fromEntries(
      [...form.entries()].filter(
        ([key]) => !['website', 'cf-turnstile-response'].includes(key)
      )
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

    const db = formsClient();
    if (!db) {
      throw new GuardError(
        'Le service est momentanément indisponible. Vous pouvez nous appeler au 01 30 63 50 50.',
        503,
        'client Supabase non configuré'
      );
    }

    const { error } = await db.from('leads').insert({
      type: data.type,
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      message: data.message,
      listing_reference: data.reference ?? null,
      consent_version: data.consent_version,
      source: 'site',
    });

    if (error) {
      // Message technique journalisé, jamais renvoyé au visiteur.
      throw new GuardError(
        'Envoi impossible pour le moment. Vous pouvez nous appeler au 01 30 63 50 50.',
        500,
        `insert leads : ${error.code}`
      );
    }

    const labels: Record<typeof data.type, string> = {
      contact: 'Demande de contact',
      visite: 'Demande de visite',
      gestion: 'Demande de gestion locative',
    };

    await notifyAgency({
      subject: `${labels[data.type]}${data.reference ? ` — réf. ${data.reference}` : ''}`,
      replyTo: data.email,
      fields: [
        ['Type', labels[data.type]],
        ['Nom', `${data.firstname} ${data.lastname}`],
        ['Email', data.email],
        ['Téléphone', data.phone || '—'],
        ['Bien concerné', data.reference ? `Réf. ${data.reference}` : '—'],
        ['Message', data.message],
      ],
    });

    return jsonOk();
  } catch (error) {
    return jsonError(error);
  }
};

/** Toute autre méthode est refusée explicitement. */
export const ALL: APIRoute = () =>
  new Response(null, { status: 405, headers: { allow: 'POST' } });
