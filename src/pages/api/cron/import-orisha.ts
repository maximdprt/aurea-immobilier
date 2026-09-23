/**
 * Import quotidien du flux d'annonces du logiciel métier (§20.7).
 *
 * Déclenché par Vercel Cron. La route refuse toute requête sans le secret
 * attendu : elle est publique par construction, elle ne doit pas être
 * exécutable par un tiers.
 *
 * Garde-fous, dans l'ordre :
 *  - validation Zod de chaque enregistrement, les invalides sont rejetés
 *    individuellement sans faire échouer l'import ;
 *  - UPSERT idempotent sur la référence ;
 *  - détection de doublons (§4) ;
 *  - refus de dépublier si plus de 20 % du catalogue disparaît d'un coup,
 *    symptôme d'un flux corrompu ;
 *  - journal dans `private.import_runs`, puis revalidation des pages touchées.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { importClient } from '~/lib/server/supabase-admin';
import { env } from '~/lib/server/env';

export const prerender = false;

/** Part maximale du catalogue pouvant disparaître en un import. */
const MAX_DISAPPEARANCE_RATIO = 0.2;

const feedItem = z
  .object({
    reference: z.coerce.number().int().positive(),
    title: z.string().trim().min(3).max(160),
    transaction_type: z.enum(['vente', 'location']),
    property_type: z.enum(['maison', 'appartement', 'immeuble', 'terrain', 'local']),
    status: z.enum(['draft', 'published', 'under_offer', 'sold', 'rented']).default('published'),
    commune: z.string().trim().min(2).max(80),
    postal_code: z.string().trim().regex(/^[0-9]{5}$/),
    price: z.coerce.number().min(0).optional(),
    living_area: z.coerce.number().min(0).optional(),
    land_area: z.coerce.number().min(0).optional(),
    rooms: z.coerce.number().int().min(0).max(40).optional(),
    bedrooms: z.coerce.number().int().min(0).max(30).optional(),
    dpe_class: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).optional(),
    ges_class: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).optional(),
    description: z.string().max(20000).optional(),
    agent_email: z.string().email().optional(),
    photos: z.array(z.object({ url: z.string().url(), alt: z.string().optional() })).default([]),
  })
  .passthrough();

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Clé de rapprochement des doublons : commune + type + surface ±2 m² + prix ±2 %. */
function isDuplicate(a: z.infer<typeof feedItem>, b: z.infer<typeof feedItem>): boolean {
  if (a.reference === b.reference) return false;
  if (slugify(a.commune) !== slugify(b.commune)) return false;
  if (a.property_type !== b.property_type) return false;
  if (a.living_area == null || b.living_area == null) return false;
  if (Math.abs(a.living_area - b.living_area) > 2) return false;
  if (a.price == null || b.price == null || a.price === 0) return false;
  return Math.abs(a.price - b.price) / a.price <= 0.02;
}

export const POST: APIRoute = async ({ request }) => {
  const expected = env('CRON_SECRET');
  const provided = request.headers.get('authorization');

  if (!expected || provided !== `Bearer ${expected}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const db = importClient();
  const feedUrl = env('ORISHA_FEED_URL');

  if (!db || !feedUrl) {
    return new Response(
      JSON.stringify({ ok: false, message: 'Flux ou base non configurés' }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    );
  }

  const startedAt = new Date().toISOString();
  const errors: { reference?: number; reason: string }[] = [];
  let created = 0;
  let updated = 0;
  let archived = 0;

  try {
    const response = await fetch(feedUrl, {
      headers: env('ORISHA_FEED_TOKEN') ? { authorization: `Bearer ${env('ORISHA_FEED_TOKEN')}` } : {},
    });
    if (!response.ok) throw new Error(`flux HTTP ${response.status}`);

    const payload = (await response.json()) as unknown;
    const rows = Array.isArray(payload) ? payload : [];

    // Validation individuelle : un enregistrement invalide n'arrête pas l'import.
    const valid: z.infer<typeof feedItem>[] = [];
    for (const row of rows) {
      const parsed = feedItem.safeParse(row);
      if (parsed.success) valid.push(parsed.data);
      else
        errors.push({
          reference: (row as { reference?: number })?.reference,
          reason: parsed.error.issues.map((i) => i.path.join('.')).join(','),
        });
    }

    // Doublons : on garde la première occurrence, on signale les suivantes.
    const kept: z.infer<typeof feedItem>[] = [];
    for (const item of valid) {
      const twin = kept.find((k) => isDuplicate(k, item));
      if (twin) {
        errors.push({
          reference: item.reference,
          reason: `doublon probable de la référence ${twin.reference}`,
        });
        continue;
      }
      kept.push(item);
    }

    // Garde-fou : un flux tronqué ne doit pas dépublier le catalogue.
    const { count: currentCount } = await db
      .from('listings')
      .select('reference', { count: 'exact', head: true })
      .in('status', ['published', 'under_offer']);

    const incoming = kept.filter((k) => k.status === 'published' || k.status === 'under_offer');
    const willDisappear = (currentCount ?? 0) - incoming.length;

    const suspicious =
      (currentCount ?? 0) > 0 &&
      willDisappear > 0 &&
      willDisappear / (currentCount ?? 1) > MAX_DISAPPEARANCE_RATIO;

    if (suspicious) {
      errors.push({
        reason: `flux suspect : ${willDisappear} biens disparaîtraient sur ${currentCount}. Aucune dépublication effectuée.`,
      });
    }

    for (const item of kept) {
      const record = {
        reference: item.reference,
        slug: `${item.reference}-${slugify(item.title)}`.slice(0, 90).replace(/-+$/, ''),
        title: item.title,
        status: item.status,
        transaction_type: item.transaction_type,
        property_type: item.property_type,
        commune_slug: slugify(item.commune),
        postal_code: item.postal_code,
        price: item.price ?? null,
        living_area: item.living_area ?? null,
        land_area: item.land_area ?? null,
        rooms: item.rooms ?? null,
        bedrooms: item.bedrooms ?? null,
        dpe_class: item.dpe_class ?? null,
        ges_class: item.ges_class ?? null,
        description: item.description ?? null,
        published_at: item.status === 'published' ? new Date().toISOString() : null,
      };

      const { error, data } = await db
        .from('listings')
        .upsert(record, { onConflict: 'reference' })
        .select('created_at, updated_at')
        .single();

      if (error) {
        errors.push({ reference: item.reference, reason: error.message });
        continue;
      }
      if (data && data.created_at === data.updated_at) created++;
      else updated++;

      // Photos du flux : l'URL distante est conservée dans `storage_path` ; le
      // pipeline images la télécharge au build et produit les variantes.
      if (item.photos.length) {
        const { error: photoError } = await db.from('listing_photos').upsert(
          item.photos.slice(0, 30).map((p, position) => ({
            listing_reference: item.reference,
            position,
            file_name: p.url.split('/').pop()?.split('?')[0] || `photo-${position}`,
            storage_path: p.url,
            alt: p.alt ?? null,
          })),
          { onConflict: 'listing_reference,position' }
        );
        if (photoError) errors.push({ reference: item.reference, reason: `photos : ${photoError.message}` });
      }
    }

    // Les biens absents du flux passent en archive — sauf si le flux est suspect.
    if (!suspicious) {
      const references = kept.map((k) => k.reference);
      const { data: archivedRows } = await db
        .from('listings')
        .update({ status: 'sold', archived_at: new Date().toISOString() })
        .in('status', ['published', 'under_offer'])
        .not('reference', 'in', `(${references.join(',') || '0'})`)
        .select('reference');
      archived = archivedRows?.length ?? 0;
    }

    await db.schema('private').from('import_runs').insert({
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      created_count: created,
      updated_count: updated,
      archived_count: archived,
      rejected_count: errors.length,
      errors: errors.length ? errors : null,
      ok: !suspicious,
    });

    return new Response(
      JSON.stringify({ ok: !suspicious, created, updated, archived, rejected: errors.length }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'erreur inconnue';
    await db.schema('private').from('import_runs').insert({
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      rejected_count: errors.length,
      errors: [...errors, { reason }],
      ok: false,
    });
    console.error('[import] échec', reason);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};

/** Vercel Cron émet un GET : on le route vers le même traitement. */
export const GET: APIRoute = (context) => POST(context);
