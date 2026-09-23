# Site AUREA Immobilier

Refonte complète du site de l'agence AUREA Immobilier (Mantes-la-Jolie) : un site distinct de
l'ancien, organisé par intention du visiteur (acheter, vendre, estimer, louer, confier), avec la
direction artistique de l'agence (logo, marine `#001F41`, sable `#E5DBC9`, or du logo) et un
back-office qui permet de modifier tout le contenu sans toucher au code.

Astro (hybride) · Supabase (PostgreSQL + RLS + Storage) · Vercel (région Paris).

---

## Démarrage

```bash
npm install
cp .env.example .env.local     # puis remplir — aucune valeur réelle dans le dépôt
npm run dev                    # http://localhost:4321
npm run build                  # lance d'abord le pipeline images (prebuild), puis Astro
```

Le site fonctionne **sans Supabase** : en l'absence de variables, le catalogue est servi depuis
le seed extrait du scraping (`src/data/*.json`) et les textes depuis le registre
(`src/lib/content-schema.ts`). Un déploiement ne peut donc jamais produire un site vide.

### Scripts

| Commande | Rôle |
|---|---|
| `npm run data` | Scraping → `src/data/*.json` + `supabase/seed.sql` |
| `npm run images` | Photos du scraping **et visuels téléversés dans le back-office** → `public/media/**` (AVIF + WebP) |
| `npm run dev` / `build` | Développement / build de production (`build` lance `images` en `prebuild`) |
| `npm run check` | Typecheck Astro + TypeScript |
| `npm run audit:seo` / `audit:secrets` | Audits du HTML produit |
| `node scripts/build-vercel-config.mjs` | Régénère `vercel.json` (en-têtes, 276 redirections, cron) |

---

## Architecture

```
src/
  styles/         tokens.css (couleurs, typo Cormorant Garamond + Inter), global.css, admin.css
  layouts/        Base.astro (public), AdminContenu.astro (back-office), Admin.astro (demandes)
  components/     Header, Footer, PageHeader, ListingCard, Gallery, SearchBar, AgentCard,
                  NewsCard, Reviews, CtaBand, Faq, LeadForm, EstimationForm, Icon…
  lib/
    content-schema.ts   REGISTRE des textes modifiables (une entrée = un champ du back-office)
    content.ts          lecture des textes au build : field(), fieldList(), fieldPairs(), agency()
    media-schema.ts     registre des visuels remplaçables (clé, usage, résolution minimale)
    news.ts / reviews.ts / catalog.ts   chargement unique au build depuis Supabase (repli seed)
    markdown.ts         rendu sûr du « format simple » des actualités
    server/             admin-*.ts (back-office), guard.ts (formulaires), publish.ts (deploy hook)
  pages/
    admin/          back-office : accueil, textes, medias, actualites, equipe, biens, avis,
                    coordonnees, honoraires, api/upload-*.ts, publier.ts
    api/            leads, estimation, alerte, alerte-desabonnement, cron/import-orisha
supabase/
  migrations/     6 migrations (schéma, RLS, hooks/cron, index, site_content, refonte)
  tests/          29 assertions pgTAP, bloquantes en CI
scripts/          extraction, pipeline images (+ téléversements), vercel.json, audits
```

### Rendu

Tout le contenu public est **pré-rendu**. Seules les routes `src/pages/api/**` et `src/pages/admin/**`
sont exécutées à la demande. Une modification dans le back-office est enregistrée en base puis
déclenche un nouveau build via `VERCEL_DEPLOY_HOOK_URL` (une à deux minutes).

### Back-office (`/admin/`)

Accès par le code `ADMIN_CODE` (cookie signé, 8 h). Il permet de modifier :

- **Page d'accueil et textes des pages** — chaque champ a une valeur d'origine ; une case vidée y revient.
- **Photos & visuels** — remplacement de la grande photo d'accueil, de la photo de l'agence, du logo,
  des portraits et des photos des biens. Le fichier part directement dans le bucket Storage `media`
  (URL signée), puis le serveur vérifie type et résolution minimale avant de l'enregistrer dans
  `media_assets`. Le pipeline images le convertit au build suivant.
- **Actualités** — rédaction au format simple (paragraphes, `##`, listes, gras, liens), image de
  couverture, publication.
- **Équipe, biens, avis clients, note Google, coordonnées, horaires, honoraires.**
- **Tableau de bord** — bouton « Publier le site », liste de ce qui reste à compléter, état de la
  configuration technique.

Les demandes reçues (`/admin/demandes/`) restent derrière un compte Supabase nominatif + MFA.

### Sécurité

- Le navigateur n'a **aucun droit d'écriture**. Formulaires : méthode, `Origin`, honeypot,
  Turnstile, limitation de débit, Zod, insertion serveur. Sans JavaScript, redirection vers `/merci/`.
- RLS sur 100 % des tables ; `exact_address`, `exact_lat`, `exact_lng` jamais accordés à `anon`.
- Le site public n'affiche **jamais** de placeholder « à fournir » : les informations manquantes
  sont listées dans le tableau de bord du back-office. `PUBLIC_RECETTE=1` les rend visibles sur le
  site pour une recette interne.

---

## Base Supabase

Les six migrations et le seed sont appliqués sur le projet `esgygaazfyjzzzdrvcey` (23/09/2026) avec
`npx supabase db query --linked --project-ref esgygaazfyjzzzdrvcey -f <fichier>`. L'historique est
tenu dans `supabase_migrations.schema_migrations`.

Reste à faire dans le dashboard : Authentication › Hooks › Custom Access Token →
`private.custom_access_token_hook` (nécessaire à l'espace « Demandes »), création des clés
`sb_secret_` (une par usage) et des comptes du back-office des demandes.

---

## Déploiement

Projet Vercel `aurea-immobilier`, connecté au dépôt GitHub. Variables à renseigner : voir
`.env.example`. Sans clé secrète, le site se construit quand même (seed + contenu public) ; seuls le
back-office et les formulaires sont désactivés, et le tableau de bord le signale.

Le document d'actions hors site (Google Business Profile, citations NAP, backlinks) est dans
[`docs/actions-off-site.md`](docs/actions-off-site.md).
