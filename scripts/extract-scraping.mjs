#!/usr/bin/env node
/**
 * Extraction du corpus de scraping (scrapper_aurea/) vers des donnees structurees.
 *
 * Entrees  : scrapper_aurea/pages/*.json, scrapper_aurea/data/*.csv
 * Sorties  : src/data/listings.json, agents.json, communes.json,
 *            archives.json, redirects.json, scraping-report.json
 *            supabase/seed.sql
 *
 * Le scraping est un jeu de donnees de depart et de secours (prompt v3 §4) :
 * la source de verite en production est le flux Orisha via Supabase.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRAP = join(ROOT, 'scrapper_aurea');
const PAGES = join(SCRAP, 'pages');
const OUT_DATA = join(ROOT, 'src', 'data');
const OUT_SUPA = join(ROOT, 'supabase');

/* ------------------------------------------------------------------ utils */

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** Le scraping est en ISO-8859-1 mal decode : on repare les mojibake connus. */
function fixText(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/�/g, '?')
    .replace(/ /g, ' ')
    .replace(/ /g, ' ')
    .replace(/\s+\n/g, '\n')
    .trim();
}

/** Parse un CSV a separateur point-virgule (format du scraper). */
function parseCsv(path) {
  const raw = readFileSync(path, 'utf8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  const head = lines[0].split(';');
  return lines.slice(1).map((line) => {
    const cells = line.split(';');
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']));
  });
}

const slugify = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Casse normale + toponymes corriges (prompt v3 §3.6). */
const COMMUNE_FIX = {
  'mantes la jolie': 'Mantes-la-Jolie',
  'mantes-la-jolie': 'Mantes-la-Jolie',
  'mantes la ville': 'Mantes-la-Ville',
  'mantes-la-ville': 'Mantes-la-Ville',
  limay: 'Limay',
  juziers: 'Juziers',
  cergy: 'Cergy',
  'l isle adam': "L'Isle-Adam",
  porcheville: 'Porcheville',
  'bonnieres sur seine': 'Bonnières-sur-Seine',
  vernon: 'Vernon',
  'rosny sur seine': 'Rosny-sur-Seine',
  pontoise: 'Pontoise',
  maule: 'Maule',
  flacourt: 'Flacourt',
  eragny: 'Éragny',
  gargenville: 'Gargenville',
  'illiers l eveque': "Illiers-l'Évêque",
  aubergenville: 'Aubergenville',
  'saint remy sur avre': 'Saint-Rémy-sur-Avre',
  'oinville sur montcient': 'Oinville-sur-Montcient',
  montrouge: 'Montrouge',
  jumeauville: 'Jumeauville',
  'bray et lu': 'Bray-et-Lû',
  'saint cyr en arthies': 'Saint-Cyr-en-Arthies',
  'follainville dennemont': 'Follainville-Dennemont',
  'les mureaux': 'Les Mureaux',
  'maudetour en vexin': 'Maudétour-en-Vexin',
  'verneuil sur seine': 'Verneuil-sur-Seine',
  evreux: 'Évreux',
  'le cormier': 'Le Cormier',
  arthies: 'Arthies',
  'vienne en arthies': 'Vienne-en-Arthies',
  andresy: 'Andrésy',
  chatou: 'Chatou',
  mericourt: 'Méricourt',
  'la couture boussey': 'La Couture-Boussey',
  buchelay: 'Buchelay',
  magnanville: 'Magnanville',
  'les alluets le roi': 'Les Alluets-le-Roi',
  epone: 'Épône',
  guerville: 'Guerville',
  issou: 'Issou',
  'septeuil': 'Septeuil',
};

function normalizeCommune(raw) {
  if (!raw) return null;
  const key = fixText(raw)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (COMMUNE_FIX[key]) return COMMUNE_FIX[key];
  // Fallback : casse titre avec traits d'union
  return key
    .split(' ')
    .map((w) => (w.length <= 2 && w !== 'le' && w !== 'la' ? w : w[0].toUpperCase() + w.slice(1)))
    .join('-');
}

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Remplace toute graphie d'une commune connue par sa forme correcte. */
function fixCommunesInText(text) {
  let out = text;
  for (const canonical of new Set(Object.values(COMMUNE_FIX))) {
    const pattern = norm(canonical).split(' ').map(escapeRe).join('[\\s-]+');
    out = out.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), canonical);
  }
  return out;
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Titre d'annonce en casse normale : l'ancien site criait en majuscules
 * et ecorchait les noms de communes (prompt v3 §3.6).
 */
function normalizeTitle(raw) {
  let t = fixText(raw).replace(/\s*,\s*$/, '').replace(/\s+/g, ' ');

  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
  const upperRatio = letters.length
    ? letters.replace(/[^A-ZÀ-Þ]/g, '').length / letters.length
    : 0;

  if (upperRatio >= 0.6) {
    t = t.toLowerCase();
    // Majuscule en tete de chaque segment separe par un tiret ou une ponctuation
    t = t.replace(/(^|[.!?:]\s+|[-–]\s*)([a-zà-ÿ])/g, (_, p, c) => p + c.toUpperCase());
  }

  t = fixCommunesInText(t);

  return t
    .replace(/(\d)\s*(pi[èe]ces?)/gi, '$1 $2') // « 5Pièces » -> « 5 pièces »
    .replace(/(\d)\s*m2\b/g, '$1 m²')
    .replace(/\brer\b/gi, 'RER')
    .replace(/\bdpe\b/gi, 'DPE')
    .replace(/\bges\b/gi, 'GES')
    .replace(/\bwc\b/gi, 'WC')
    .replace(/\brdc\b/gi, 'RDC')
    .replace(/\bRER\s+([a-e])\b/gi, (_, l) => `RER ${l.toUpperCase()}`)
    .replace(/\bt\s?([1-9])\b/gi, (_, n) => `T${n}`)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** « MAUME Vincent », « Cherel Oriane » -> slug du conseiller. */
function matchAgentSlug(rawName, agents) {
  if (!rawName) return null;
  const words = norm(rawName).split(' ').filter((w) => w.length > 1);
  if (!words.length) return null;
  const scored = agents
    .map((a) => {
      const an = norm(a.name).split(' ');
      const hits = words.filter((w) => an.includes(w)).length;
      return { slug: a.slug, hits };
    })
    .filter((s) => s.hits >= Math.min(2, words.length))
    .sort((x, y) => y.hits - x.hits);
  return scored.length ? scored[0].slug : null;
}

const num = (v) => {
  if (v == null) return null;
  const m = String(v).replace(/ | |\s/g, '').match(/-?\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(',', '.')) : null;
};

/* -------------------------------------------------- index des images locales */

const imagesCsv = parseCsv(join(SCRAP, 'data', 'images.csv'));
const localFiles = new Set(readdirSync(join(SCRAP, 'images')));

/**
 * Piege : l'ancien site repond 200 sur n'importe quel prefixe de chemin et sert
 * alors un fichier arbitraire (prompt v3 §3.1 et §3.2). Le scraper a donc
 * enregistre, pour une meme image, des URL prefixees pointant vers le mauvais
 * fichier local. On ne fait confiance qu'aux URL canoniques `/office5/...`,
 * et on rattache tout le reste par nom de fichier.
 */
const CANONICAL_IMAGE_PREFIX = 'https://www.aurea-immobilier.fr/office5/';
const baseToLocal = new Map();
for (const row of imagesCsv) {
  if (!row.url.startsWith(CANONICAL_IMAGE_PREFIX)) continue;
  if (!row.fichier_local || row.fichier_local === '(echec)') continue;
  if (!localFiles.has(row.fichier_local)) continue;
  const base = row.url.split('/').pop().split('?')[0];
  if (base && !baseToLocal.has(base)) baseToLocal.set(base, row.fichier_local);
}
function localFileFor(url) {
  const base = url.split('/').pop().split('?')[0];
  const byBase = baseToLocal.get(base);
  if (byBase) return byBase;
  // Quelques images ont garde leur nom d'origine en local
  return localFiles.has(base) ? base : null;
}
/** Les photos de biens vivent sous /catalog/images/pr_p/<chiffres>/<id><lettre>.jpg */
const isPropertyPhoto = (url) => /\/pr_p\//.test(url);

/* ------------------------------------------------------- parseur d'une fiche */

const GROUPS = new Set([
  'Général',
  'Localisation',
  'Aspects financiers',
  'Copropriété',
  'Surfaces',
  'Extérieur',
  'Intérieur',
  'Autres',
  'Diagnostics',
]);

/**
 * La section « Caractéristiques détaillées » est une liste plate
 * cle / valeur alternees, decoupee par des entetes de groupe.
 */
/**
 * Honoraires d'etat des lieux, lus dans le corps de l'annonce.
 * Formes rencontrees dans le corpus :
 *   « Etablissement état des lieux: 243 euros »
 *   « dont honoraires d'état des lieux: 243 € TTC »
 */
function inventoryFeesFromText(text) {
  const m = String(text).match(
    /[ée]tat\s+des\s+lieux\s*:?\s*([\d][\d\s ]*)\s*(?:euros?|€)/i
  );
  if (!m) return null;
  const n = Number(m[1].replace(/[\s ]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseCharacteristics(lines) {
  const start = lines.findIndex((l) => l === 'Caractéristiques détaillées');
  if (start === -1) return {};
  const out = {};
  let group = null;
  let i = start + 1;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (GROUPS.has(line)) {
      group = line;
      continue;
    }
    if (!group) continue;
    // Fin de section : on retombe sur le titre du bien (repete en pied de fiche)
    if (line === 'Agence' || line === 'Nous contacter') break;
    const value = lines[i + 1];
    if (value === undefined || GROUPS.has(value)) continue;
    out[line] = value;
    i++;
  }
  return out;
}

/** Description commerciale : entre « Description » et la mention d'honoraires. */
function parseDescription(lines) {
  const start = lines.findIndex((l) => l === 'Description');
  if (start === -1) return '';
  const stops = [
    /^Honoraires? (à|a) la charge/i,
    /^Nos honoraires$/i,
    /^Diagnostics énergétiques$/i,
    /^Caractéristiques détaillées$/i,
    /^Imprimer$/,
  ];
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (stops.some((re) => re.test(l))) break;
    if (/^Réf\s*:/.test(l)) continue;
    if (l === '**') continue;
    body.push(l);
  }
  return body.join('\n').trim();
}

function parseFiche(file) {
  const d = readJson(join(PAGES, file));
  if (d.url.includes('?')) return null; // variantes a parametres = doublons

  const m = d.url.match(/\/fiches\/([^/]+)\/([^/]+)\.html$/);
  if (!m) return null;
  const [, cpathRaw, legacySlug] = m;
  const legacyProductsId = cpathRaw.split('_').pop();
  const cPath = cpathRaw.startsWith('_') ? null : cpathRaw.replace(/_\d+$/, '');

  const lines = fixText(d.texte_principal || d.texte_integral || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const chars = parseCharacteristics(lines);
  const all = lines.join('\n');

  const reference =
    (all.match(/Référence\s+(\d+)/) || all.match(/Réf\s*:\s*(\d+)/) || [])[1] ?? null;

  // Fil d'Ariane : Accueil / Appartements|Maisons / A vendre|A louer / sous-type / Référence N
  const crumb = (d.listes || []).find(
    (l) => Array.isArray(l) && l[0] === 'Accueil' && String(l[l.length - 1]).startsWith('Référence')
  );
  const breadcrumb = (crumb || []).map(fixText);

  const rawTitle = fixText((d.titres || []).find((t) => t.niveau === 1)?.texte || d.titre || '')
    .split('\n')[0]
    .replace(/\s*,\s*$/, '');

  const commune = normalizeCommune(chars['Ville'] || breadcrumbCommune(rawTitle));
  const transaction =
    /louer/i.test(chars['Type de transaction'] || breadcrumb[2] || '') ? 'location' : 'vente';
  const propertyType = /maison/i.test(chars['Type de bien'] || breadcrumb[1] || '')
    ? 'maison'
    : /immeuble/i.test(rawTitle)
      ? 'immeuble'
      : 'appartement';

  // Statut : une fiche sans cPath est un bien archive (vendu / loue)
  const archived = cPath === null;

  const photos = (d.images || [])
    .map((img) => ({ url: img.url, alt: fixText(img.alt || '') }))
    .filter((img) => isPropertyPhoto(img.url))
    .map((img) => ({ file: localFileFor(img.url), alt: img.alt }))
    .filter((p) => p.file);
  const seen = new Set();
  const uniquePhotos = photos.filter((p) => !seen.has(p.file) && seen.add(p.file));

  const advisor = (all.match(/Votre Conseiller\s*:\s*\n?([^\n]+)\n?,?\n?([^\n]*)/) || [])
    .slice(1)
    .map(fixText);

  const energyMin = num(
    chars['Montant minimum estimé des dépenses annuelles d’énergie pour un usage standard'] ??
      chars["Montant minimum estimé des dépenses annuelles d'énergie pour un usage standard"]
  );
  const energyMax = num(
    chars["Montant maximum estimé des dépenses annuelles d'énergie pour un usage standard"]
  );

  return {
    reference: reference ? Number(reference) : null,
    legacyProductsId,
    legacyCPath: cPath,
    legacySlug,
    legacyUrl: d.url.replace('https://www.aurea-immobilier.fr', ''),
    title: normalizeTitle(rawTitle),
    rawTitle,
    slug: null, // calcule plus bas, apres normalisation
    status: archived ? (transaction === 'location' ? 'rented' : 'sold') : 'published',
    transaction,
    propertyType,
    subtype: breadcrumb[3] ?? null,
    commune,
    postalCode: chars['Code postal'] || null,
    // Vente : prix honoraires inclus. Location : loyer charges comprises.
    price: num(chars['Prix']) ?? num(chars['Loyer charges comprises']) ?? num(chars['Loyer mensuel HC']),
    rentBase: num(chars['Loyer mensuel HC']) ?? num(chars['Loyer de base']),
    rentCharges: num(chars['Provision sur charges']),
    rentTotal: num(chars['Loyer charges comprises']),
    tenantFees: num(chars['Honoraires Locataire']),
    // Le tableau de caracteristiques ne porte que le total « Honoraires
    // Locataire ». Le detail de l'etat des lieux n'apparait QUE dans le texte
    // de l'annonce (« Etablissement etat des lieux: 243 euros »). Or la loi
    // ALUR impose de l'afficher a part : on le recupere donc la, a defaut.
    inventoryFees:
      num(chars['Honoraires état des lieux']) ??
      num(chars['Honoraires Etat des lieux']) ??
      inventoryFeesFromText(all),
    deposit: num(chars['Dépôt de Garantie']),
    feesPayer:
      transaction === 'location'
        ? 'locataire'
        : /honoraires? (à|a) la charge de l.acqu[ée]reur/i.test(all)
          ? 'acquereur'
          : /honoraires? (à|a) la charge du vendeur/i.test(all)
            ? 'vendeur'
            : null,
    livingArea: num(chars['Surface']),
    landArea: num(chars['Surface terrain']),
    livingRoomArea: num(chars['Surface séjour']),
    rooms: num(chars['Nombre pièces']) ?? num(rawTitle.match(/(\d+)\s*pi[èe]ce/i)?.[1]),
    bedrooms: num(chars['Chambres']),
    bathrooms: num(chars["Salle(s) d'eau"]) ?? num(chars['Salle(s) de bain']),
    floor: num(chars['Etage']),
    floors: num(chars['Nombre étages']),
    yearBuilt: num(chars['Année construction']),
    heating: [chars['Type Chauffage'], chars['Mode Chauffage'], chars['Méca. Chauffage']]
      .filter(Boolean)
      .join(' · ') || null,
    condition: chars['Etat général'] || null,
    hasGarden: chars['Jardin'] === 'Oui',
    hasElevator: chars['Ascenseur'] === 'Oui',
    cellars: num(chars['Cave(s)']),
    exposure: chars['Exposition Séjour'] || null,
    windows: chars['Fenêtres'] || null,
    sanitation: chars['Assainissement'] || null,
    isCondo: chars['Bien en copropriété'] === 'Oui',
    condoLots: num(chars['Nb Lots Copropriété']),
    condoHousingLots: num(chars["Dont lots d'habitation"]),
    condoAnnualCharges: num(chars['Charges annuelles (ALUR)']),
    propertyTax: num(chars['Taxe Foncière']),
    rentControlled: chars["Bien soumis à l'encadrement des loyers"] === 'Oui',
    dpeClass: chars['Consommation énergie primaire'] || null,
    dpeFinalClass: chars['Consommation énergie finale'] || null,
    dpeValue: num(chars['Valeur consommation énergie primaire']),
    dpeFinalValue: num(chars['Valeur consommation énergie finale']),
    gesClass: chars['Gaz Effet de Serre'] || null,
    gesValue: num(chars['Valeur Gaz Effet de serre']),
    energyCostMin: energyMin,
    energyCostMax: energyMax,
    dpeDate: chars['Date établissement Diagnostic Energétique'] || null,
    erp: chars["Concerné par un Etat des Risques et Pollutions (ERP)"] === 'Oui',
    erpDate: chars["Date d'établissement Etat des Risques et Pollutions(ERP)"] || null,
    transitAccess:
      chars['Accès RER'] ? `RER à ${chars['Accès RER']}` :
      chars['Accès Bus'] ? `Bus à ${chars['Accès Bus']}` :
      chars['Accès Gare'] ? `Gare à ${chars['Accès Gare']}` : null,
    isExclusive: /\bExclusif\b/.test(all),
    advisorName: advisor[0] || null,
    advisorRole: advisor[1] || null,
    description: parseDescription(lines),
    photos: uniquePhotos,
    characteristics: chars,
  };
}

function breadcrumbCommune(title) {
  // Beaucoup de titres portent la commune : « MAISON - MÉRICOURT - 4 PIÈCES »
  const t = norm(title);
  // Le nom le plus long d'abord, pour que « Mantes-la-Ville » l'emporte sur « Mantes »
  return (
    [...new Set(Object.values(COMMUNE_FIX))]
      .sort((a, b) => b.length - a.length)
      .find((c) => t.includes(norm(c))) ?? null
  );
}

/* ------------------------------------------------------------ biens archives */

/**
 * Les pages `products_selled` listent les biens vendus/loues sous forme de blocs :
 *
 *   [Exclusif] TITRE , COMMUNE  STATUT  [N 'pièce(s)']  SURFACE 'm²'  'Réf :'  REF
 *
 * On s'ancre sur « Réf : », seul repere toujours present, puis on remonte.
 */
function parseArchives() {
  const files = readdirSync(PAGES).filter((f) => /^catalog-products_selled.*\.json$/.test(f));
  const out = [];
  const seen = new Set();
  let announced = null;

  for (const f of files) {
    const d = readJson(join(PAGES, f));
    const lines = fixText(d.texte_principal || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const count = lines.find((l) => /annonce\(s\) trouvée\(s\)/.test(l));
    if (count && announced === null) announced = num(count);

    for (let r = 0; r < lines.length; r++) {
      if (lines[r] !== 'Réf :') continue;
      const reference = num(lines[r + 1]);
      if (reference === null) continue;

      let i = r - 1;
      let area = null;
      let rooms = null;
      if (lines[i] === 'm²') {
        area = num(lines[i - 1]);
        i -= 2;
      }
      if (lines[i] === 'pièce(s)') {
        rooms = num(lines[i - 1]);
        i -= 2;
      }
      const status =
        lines[i] === 'Vendu' ? 'sold' : lines[i] === 'Loué' ? 'rented' : null;
      if (!status) continue;
      i--;

      let commune = null;
      if (lines[i - 1] === ',') {
        commune = normalizeCommune(lines[i]);
        i -= 2;
      }
      const title = lines[i];
      if (!title || title === 'Exclusif' || /^\d+$/.test(title)) continue;

      if (seen.has(reference)) continue;
      seen.add(reference);
      out.push({
        reference,
        title: normalizeTitle(title),
        commune: commune ?? breadcrumbCommune(title),
        status,
        rooms,
        area,
        isExclusive: lines[i - 1] === 'Exclusif',
        propertyType: /maison|pavillon|longère/i.test(title)
          ? 'maison'
          : /immeuble/i.test(title)
            ? 'immeuble'
            : /terrain/i.test(title)
              ? 'terrain'
              : /local|commerce|bureau/i.test(title)
                ? 'local'
                : 'appartement',
      });
    }
  }

  out.announcedTotal = announced;
  return out.sort((a, b) => (b.reference ?? 0) - (a.reference ?? 0));
}

/* ------------------------------------------------------------------- agents */

const AGENT_ROLES = {
  '839239': 'Directrice, présidente',
  '839238': 'Directeur associé, cofondateur',
  '840371': 'Négociatrice',
  '839272': 'Négociatrice',
  '839273': 'Négociatrice',
  '847433': 'Négociatrice',
  '869668': 'Négociatrice',
  '839241': 'Négociateur',
};
const AGENT_EMAILS = {
  '839239': 'helene.vermeire@aurea-immobilier.fr',
  '839238': 'vincent.maume@aurea-immobilier.fr',
  '840371': 'oriane.cherel@aurea-immobilier.fr',
  '839272': null, // [[a demander]] — prompt v3 §19
  '839273': null, // adresse gmail personnelle sur l'ancien site : a remplacer
  '847433': 'aimee.vaillant@aurea-immobilier.fr',
  '869668': null, // [[a demander]]
  '839241': 'evan.fernandes@aurea-immobilier.fr',
};

/**
 * Telephones directs de l'equipe.
 *
 * La page « Notre agence » liste les conseillers dans l'ordre : un titre h3
 * par nom, puis le numero en paragraphe. Les deux suites sont paralleles, on
 * les apparie donc par rang plutot que de recopier les numeros a la main —
 * ainsi un nouveau scraping met la liste a jour tout seul.
 *
 * Source : scrapper_aurea/pages/content-5-notre-agence.json
 */
function parseTeamPhones() {
  const file = join(PAGES, 'content-5-notre-agence.json');
  if (!existsSync(file)) return {};
  const d = readJson(file);

  const titres = d.titres ?? [];
  const start = titres.findIndex((t) => /notre\s+equipe/i.test(slugify(t.texte).replace(/-/g, ' ')));
  if (start === -1) return {};

  // Les noms sont les h3 qui suivent « Notre équipe », jusqu'au pied de page.
  const STOP = new Set(['l-agence', 'nos-services', 'liens-utiles', 'nos-annonces']);
  const names = [];
  for (const t of titres.slice(start + 1)) {
    if (t.niveau !== 3) continue;
    const slug = slugify(t.texte);
    if (STOP.has(slug)) break;
    names.push(slug);
  }

  // Les numeros, dans le meme ordre. Un paragraphe peut coller le telephone
  // et l'email (cas de Marion Nicaise) : on ne retient que le numero.
  //
  // On ne prend QUE les mobiles 06/07 : le haut de la page repete le fixe de
  // l'agence (01 30 63 50 50), qui decalerait tout l'appariement d'un rang et
  // attribuerait a chacun le numero de son voisin.
  const phones = [];
  for (const par of d.paragraphes ?? []) {
    const m = String(par).match(/0[67](?:[ .-]?\d{2}){4}/);
    if (m) phones.push(m[0].replace(/[.-]/g, ' ').replace(/\s+/g, ' ').trim());
  }

  // Appariement par rang : il n'a de sens que si les deux suites font la meme
  // longueur. Sinon on refuse d'attribuer quoi que ce soit — un mauvais numero
  // publie sur la fiche d'une personne reelle est pire qu'un numero absent.
  if (phones.length !== names.length) {
    console.warn(
      `[agents] ${names.length} conseillers pour ${phones.length} mobiles : ` +
        `appariement abandonne, les telephones restent vides.`
    );
    return {};
  }

  const out = {};
  names.forEach((slug, i) => {
    out[slug] = phones[i];
  });
  return out;
}

function parseAgents() {
  const files = readdirSync(PAGES).filter((f) => /^annonces-agent-\d+-.*\.json$/.test(f));
  const agents = [];
  const localImages = readdirSync(join(SCRAP, 'images'));
  const phones = parseTeamPhones();
  for (const f of files) {
    const d = readJson(join(PAGES, f));
    if (d.url.includes('?')) continue;
    const m = d.url.match(/\/annonces\/agent\/(\d+)-([^.]+)\.html/);
    if (!m) continue;
    const [, id, slug] = m;
    const name = fixText(d.titre).replace(/^Annonces de\s+/i, '').replace(/\s*\|.*$/, '');
    const pretty = name
      .split(/\s+/)
      .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    const photo =
      localImages.find((img) => img.startsWith(`${slug}-${id}.`)) ??
      localImages.find((img) => img.startsWith(`${slug}-`) && !img.includes('no-picture')) ??
      null;
    agents.push({
      legacyId: id,
      slug,
      name: pretty,
      role: AGENT_ROLES[id] ?? 'Négociateur',
      email: AGENT_EMAILS[id] ?? null,
      phone: phones[slug] ?? null,
      photo,
      legacyUrl: `/annonces/agent/${id}-${slug}.html`,
    });
  }
  // Marion Nicaise : pas de page conseiller sur l'ancien site, mais un portrait
  agents.push({
    legacyId: null,
    slug: 'marion-nicaise',
    name: 'Marion Nicaise',
    role: 'Gestionnaire locative',
    email: 'marion.nicaise@aurea-immobilier.fr',
    phone: phones['marion-nicaise'] ?? null,
    photo: localImages.find((i) => i.startsWith('marion-nicaise-')) ?? 'marion-nicaise.png',
    legacyUrl: null,
  });
  const order = [
    'helene-vermeire-benz',
    'vincent-maume',
    'oriane-cherel',
    'aimee-vaillant',
    'justine-vitry',
    'natacha-laly',
    'jill-thepaut',
    'evan-fernandes',
    'marion-nicaise',
  ];
  return agents.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
}

/* ----------------------------------------------------------------- communes */

function buildCommunes(listings, archives) {
  const counts = new Map();
  const bump = (name, key) => {
    if (!name) return;
    const e = counts.get(name) ?? { active: 0, sold: 0 };
    e[key]++;
    counts.set(name, e);
  };
  for (const l of listings) bump(l.commune, l.status === 'published' ? 'active' : 'sold');
  for (const a of archives) bump(a.commune, 'sold');

  const POSTAL = {
    'Mantes-la-Jolie': '78200',
    'Mantes-la-Ville': '78711',
    Limay: '78520',
    Buchelay: '78200',
    Magnanville: '78200',
    'Rosny-sur-Seine': '78710',
    Porcheville: '78440',
    Juziers: '78820',
    Gargenville: '78440',
    'Follainville-Dennemont': '78520',
    'Bonnières-sur-Seine': '78270',
    'Vienne-en-Arthies': '95510',
    Arthies: '95420',
    'Les Mureaux': '78130',
    Andrésy: '78570',
    'Verneuil-sur-Seine': '78480',
    Méricourt: '78270',
    Flacourt: '78200',
    Jumeauville: '78580',
    'Oinville-sur-Montcient': '78250',
    Maule: '78580',
    Aubergenville: '78410',
    Épône: '78680',
    Guerville: '78930',
    Issou: '78440',
  };

  return [...counts.entries()]
    .map(([name, c]) => ({
      name,
      slug: slugify(name),
      postalCode: POSTAL[name] ?? null,
      activeCount: c.active,
      soldCount: c.sold,
      total: c.active + c.sold,
    }))
    .sort((a, b) => b.total - a.total);
}

/* ---------------------------------------------------------------- redirects */

function buildRedirects(listings) {
  const byLegacyId = new Map(listings.map((l) => [l.legacyProductsId, l]));
  const target = (id) => {
    const l = byLegacyId.get(id);
    return l ? `/bien/${l.slug}/` : '/acheter/';
  };

  const rows = [];
  const add = (source, destination, statusCode = 301, note = '') =>
    rows.push({ source, destination, statusCode, note });

  // Pages editoriales et legales
  add('/content/5/notre-agence.html', '/agence/', 301, 'page agence');
  add('/content/1/notre-agence.html', '/agence/', 301, '404 sur l ancien site mais liee au footer');
  add('/annonces/transaction/Vente.html', '/acheter/');
  add('/annonces/transaction/vente.html', '/acheter/');
  add('/annonces/transaction_____2/vente.html', '/acheter/page/2/');
  add('/annonces/transaction_____3/vente.html', '/acheter/page/3/');
  add('/annonces/transaction/Location.html', '/louer/');
  add('/annonces/transaction/location.html', '/louer/');
  add('/catalog/products_selled.php', '/biens-vendus/');
  for (let p = 2; p <= 11; p++) add(`/catalog/products_selled.php?page=${p}`, `/biens-vendus/page/${p}/`);
  add('/catalog/estimation.php', '/estimation/');
  add('/estimation.php', '/estimation/', 301, '404 sur l ancien site');
  add('/catalog/contact_us.php?form=1', '/contact/');
  add('/contact_us.php?form=1', '/contact/', 301, '404 sur l ancien site');
  add('/catalog/contact_us.php?form=3', '/gestion-locative/');
  add('/contact_us.php?form=3', '/gestion-locative/', 301, '404 sur l ancien site');
  add('/annonces/transaction/contact_us.php?form=3', '/gestion-locative/');
  add('/catalog/news.php', '/guides/');
  add('/catalog/mentions.php', '/mentions-legales/');
  add('/catalog/gdpr.php', '/confidentialite/');
  add('/catalog/cookies-policy.php', '/cookies/');
  add('/catalog/cookies.php', '/cookies/');
  add('/catalog/site_plan.php', '/plan-du-site/');
  add('/catalog/annonce.php', '/acheter/');
  add('/annonce.php', '/acheter/', 301, '404 sur l ancien site');
  add('/catalog/outils.php', '/guides/outils/');
  add('/catalog/account.php', '/', 410, 'espace compte non repris');
  add('/account.php', '/', 410, 'espace compte non repris');
  add('/catalog/selection.php', '/', 410, 'selection desormais locale au navigateur');
  add('/selection.php', '/', 410, 'selection desormais locale au navigateur');
  add('/create_alerte_mail.php', '/contact/', 301, 'alertes email refondues');
  add('/catalog/try', '/', 410, 'URL parasite');
  add('/segments/immo/catalog/images/manufacturers_bareme/385554.pdf', '/honoraires/');

  // Fiches biens : cPath et variantes a parametres
  for (const l of listings) {
    add(l.legacyUrl, `/bien/${l.slug}/`, 301, `réf. ${l.reference}`);
    if (l.legacyCPath) {
      add(
        `${l.legacyUrl}?cPath=${l.legacyCPath.replace(/-/g, '_')}&products_id=${l.legacyProductsId}`,
        `/bien/${l.slug}/`
      );
    }
    add(`/catalog/products_print.php?products_id=${l.legacyProductsId}`, `/bien/${l.slug}/`);
    add(
      `/catalog/contact_us.php?manufacturer_id=385554&products_id=${l.legacyProductsId}`,
      `/bien/${l.slug}/#contact`
    );
  }

  // Pages ville_bien de l'ancien site
  const villeBien = readdirSync(PAGES).filter((f) => /^ville_bien-.*\.json$/.test(f));
  for (const f of villeBien) {
    const d = readJson(join(PAGES, f));
    if (d.url.includes('?')) continue;
    const path = d.url.replace('https://www.aurea-immobilier.fr', '');
    const m = path.match(/\/ville_bien\/([^_]+)__(\d)__vente\//);
    if (!m) continue;
    const commune = slugify(normalizeCommune(decodeURIComponent(m[1]).replace(/\+/g, ' ')));
    const type = m[2] === '2' ? 'maison' : 'appartement';
    add(path, `/acheter/${type}-${commune}/`, 301, 'page ville x type');
  }

  // Pages conseiller
  for (const a of parseAgents()) {
    if (a.legacyUrl) add(a.legacyUrl, `/equipe/${a.slug}/`);
  }

  // Toutes les URL dupliquees relevees par le scraper (prompt v3 §3.1)
  const doublons = parseCsv(join(SCRAP, 'data', 'doublons.csv'));
  const knownSources = new Set(rows.map((r) => r.source));
  for (const row of doublons) {
    const src = (row.url_ignoree || '').replace('https://www.aurea-immobilier.fr', '');
    const canonical = (row.identique_a || '').replace('https://www.aurea-immobilier.fr', '');
    if (!src || knownSources.has(src)) continue;
    let dest = '/';
    if (canonical && canonical !== '/' && !canonical.startsWith('(')) {
      const match = rows.find((r) => r.source === canonical);
      dest = match ? match.destination : '/';
    }
    add(src, dest, 301, 'URL dupliquee par chemin relatif');
    knownSources.add(src);
  }

  // Erreurs 404 encore liees depuis l ancien site
  const erreurs = parseCsv(join(SCRAP, 'data', 'erreurs.csv'));
  for (const row of erreurs) {
    const src = (row.url || '').replace('https://www.aurea-immobilier.fr', '');
    if (!src || knownSources.has(src)) continue;
    add(src, '/', 301, '404 sur l ancien site, encore liee');
    knownSources.add(src);
  }

  return rows;
}

/* --------------------------------------------------------------------- main */

function main() {
  const ficheFiles = readdirSync(PAGES).filter((f) => /^fiches-.*\.json$/.test(f));
  const listings = ficheFiles
    .map(parseFiche)
    .filter(Boolean)
    .filter((l) => l.reference !== null);

  // Deduplication sur la reference (les variantes ?cPath= sont deja ecartees)
  const byRef = new Map();
  for (const l of listings) {
    const prev = byRef.get(l.reference);
    if (!prev || l.photos.length > prev.photos.length) byRef.set(l.reference, l);
  }
  const unique = [...byRef.values()].sort((a, b) => b.reference - a.reference);

  const agents = parseAgents();
  const allArchives = parseArchives();
  const archiveByRef = new Map(allArchives.map((a) => [a.reference, a]));

  // Slug definitif, rattachement du conseiller, et recoupement avec les pages
  // « nos reussites » qui font foi pour le statut vendu / loue et la commune.
  for (const l of unique) {
    const archived = archiveByRef.get(l.reference);
    if (archived) {
      l.status = archived.status;
      if (!l.commune && archived.commune) l.commune = archived.commune;
    }
    l.slug = `${l.reference}-${slugify(l.title)}`.slice(0, 90).replace(/-+$/, '');
    l.agentSlug = matchAgentSlug(l.advisorName, agents);
    l.communeSlug = l.commune ? slugify(l.commune) : null;
  }

  const archives = allArchives.filter((a) => !byRef.has(a.reference));
  const communes = buildCommunes(unique, archives);
  const redirects = buildRedirects(unique);

  const report = {
    generatedAt: new Date().toISOString(),
    source: 'scrapper_aurea (crawl du 2026-09-18)',
    listings: unique.length,
    listingsPublished: unique.filter((l) => l.status === 'published').length,
    listingsArchivedWithFullSheet: unique.filter((l) => l.status !== 'published').length,
    archivesFromListPages: archives.length,
    totalSoldOrRented: archives.length + unique.filter((l) => l.status !== 'published').length,
    // Compteur affiche par l'ancien site : c'est le total reel du portefeuille archive
    announcedArchivedTotal: allArchives.announcedTotal ?? null,
    agents: agents.length,
    communes: communes.length,
    redirects: redirects.length,
    photos: unique.reduce((n, l) => n + l.photos.length, 0),
    gaps: [
      `Pages 7 a 10 de products_selled.php non scrapees : ${archives.length + unique.filter((l) => l.status !== 'published').length} biens archives recuperes sur ${allArchives.announcedTotal ?? '?'} annonces (compteur de l ancien site).`,
      'Aucun media riche (visite virtuelle, video drone) dans le HTML scrape : medias.csv est vide.',
      'Aucun avis client dans le scraping : la section avis reste a alimenter manuellement.',
      'Certains visuels sont declares generes par IA (Gemini, immofacile, immowise, scout) : tri a valider par l agence.',
    ],
  };

  mkdirSync(OUT_DATA, { recursive: true });
  mkdirSync(OUT_SUPA, { recursive: true });

  const write = (name, data) =>
    writeFileSync(join(OUT_DATA, name), JSON.stringify(data, null, 2) + '\n', 'utf8');

  write('listings.json', unique);
  write('archives.json', archives);
  write('agents.json', agents);
  write('communes.json', communes);
  write('redirects.json', redirects);
  write('scraping-report.json', report);

  writeFileSync(join(OUT_SUPA, 'seed.sql'), buildSeedSql(unique, archives, agents, communes), 'utf8');

  console.log('Extraction terminee :');
  console.table({
    'fiches completes': unique.length,
    'dont en ligne': report.listingsPublished,
    'archives (pages listes)': archives.length,
    conseillers: agents.length,
    communes: communes.length,
    'photos rattachees': report.photos,
    'redirections 301/410': redirects.length,
  });
}

/* ------------------------------------------------------------- seed Supabase */

const sqlStr = (v) =>
  v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const sqlNum = (v) => (v === null || v === undefined || Number.isNaN(v) ? 'null' : String(v));
const sqlBool = (v) => (v ? 'true' : 'false');

function buildSeedSql(listings, archives, agents, communes) {
  const L = [];
  L.push('-- Seed genere par scripts/extract-scraping.mjs — NE PAS EDITER A LA MAIN.');
  L.push('-- Source : scrapper_aurea (crawl du 2026-09-18). Donnees de depart et de secours ;');
  L.push('-- la source de verite en production est le flux Orisha (prompt v3 §4).');
  L.push('');
  L.push('begin;');
  L.push('');

  L.push('-- Communes -----------------------------------------------------------------');
  for (const c of communes) {
    L.push(
      `insert into public.communes (slug, name, postal_code, active_count, sold_count) values (${sqlStr(
        c.slug
      )}, ${sqlStr(c.name)}, ${sqlStr(c.postalCode)}, ${sqlNum(c.activeCount)}, ${sqlNum(
        c.soldCount
      )}) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;`
    );
  }
  L.push('');

  L.push('-- Conseillers --------------------------------------------------------------');
  for (const a of agents) {
    L.push(
      `insert into public.agents (slug, name, role, email, phone, photo_file, legacy_id) values (${sqlStr(
        a.slug
      )}, ${sqlStr(a.name)}, ${sqlStr(a.role)}, ${sqlStr(a.email)}, ${sqlStr(
        a.phone
      )}, ${sqlStr(a.photo)}, ${sqlStr(a.legacyId)}) on conflict (slug) do update set name = excluded.name, role = excluded.role, email = excluded.email, phone = excluded.phone, photo_file = excluded.photo_file;`
    );
  }
  L.push('');

  L.push('-- Biens (fiches completes) ------------------------------------------------');
  for (const l of listings) {
    const cols = [
      ['reference', sqlNum(l.reference)],
      ['legacy_products_id', sqlStr(l.legacyProductsId)],
      ['slug', sqlStr(l.slug)],
      ['title', sqlStr(l.title)],
      ['status', sqlStr(l.status)],
      ['transaction_type', sqlStr(l.transaction)],
      ['property_type', sqlStr(l.propertyType)],
      ['commune_slug', sqlStr(l.commune ? slugify(l.commune) : null)],
      ['postal_code', sqlStr(l.postalCode)],
      ['price', sqlNum(l.price)],
      ['fees_payer', sqlStr(l.feesPayer)],
      ['living_area', sqlNum(l.livingArea)],
      ['land_area', sqlNum(l.landArea)],
      ['rooms', sqlNum(l.rooms)],
      ['bedrooms', sqlNum(l.bedrooms)],
      ['floor_number', sqlNum(l.floor)],
      ['year_built', sqlNum(l.yearBuilt)],
      ['heating', sqlStr(l.heating)],
      ['is_condo', sqlBool(l.isCondo)],
      ['condo_lots', sqlNum(l.condoLots)],
      ['condo_annual_charges', sqlNum(l.condoAnnualCharges)],
      ['property_tax', sqlNum(l.propertyTax)],
      ['dpe_class', sqlStr(l.dpeClass)],
      ['ges_class', sqlStr(l.gesClass)],
      ['dpe_value', sqlNum(l.dpeValue)],
      ['ges_value', sqlNum(l.gesValue)],
      ['energy_cost_min', sqlNum(l.energyCostMin)],
      ['energy_cost_max', sqlNum(l.energyCostMax)],
      ['is_exclusive', sqlBool(l.isExclusive)],
      ['description', sqlStr(l.description)],
      ['agent_slug', sqlStr(l.agentSlug)],
    ];
    L.push(
      `insert into public.listings (${cols.map((c) => c[0]).join(', ')}) values (${cols
        .map((c) => c[1])
        .join(', ')}) on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;`
    );
    l.photos.forEach((p, i) => {
      L.push(
        `insert into public.listing_photos (listing_reference, position, file_name, alt) values (${sqlNum(
          l.reference
        )}, ${i}, ${sqlStr(p.file)}, ${sqlStr(p.alt)}) on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;`
      );
    });
  }
  L.push('');

  L.push('-- Biens archives (listes « nos reussites ») --------------------------------');
  for (const a of archives) {
    L.push(
      `insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (${sqlNum(
        a.reference
      )}, ${sqlStr(a.title)}, ${sqlStr(a.commune ? slugify(a.commune) : null)}, ${sqlStr(
        a.status
      )}, ${sqlNum(a.area)}, ${sqlStr(a.propertyType)}) on conflict (reference) do nothing;`
    );
  }
  L.push('');
  L.push('commit;');
  L.push('');
  return L.join('\n');
}

main();
