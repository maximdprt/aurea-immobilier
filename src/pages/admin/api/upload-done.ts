/**
 * Étape 2 du téléversement : le fichier est dans le bucket, on le vérifie et
 * on l'enregistre comme visuel du site, puis on relance la mise en ligne.
 */
import type { APIRoute } from 'astro';
import { adminJson, adminJsonError, readAdminJson } from '~/lib/server/admin-guard';
import { confirmUpload, publicUrl } from '~/lib/server/admin-media';
import { publishMessage, publishSite } from '~/lib/server/publish';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const body = await readAdminJson<{ key?: string; path?: string; alt?: string }>(context);
    const asset = await confirmUpload(String(body.key ?? ''), String(body.path ?? ''), body.alt ? String(body.alt) : null);
    const message = publishMessage(await publishSite());
    return adminJson({
      ok: true,
      message,
      asset: { ...asset, url: publicUrl(asset.storage_path) },
    });
  } catch (error) {
    return adminJsonError(error);
  }
};

export const ALL: APIRoute = () => new Response(null, { status: 405, headers: { allow: 'POST' } });
