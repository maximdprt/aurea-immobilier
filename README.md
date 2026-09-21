# Site AUREA Immobilier

Refonte du site de l'agence AUREA Immobilier (Mantes-la-Jolie), construite à partir du
**scraping intégral du site existant** (`scrapper_aurea/`, crawl du 18/09/2026) et du brief
`prompt-site-aurea-immobilier-v3-securite.md`.

Astro (hybride) · Supabase (PostgreSQL + RLS) · Vercel (région Paris).

---

## Démarrage

```bash
npm install
cp .env.example .env.local     # puis remplir — aucune valeur réelle dans le dépôt
npm run prepare:assets         # extraction du scraping + pipeline images
npm run dev
```

Le site fonctionne **sans Supabase** : en l'absence de variables d'environnement, le catalogue
est servi depuis le seed extrait du scraping (`src/data/*.json`). Un déploiement ne peut donc
jamais produire un catalogue vide.

### Scripts

| Commande | Rôle |
|---|---|
| `npm run data` | Scraping → `src/data/*.json` + `supabase/seed.sql` |
| `npm run images` | `scrapper_aurea/images/` → `public/media/**` (AVIF + repli WebP) |
| `npm run prepare:assets` | Les deux ci-dessus |
| `npm run dev` / `build` | Développement / build de production |
| `npm run check` | Typecheck Astro + TypeScript |
| `npm run audit:seo` | Audit du HTML produit (titles, H1, JSON-LD, liens, doublons) |
| `npm run audit:secrets` | Vérifie qu'aucun secret n'est servi au navigateur |
| `npm run verify` | Enchaîne check + build + les deux audits |
| `node scripts/build-vercel-config.mjs` | Régénère `vercel.json` (en-têtes, 276 redirections, cron) |
| `node scripts/fetch-fonts.mjs` | Re-télécharge les polices auto-hébergées (rare) |

---

## Ce que le scraping a donné

Le corpus d'entrée est décrit dans le §1 du brief. L'extraction produit :

| | |
|---|---|
| Fiches biens complètes | **21** (9 en ligne, 12 archivées) |
| Biens archivés reconstitués | **79** sur les **128** annoncés par l'ancien site |
| Photos rattachées à un bien | **86** |
| Conseillers | **9** |
| Communes avec présence réelle | **34**, dont **14** éligibles à une page dédiée |
| Redirections 301/410 générées | **276** |

Ces chiffres sont recalculés à chaque `npm run data` et publiés sur `/plan-du-site/`.

### Trois pièges du corpus, traités dans le code

1. **L'ancien serveur répond 200 sur n'importe quel préfixe de chemin.** Il en résulte 144 URL
   dupliquées et, pour les images, des correspondances fausses : la même URL sert tantôt une
   photo, tantôt un PNG. `scripts/extract-scraping.mjs` ne fait donc confiance qu'aux URL
   canoniques `/office5/…` et rattache le reste par nom de fichier.
2. **Encodage ISO-8859-1 mal décodé** dans les JSON scrapés : les accents sont réparés, et les
   toponymes sont normalisés (« Viennes en arthies » → « Vienne-en-Arthies »).
3. **Les pages 7 à 10 des archives n'ont pas été crawlées.** Le site affiche donc 128 (chiffre
   annoncé par l'ancien site) et détaille les 79 reconstitués, en le disant.

---

## Architecture

```
scripts/          extraction du scraping, pipeline images, génération de vercel.json, audits
src/
  data/           JSON générés (versionnés) — ne pas éditer à la main
  lib/            site.ts (identité, placeholders), catalog.ts (accès données), format.ts,
                  schema.ts (JSON-LD), server/ (Supabase admin, garde des formulaires)
  content/guides/ guides éditoriaux (Markdown, schéma de contenu typé)
  components/     Picture, ListingCard, Gallery, EnergyLabel, LeadForm, EstimationForm…
  pages/          pages statiques + routes serveur sous api/
supabase/
  migrations/     schéma, RLS, hooks et cron — la base n'est jamais modifiée à la main
  tests/rls.test.sql   24 assertions pgTAP, bloquantes en CI
  seed.sql        généré depuis le scraping
```

### Rendu

Tout le contenu public est **pré-rendu**. Seules les routes `src/pages/api/**` sont exécutées à
la demande, en région `cdg1` (Paris), au plus près de la base. Aucune information clé — prix,
surface, DPE, adresse de l'agence — ne dépend du JavaScript client : beaucoup de robots de
moteurs génératifs ne l'exécutent pas.

### Sécurité

- Le navigateur n'a **aucun droit d'écriture**. Tout passe par une route serveur qui applique,
  dans l'ordre : méthode et taille, contrôle d'`Origin`, honeypot, Turnstile vérifié côté
  serveur, limitation de débit, validation Zod stricte, puis insertion.
- La RLS est activée sur 100 % des tables exposées, avec des `grant` colonne par colonne :
  `exact_address`, `exact_lat` et `exact_lng` ne sont **jamais** accordés au rôle anonyme.
- L'accès aux demandes exige un second facteur : la politique RLS teste `aal2`, l'interface ne
  fait que le refléter.
- Les clés `sb_secret_` vivent uniquement dans `src/lib/server/` ; `npm run audit:secrets`
  échoue si l'une d'elles apparaît dans un fichier servi.

---

## Ce qui reste à fournir avant la mise en ligne

La liste complète, classée par ce qu'elle bloque, est publiée sur **`/plan-du-site/`** et
maintenue dans `src/lib/site.ts` (`MISSING_INFO`). Le principe est constant : **rien n'est
inventé**. Une information absente s'affiche comme un placeholder `[[…]]` visible, jaune, plutôt
que d'être remplacée par une valeur vraisemblable.

Les points les plus sensibles :

- **Médiateur de la consommation** — « NC » partout dans l'existant, obligation légale.
- **Contradiction sur le numéro RCS** entre les mentions légales (931 635 924) et le barème des
  honoraires (909 023 830). À trancher sur le Kbis.
- **Garantie financière** — le barème déclare une non-détention de fonds, difficilement
  compatible avec l'encaissement de loyers en gestion locative.
- **Horaires, coordonnées GPS, avis Google** — absents du site actuel, indispensables à la
  cohérence NAP et au pack local.
- **Flux Orisha** — tant qu'il n'est pas branché, le catalogue reste figé sur le seed.

À l'inverse, trois mentions que le brief croyait manquantes ont été retrouvées dans le PDF du
barème des honoraires et sont désormais publiées : carte professionnelle
**CPI 9501 2024 000 000 031** (CCI de Paris Île-de-France, 05/09/2024), assurance RCP
**VERSPIEREN n° 41543943**, et le barème lui-même (6 % en habitation, minimum 10 000 € TTC).

---

## Déploiement

1. Trois environnements Vercel, **trois projets Supabase distincts** (production, preview,
   local). Aucun vrai lead dans une preview.
2. Migrations appliquées **avant** le déploiement, depuis la CI, jamais depuis un poste.
3. Variables secrètes marquées *Sensitive* dans Vercel ; une clé secrète par usage, pour
   pouvoir en révoquer une seule.
4. `vercel.json` est **généré** : le modifier à la main serait écrasé. La CI vérifie qu'il est à
   jour vis-à-vis de `src/data/redirects.json`.
5. Après bascule : recrawler les 276 URL redirigées et vérifier que 100 % renvoient un 301
   unique vers une page en 200.

Le document d'actions hors site (Google Business Profile, citations NAP, backlinks, suivi GEO)
est dans [`docs/actions-off-site.md`](docs/actions-off-site.md).
