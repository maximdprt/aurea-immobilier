#!/usr/bin/env node
/**
 * Prix de marché issus de DVF (Demandes de valeurs foncières, DGFiP), pour
 * chaque commune où l'agence a une page, écrits dans src/data/dvf.json.
 *
 * Source : fichiers « geo-dvf » publiés par Etalab sur data.gouv.fr
 * (https://files.data.gouv.fr/geo-dvf/latest/csv/), un CSV par commune et
 * par année. Aucune clé, aucune donnée personnelle : ce sont des mutations
 * publiques, sans nom d'acquéreur ni de vendeur.
 *
 * Méthode, volontairement simple et vérifiable :
 *  - seules les mutations de nature « Vente » sont retenues ;
 *  - une mutation n'est gardée que si elle porte sur UN SEUL logement (une
 *    maison ou un appartement), dépendances comprises : le prix d'une vente
 *    de plusieurs logements ne peut pas être ramené à un prix au m² ;
 *  - prix au m² = valeur foncière / surface réelle bâtie ;
 *  - valeurs aberrantes écartées : surface < 9 m², prix au m² hors de
 *    [500 €, 12 000 €] ;
 *  - on publie la MÉDIANE (insensible aux ventes atypiques) et le nombre de
 *    ventes qui la fondent. Sous 5 ventes, le chiffre n'est pas publié.
 *
 * Usage : node scripts/fetch-dvf.mjs   (réseau requis ; relancer une fois par an)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src', 'data');
const YEARS = [2023, 2024, 2025];
/** Années agrégées pour le chiffre principal. */
const MAIN = [2024, 2025];
const MIN_SALES = 5;

const communes = JSON.parse(readFileSync(join(DATA, 'communes.json'), 'utf8')).filter(
  (c) => c.activeCount > 0 || c.soldCount >= 2
);

const median = (values) => {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};

/**
 * Noms abrégés par l'ancien site. « Éragny » y désigne Éragny-sur-Oise (95),
 * voisine de Cergy et Pontoise où l'agence a aussi vendu, et non
 * Éragny-sur-Epte (60), hors secteur.
 */
const ALIASES = { eragny: { code: '95218', codeDepartement: '95', nom: 'Éragny-sur-Oise' } };

async function inseeFor(c) {
  if (ALIASES[c.slug]) return ALIASES[c.slug];
  // Les accents du corpus peuvent être décomposés (NFD) : on compare sans eux.
  const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const params = new URLSearchParams({ nom: plain(c.name), fields: 'code,nom,codesPostaux,codeDepartement', boost: 'population', limit: '10' });
  const res = await fetch(`https://geo.api.gouv.fr/communes?${params}`);
  const list = await res.json();
  const exact = list.filter((x) => plain(x.nom) === plain(c.name));
  const byPostal = c.postalCode ? exact.find((x) => x.codesPostaux.includes(c.postalCode)) : null;
  // À défaut de code postal, on privilégie les départements du secteur de l'agence.
  const local = exact.find((x) => ['78', '95', '27', '28', '92'].includes(x.codeDepartement));
  return byPostal ?? local ?? exact[0] ?? null;
}

function parseCsv(text) {
  const [head, ...rows] = text.trim().split('\n');
  const cols = head.split(',');
  const idx = (n) => cols.indexOf(n);
  const I = {
    id: idx('id_mutation'), date: idx('date_mutation'), nature: idx('nature_mutation'), value: idx('valeur_fonciere'),
    type: idx('type_local'), surface: idx('surface_reelle_bati'),
  };
  // Les champs de ce fichier ne contiennent jamais de virgule : un split suffit.
  return rows.map((r) => r.split(',')).map((f) => ({
    id: f[I.id], date: f[I.date], nature: f[I.nature], value: Number(f[I.value]), type: f[I.type], surface: Number(f[I.surface]),
  }));
}

function salesFrom(rows) {
  const byMutation = new Map();
  for (const r of rows) {
    if (r.nature !== 'Vente') continue;
    const m = byMutation.get(r.id) ?? { rows: [], date: r.date, value: r.value };
    m.rows.push(r);
    byMutation.set(r.id, m);
  }
  const out = [];
  for (const m of byMutation.values()) {
    const homes = m.rows.filter((r) => r.type === 'Maison' || r.type === 'Appartement');
    const others = m.rows.filter((r) => r.type === 'Local industriel. commercial ou assimilé');
    if (homes.length !== 1 || others.length) continue;
    const h = homes[0];
    if (!(h.surface >= 9) || !(m.value > 0)) continue;
    const perSqm = m.value / h.surface;
    if (perSqm < 500 || perSqm > 12000) continue;
    out.push({ type: h.type === 'Maison' ? 'maison' : 'appartement', year: Number(m.date.slice(0, 4)), perSqm, price: m.value, surface: h.surface });
  }
  return out;
}

const stats = (sales) =>
  sales.length >= MIN_SALES
    ? { medianPerSqm: median(sales.map((s) => s.perSqm)), medianPrice: median(sales.map((s) => s.price)), medianSurface: median(sales.map((s) => s.surface)), count: sales.length }
    : { medianPerSqm: null, medianPrice: null, medianSurface: null, count: sales.length };

const result = {
  source: 'DVF — Demandes de valeurs foncières (DGFiP), fichiers geo-dvf publiés par Etalab sur data.gouv.fr',
  sourceUrl: 'https://explore.data.gouv.fr/fr/immobilier',
  extractedAt: new Date().toISOString().slice(0, 10),
  period: `${MAIN[0]}-${MAIN[MAIN.length - 1]}`,
  lastSaleDate: null,
  method:
    'Médiane des ventes d’un seul logement (maison ou appartement), prix au m² = valeur foncière / surface réelle bâtie. Chiffre publié à partir de 5 ventes.',
  communes: {},
};

for (const c of communes) {
  const geo = await inseeFor(c);
  if (!geo) {
    console.warn(`  ! code INSEE introuvable : ${c.name}`);
    continue;
  }
  const all = [];
  for (const y of YEARS) {
    const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/${y}/communes/${geo.codeDepartement}/${geo.code}.csv`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const text = await res.text();
    const rows = parseCsv(text);
    for (const r of rows) if (r.date > (result.lastSaleDate ?? '')) result.lastSaleDate = r.date;
    all.push(...salesFrom(rows));
  }
  const main = all.filter((s) => MAIN.includes(s.year));
  const entry = { name: c.name, insee: geo.code, maison: stats(main.filter((s) => s.type === 'maison')), appartement: stats(main.filter((s) => s.type === 'appartement')), byYear: {} };
  for (const y of YEARS) {
    entry.byYear[y] = {
      maison: stats(all.filter((s) => s.year === y && s.type === 'maison')).medianPerSqm,
      appartement: stats(all.filter((s) => s.year === y && s.type === 'appartement')).medianPerSqm,
    };
  }
  result.communes[c.slug] = entry;
  console.log(
    `  ${c.name.padEnd(22)} ${geo.code}  maisons ${String(entry.maison.medianPerSqm ?? '—').padStart(5)} €/m² (${entry.maison.count})  appartements ${String(entry.appartement.medianPerSqm ?? '—').padStart(5)} €/m² (${entry.appartement.count})`
  );
}

writeFileSync(join(DATA, 'dvf.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`\nsrc/data/dvf.json écrit — ${Object.keys(result.communes).length} communes, dernière vente ${result.lastSaleDate}`);
