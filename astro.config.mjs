// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import { createRequire } from 'node:module';

const SITE = process.env.PUBLIC_SITE_URL ?? 'https://www.aurea-immobilier.fr';

/**
 * Un bien vendu ou loue reste en ligne — il conserve ses liens entrants — mais
 * il est en `noindex`. Le declarer dans le sitemap serait contradictoire, et
 * Search Console le signale comme tel. On liste donc les slugs a exclure.
 */
const require = createRequire(import.meta.url);
/** @type {{ slug: string, status: string }[]} */
const allListings = require('./src/data/listings.json');
const archivedSlugs = new Set(
  allListings
    .filter((listing) => listing.status === 'sold' || listing.status === 'rented')
    .map((listing) => `/bien/${listing.slug}/`)
);

/**
 * Pages techniques, jamais indexables. Toute page portant `noindex` doit
 * figurer ici : l'audit SEO echoue si le sitemap annonce une page que la page
 * elle-meme demande d'ignorer.
 *
 * `/selection/` en fait partie : son contenu est propre a chaque visiteur (les
 * biens mis de cote dans son navigateur) et n'existe pas cote serveur.
 */
const NEVER_INDEXED = [
  '/404/',
  '/contenu-supprime/',
  '/admin',
  '/api/',
  '/selection/',
  // Pages atteintes par un lien porteur de jeton, propres a une inscription.
  '/alerte/confirmation/',
  '/desabonnement/',
  // Page de remerciement des formulaires : aucun contenu propre.
  '/merci/',
];

/**
 * Astro en mode hybride (prompt v3 §6) : tout le contenu public est pre-rendu,
 * seules les routes serveur (`src/pages/api/**`) sont a la demande, en region
 * Paris au plus pres de Supabase.
 */
export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  output: 'static',
  // Remplace par src/middleware.ts : la verification integree comparait
  // l'origine a une URL que l'adaptateur Vercel reconstruit autrement, et
  // refusait la connexion au back-office sur l'alias *.vercel.app.
  security: { checkOrigin: false },
  adapter: vercel({
    // La region des fonctions est fixee dans vercel.json (`regions: ['cdg1']`),
    // au plus pres de la base Supabase (§20.7).
    maxDuration: 15,
  }),
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  integrations: [
    sitemap({
      filter: (page) => {
        const path = page.replace(SITE, '');
        if (NEVER_INDEXED.some((prefix) => path.startsWith(prefix))) return false;
        // Les fiches archivees sont en noindex : elles n'ont rien a faire ici
        if (archivedSlugs.has(path)) return false;
        return true;
      },
      /** @param {import('@astrojs/sitemap').SitemapItem} item */
      serialize(item) {
        if (item.url.endsWith('/bien/')) return undefined;
        item.priority = item.url === `${SITE}/` ? 1.0 : item.url.includes('/bien/') ? 0.8 : 0.6;
        // Les fiches changent tous les jours (statut, prix), le reste chaque semaine
        item.changefreq = /** @type {any} */ (
          item.url.includes('/bien/') ? 'daily' : 'weekly'
        );
        return item;
      },
    }),
  ],
  vite: {
    build: {
      // Aucun secret ne doit pouvoir fuir dans le bundle client (§20.1)
      rollupOptions: {
        output: { manualChunks: undefined },
      },
    },
  },
});
