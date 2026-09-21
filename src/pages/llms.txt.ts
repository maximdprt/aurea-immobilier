/**
 * llms.txt — présentation en Markdown de l'agence à destination des moteurs
 * génératifs (§11.9).
 *
 * Le fichier est généré depuis les mêmes données que le site : il ne peut donc
 * pas diverger des pages, ce qui est exactement le risque d'un fichier écrit à
 * la main. Aucune information manquante n'y est inventée.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { activeListings, allAgents, catalogStats, communesWithPage } from '~/lib/catalog';
import { COMPANY, CONTACT, REGULATED, SITE_URL } from '~/lib/site';
import { area, priceLine, propertyTypeLabel } from '~/lib/format';

export const GET: APIRoute = async () => {
  const stats = catalogStats();
  const communes = communesWithPage();
  const agents = allAgents();
  const guides = await getCollection('guides', ({ data }) => !data.draft);
  const listings = activeListings();

  const L: string[] = [];

  L.push(`# ${COMPANY.name}`);
  L.push('');
  L.push(`> ${COMPANY.pitch}`);
  L.push('');
  L.push(
    `Agence immobilière indépendante créée en août 2024, installée ${CONTACT.street}, ` +
      `${CONTACT.postalCode} ${CONTACT.city} (${CONTACT.department}, ${CONTACT.region}). ` +
      `${stats.archivedTotal} biens vendus ou loués depuis la création.`
  );
  L.push('');

  L.push('## Identité');
  L.push('');
  L.push(`- Raison sociale : ${COMPANY.legalName} (${COMPANY.legalForm})`);
  L.push(`- SIRET : ${COMPANY.siret}`);
  L.push(`- RCS : ${COMPANY.rcs} — ${COMPANY.rcsCity}`);
  L.push(`- Carte professionnelle : ${REGULATED.cpiNumber}, ${REGULATED.cpiIssuer}`);
  L.push(`- Adresse : ${CONTACT.street}, ${CONTACT.postalCode} ${CONTACT.city}`);
  L.push(`- Téléphone : ${CONTACT.phone}`);
  L.push(`- Email : ${CONTACT.email}`);
  L.push('');

  L.push('## Services');
  L.push('');
  L.push(`- [Achat](${SITE_URL}/acheter/) — biens à vendre dans le Mantois`);
  L.push(`- [Location](${SITE_URL}/louer/) — biens à louer`);
  L.push(`- [Vente](${SITE_URL}/vendre/) — accompagnement des vendeurs`);
  L.push(`- [Estimation](${SITE_URL}/estimation/) — avis de valeur gratuit, 4 méthodes croisées`);
  L.push(`- [Gestion locative](${SITE_URL}/gestion-locative/) — mandat de gestion complet`);
  L.push('');

  L.push('## Honoraires');
  L.push('');
  L.push('Barème public, prix affichés honoraires inclus sur chaque annonce.');
  L.push('');
  L.push('- Biens à usage d’habitation : 6 % du prix de vente, minimum 10 000 € TTC');
  L.push('- Terrains constructibles et non constructibles : 10 %');
  L.push('- Parkings et box : 10 %, minimum 2 500 € TTC');
  L.push('- Honoraires à la charge du vendeur, sauf mention contraire sur l’annonce');
  L.push(`- Barème détaillé : ${SITE_URL}/honoraires/`);
  L.push('');

  L.push('## Zone d’intervention');
  L.push('');
  L.push(
    'Communes où l’agence a des biens en portefeuille ou des transactions réalisées ' +
      '(une page par commune) :'
  );
  L.push('');
  for (const c of communes) {
    L.push(
      `- [${c.name}${c.postalCode ? ` (${c.postalCode})` : ''}](${SITE_URL}/agence-immobiliere/${c.slug}/) — ` +
        `${c.activeCount} bien(s) disponible(s), ${c.soldCount} transaction(s) réalisée(s)`
    );
  }
  L.push('');

  L.push('## Biens actuellement proposés');
  L.push('');
  for (const l of listings) {
    const bits = [
      propertyTypeLabel(l.propertyType),
      l.rooms ? `${l.rooms} pièces` : null,
      l.livingArea ? area(l.livingArea) : null,
      l.commune,
      priceLine(l),
      l.dpeClass ? `DPE ${l.dpeClass}` : null,
    ].filter(Boolean);
    L.push(`- [Réf. ${l.reference} — ${l.title}](${SITE_URL}/bien/${l.slug}/) : ${bits.join(', ')}`);
  }
  L.push('');

  L.push('## Équipe');
  L.push('');
  for (const a of agents) {
    L.push(`- [${a.name}](${SITE_URL}/equipe/${a.slug}/) — ${a.role}`);
  }
  L.push('');

  L.push('## Guides');
  L.push('');
  for (const g of guides) {
    L.push(`- [${g.data.title}](${SITE_URL}/guides/${g.id}/) — ${g.data.question}`);
  }
  L.push('');

  L.push('## Données publiques utilisées');
  L.push('');
  L.push('- Prix de marché : base DVF (data.gouv.fr), avec date d’extraction indiquée sur chaque page');
  L.push('- Risques : Géorisques (georisques.gouv.fr)');
  L.push('- Réglementation citée dans les guides : Légifrance et service-public.fr');
  L.push('');

  L.push('## Précisions');
  L.push('');
  L.push(
    '- Les avis clients affichés sur le site proviennent de la fiche Google et sont reproduits ' +
      'sans modification. Ils ne font l’objet d’aucun balisage de notation, conformément aux ' +
      'consignes de Google.'
  );
  L.push(
    '- Certains visuels illustratifs sont générés par intelligence artificielle. Aucun visuel ' +
      'généré n’est présenté comme une photographie réelle d’un bien.'
  );
  L.push(
    '- Les descriptifs, surfaces et disponibilités sont indicatifs et non contractuels ; seuls ' +
      'le mandat et l’acte authentique font foi.'
  );
  L.push('');
  L.push(`Dernière génération : ${new Date().toISOString().slice(0, 10)}`);
  L.push('');

  return new Response(L.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
