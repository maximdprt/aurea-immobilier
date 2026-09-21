#!/usr/bin/env node
/**
 * Pipeline images : scrapper_aurea/images/ -> public/media/**
 *
 * - AVIF + WebP, plusieurs largeurs, dimensions ecrites dans src/data/media.json
 * - metadonnees EXIF / GPS supprimees (prompt v3 §20.2 : pas de coordonnees
 *   exactes d'un bien dans un fichier public)
 * - images OG 1200x630 par bien
 * - palette extraite du logo pour alimenter le token system (§14)
 *
 * Objectif : passer des 135,8 Mo du site actuel a moins de 15 Mo (§6).
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, parse as parsePath } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'scrapper_aurea', 'images');
const OUT = join(ROOT, 'public', 'media');
const DATA = join(ROOT, 'src', 'data');

const listings = JSON.parse(readFileSync(join(DATA, 'listings.json'), 'utf8'));
const agents = JSON.parse(readFileSync(join(DATA, 'agents.json'), 'utf8'));

const AVIF = { quality: 46, effort: 6, chromaSubsampling: '4:2:0' };
const WEBP = { quality: 64, effort: 5 };
const manifest = {};
let written = 0;
let bytes = 0;

const ensure = (dir) => mkdirSync(dir, { recursive: true });

/**
 * Genere les variantes d'une image source.
 * @returns {Promise<{base:string,widths:number[],width:number,height:number,ratio:number}|null>}
 */
async function variants(sourceFile, outDir, baseName, widths, { square = false } = {}) {
  const input = join(SRC, sourceFile);
  if (!existsSync(input)) {
    console.warn(`  ! introuvable : ${sourceFile}`);
    return null;
  }
  const meta = await sharp(input).metadata();
  if (!meta.width || !meta.height) return null;

  ensure(outDir);
  const produced = [];

  for (const w of widths) {
    if (!square && w > meta.width * 1.2) continue; // pas d'upscale inutile
    const pipeline = () => {
      const p = sharp(input).rotate(); // applique l'orientation EXIF puis la jette
      return square
        ? p.resize(w, w, { fit: 'cover', position: 'attention' })
        : p.resize({ width: w, withoutEnlargement: true });
    };
    const out = join(outDir, `${baseName}-${w}.avif`);
    await pipeline().avif(AVIF).toFile(out);
    bytes += statSync(out).size;
    written++;
    produced.push(w);
  }
  if (!produced.length) return null;

  /**
   * Une seule image de repli, en WebP, servie aux navigateurs sans AVIF
   * (Safari anterieur a 16). Generer un jeu complet dans les deux formats
   * doublerait le poids du depot pour 3 % des visiteurs : on garde l'AVIF en
   * `srcset` et un WebP unique en `src`, ce qui divise le stockage par deux
   * sans degrader l'experience majoritaire (budget du §6).
   */
  const fbWidth = produced.includes(800) ? 800 : produced[produced.length - 1];
  const fbOut = join(outDir, `${baseName}-${fbWidth}.webp`);
  const fb = sharp(input).rotate();
  await (square
    ? fb.resize(fbWidth, fbWidth, { fit: 'cover', position: 'attention' })
    : fb.resize({ width: fbWidth, withoutEnlargement: true })
  )
    .webp(WEBP)
    .toFile(fbOut);
  bytes += statSync(fbOut).size;
  written++;

  const largest = Math.max(...produced);
  const ratio = square ? 1 : meta.width / meta.height;
  return {
    widths: produced,
    fallbackWidth: fbWidth,
    width: largest,
    height: Math.round(largest / ratio),
    ratio: Number(ratio.toFixed(4)),
  };
}

/** Image de partage 1200x630 (Open Graph / Twitter Card). */
async function ogImage(sourceFile, outDir, baseName) {
  const input = join(SRC, sourceFile);
  if (!existsSync(input)) return null;
  ensure(outDir);
  const out = join(outDir, `${baseName}-og.jpg`);
  await sharp(input)
    .rotate()
    .resize(1200, 630, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(out);
  bytes += statSync(out).size;
  written++;
  return `${baseName}-og.jpg`;
}

/* ------------------------------------------------------- palette du logo */

const LOGO = 'aurea-immobilier-aurea-logoe-ok.png';

/**
 * Extrait les teintes dorees reellement presentes dans le logo, pour que les
 * tokens de couleur (§14) en derivent au lieu d'etre inventes.
 */
async function logoPalette() {
  const input = join(SRC, LOGO);
  const { data, info } = await sharp(input)
    .resize(160, 160, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map();
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min < 25) continue; // gris / blanc : hors palette
    const key = [r, g, b].map((v) => Math.round(v / 16) * 16).join(',');
    const e = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    e.r += r; e.g += g; e.b += b; e.n++;
    buckets.set(key, e);
  }

  const hex = (n) => n.toString(16).padStart(2, '0');
  const toHex = ({ r, g, b, n }) =>
    '#' + hex(Math.round(r / n)) + hex(Math.round(g / n)) + hex(Math.round(b / n));
  const luminance = ({ r, g, b, n }) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / n;

  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, 24);
  const byLum = [...sorted].sort((a, b) => luminance(a) - luminance(b));

  return {
    source: LOGO,
    dominant: sorted.slice(0, 6).map(toHex),
    darkest: toHex(byLum[0]),
    mid: toHex(byLum[Math.floor(byLum.length / 2)]),
    lightest: toHex(byLum[byLum.length - 1]),
  };
}

/* ------------------------------------------------------------------ main */

async function main() {
  console.log('Pipeline images — source :', SRC);

  // 1. Photos de biens ------------------------------------------------------
  for (const listing of listings) {
    if (!listing.photos.length) continue;
    const dir = join(OUT, 'biens', String(listing.reference));
    const entries = [];
    for (const [i, photo] of listing.photos.entries()) {
      const v = await variants(photo.file, dir, String(i), [400, 800, 1200]);
      if (!v) continue;
      entries.push({
        index: i,
        base: `/media/biens/${listing.reference}/${i}`,
        alt: photo.alt,
        ...v,
      });
    }
    if (!entries.length) continue;
    const og = await ogImage(listing.photos[0].file, dir, 'share');
    manifest[`bien:${listing.reference}`] = {
      photos: entries,
      og: og ? `/media/biens/${listing.reference}/${og}` : null,
    };
  }
  console.log(`  biens : ${Object.keys(manifest).filter((k) => k.startsWith('bien:')).length}`);

  // 2. Portraits de l'equipe ------------------------------------------------
  for (const agent of agents) {
    if (!agent.photo || agent.photo.endsWith('.svg')) continue;
    const v = await variants(agent.photo, join(OUT, 'equipe'), agent.slug, [240, 480], {
      square: true,
    });
    if (v) manifest[`agent:${agent.slug}`] = { base: `/media/equipe/${agent.slug}`, ...v };
  }
  console.log(`  portraits : ${Object.keys(manifest).filter((k) => k.startsWith('agent:')).length}`);

  // 3. Visuels editoriaux ---------------------------------------------------
  const EDITORIAL = [
    ['home1a-min.jpg', 'hero-accueil', [640, 1024, 1600]],
    ['aurea-immobilier-content1.png', 'content1', [640, 1024]],
    ['photo-agence-1.jpg', 'agence', [640, 1024, 1600]],
    ['gestion2_locative.jpg', 'gestion-locative', [640, 1024, 1600]],
    ['contactez-nous-contact.jpg', 'contact', [640, 994]],
    ['nos-conseils-services.jpg', 'services', [640, 1024]],
    ['nos-conseils-service2.jpeg', 'services-2', [640, 1024]],
    ['aurea-immobilier-385554.jpg', 'vitrine', [640, 800]],
  ];
  for (const [file, name, widths] of EDITORIAL) {
    const v = await variants(file, join(OUT, 'editorial'), name, widths);
    if (v) manifest[`editorial:${name}`] = { base: `/media/editorial/${name}`, ...v };
  }
  const heroOg = await ogImage('home1a-min.jpg', join(OUT, 'editorial'), 'default');
  if (heroOg) manifest['og:default'] = `/media/editorial/${heroOg}`;
  console.log(`  visuels editoriaux : ${EDITORIAL.length}`);

  // 4. Logo et icones -------------------------------------------------------
  ensure(join(OUT, 'marque'));
  const logoSource = join(SRC, LOGO);
  const trimmed = await sharp(logoSource).trim({ threshold: 5 }).toBuffer();
  const trimMeta = await sharp(trimmed).metadata();
  for (const w of [180, 360, 720]) {
    for (const [ext, fn, opts] of [
      ['avif', 'avif', AVIF],
      ['webp', 'webp', { quality: 88, alphaQuality: 90 }],
      ['png', 'png', { compressionLevel: 9, palette: true }],
    ]) {
      const out = join(OUT, 'marque', `logo-${w}.${ext}`);
      await sharp(trimmed).resize({ width: w }).toFormat(fn, opts).toFile(out);
      bytes += statSync(out).size;
      written++;
    }
  }
  manifest['logo'] = {
    base: '/media/marque/logo',
    widths: [180, 360, 720],
    fallbackWidth: 360,
    width: 720,
    height: Math.round((720 / trimMeta.width) * trimMeta.height),
    ratio: Number((trimMeta.width / trimMeta.height).toFixed(4)),
  };

  // Icones : le logo sur fond creme, recadre carre
  for (const size of [32, 180, 512]) {
    const out = join(ROOT, 'public', size === 32 ? 'favicon-32.png' : `icon-${size}.png`);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 250, g: 248, b: 243, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp(trimmed)
            .resize({ width: Math.round(size * 0.82), height: Math.round(size * 0.82), fit: 'inside' })
            .png()
            .toBuffer(),
          gravity: 'center',
        },
      ])
      .png({ compressionLevel: 9 })
      .toFile(out);
    bytes += statSync(out).size;
    written++;
  }

  // 5. Palette ---------------------------------------------------------------
  const palette = await logoPalette();
  writeFileSync(join(DATA, 'logo-palette.json'), JSON.stringify(palette, null, 2) + '\n');
  console.log('  palette du logo :', palette.dominant.join(' '));

  writeFileSync(join(DATA, 'media.json'), JSON.stringify(manifest, null, 2) + '\n');

  const mo = (bytes / 1024 / 1024).toFixed(1);
  console.log(`\n${written} fichiers generes — ${mo} Mo au total`);
  if (bytes > 15 * 1024 * 1024) {
    console.warn('  ! budget de 15 Mo depasse (prompt v3 §6)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
