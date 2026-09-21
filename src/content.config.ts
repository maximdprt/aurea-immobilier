import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Guides — le cœur du dispositif GEO (§11).
 *
 * Chaque guide est signé par un membre de l'équipe et porte ses dates de
 * publication et de révision : la fraîcheur et l'auteur identifié sont deux des
 * signaux sur lesquels s'appuient les moteurs génératifs.
 *
 * `sources` est obligatoire et non vide : le brief interdit de publier un fait
 * réglementaire ou chiffré sans lien vers sa source officielle.
 */
const guides = defineCollection({
  loader: glob({ base: './src/content/guides', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().min(10).max(80),
    /** 140-155 caractères, contrôlé par scripts/audit-seo.mjs. */
    description: z.string().min(80).max(200),
    /** Question à laquelle le guide répond, posée telle quelle. */
    question: z.string(),
    /** Réponse directe de 40 à 60 mots, servie en premier paragraphe. */
    answer: z.string(),
    author: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date(),
    cluster: z.enum(['prix', 'vendre', 'acheter', 'louer', 'gestion', 'vivre-ici']),
    sources: z
      .array(z.object({ label: z.string(), url: z.string().url() }))
      .min(1, 'Un guide doit citer au moins une source vérifiable'),
    /** Communes concernées, pour le maillage interne. */
    communes: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { guides };
