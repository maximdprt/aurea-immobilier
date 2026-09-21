#!/usr/bin/env node
/**
 * Telecharge et auto-heberge les polices en WOFF2, sous-ensemble latin
 * (prompt v3 §6 : aucune requete vers un CDN tiers au chargement).
 *
 * Deux familles seulement :
 *  - Cormorant Garamond 600 : titres. Serif a fort contraste, dans l'esprit du
 *    lettrage du logo AUREA.
 *  - Inter (variable 400-700) : texte courant et interface.
 *
 * A relancer uniquement si l'on change de police ; les fichiers produits sont
 * versionnes dans le depot pour que le build n'ait aucune dependance reseau.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'fonts');

// UA moderne : indispensable pour que Google Fonts serve du WOFF2 et non du TTF
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FAMILIES = [
  {
    // Police unique du site d'origine (--font-1 et --font-2 : "Arapey").
    css: 'https://fonts.googleapis.com/css2?family=Arapey&display=swap',
    file: 'arapey-400-latin.woff2',
    family: 'Arapey',
  },
  {
    css: 'https://fonts.googleapis.com/css2?family=Arapey:ital@1&display=swap',
    file: 'arapey-400italic-latin.woff2',
    family: 'Arapey italic',
  },
  {
    css: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&display=swap',
    file: 'cormorant-garamond-600-latin.woff2',
    family: 'Cormorant Garamond',
  },
  {
    css: 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap',
    file: 'inter-variable-latin.woff2',
    family: 'Inter',
  },
];

/** Ne garde que le bloc `unicode-range` latin de base (U+0000-00FF). */
function pickLatinUrl(css) {
  const blocks = css.split('@font-face').slice(1);
  const latin =
    blocks.find((b) => /unicode-range:[^;]*U\+0000-00FF/i.test(b)) ??
    blocks[blocks.length - 1];
  return latin.match(/src:\s*url\((https:[^)]+\.woff2)\)/)?.[1] ?? null;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const f of FAMILIES) {
    const css = await (await fetch(f.css, { headers: { 'User-Agent': UA } })).text();
    const url = pickLatinUrl(css);
    if (!url) throw new Error(`WOFF2 latin introuvable pour ${f.family}`);
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    writeFileSync(join(OUT, f.file), buf);
    console.log(`${f.family} -> ${f.file} (${(buf.length / 1024).toFixed(1)} Ko)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
