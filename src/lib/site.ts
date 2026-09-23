/**
 * Constantes d'identite du site.
 *
 * Regle absolue (prompt v3 §0 et §19) : ce qui n'est pas dans le scraping n'est
 * pas invente. Les valeurs manquantes sont typees `Missing` et rendues comme un
 * placeholder visible `[[...]]`, de sorte qu'aucune page ne puisse partir en
 * production avec une information fausse.
 */

/** Information non encore fournie par l'agence. Voir `MISSING_INFO`. */
export type Missing = { readonly __missing: string };
export const missing = (label: string): Missing => ({ __missing: label });
export const isMissing = (v: unknown): v is Missing =>
  typeof v === 'object' && v !== null && '__missing' in v;

/** Rend une valeur, ou son placeholder visible si elle manque. */
export const orPlaceholder = (v: string | Missing): string =>
  isMissing(v) ? `[[${v.__missing}]]` : v;

export const SITE_URL = (
  import.meta.env.PUBLIC_SITE_URL ?? 'https://www.aurea-immobilier.fr'
).replace(/\/$/, '');

/* ------------------------------------------------------- Identite legale */
/* Source : scrapper_aurea/pages/catalog-mentions.md (verifie)             */

export const COMPANY = {
  name: 'AUREA Immobilier',
  legalName: 'AUREA IMMOBILIER',
  legalForm: 'SAS',
  capital: '1 000 €',
  siret: '931 635 924 00018',
  rcs: '931 635 924',
  rcsCity: 'Pontoise',
  vatId: 'FR30931635924',
  foundingDate: '2024-08',
  tagline: 'Quand immobilier rime avec qualité',
  /** Positionnement repris de la page « Notre agence », reecrit. */
  pitch:
    'Agence immobilière indépendante à Mantes-la-Jolie : vente, achat, location, estimation et gestion locative dans le Mantois.',
} as const;

export const CONTACT = {
  street: '44 rue Nationale',
  postalCode: '78200',
  city: 'Mantes-la-Jolie',
  region: 'Île-de-France',
  department: 'Yvelines',
  country: 'FR',
  phone: '01 30 63 50 50',
  phoneE164: '+33130635050',
  email: 'contact@aurea-immobilier.fr',
} as const;

/**
 * Horaires : absents du HTML scrape. Tant qu'ils ne sont pas confirmes, le site
 * n'en affiche aucun plutot que d'en afficher de faux — la coherence NAP avec la
 * fiche Google est un facteur direct du pack local (§2.1, §16).
 */
/**
 * Horaires d'ouverture.
 *
 * Source : page « Notre agence » de l'ancien site (scrapper_aurea,
 * texte_complet.txt) — « Le lundi sur rendez-vous / Du mardi au vendredi
 * 9h30-12h30 14h-19h / Le samedi 9h30-12h30 14h-18h ».
 *
 * Structures plutot que redigees, pour servir les trois usages sans risque
 * de divergence : l'affichage, le `openingHoursSpecification` de schema.org,
 * et le calcul « Ouvert maintenant / Ferme ».
 *
 * ⚠️ Ces horaires doivent rester STRICTEMENT identiques a ceux de la fiche
 * Google Business Profile : c'est un facteur direct du pack local (§19).
 */
export interface OpeningRange {
  readonly from: string;
  readonly to: string;
}
export interface OpeningDay {
  /** Jours au format schema.org. */
  readonly days: readonly string[];
  readonly label: string;
  readonly ranges: readonly OpeningRange[];
  /** Mention affichee a la place des heures (ex. « sur rendez-vous »). */
  readonly note?: string;
}

export const OPENING_HOURS: readonly OpeningDay[] = [
  { days: ['Monday'], label: 'Lundi', ranges: [], note: 'sur rendez-vous' },
  {
    days: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    label: 'Du mardi au vendredi',
    ranges: [
      { from: '09:30', to: '12:30' },
      { from: '14:00', to: '19:00' },
    ],
  },
  {
    days: ['Saturday'],
    label: 'Samedi',
    ranges: [
      { from: '09:30', to: '12:30' },
      { from: '14:00', to: '18:00' },
    ],
  },
  { days: ['Sunday'], label: 'Dimanche', ranges: [], note: 'fermé' },
];

/** « 9h30-12h30 et 14h-19h », au format francais. */
export const formatRanges = (d: OpeningDay): string =>
  d.ranges.length === 0
    ? (d.note ?? 'fermé')
    : d.ranges.map((r) => `${fmtHour(r.from)}-${fmtHour(r.to)}`).join(' et ');

const fmtHour = (h: string): string => {
  const [hh, mm] = h.split(':');
  return mm === '00' ? `${Number(hh)}h` : `${Number(hh)}h${mm}`;
};

/** `openingHoursSpecification` schema.org, jours fermes exclus. */
export const openingHoursSchema = () =>
  OPENING_HOURS.filter((d) => d.ranges.length > 0).flatMap((d) =>
    d.ranges.map((r) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: d.days,
      opens: r.from,
      closes: r.to,
    }))
  );

/** Coordonnees GPS : a relever sur la fiche Google Business Profile (§19). */
/**
 * Coordonnees relevees dans l'URL d'integration Google Maps de la page
 * « Notre agence » de l'ancien site (parametres !3d / !2d de l'embed) :
 * 44 rue Nationale, 78200 Mantes-la-Jolie.
 */
export const GEO = {
  '@type': 'GeoCoordinates',
  latitude: 48.9903367914126,
  longitude: 1.7143302759697245,
} as const;

/** URL d'integration de la carte, telle qu'utilisee par l'ancien site. */
export const MAP_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2618.064141475658!2d1.7143302759697245!3d48.9903367914126!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e6bfb285ed8837%3A0xfcfba1fb1fc94e6d!2s44%20Rue%20nationale%2C%2078200%20Mantes-la-Jolie!5e0!3m2!1sfr!2sfr!4v1725029596377!5m2!1sfr!2sfr';

/** Avis Google : rien dans le scraping, tout est a collecter (§13). */
export const GOOGLE_REVIEWS = {
  rating: missing('note Google au jour de la mise en ligne'),
  count: missing("nombre d'avis Google au jour de la mise en ligne"),
  surveyedAt: missing('date du relevé'),
  profileUrl: missing('URL de la fiche Google Maps'),
  reviewUrl: missing('lien court « Demander des avis » du Google Business Profile'),
} as const;

/**
 * Reseaux sociaux officiels, fournis par l'agence (hors scraping).
 * `label` sert de texte accessible : jamais d'icone seule (§4.4).
 */
export const SOCIAL: readonly { readonly label: string; readonly handle: string; readonly url: string }[] = [
  {
    label: 'Instagram',
    handle: '@aurea.immobilier',
    url: 'https://www.instagram.com/aurea.immobilier/',
  },
  {
    label: 'TikTok',
    handle: '@aurea.immobilier',
    url: 'https://www.tiktok.com/@aurea.immobilier',
  },
];

/** Profils tiers : RealAdvisor repere dans le scraping (§16), + les reseaux ci-dessus. */
export const SAME_AS: readonly string[] = [
  'https://realadvisor.fr/fr/agences-immobilieres/agence-aurea-immobilier',
  ...SOCIAL.map((s) => s.url),
];

/** Restent a fournir : Facebook et LinkedIn ne sont pas connus a ce jour. */
export const SOCIAL_MISSING = missing('URL des comptes Facebook et LinkedIn');

/* ------------------------------------------------ Mentions reglementaires */
/*
 * Les mentions legales du site actuel affichent « NC » pour l'assurance et le
 * mediateur, et ne portent aucun numero de carte professionnelle. Le brief les
 * classait donc comme bloquantes.
 *
 * Le PDF du barème des honoraires (scrapper_aurea/files/nos-honoraires-385554.pdf)
 * les contient pourtant. Elles sont reprises ici, marquees comme provenant de ce
 * document, et restent a faire confirmer par l'agence avant publication : le
 * meme PDF comporte une incoherence documentee plus bas.
 */

export const REGULATED = {
  cpiNumber: 'CPI 9501 2024 000 000 031',
  cpiIssuer: 'CCI de Paris Île-de-France',
  cpiIssuedOn: '2024-09-05',
  cpiScope: 'Carte T — Transactions sur immeubles et fonds de commerce',
  /**
   * L'agence declare ne pas detenir de fonds autres que sa remuneration.
   * ⚠️ A confronter avec l'activite de gestion locative, qui implique
   * normalement l'encaissement de loyers et donc une garantie financiere.
   */
  noFundsHeld: true,
  financialGuarantee: missing(
    'garantie financière : à confirmer — le barème déclare une non-détention de fonds, incompatible avec l’encaissement de loyers en gestion locative'
  ),
  insurer: 'VERSPIEREN',
  insurancePolicy: '41543943',
  insurerAddress: '44 avenue Georges Pompidou, 92300 Levallois-Perret',
  mediator: missing('médiateur de la consommation : nom, adresse, site'),
  publicationDirector: missing('directeur de la publication'),
  dpoEmail: missing('adresse email professionnelle pour les demandes RGPD'),
  /** Source de ces mentions, a citer dans la page legale. */
  source: 'Barème des honoraires AUREA Immobilier (PDF publié sur le site actuel)',
} as const;

/**
 * Incoherence relevee entre deux documents publies par l'agence elle-meme.
 * Elle doit etre tranchee avant la mise en ligne : publier un numero RCS
 * errone dans les mentions legales est une faute.
 */
export const LEGAL_DISCREPANCIES = [
  {
    field: 'Numéro RCS',
    inLegalNotice: '931 635 924 (RCS Pontoise)',
    inFeesPdf: '909 023 830 (RCS Pontoise)',
    note: 'Les deux documents du site actuel se contredisent. Le SIRET 931 635 924 00018 concorde avec le premier. Le barème PDF est peut-être un modèle repris d’une autre structure — à vérifier sur le Kbis.',
  },
] as const;

export const HOSTING = {
  site: {
    name: 'Vercel Inc.',
    address: '440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis',
    url: 'https://vercel.com',
  },
  database: {
    name: 'Supabase Inc.',
    address: missing('adresse du siège Supabase, à reprendre du DPA'),
    note: 'Données hébergées dans l’Union européenne — région Paris (eu-west-3).',
  },
} as const;

/* ------------------------------------------------------------- Navigation */

/**
 * Menu principal. Organise par INTENTION du visiteur — acheter, louer,
 * vendre, estimer, confier — et non par rubrique interne : c'est ce qu'il
 * cherche en arrivant, et il doit le trouver en un regard.
 */
export interface NavLink {
  readonly href: string;
  readonly label: string;
  readonly hint?: string;
  /** Nom d'icône de `Icon.astro`. */
  readonly icon?: string;
}

export interface NavItem {
  readonly href: string;
  readonly label: string;
  /** Sous-rubriques affichées dans le méga-menu. */
  readonly children?: readonly NavLink[];
  /** Carte mise en avant à droite du méga-menu. */
  readonly feature?: 'achat' | 'vente' | 'location' | 'agence';
  /** Autres chemins qui rendent l'entrée « active ». */
  readonly match?: readonly string[];
}

export const NAV: readonly NavItem[] = [
  {
    href: '/acheter/',
    label: 'Acheter',
    feature: 'achat',
    match: ['/acheter/', '/bien/', '/agence-immobiliere/', '/selection/', '/alerte/'],
    children: [
      { href: '/acheter/', label: 'Tous les biens à vendre', hint: 'Prix honoraires inclus, DPE affiché', icon: 'home' },
      { href: '/acheter/?type=maison', label: 'Maisons', hint: 'Avec jardin, de ville ou de campagne', icon: 'garden' },
      { href: '/acheter/?type=appartement', label: 'Appartements', hint: 'Du studio au grand familial', icon: 'building' },
      { href: '/alerte/', label: 'Alerte nouveautés', hint: 'Prévenu avant tout le monde', icon: 'bell' },
      { href: '/selection/', label: 'Ma sélection', hint: 'Les biens que vous avez aimés', icon: 'heart' },
      { href: '/prix-immobilier-mantes-la-jolie/', label: 'Prix au m² à Mantes', hint: 'Nos ventes, bien par bien', icon: 'chart' },
    ],
  },
  {
    href: '/vendre/',
    label: 'Vendre',
    feature: 'vente',
    match: ['/vendre/', '/estimation/', '/biens-vendus/', '/honoraires/'],
    children: [
      { href: '/estimation/', label: 'Estimation gratuite', hint: 'Avis de valeur écrit sous 48 h', icon: 'chart' },
      { href: '/vendre/', label: 'Notre méthode de vente', hint: 'Cinq étapes, un seul interlocuteur', icon: 'handshake' },
      { href: '/biens-vendus/', label: 'Nos réussites', hint: 'Les biens vendus et loués', icon: 'check' },
      { href: '/honoraires/', label: 'Nos honoraires', hint: 'Le barème, en toute transparence', icon: 'euro' },
    ],
  },
  {
    href: '/louer/',
    label: 'Louer',
    feature: 'location',
    match: ['/louer/', '/gestion-locative/'],
    children: [
      { href: '/louer/', label: 'Biens à louer', hint: 'Loyer charges comprises affiché', icon: 'key' },
      { href: '/gestion-locative/', label: 'Gestion locative', hint: 'Propriétaires : on s’occupe de tout', icon: 'shield' },
      { href: '/alerte/', label: 'Alerte location', hint: 'Soyez prévenu des nouveautés', icon: 'bell' },
    ],
  },
  {
    href: '/agence/',
    label: 'L’agence',
    feature: 'agence',
    match: ['/agence/', '/equipe/', '/avis/', '/actualites/', '/guides/'],
    children: [
      { href: '/agence/', label: 'Notre agence', hint: 'Qui nous sommes, nos engagements', icon: 'building' },
      { href: '/equipe/', label: 'L’équipe', hint: 'Une ligne directe par conseiller', icon: 'users' },
      { href: '/avis/', label: 'Avis clients', hint: 'Ce que disent nos clients', icon: 'star' },
      { href: '/actualites/', label: 'Actualités', hint: 'La vie de l’agence', icon: 'sparkle' },
      { href: '/guides/', label: 'Guides pratiques', hint: 'Réponses aux questions fréquentes', icon: 'file' },
    ],
  },
  { href: '/contact/', label: 'Contact' },
];

/** Colonne « Services » du pied de page. */
export const FOOTER_SERVICES = [
  { href: '/estimation/', label: 'Estimation gratuite' },
  { href: '/vendre/', label: 'Vendre avec AUREA' },
  { href: '/gestion-locative/', label: 'Gestion locative' },
  { href: '/alerte/', label: 'Alerte nouveautés' },
  { href: '/prix-immobilier-mantes-la-jolie/', label: 'Prix immobilier à Mantes' },
  { href: '/guides/outils/', label: 'Nos outils' },
] as const;

/** Colonne « L’agence » du pied de page. */
export const FOOTER_AGENCY = [
  { href: '/agence/', label: 'Notre agence' },
  { href: '/equipe/', label: 'L’équipe' },
  { href: '/avis/', label: 'Avis clients' },
  { href: '/biens-vendus/', label: 'Nos réussites' },
  { href: '/actualites/', label: 'Actualités' },
  { href: '/guides/', label: 'Guides' },
  { href: '/contact/', label: 'Contact' },
] as const;

export const FOOTER_LEGAL = [
  { href: '/honoraires/', label: 'Nos honoraires' },
  { href: '/mentions-legales/', label: 'Mentions légales' },
  { href: '/confidentialite/', label: 'Politique de confidentialité' },
  { href: '/cgu/', label: 'Conditions générales d’utilisation' },
  { href: '/cookies/', label: 'Politique des cookies' },
  { href: '/plan-du-site/', label: 'Plan du site' },
] as const;

/* ------------------------------------------------- Informations manquantes */

/** Reprise du §19 du brief : sert la page /plan-du-site/ et l'audit de recette. */
export const MISSING_INFO = {
  'Bloquant — légal': [
    'Médiateur de la consommation : nom, adresse, site — reste « NC » partout',
    'Adresse email professionnelle pour le responsable de traitement RGPD',
    'Nom du directeur de la publication',
    'Trancher la contradiction sur le numéro RCS entre les mentions légales (931 635 924) et le barème des honoraires (909 023 830)',
    'Garantie financière : la non-détention de fonds déclarée au barème est incompatible avec l’encaissement de loyers en gestion locative',
    'Confirmer que la carte professionnelle CPI 9501 2024 000 000 031 et la RCP VERSPIEREN n° 41543943 sont toujours en vigueur',
  ],
  'Bloquant — SEO local': [
    'Coordonnées GPS exactes de la fiche Google Business Profile',
    'Horaires d’ouverture officiels, à aligner site / Google / annuaires',
    'URL de la fiche Google Maps et lien court « Demander des avis »',
    'Note, nombre d’avis Google et texte exact des 5 avis retenus',
    'Accès à la propriété Google Search Console existante',
    'URL des comptes Facebook et LinkedIn (Instagram et TikTok fournis)',
  ],
  'Bloquant — catalogue': [
    'Format et identifiants du flux passerelle Orisha (XML / Poliris / API)',
    'URL des visites virtuelles et vidéos drone (absentes du HTML actuel)',
    'Complément de scraping : pages 7 à 10 de products_selled.php',
  ],
  'Bloquant — sécurité et mise en production': [
    'Propriété des comptes Vercel, Supabase, registrar, Cloudflare et emailing au nom de l’agence',
    'Accès au DNS de aurea-immobilier.fr (bascule, SPF, DKIM, DMARC)',
    'Liste des utilisateurs du back-office et leur rôle',
    'Contrats de sous-traitance (DPA) signés',
    'Choix du service d’envoi d’emails transactionnels',
    'Durées de conservation validées par l’agence',
  ],
  'Nécessaire — contenu': [
    'Chiffres réels : délai moyen de vente, part de mandats exclusifs, ventes sur 12 mois',
    'Rôle exact de Zachary Denat',
    'Emails professionnels de Justine Vitry et Jill Thépaut',
    'Portrait photo de Jill Thépaut',
    'Validation du tri « photo réelle / visuel IA » sur le dossier images/',
    'Honoraires de gestion locative en % HT/TTC et garantie loyers impayés',
    'Données DVF par commune (prix médian au m², nombre de transactions, date)',
  ],
} as const;

/* ----------------------------------------------------------- Robots et IA */

/** Robots explicitement autorises (§11.8). */
export const AI_CRAWLERS = [
  'Googlebot',
  'Bingbot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'PerplexityBot',
  'ClaudeBot',
  'Claude-Web',
  'Google-Extended',
  'Applebot-Extended',
] as const;
