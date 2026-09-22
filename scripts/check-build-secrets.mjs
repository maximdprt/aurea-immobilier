#!/usr/bin/env node
/**
 * Vérifie qu'aucun secret ne fuit dans ce qui est servi au navigateur (§20.1).
 *
 * La clé `sb_secret_` contourne totalement la RLS : si elle se retrouve dans un
 * bundle client, tout le modèle de sécurité tombe. Ce test est bloquant en CI.
 *
 * Il contrôle aussi qu'aucune variable serveur n'a été préfixée `PUBLIC_` par
 * inadvertance — l'erreur la plus facile à commettre avec Astro comme avec
 * Next.js.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Répertoires réellement servis au navigateur. */
const CLIENT_DIRS = [
  join(ROOT, 'dist/client'),
  join(ROOT, 'dist'),
  join(ROOT, '.vercel/output/static'),
].filter((dir) => existsSync(dir));

if (!CLIENT_DIRS.length) {
  console.error('Aucun build trouvé. Lancez `npm run build` avant le contrôle.');
  process.exit(1);
}

/** Motifs interdits côté client. */
const FORBIDDEN = [
  { pattern: /sb_secret_[A-Za-z0-9_-]+/g, label: 'clé secrète Supabase' },
  { pattern: /\bservice_role\b/g, label: 'mention service_role' },
  { pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./g, label: 'JWT en clair' },
  { pattern: /TURNSTILE_SECRET_KEY\s*[:=]\s*["'][^"']+["']/g, label: 'secret Turnstile' },
  { pattern: /CRON_SECRET\s*[:=]\s*["'][^"']+["']/g, label: 'secret de cron' },
  { pattern: /ORISHA_FEED_TOKEN\s*[:=]\s*["'][^"']+["']/g, label: 'jeton du flux Orisha' },
  { pattern: /EMAIL_API_KEY\s*[:=]\s*["'][^"']+["']/g, label: 'clé du service d’emailing' },
  { pattern: /IP_HASH_SALT\s*[:=]\s*["'][^"']+["']/g, label: 'sel de hachage des IP' },
  {
    pattern: /ALERT_TOKEN_SECRET\s*[:=]\s*["'][^"']+["']/g,
    label: 'secret des jetons d’alerte',
  },
];

const SCANNED_EXTENSIONS = ['.js', '.mjs', '.css', '.html', '.json', '.txt', '.map'];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (SCANNED_EXTENSIONS.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

const findings = [];
let scanned = 0;

for (const dir of CLIENT_DIRS) {
  for (const file of walk(dir)) {
    scanned++;
    const content = readFileSync(file, 'utf8');
    for (const { pattern, label } of FORBIDDEN) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        findings.push({
          file: relative(ROOT, file),
          label,
          // On ne réimprime jamais le secret : seulement son début.
          excerpt: `${match[0].slice(0, 12)}…`,
        });
      }
    }
  }
}

/* ------------------- contrôle des noms de variables du dépôt ------------- */

const SERVER_ONLY = [
  'SUPABASE_SECRET_KEY_FORMS',
  'SUPABASE_SECRET_KEY_IMPORT',
  'TURNSTILE_SECRET_KEY',
  'CRON_SECRET',
  'ORISHA_FEED_TOKEN',
  'EMAIL_API_KEY',
  'IP_HASH_SALT',
  'ALERT_TOKEN_SECRET',
];

const envExample = existsSync(join(ROOT, '.env.example'))
  ? readFileSync(join(ROOT, '.env.example'), 'utf8')
  : '';

for (const name of SERVER_ONLY) {
  if (new RegExp(`PUBLIC_${name}`).test(envExample)) {
    findings.push({
      file: '.env.example',
      label: `variable serveur préfixée PUBLIC_ : ${name}`,
      excerpt: '',
    });
  }
}

/* ------------------------------------------------------------------ sortie */

console.log(`Contrôle des secrets — ${scanned} fichiers servis analysés`);

if (findings.length) {
  console.log('\nFuites détectées :');
  for (const f of findings) {
    console.log(`  ✗ ${f.file} — ${f.label} ${f.excerpt}`);
  }
  console.log('\nContrôle en échec. Révoquez immédiatement toute clé exposée (§20.9).');
  process.exit(1);
}

console.log('Aucun secret dans les fichiers servis au navigateur.');
