/**
 * Téléversement des visuels depuis le back-office.
 *
 * NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT.
 *
 * ── Pourquoi en deux temps ──────────────────────────────────────────────────
 *
 * Une fonction Vercel n'accepte que 4,5 Mo de corps de requête ; une photo
 * de bien en fait souvent 8 ou 10. Le fichier ne transite donc jamais par
 * nos routes : le serveur signe une URL de dépôt (valable deux heures), le
 * navigateur envoie le fichier DIRECTEMENT au bucket Supabase, puis prévient
 * le serveur qui vérifie le fichier déposé et l'enregistre.
 *
 * ── Ce qui est vérifié ─────────────────────────────────────────────────────
 *
 *  - la clé : connue du registre (`media-schema.ts`) ou de forme valide ;
 *  - le type : JPEG, PNG ou WebP, lu dans les octets par sharp, pas déclaré ;
 *  - la résolution : au moins la taille minimale de l'emplacement, sinon le
 *    fichier est effacé et refusé — le site ne publie pas d'image floue.
 */
import sharp from 'sharp';
import { contentClient } from './supabase-admin';
import { AdminDataError } from './admin-data';
import {
  ACCEPTED_MIME,
  MAX_UPLOAD_BYTES,
  isMediaKey,
  specFor,
  type MediaSpec,
} from '~/lib/media-schema';

const BUCKET = 'media';

function db() {
  const client = contentClient();
  if (!client) {
    throw new AdminDataError(
      'La base n’est pas joignable. Vérifiez SUPABASE_SECRET_KEY_CONTENT, puis réessayez.',
      'SUPABASE_SECRET_KEY_CONTENT absente'
    );
  }
  return client;
}

export interface MediaAsset {
  key: string;
  storage_path: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  alt: string | null;
  updated_at: string;
}

/** Tous les visuels téléversés, indexés par clé. */
export async function readAssets(): Promise<Map<string, MediaAsset>> {
  const { data, error } = await db()
    .from('media_assets')
    .select('key, storage_path, mime, width, height, bytes, alt, updated_at');
  if (error) throw new AdminDataError('Lecture des visuels impossible.', `select media_assets : ${error.code}`);
  return new Map((data ?? []).map((row) => [row.key as string, row as MediaAsset]));
}

/** URL publique d'un fichier du bucket, pour l'aperçu dans le back-office. */
export function publicUrl(storagePath: string): string {
  return db().storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

const extFor = (mime: string) => (mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg');

export interface UploadTicket {
  key: string;
  path: string;
  signedUrl: string;
  token: string;
}

/** Étape 1 — signe une URL de dépôt pour une clé donnée. */
export async function createUploadTicket(key: string, mime: string, size: number): Promise<UploadTicket> {
  if (!isMediaKey(key) || !specFor(key)) {
    throw new AdminDataError('Emplacement inconnu.', `cle refusee : ${key}`);
  }
  if (!(ACCEPTED_MIME as readonly string[]).includes(mime)) {
    throw new AdminDataError('Format refusé : envoyez une image JPEG, PNG ou WebP.');
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    throw new AdminDataError('Fichier trop lourd : 25 Mo maximum.');
  }

  const path = `overrides/${key.replace(/:/g, '/')}/${crypto.randomUUID()}.${extFor(mime)}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    throw new AdminDataError('Impossible de préparer l’envoi. Réessayez.', `signed url : ${error?.message}`);
  }
  return { key, path, signedUrl: data.signedUrl, token: data.token };
}

/**
 * Étape 2 — le fichier est dans le bucket : on le relit, on le mesure, et
 * seulement alors on l'enregistre comme visuel du site.
 */
export async function confirmUpload(key: string, path: string, alt: string | null): Promise<MediaAsset> {
  const spec: MediaSpec | null = isMediaKey(key) ? specFor(key) : null;
  if (!spec) throw new AdminDataError('Emplacement inconnu.', `cle refusee : ${key}`);
  if (!path.startsWith(`overrides/${key.replace(/:/g, '/')}/`) || path.includes('..')) {
    throw new AdminDataError('Fichier inattendu.', `chemin refuse : ${path}`);
  }

  const storage = db().storage.from(BUCKET);
  const { data: blob, error } = await storage.download(path);
  if (error || !blob) {
    throw new AdminDataError(
      'Le fichier n’a pas été reçu par le serveur de stockage. Réessayez l’envoi.',
      `download : ${error?.message}`
    );
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  let meta: sharp.Metadata;
  try {
    meta = await sharp(buffer).rotate().metadata();
  } catch {
    await storage.remove([path]);
    throw new AdminDataError('Ce fichier n’est pas une image lisible.');
  }

  const mime =
    meta.format === 'jpeg' ? 'image/jpeg' : meta.format === 'png' ? 'image/png' : meta.format === 'webp' ? 'image/webp' : null;
  if (!mime) {
    await storage.remove([path]);
    throw new AdminDataError('Format refusé : envoyez une image JPEG, PNG ou WebP.');
  }

  // Dimensions APRES rotation EXIF : une photo prise en portrait a ses
  // largeur et hauteur inversées dans l'en-tête du fichier.
  const swap = (meta.orientation ?? 1) >= 5;
  const width = swap ? (meta.height ?? 0) : (meta.width ?? 0);
  const height = swap ? (meta.width ?? 0) : (meta.height ?? 0);

  if (width < spec.minWidth || height < spec.minHeight) {
    await storage.remove([path]);
    throw new AdminDataError(
      `Image trop petite (${width} × ${height} px). Cet emplacement demande au moins ${spec.minWidth} × ${spec.minHeight} px pour rester net sur grand écran.`
    );
  }

  // L'ancien fichier, s'il existe, est effacé après l'enregistrement du nouveau.
  const { data: previous } = await db().from('media_assets').select('storage_path').eq('key', key).maybeSingle();

  const row = {
    key,
    storage_path: path,
    mime,
    width,
    height,
    bytes: buffer.byteLength,
    alt: alt?.trim().slice(0, 300) || null,
    updated_by: 'code',
    updated_at: new Date().toISOString(),
  };
  const { error: writeError } = await db().from('media_assets').upsert(row, { onConflict: 'key' });
  if (writeError) {
    await storage.remove([path]);
    throw new AdminDataError('Enregistrement impossible.', `upsert media_assets : ${writeError.code}`);
  }

  if (previous?.storage_path && previous.storage_path !== path) {
    await storage.remove([previous.storage_path]);
  }

  return row;
}

/** Retire un visuel téléversé : le site reprend l'image d'origine. */
export async function removeOverride(key: string): Promise<void> {
  const { data, error } = await db().from('media_assets').select('storage_path').eq('key', key).maybeSingle();
  if (error) throw new AdminDataError('Suppression impossible.', `select media_assets : ${error.code}`);
  if (!data) return;
  const { error: delError } = await db().from('media_assets').delete().eq('key', key);
  if (delError) throw new AdminDataError('Suppression impossible.', `delete media_assets : ${delError.code}`);
  await db().storage.from(BUCKET).remove([data.storage_path]);
}
