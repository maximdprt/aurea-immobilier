/**
 * Registre des visuels remplaçables depuis le back-office.
 *
 * Une clé = un emplacement du site. Le pipeline images (`scripts/build-images.mjs`)
 * lit la table `media_assets` au build : quand une clé y figure, le fichier
 * téléversé remplace le visuel d'origine, avec les mêmes variantes AVIF/WebP.
 *
 * Les tailles minimales sont là pour que la photo reste nette sur un grand
 * écran : le back-office refuse un fichier trop petit plutôt que de publier
 * une image floue.
 *
 * Aucun secret : ce module est importable côté client et côté serveur.
 */

export interface MediaSpec {
  key: string;
  label: string;
  /** Où le visuel apparaît. */
  usage: string;
  /** Largeur minimale acceptée, en pixels. */
  minWidth: number;
  /** Hauteur minimale acceptée, en pixels. */
  minHeight: number;
  /** Format conseillé, affiché dans le back-office. */
  advice: string;
  /** Page où voir le résultat. */
  page: string;
}

/** Visuels éditoriaux fixes : un par emplacement. */
export const EDITORIAL_MEDIA: MediaSpec[] = [
  {
    key: 'editorial:hero-accueil',
    label: 'Grande photo de l’accueil',
    usage: 'Bandeau plein écran en haut de la page d’accueil.',
    minWidth: 1600,
    minHeight: 900,
    advice: 'Paysage, 1920 × 1080 px ou plus. Un intérieur lumineux ou une façade, sans texte incrusté.',
    page: '/',
  },
  {
    key: 'editorial:agence',
    label: 'Photo de l’agence',
    usage: 'Page « Notre agence », bloc « Notre histoire » et vignettes.',
    minWidth: 1200,
    minHeight: 800,
    advice: 'Paysage, 1600 × 1200 px conseillé. La vitrine ou l’intérieur des bureaux.',
    page: '/agence/',
  },
  {
    key: 'editorial:services',
    label: 'Photo « Vendre »',
    usage: 'Page « Vendre », bloc « Ce que nous mettons en œuvre ».',
    minWidth: 1024,
    minHeight: 680,
    advice: 'Paysage, 1600 × 1200 px conseillé.',
    page: '/vendre/',
  },
  {
    key: 'editorial:gestion-locative',
    label: 'Photo « Gestion locative »',
    usage: 'En-tête de la page « Gestion locative ».',
    minWidth: 1024,
    minHeight: 680,
    advice: 'Paysage, 1600 × 1200 px conseillé.',
    page: '/gestion-locative/',
  },
  {
    key: 'editorial:contact',
    label: 'Photo « Contact »',
    usage: 'Page contact.',
    minWidth: 994,
    minHeight: 550,
    advice: 'Paysage, 1600 × 900 px conseillé.',
    page: '/contact/',
  },
  {
    key: 'editorial:vitrine',
    label: 'Vitrine de l’agence',
    usage: 'Page « Notre agence », bloc « Nous trouver ».',
    minWidth: 800,
    minHeight: 600,
    advice: 'Paysage, 1200 × 900 px conseillé.',
    page: '/agence/',
  },
  {
    key: 'logo',
    label: 'Logo',
    usage: 'En-tête, pied de page, icônes du site.',
    minWidth: 600,
    minHeight: 300,
    advice: 'PNG avec fond transparent, 1200 px de large ou plus.',
    page: '/',
  },
];

export const editorialSpec = (key: string): MediaSpec | undefined =>
  EDITORIAL_MEDIA.find((m) => m.key === key);

/** Spécification d'un portrait de conseiller. */
export const agentSpec = (slug: string, name: string): MediaSpec => ({
  key: `agent:${slug}`,
  label: `Portrait de ${name}`,
  usage: 'Pages équipe, fiche conseiller, fiches des biens suivis.',
  minWidth: 600,
  minHeight: 750,
  advice: 'Portrait vertical, 1000 × 1250 px conseillé, visage dans le tiers supérieur.',
  page: `/equipe/${slug}/`,
});

/** Spécification d'une photo de bien. */
export const listingPhotoSpec = (reference: number, index: number): MediaSpec => ({
  key: `bien:${reference}:${index}`,
  label: `Photo ${index + 1} de la référence ${reference}`,
  usage: 'Fiche du bien, cartes des listes, image de partage.',
  minWidth: 1200,
  minHeight: 800,
  advice: 'Paysage, 1600 × 1200 px ou plus.',
  page: '',
});

/** Spécification de l'image de couverture d'une actualité. */
export const newsCoverSpec = (slug: string): MediaSpec => ({
  key: `actu:${slug}`,
  label: 'Image de couverture',
  usage: 'Liste des actualités et haut de l’article.',
  minWidth: 1200,
  minHeight: 675,
  advice: 'Paysage, 1600 × 900 px conseillé.',
  page: `/actualites/${slug}/`,
});

/** Vérifie la forme d'une clé, telle que la base la contraint. */
export const isMediaKey = (key: string): boolean =>
  /^[a-z]+(:[a-z0-9-]+){0,2}$/.test(key) && key.length >= 3 && key.length <= 120;

/** Retrouve la spécification d'une clé quelconque, si elle est connue. */
export function specFor(key: string, names: { agents?: Map<string, string> } = {}): MediaSpec | null {
  const fixed = editorialSpec(key);
  if (fixed) return fixed;
  const agent = key.match(/^agent:([a-z0-9-]+)$/);
  if (agent) return agentSpec(agent[1], names.agents?.get(agent[1]) ?? agent[1]);
  const listing = key.match(/^bien:(\d+):(\d+)$/);
  if (listing) return listingPhotoSpec(Number(listing[1]), Number(listing[2]));
  const news = key.match(/^actu:([a-z0-9-]+)$/);
  if (news) return newsCoverSpec(news[1]);
  return null;
}

/** Types de fichiers acceptés, et poids maximal (25 Mo, limite du bucket). */
export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
