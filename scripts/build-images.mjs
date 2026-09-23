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
import { join, dirname, isAbsolute, parse as parsePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'scrapper_aurea', 'images');
const OUT = join(ROOT, 'public', 'media');
const DATA = join(ROOT, 'src', 'data');
/** Originaux telecharges depuis Supabase Storage (jamais versionnes). */
const CACHE = join(ROOT, '.cache', 'media');

/**
 * Variables d'environnement : sur Vercel elles sont dans process.env ; en
 * local elles vivent dans .env.local, que Node ne lit pas tout seul.
 */
function loadDotEnv() {
  const file = join(ROOT, '.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadDotEnv();
const SUPABASE_URL = (process.env.PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

const listings = JSON.parse(readFileSync(join(DATA, 'listings.json'), 'utf8'));
const agents = JSON.parse(readFileSync(join(DATA, 'agents.json'), 'utf8'));

const AVIF = { quality: 46, effort: 6, chromaSubsampling: '4:2:0' };
const WEBP = { quality: 64, effort: 5 };

/*
 * Portraits : reglages plus genereux que pour les photos de biens.
 *
 * - `4:4:4` au lieu de `4:2:0` : le sous-echantillonnage de chrominance divise
 *   par deux la definition des couleurs. Sur un paysage cela ne se voit pas,
 *   sur un visage cela etale les teints et salit le contour des levres et des
 *   yeux. Un portrait fait quelques dizaines de Ko : la depense est minime.
 * - qualite plus haute, effort maximal a l'encodage (le build est hors ligne).
 */
const AVIF_PORTRAIT = { quality: 62, effort: 9, chromaSubsampling: '4:4:4' };
const WEBP_PORTRAIT = { quality: 86, effort: 6, smartSubsample: true };
const manifest = {};
let written = 0;
let bytes = 0;

const ensure = (dir) => mkdirSync(dir, { recursive: true });

/* ------------------------------------------------- portraits de l'equipe */
/*
 * Les photos fournies par l'agence sont heterogenes : certaines cadrent le
 * visage, d'autres la personne entiere a plusieurs metres. Mises cote a cote,
 * les tetes vont du simple au double et la grille parait bancale.
 *
 * On releve donc, une fois pour toutes, la position du visage sur chaque
 * photo REDRESSEE (centre X, centre Y, hauteur de la tete, en fraction de
 * l'image), puis on calcule un cadrage qui amene toutes les tetes a la meme
 * taille et a la meme hauteur dans le cadre.
 *
 * Mesures faites a la grille sur les originaux ; a refaire si l'agence
 * fournit de nouvelles photos.
 */
const FACES = {
  'helene-vermeire-benz': { x: 0.48, y: 0.13, h: 0.13 },
  'vincent-maume': { x: 0.5, y: 0.14, h: 0.12 },
  'oriane-cherel': { x: 0.62, y: 0.15, h: 0.13 },
  'justine-vitry': { x: 0.4, y: 0.24, h: 0.15 },
  'natacha-laly': { x: 0.5, y: 0.22, h: 0.16 },
  'aimee-vaillant': { x: 0.57, y: 0.25, h: 0.15 },
  'evan-fernandes': { x: 0.43, y: 0.25, h: 0.135 },
  'jill-thepaut': { x: 0.53, y: 0.27, h: 0.11 },
  'marion-nicaise': { x: 0.52, y: 0.37, h: 0.07 },
};

/** Portrait 4:5, tete a 17 % de la hauteur, centre du visage a 27 % du haut. */
/*
 * Portrait 4:5, tete a 17 % de la hauteur, centre du visage a 27 % du haut.
 *
 * `widths` est un PLAFOND : on ne produit jamais une largeur superieure au
 * recadrage natif. Les sorties etaient jusqu'ici en 600 px pour un recadrage
 * de 427 px, soit un agrandissement de 41 % — de la matiere inventee par
 * l'interpolation, donc du flou. Les photos fournies par l'agence plafonnent
 * a 640 px de cote : c'est la limite, on ne la depasse pas.
 */
const PORTRAIT = { aspect: 4 / 5, head: 0.17, headY: 0.27, widths: [220, 440] };

/**
 * Cadre de recadrage pour une photo donnee. `maxUpscale` evite d'agrandir une
 * photo trop large au-dela du raisonnable : mieux vaut une tete un peu plus
 * petite qu'un portrait flou (cas de Marion Nicaise, photographiee de loin).
 */
function faceCrop(srcW, srcH, face, outW, maxUpscale = 1.35) {
  let hc = (face.h * srcH) / PORTRAIT.head;
  let wc = hc * PORTRAIT.aspect;
  const fit = () => {
    if (wc > srcW) {
      wc = srcW;
      hc = wc / PORTRAIT.aspect;
    }
    if (hc > srcH) {
      hc = srcH;
      wc = hc * PORTRAIT.aspect;
    }
  };
  fit();
  const minW = outW / maxUpscale;
  if (wc < minW) {
    wc = Math.min(minW, srcW);
    hc = wc / PORTRAIT.aspect;
    fit();
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  return {
    left: Math.round(clamp(face.x * srcW - wc / 2, 0, srcW - wc)),
    top: Math.round(clamp(face.y * srcH - PORTRAIT.headY * hc, 0, srcH - hc)),
    width: Math.round(wc),
    height: Math.round(hc),
  };
}

/**
 * Parmi tous les fichiers `<slug>-*` du corpus, retient celui qui a le plus de
 * pixels une fois redresse. L'extraction retenait le fichier nomme d'apres
 * l'identifiant interne, systematiquement la vignette 200x300, alors qu'une
 * version 427x640 existait a cote.
 */
async function bestPortrait(slug) {
  const candidates = readdirSync(SRC).filter(
    (f) => f.startsWith(`${slug}-`) && !f.includes('no-picture') && /\.(jpe?g|png|webp)$/i.test(f)
  );
  let best = null;
  for (const file of candidates) {
    try {
      const info = await sharp(join(SRC, file))
        .rotate()
        .toBuffer({ resolveWithObject: true })
        .then((r) => r.info);
      const area = info.width * info.height;
      if (!best || area > best.area) {
        best = { file, path: join(SRC, file), area, width: info.width, height: info.height };
      }
    } catch {
      /* fichier illisible (SVG « no-picture ») : ignore */
    }
  }
  return best;
}

/** Dimensions d'un fichier quelconque, une fois redresse. */
async function describeFile(path) {
  try {
    const info = await sharp(path)
      .rotate()
      .toBuffer({ resolveWithObject: true })
      .then((r) => r.info);
    return { file: parsePath(path).base, path, width: info.width, height: info.height, area: info.width * info.height };
  } catch {
    return null;
  }
}

/** Variantes d'un portrait : recadre sur le visage, puis AVIF + WebP. */
async function portraitVariants(slug, outDir, sourcePath = null, baseName = slug) {
  const src = sourcePath ? await describeFile(sourcePath) : await bestPortrait(slug);
  if (!src) return null;
  // Un portrait televerse depuis le back-office n'a pas de repere de visage :
  // sharp cadre alors sur la zone la plus « interessante » (position: attention).
  const face = sourcePath ? null : FACES[slug];
  if (!face && !sourcePath) {
    console.warn(`  ! pas de repere de visage pour ${slug} : cadrage centre par defaut`);
  }
  ensure(outDir);
  const rotated = await sharp(src.path).rotate().toBuffer();
  // Les photos du scraping plafonnent a 640 px ; un fichier televerse peut
  // aller jusqu'a 880 px de large, ce qui couvre les ecrans a haute densite.
  const ceiling = sourcePath ? 880 : PORTRAIT.widths[PORTRAIT.widths.length - 1];
  // `maxUpscale: 1` : le cadre ne descend jamais sous la largeur demandee, donc
  // aucune variante n'a besoin d'etre agrandie.
  const box = face ? faceCrop(src.width, src.height, face, ceiling, 1) : null;
  const nativeW = box
    ? box.width
    : Math.min(src.width, Math.floor(src.height * PORTRAIT.aspect), ceiling);

  const base = () => {
    const p = sharp(rotated);
    return box ? p.extract(box) : p;
  };

  /*
   * Aucune largeur au-dela du recadrage natif : pas d'agrandissement. On
   * ajoute ensuite la largeur native elle-meme comme plus grande variante,
   * sans quoi un cadre de 427 px ne produirait que le palier 220 px et les
   * ecrans a haute densite afficheraient une image deux fois trop petite.
   */
  const maxNative = Math.round(nativeW);
  const targets = PORTRAIT.widths.filter((w) => w < maxNative);
  targets.push(maxNative);

  const render = (w) =>
    base()
      .resize(w, Math.round(w / PORTRAIT.aspect), {
        fit: 'cover',
        position: box ? 'centre' : 'attention',
        kernel: 'lanczos3',
      })
      // Accentuation legere, appliquee APRES reduction : elle compense la
      // douceur inherente au reechantillonnage, sans creer de halo.
      .sharpen({ sigma: 0.5, m1: 0.6, m2: 2 });

  const produced = [];
  for (const w of targets) {
    const out = join(outDir, `${baseName}-${w}.avif`);
    await render(w).avif(AVIF_PORTRAIT).toFile(out);
    bytes += statSync(out).size;
    written++;
    produced.push(w);
  }
  const fbWidth = produced[produced.length - 1];
  const fbOut = join(outDir, `${baseName}-${fbWidth}.webp`);
  await render(fbWidth).webp(WEBP_PORTRAIT).toFile(fbOut);
  bytes += statSync(fbOut).size;
  written++;

  return {
    widths: produced,
    fallbackWidth: fbWidth,
    width: fbWidth,
    height: Math.round(fbWidth / PORTRAIT.aspect),
    ratio: Number(PORTRAIT.aspect.toFixed(4)),
  };
}


/**
 * Genere les variantes d'une image source.
 * @returns {Promise<{base:string,widths:number[],width:number,height:number,ratio:number}|null>}
 */
async function variants(sourceFile, outDir, baseName, widths, { square = false } = {}) {
  const input = isAbsolute(sourceFile) ? sourceFile : join(SRC, sourceFile);
  if (!existsSync(input)) {
    console.warn(`  ! introuvable : ${sourceFile}`);
    return null;
  }
  /*
   * Metadonnees APRES rotation EXIF. Les lire avant serait un piege : deux
   * portraits de l'equipe portent `orientation: 8` (photo couchee a 90 deg).
   * On enregistrait alors un ratio paysage pour une image finalement
   * verticale, et le navigateur ecrasait l'image aux dimensions annoncees.
   */
  const meta = await sharp(input).rotate().toBuffer({ resolveWithObject: true })
    .then((r) => r.info)
    .catch(() => null);
  if (!meta || !meta.width || !meta.height) return null;

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
  const input = isAbsolute(sourceFile) ? sourceFile : join(SRC, sourceFile);
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

/* ------------------------------------- visuels importes depuis le back-office */

/** Appel REST Supabase avec la cle publique (lecture seule, sous RLS). */
async function supabaseRows(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${path} : HTTP ${res.status}`);
  return res.json();
}

/**
 * Telecharge un original dans le cache local, une seule fois par version
 * (le nom contient l'empreinte de l'URL, donc un fichier remplace change de nom).
 */
async function fetchOriginal(url, ext) {
  ensure(CACHE);
  const name = `${createHash('sha1').update(url).digest('hex').slice(0, 16)}.${ext}`;
  const path = join(CACHE, name);
  if (existsSync(path)) return path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`telechargement impossible (${res.status}) : ${url}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

const extFromMime = (mime) => (mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg');

/**
 * Remplace, dans le manifeste, les visuels pour lesquels l'agence a televerse
 * une photo (table `media_assets`), et ajoute les photos de biens dont la
 * source est une URL distante (flux du logiciel metier).
 *
 * Les fichiers produits portent une empreinte dans leur chemin : les en-tetes
 * de cache des medias sont immuables (un an), un visuel remplace doit donc
 * changer d'adresse.
 */
async function applyOverrides() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('  visuels televerses : Supabase non configure, etape ignoree');
    return;
  }

  let assets = [];
  let remotePhotos = [];
  try {
    assets = await supabaseRows('media_assets?select=key,storage_path,mime,updated_at');
    remotePhotos = await supabaseRows(
      'listing_photos?select=listing_reference,position,storage_path,alt&storage_path=like.http*'
    );
  } catch (error) {
    console.warn(`  ! visuels televerses : lecture impossible (${error.message}) — visuels d'origine conserves`);
    return;
  }

  let applied = 0;

  for (const asset of assets) {
    const url = `${SUPABASE_URL}/storage/v1/object/public/media/${asset.storage_path}`;
    const stamp = createHash('sha1').update(asset.storage_path).digest('hex').slice(0, 10);
    try {
      const path = await fetchOriginal(url, extFromMime(asset.mime));
      const key = asset.key;
      let m;

      if ((m = key.match(/^editorial:([a-z0-9-]+)$/))) {
        const name = m[1];
        const v = await variants(path, join(OUT, 'o', stamp), name, [640, 1024, 1600, 2000]);
        if (v) manifest[key] = { base: `/media/o/${stamp}/${name}`, ...v };
        if (name === 'hero-accueil') {
          const og = await ogImage(path, join(OUT, 'o', stamp), 'default');
          if (og) manifest['og:default'] = `/media/o/${stamp}/${og}`;
        }
      } else if ((m = key.match(/^agent:([a-z0-9-]+)$/))) {
        const slug = m[1];
        const v = await portraitVariants(slug, join(OUT, 'o', stamp), path, slug);
        if (v) manifest[key] = { base: `/media/o/${stamp}/${slug}`, ...v };
      } else if ((m = key.match(/^bien:(\d+):(\d+)$/))) {
        const ref = m[1];
        const index = Number(m[2]);
        const v = await variants(path, join(OUT, 'o', stamp), `p${index}`, [400, 800, 1200, 1600]);
        if (v) {
          const entry = manifest[`bien:${ref}`] ?? { photos: [], og: null };
          const photo = { index, base: `/media/o/${stamp}/p${index}`, alt: '', ...v };
          const at = entry.photos.findIndex((p) => p.index === index);
          if (at === -1) entry.photos.push(photo);
          else entry.photos[at] = photo;
          entry.photos.sort((a, b) => a.index - b.index);
          if (index === 0) {
            const og = await ogImage(path, join(OUT, 'o', stamp), 'share');
            if (og) entry.og = `/media/o/${stamp}/${og}`;
          }
          manifest[`bien:${ref}`] = entry;
        }
      } else if ((m = key.match(/^actu:([a-z0-9-]+)$/))) {
        const slug = m[1];
        const v = await variants(path, join(OUT, 'o', stamp), slug, [640, 1024, 1600]);
        if (v) manifest[key] = { base: `/media/o/${stamp}/${slug}`, ...v };
        const og = await ogImage(path, join(OUT, 'o', stamp), `${slug}-share`);
        if (og && manifest[key]) manifest[key].og = `/media/o/${stamp}/${og}`;
      } else if (key === 'logo') {
        const dir = join(OUT, 'o', stamp);
        ensure(dir);
        const trimmedLogo = await sharp(path).trim({ threshold: 5 }).toBuffer();
        const meta = await sharp(trimmedLogo).metadata();
        for (const w of [180, 360, 720]) {
          for (const [ext, fn, opts] of [
            ['avif', 'avif', AVIF],
            ['webp', 'webp', { quality: 88, alphaQuality: 90 }],
            ['png', 'png', { compressionLevel: 9 }],
          ]) {
            const out = join(dir, `logo-${w}.${ext}`);
            await sharp(trimmedLogo).resize({ width: w, withoutEnlargement: false }).toFormat(fn, opts).toFile(out);
            bytes += statSync(out).size;
            written++;
          }
        }
        manifest['logo'] = {
          base: `/media/o/${stamp}/logo`,
          widths: [180, 360, 720],
          fallbackWidth: 360,
          width: 720,
          height: Math.round((720 / meta.width) * meta.height),
          ratio: Number((meta.width / meta.height).toFixed(4)),
        };
      } else {
        console.warn(`  ! cle de visuel inconnue ignoree : ${key}`);
        continue;
      }
      applied++;
    } catch (error) {
      console.warn(`  ! visuel ${asset.key} ignore : ${error.message}`);
    }
  }

  // Photos de biens dont la source est distante (flux du logiciel metier) et
  // qui n'ont pas de fichier local ni de televersement.
  for (const photo of remotePhotos) {
    const ref = photo.listing_reference;
    const index = photo.position;
    const entry = manifest[`bien:${ref}`] ?? { photos: [], og: null };
    if (entry.photos.some((p) => p.index === index)) continue;
    try {
      const stamp = createHash('sha1').update(photo.storage_path).digest('hex').slice(0, 10);
      const path = await fetchOriginal(photo.storage_path, 'jpg');
      const v = await variants(path, join(OUT, 'o', stamp), `p${index}`, [400, 800, 1200, 1600]);
      if (!v) continue;
      entry.photos.push({ index, base: `/media/o/${stamp}/p${index}`, alt: photo.alt ?? '', ...v });
      entry.photos.sort((a, b) => a.index - b.index);
      if (index === 0 && !entry.og) {
        const og = await ogImage(path, join(OUT, 'o', stamp), 'share');
        if (og) entry.og = `/media/o/${stamp}/${og}`;
      }
      manifest[`bien:${ref}`] = entry;
      applied++;
    } catch (error) {
      console.warn(`  ! photo distante ${ref}/${index} ignoree : ${error.message}`);
    }
  }

  console.log(`  visuels televerses ou distants appliques : ${applied}`);
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
    const v = await portraitVariants(agent.slug, join(OUT, 'equipe'));
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

  // 5. Visuels televerses depuis le back-office ------------------------------
  await applyOverrides();

  // 6. Palette ---------------------------------------------------------------
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
