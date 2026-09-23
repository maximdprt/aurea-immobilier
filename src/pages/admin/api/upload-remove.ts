/**
 * Retire un visuel téléversé : le site reprend l'image d'origine au prochain
 * déploiement, qui est relancé.
 */
import type { APIRoute } from 'astro';
import { adminJson, adminJsonError, readAdminJson } from '~/lib/server/admin-guard';
import { removeOverride } from '~/lib/server/admin-media';
import { publishMessage, publishSite } from '~/lib/server/publish';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const body = await readAdminJson<{ key?: string }>(context);
    await removeOverride(String(body.key ?? ''));
    return adminJson({ ok: true, message: publishMessage(await publishSite()) });
  } catch (error) {
    return adminJsonError(error);
  }
};

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { allow: 'POST' } });
