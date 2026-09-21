/**
 * robots.txt généré.
 *
 * Point clé du §11.8 : les robots des moteurs génératifs sont explicitement
 * autorisés. Être cité par ChatGPT, Perplexity ou Google AI Overviews suppose
 * d'abord de ne pas les bloquer — beaucoup de sites immobiliers le font sans
 * s'en rendre compte via une configuration par défaut.
 */
import type { APIRoute } from 'astro';
import { AI_CRAWLERS, SITE_URL } from '~/lib/site';

export const GET: APIRoute = () => {
  const disallow = [
    '/admin/',
    '/api/',
    '/contenu-supprime/',
    // Anciennes URL de recherche à paramètres, au cas où un robot les aurait gardées
    '/catalog/',
    '/*?cPath=',
    '/*?products_id=',
    '/*?form=',
  ];

  const lines: string[] = [
    '# AUREA Immobilier — https://www.aurea-immobilier.fr',
    '# Les robots des moteurs génératifs sont autorisés (voir plus bas).',
    '',
    'User-agent: *',
    ...disallow.map((path) => `Disallow: ${path}`),
    'Allow: /',
    '',
    '# Moteurs de recherche et moteurs génératifs explicitement autorisés',
  ];

  for (const bot of AI_CRAWLERS) {
    lines.push('', `User-agent: ${bot}`, 'Allow: /', 'Disallow: /admin/', 'Disallow: /api/');
  }

  lines.push(
    '',
    '# Aspirateurs de contenu sans contrepartie : refusés',
    'User-agent: SemrushBot',
    'Disallow: /',
    '',
    'User-agent: AhrefsBot',
    'Disallow: /',
    '',
    'User-agent: MJ12bot',
    'Disallow: /',
    '',
    `Sitemap: ${SITE_URL}/sitemap-index.xml`,
    ''
  );

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
