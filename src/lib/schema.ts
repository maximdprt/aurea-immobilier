/**
 * Donnees structurees JSON-LD (prompt v3 §12).
 *
 * L'ancien site n'emettait qu'un `BreadcrumbList` avec des chemins relatifs
 * casses ; tout est reconstruit ici.
 *
 * Regle explicite du brief : on ne balise NI `Review` NI `AggregateRating` sur
 * l'entite de l'agence. Les avis affiches par une entreprise sur son propre
 * site sont auto-promotionnels au sens des consignes Google, inelegibles aux
 * etoiles, et les baliser expose a une action manuelle.
 */
import { COMPANY, CONTACT, GEO, SAME_AS, SITE_URL, isMissing, openingHoursSchema } from './site';
import { listingHeading, stripContacts } from './format';
import type { Agent, Listing } from './types';

export const AGENCY_ID = `${SITE_URL}/#agence`;
export const WEBSITE_ID = `${SITE_URL}/#site`;
export const personId = (slug: string) => `${SITE_URL}/equipe/${slug}/#person`;

type Json = Record<string, unknown>;

/** Retire les cles nulles pour ne jamais emettre de champ vide. */
function clean<T extends Json>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
  ) as T;
}

/* ------------------------------------------------------------- Agence ---- */

export function agencySchema({ full = false }: { full?: boolean } = {}): Json {
  if (!full) return { '@id': AGENCY_ID };

  return clean({
    '@type': 'RealEstateAgent',
    '@id': AGENCY_ID,
    name: COMPANY.name,
    legalName: COMPANY.legalName,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/media/marque/logo-720.png`,
    image: `${SITE_URL}/media/editorial/agence-1024.webp`,
    description: COMPANY.pitch,
    telephone: CONTACT.phoneE164,
    email: CONTACT.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: CONTACT.street,
      addressLocality: CONTACT.city,
      postalCode: CONTACT.postalCode,
      addressRegion: CONTACT.region,
      addressCountry: CONTACT.country,
    },
    // Les coordonnees ne sont emises que si elles ont ete relevees (§19)
    geo: isMissing(GEO) ? null : GEO,
    // Horaires repris de l'ancien site (voir OPENING_HOURS). Ils doivent
    // rester identiques a la fiche Google : la coherence NAP en depend.
    openingHoursSpecification: openingHoursSchema(),
    areaServed: undefined,
    sameAs: SAME_AS.length ? SAME_AS : null,
    founder: [{ '@id': personId('helene-vermeire-benz') }, { '@id': personId('vincent-maume') }],
    foundingDate: COMPANY.foundingDate,
    priceRange: '€€',
    vatID: COMPANY.vatId,
    taxID: COMPANY.siret.replace(/\s/g, ''),
  });
}

export function websiteSchema(): Json {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: COMPANY.name,
    inLanguage: 'fr-FR',
    publisher: { '@id': AGENCY_ID },
  };
}

/* -------------------------------------------------------- Fil d'Ariane --- */

export interface Crumb {
  label: string;
  href?: string;
}

export function breadcrumbSchema(crumbs: Crumb[]): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => {
      const item: Json = { '@type': 'ListItem', position: i + 1, name: c.label };
      if (c.href) item.item = `${SITE_URL}${c.href}`;
      return item;
    }),
  };
}

/* ---------------------------------------------------------- Fiche bien --- */

export function listingSchema(listing: Listing, ogImage: string | null): Json {
  const residence = clean({
    '@type':
      listing.propertyType === 'maison'
        ? 'SingleFamilyResidence'
        : listing.propertyType === 'appartement'
          ? 'Apartment'
          : 'Residence',
    name: listingHeading(listing),
    numberOfRooms: listing.rooms ?? null,
    numberOfBedrooms: listing.bedrooms ?? null,
    yearBuilt: listing.yearBuilt ?? null,
    floorSize: listing.livingArea
      ? { '@type': 'QuantitativeValue', value: listing.livingArea, unitCode: 'MTK' }
      : null,
    // Adresse au niveau commune seulement : l'adresse exacte d'un bien en vente
    // n'a pas a etre publique (§20.2)
    address: clean({
      '@type': 'PostalAddress',
      addressLocality: listing.commune ?? null,
      postalCode: listing.postalCode ?? null,
      addressRegion: 'Île-de-France',
      addressCountry: 'FR',
    }),
  });

  const availability =
    listing.status === 'published'
      ? 'https://schema.org/InStock'
      : listing.status === 'under_offer'
        ? 'https://schema.org/LimitedAvailability'
        : 'https://schema.org/SoldOut';

  return clean({
    '@type': 'RealEstateListing',
    '@id': `${SITE_URL}/bien/${listing.slug}/#listing`,
    url: `${SITE_URL}/bien/${listing.slug}/`,
    name: listingHeading(listing),
    description: stripContacts(listing.description).replace(/\s+/g, ' ').slice(0, 500),
    image: ogImage ? `${SITE_URL}${ogImage}` : null,
    /*
     * `datePosted` est volontairement absent : le scraping ne fournit aucune
     * date de mise en ligne. Y mettre la date du DPE, seule date disponible,
     * serait une donnee fausse. Le champ sera renseigne par l'import Orisha.
     */
    provider: { '@id': AGENCY_ID },
    about: residence,
    mainEntity: residence,
    offers: listing.price
      ? clean({
          '@type': 'Offer',
          price: listing.price,
          priceCurrency: 'EUR',
          availability,
          businessFunction:
            listing.transaction === 'location'
              ? 'http://purl.org/goodrelations/v1#LeaseOut'
              : 'http://purl.org/goodrelations/v1#Sell',
          seller: { '@id': AGENCY_ID },
        })
      : null,
  });
}

/* ------------------------------------------------------------ Personne --- */

export function personSchema(agent: Agent, photoUrl: string | null): Json {
  return clean({
    '@type': 'Person',
    '@id': personId(agent.slug),
    name: agent.name,
    jobTitle: agent.role,
    url: `${SITE_URL}/equipe/${agent.slug}/`,
    image: photoUrl ? `${SITE_URL}${photoUrl}` : null,
    email: agent.email,
    telephone: CONTACT.phoneE164,
    worksFor: { '@id': AGENCY_ID },
  });
}

/* ------------------------------------------------------------- Article --- */

export function articleSchema(opts: {
  title: string;
  description: string;
  path: string;
  published: string;
  modified: string;
  authorSlug?: string | null;
  authorName?: string | null;
  image?: string | null;
}): Json {
  return clean({
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    datePublished: opts.published,
    dateModified: opts.modified,
    image: opts.image ? `${SITE_URL}${opts.image}` : null,
    author: opts.authorSlug
      ? { '@id': personId(opts.authorSlug) }
      : opts.authorName
        ? { '@type': 'Person', name: opts.authorName }
        : { '@id': AGENCY_ID },
    publisher: { '@id': AGENCY_ID },
    inLanguage: 'fr-FR',
  });
}

/* ----------------------------------------------------------------- FAQ --- */

/** A n'emettre que si la FAQ est reellement visible sur la page (§12). */
export function faqSchema(items: { question: string; answer: string }[]): Json {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  };
}

/* --------------------------------------------------------------- Graphe --- */

export function graph(...nodes: (Json | null | undefined)[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  });
}
