/**
 * Route du formulaire d'estimation.
 *
 * Même chaîne de contrôles que /api/leads (§20.5). L'adresse exacte saisie est
 * une donnée personnelle : elle est stockée dans `payload`, jamais publiée, et
 * couverte par la même durée de conservation que le reste de la demande.
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

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

const schema = z
  .object({
    property_type: z.enum(['maison', 'appartement', 'immeuble', 'terrain', 'local']),
    project: z.enum(['vendre', 'louer', 'savoir']).optional().or(z.literal('')),
    address: z.string().trim().min(3).max(160),
    postal_code: z.string().trim().regex(/^[0-9]{5}$/, 'Code postal invalide'),
    city: z.string().trim().min(2).max(80),
    living_area: z.coerce.number().min(5).max(2000),
    land_area: z.coerce.number().min(0).max(100000).optional().or(z.literal('')),
    rooms: z.coerce.number().int().min(1).max(30),
    bedrooms: z.coerce.number().int().min(0).max(20).optional().or(z.literal('')),
    condition: z.enum(['neuf', 'bon', 'rafraichir', 'travaux']).optional().or(z.literal('')),
    dpe_class: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).optional().or(z.literal('')),
    notes: optionalText(1000),
    firstname: z.string().trim().min(1).max(80),
    lastname: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(254),
    phone: z
      .string()
      .trim()
      .min(6)
      .max(25)
      .regex(/^[0-9+().\s-]*$/, 'Numéro de téléphone invalide'),
    consent: z.literal('1', { errorMap: () => ({ message: 'Consentement requis' }) }),
    consent_version: z.string().trim().min(4).max(32),
  })
  .strict();

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await readForm(request);
    const ip = clientIp(request);

    await checkAntiSpam(form, ip);
    await checkRateLimit(ip, '/api/estimation');

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
    const d = parsed.data;

    const db = formsClient();
    if (!db) {
      throw new GuardError(
        'Le service est momentanément indisponible. Vous pouvez nous appeler au 01 30 63 50 50.',
        503,
        'client Supabase non configuré'
      );
    }

    const { error } = await db.from('leads').insert({
      type: 'estimation',
      firstname: d.firstname,
      lastname: d.lastname,
      email: d.email.toLowerCase(),
      phone: d.phone,
      message: d.notes || null,
      consent_version: d.consent_version,
      source: 'estimation',
      payload: {
        property_type: d.property_type,
        project: d.project || null,
        address: d.address,
        postal_code: d.postal_code,
        city: d.city,
        living_area: d.living_area,
        land_area: d.land_area || null,
        rooms: d.rooms,
        bedrooms: d.bedrooms || null,
        condition: d.condition || null,
        dpe_class: d.dpe_class || null,
      },
    });

    if (error) {
      throw new GuardError(
        'Envoi impossible pour le moment. Vous pouvez nous appeler au 01 30 63 50 50.',
        500,
        `insert estimation : ${error.code}`
      );
    }

    await notifyAgency({
      subject: `Demande d’estimation — ${d.property_type} à ${d.city}`,
      replyTo: d.email,
      fields: [
        ['Nom', `${d.firstname} ${d.lastname}`],
        ['Email', d.email],
        ['Téléphone', d.phone],
        ['Type de bien', d.property_type],
        ['Projet', String(d.project || '—')],
        ['Adresse', `${d.address}, ${d.postal_code} ${d.city}`],
        ['Surface habitable', `${d.living_area} m²`],
        ['Terrain', d.land_area ? `${d.land_area} m²` : '—'],
        ['Pièces', String(d.rooms)],
        ['Chambres', String(d.bedrooms || '—')],
        ['État', String(d.condition || '—')],
        ['DPE annoncé', String(d.dpe_class || '—')],
        ['Précisions', d.notes || '—'],
      ],
    });

    return jsonOk(request);
  } catch (error) {
    return jsonError(error, request);
  }
};

export const ALL: APIRoute = () =>
  new Response(null, { status: 405, headers: { allow: 'POST' } });
