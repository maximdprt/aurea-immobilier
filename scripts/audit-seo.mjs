#!/usr/bin/env node
/**
 * Audit de recette SEO sur le HTML réellement produit.
 *
 * Reprend les critères d'acceptation du §18 : aucun title, description ni H1
 * dupliqué, un seul H1 par page, canonical absolue partout, JSON-LD parsable,
 * aucune image sans alt, aucun lien interne cassé, et les longueurs de title et
 * de meta description dans les bornes du §8.
 *
 * Sort en code 1 si un critère bloquant échoue : la CI s'arrête.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = existsSync(join(ROOT, 'dist/client')) ? join(ROOT, 'dist/client') : join(ROOT, 'dist');

if (!existsSync(DIST)) {
  console.error('Aucun build trouvé. Lancez `npm run build` avant l’audit.');
  process.exit(1);
}

/* ------------------------------------------------------------------ outils */

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

const text = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
const first = (html, re) => html.match(re)?.[1] ?? null;
const strip = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const errors = [];
const warnings = [];
const pages = [];

/* ------------------------------------------------------------- inspection */

for (const file of walk(DIST)) {
  const html = readFileSync(file, 'utf8');
  const route =
    '/' +
    relative(DIST, file)
      .replace(/\\/g, '/')
      .replace(/index\.html$/, '')
      .replace(/\.html$/, '/');

  const title = first(html, /<title>([\s\S]*?)<\/title>/i);
  const description = first(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  const canonical = first(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i);
  const robots = first(html, /<meta\s+name="robots"\s+content="([^"]*)"/i);
  const noindex = /noindex/i.test(robots ?? '');
  const h1s = text(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map(strip);
  const jsonLd = text(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);

  const page = { route, title, description, canonical, noindex, h1: h1s[0] ?? null, html };
  pages.push(page);

  /* -- Critères bloquants ------------------------------------------------ */

  if (!title) errors.push(`${route} — title manquant`);
  if (!description) errors.push(`${route} — meta description manquante`);
  if (!canonical) errors.push(`${route} — canonical manquante`);
  else if (!canonical.startsWith('http')) errors.push(`${route} — canonical non absolue`);

  if (h1s.length === 0) errors.push(`${route} — aucun H1`);
  if (h1s.length > 1) errors.push(`${route} — ${h1s.length} H1 (un seul autorisé)`);

  /*
   * Au moins un bloc JSON-LD par page indexable. Sans ce contrôle, une erreur
   * d'injection produit zéro bloc et l'audit passe en silence — c'est
   * exactement ce qui s'est produit avec `<set:html>` employé comme balise.
   */
  if (!noindex && jsonLd.length === 0) {
    errors.push(`${route} — aucun bloc JSON-LD`);
  }
  for (const block of jsonLd) {
    try {
      const parsed = JSON.parse(block);
      if (!parsed['@context']) errors.push(`${route} — JSON-LD sans @context`);
    } catch {
      errors.push(`${route} — JSON-LD invalide`);
    }
  }
  // Un `<set:html>` mal employé ressort comme une balise littérale dans le HTML
  if (/<set:html/i.test(html)) {
    errors.push(`${route} — balise <set:html> littérale dans la sortie`);
  }

  // Consigne explicite du §12 : aucun balisage d'avis sur l'entité de l'agence
  if (/"@type"\s*:\s*"(AggregateRating|Review)"/.test(html)) {
    errors.push(`${route} — balisage Review/AggregateRating interdit (§12)`);
  }

  /*
   * Images sans alt. Le compresseur HTML d'Astro réduit `alt=""` à l'attribut
   * booléen `alt` : une image décorative reste donc conforme, et le test doit
   * accepter les deux écritures.
   */
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const hasAttr = (img, name) => new RegExp(`\\b${name}(=|[\\s>/])`).test(img);
  const noAlt = imgs.filter((img) => !hasAttr(img, 'alt'));
  if (noAlt.length) errors.push(`${route} — ${noAlt.length} image(s) sans attribut alt`);

  // Dimensions explicites : garde-fou CLS
  const noDims = imgs.filter((img) => !hasAttr(img, 'width') || !hasAttr(img, 'height'));
  if (noDims.length) warnings.push(`${route} — ${noDims.length} image(s) sans width/height`);

  /* -- Critères d'alerte -------------------------------------------------- */

  if (title && !noindex) {
    const length = strip(title).length;
    if (length > 65) warnings.push(`${route} — title de ${length} caractères (> 65)`);
    if (length < 25) warnings.push(`${route} — title de ${length} caractères (< 25)`);
  }
  if (description && !noindex) {
    const length = description.length;
    if (length > 165) warnings.push(`${route} — description de ${length} caractères (> 165)`);
    if (length < 110) warnings.push(`${route} — description de ${length} caractères (< 110)`);
  }
}

/* --------------------------------------------------------- doublons ------ */

const indexable = pages.filter((p) => !p.noindex);

function reportDuplicates(field, label) {
  const seen = new Map();
  for (const page of indexable) {
    const value = page[field];
    if (!value) continue;
    const key = strip(value);
    seen.set(key, [...(seen.get(key) ?? []), page.route]);
  }
  for (const [value, routes] of seen) {
    if (routes.length > 1) {
      errors.push(`${label} dupliqué sur ${routes.length} pages : « ${value.slice(0, 60)}… » → ${routes.join(', ')}`);
    }
  }
}

reportDuplicates('title', 'Title');
reportDuplicates('description', 'Meta description');
reportDuplicates('h1', 'H1');

/* --------------------------------------------------- liens internes ------ */

const routes = new Set(pages.map((p) => p.route));
const broken = new Map();

for (const page of pages) {
  const hrefs = text(page.html, /href="(\/[^"#?]*)"/gi);
  for (const href of hrefs) {
    const target = href.endsWith('/') ? href : `${href}/`;
    if (routes.has(target)) continue;
    // Fichiers statiques réellement présents
    const asFile = join(DIST, href.replace(/^\//, ''));
    if (existsSync(asFile)) continue;
    broken.set(href, [...(broken.get(href) ?? []), page.route]);
  }
}

for (const [href, from] of broken) {
  errors.push(`Lien interne cassé : ${href} (depuis ${[...new Set(from)].slice(0, 3).join(', ')})`);
}

/* ------------------------------------------------------ pages orphelines - */

const linked = new Set(['/']);
for (const page of pages) {
  for (const href of text(page.html, /href="(\/[^"#?]*)"/gi)) {
    linked.add(href.endsWith('/') ? href : `${href}/`);
  }
}
const orphans = indexable.filter((p) => !linked.has(p.route) && p.route !== '/');
for (const orphan of orphans) {
  warnings.push(`Page orpheline (aucun lien interne entrant) : ${orphan.route}`);
}

/* ------------------------------------------------------- sitemap --------- */

/*
 * Le sitemap doit contenir exactement les pages indexables : ni une page en
 * `noindex` (Search Console le signale comme une contradiction), ni une page
 * indexable manquante.
 */
const sitemapFile = join(DIST, 'sitemap-0.xml');
if (existsSync(sitemapFile)) {
  const xml = readFileSync(sitemapFile, 'utf8');
  const listed = new Set(
    [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, ''))
  );

  for (const page of pages) {
    if (page.noindex && listed.has(page.route)) {
      errors.push(`Page en noindex présente dans le sitemap : ${page.route}`);
    }
  }
  for (const page of indexable) {
    if (!listed.has(page.route)) {
      warnings.push(`Page indexable absente du sitemap : ${page.route}`);
    }
  }
  console.log(`Sitemap : ${listed.size} URL pour ${indexable.length} pages indexables
`);
} else {
  warnings.push('Aucun sitemap trouvé dans le build');
}

/* ------------------------------------------------------------- placeholders */

const withTodo = pages.filter((p) => p.html.includes('data-todo'));

/* ----------------------------------------------------------------- sortie */

console.log(`Audit SEO — ${pages.length} pages analysées (${indexable.length} indexables)\n`);

if (warnings.length) {
  console.log(`Avertissements (${warnings.length}) :`);
  for (const w of warnings) console.log(`  · ${w}`);
  console.log('');
}

if (errors.length) {
  console.log(`Erreurs bloquantes (${errors.length}) :`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  console.log('');
}

if (withTodo.length) {
  console.log(
    `${withTodo.length} pages portent au moins un placeholder [[…]] — informations à fournir ` +
      `par l’agence avant la mise en ligne (voir /plan-du-site/).`
  );
  console.log('');
}

if (errors.length) {
  console.log('Audit en échec.');
  process.exit(1);
}

console.log('Aucune erreur bloquante.');
