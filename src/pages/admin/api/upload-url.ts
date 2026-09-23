/**
 * Étape 1 du téléversement : signe une URL de dépôt directe vers le bucket.
 * Voir `~/lib/server/admin-media.ts` pour le pourquoi du mécanisme.
 */
import type { APIRoute } from 'astro';
import { adminJson, adminJsonError, readAdminJson } from '~/lib/server/admin-guard';
import { createUploadTicket } from '~/lib/server/admin-media';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const body = await readAdminJson<{ key?: string; mime?: string; size?: number }>(context);
    const ticket = await createUploadTicket(String(body.key ?? ''), String(body.mime ?? ''), Number(body.size));
    return adminJson(ticket);
  } catch (error) {
    return adminJsonError(error);
  }
};

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { allow: 'POST' } });
