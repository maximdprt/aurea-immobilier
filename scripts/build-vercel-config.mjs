#!/usr/bin/env node
/**
 * Genere vercel.json : en-tetes de securite (§20.6), redirections 301 issues du
 * scraping (§10), tache planifiee d'import (§20.7).
 *
 * Les redirections ne sont pas ecrites a la main : elles sortent de
 * src/data/redirects.json, lui-meme produit a partir de pages.csv, doublons.csv
 * et erreurs.csv. C'est la seule facon de garantir qu'aucune des 242 URL de
 * l'ancien site ne reste sans decision.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const redirects = JSON.parse(readFileSync(join(ROOT, 'src/data/redirects.json'), 'utf8'));

// L'URL du projet Supabase n'est pas un secret : elle figure dans chaque page
// qui interroge la base. Le projet de production est fixe ici en repli.
const SUPABASE_HOST = (process.env.PUBLIC_SUPABASE_URL ?? 'https://esgygaazfyjzzzdrvcey.supabase.co').replace(/\/$/, '');

/**
 * CSP. Deployer d'abord une semaine en Content-Security-Policy-Report-Only,
 * puis basculer. Pas de 'unsafe-inline' pour les scripts : Astro produit des
 * scripts externes, et les rares scripts inline sont des modules hashables.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${SUPABASE_HOST}`,
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE_HOST}`,
  'frame-src https://challenges.cloudflare.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

/**
 * Vercel n'apparie que le chemin : une URL a parametres devient un `source`
 * sans query, plus une condition `has` sur chaque parametre.
 */
function toVercelRedirect(row) {
  const [path, query] = row.source.split('?');
  const entry = {
    // path-to-regexp : '+', '(', ')', '?', '*' et ':' sont des operateurs ; on
    // les echappe pour qu'une ancienne URL soit prise au pied de la lettre.
    source: path.replace(/\/{2,}/g, '/').replace(/[+()?*:]/g, '\\$&'),
    destination: row.destination,
    permanent: row.statusCode === 301,
  };
  if (row.statusCode === 410) {
    // Vercel ne sait pas repondre 410 via `redirects` : on route vers la page
    // dediee, qui porte elle-meme un noindex et explique la disparition.
    entry.destination = '/contenu-supprime/';
    entry.permanent = true;
  }
  if (query) {
    entry.has = query.split('&').map((pair) => {
      const [key, value] = pair.split('=');
      return value === undefined
        ? { type: 'query', key }
        : { type: 'query', key, value };
    });
  }
  return entry;
}

const seen = new Set();
const vercelRedirects = [];
for (const row of redirects) {
  const entry = toVercelRedirect(row);
  const signature = `${entry.source}|${JSON.stringify(entry.has ?? null)}`;
  // Vercel applique la premiere regle qui matche : on ecarte les doublons de
  // source pour eviter les chaines de redirection (§9 : aucune chaine).
  if (seen.has(signature)) continue;
  seen.add(signature);
  vercelRedirects.push(entry);
}

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  framework: 'astro',
  // Les fonctions serveur restent au plus pres de la base, a Paris (§20.7)
  regions: ['cdg1'],
  headers: [
    { source: '/(.*)', headers: securityHeaders },
    {
      // Assets haches : cache immuable
      source: '/media/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/fonts/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      // Le back-office n'est jamais indexable, quoi que dise robots.txt
      source: '/admin/(.*)',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    },
    {
      source: '/api/(.*)',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
    },
  ],
  redirects: vercelRedirects,
  crons: [
    {
      // Import quotidien du flux Orisha, en heure creuse
      path: '/api/cron/import-orisha',
      schedule: '0 5 * * *',
    },
  ],
};

writeFileSync(join(ROOT, 'vercel.json'), JSON.stringify(config, null, 2) + '\n', 'utf8');

const permanents = vercelRedirects.filter((r) => r.permanent).length;
console.log(
  `vercel.json écrit : ${vercelRedirects.length} redirections (${permanents} permanentes), ` +
    `${securityHeaders.length} en-têtes de sécurité, 1 tâche planifiée.`
);
