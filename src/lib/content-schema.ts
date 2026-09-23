/**
 * Ce qui est modifiable depuis le back-office, et avec quelle valeur par défaut.
 *
 * UNE SEULE définition sert trois choses :
 *  - le formulaire du back-office est engendré à partir d'ici ;
 *  - le site lit ces clés et retombe sur `fallback` quand rien n'est
 *    enregistré ;
 *  - la valeur de repli est donc écrite une fois, ici, et non dupliquée entre
 *    la page et le formulaire — où les deux finiraient par diverger.
 *
 * Ajouter un champ modifiable = ajouter une entrée ici, puis lire la clé dans
 * la page concernée avec `field()` / `fieldList()` / `fieldPairs()`.
 *
 * Convention des listes « à deux colonnes » (étapes, arguments) : une ligne
 * par entrée, les colonnes séparées par « | ». Exemple :
 *   Estimation argumentée | Quatre méthodes croisées, un avis de valeur écrit.
 *
 * Aucun secret : ce module est importable côté client.
 */

export type FieldKind = 'ligne' | 'paragraphe' | 'liste';

export interface ContentField {
  name: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  /** Texte affiché tant que rien n'est enregistré. */
  fallback: string;
  /** Pour `liste` : une entrée par ligne dans le formulaire. */
  fallbackList?: string[];
}

export interface ContentBlock {
  /** Clé du document dans `site_content`. */
  key: string;
  title: string;
  /** Page publique concernée, affichée pour se repérer. */
  page: string;
  intro?: string;
  fields: ContentField[];
}

/** Rubriques du back-office qui partagent le formulaire générique. */
export type ContentGroup = 'accueil' | 'textes' | 'coordonnees' | 'honoraires' | 'avis';

const ligne = (name: string, label: string, fallback: string, hint?: string): ContentField => ({
  name,
  label,
  kind: 'ligne',
  fallback,
  hint,
});

const para = (name: string, label: string, fallback: string, hint?: string): ContentField => ({
  name,
  label,
  kind: 'paragraphe',
  fallback,
  hint,
});

const liste = (name: string, label: string, fallbackList: string[], hint?: string): ContentField => ({
  name,
  label,
  kind: 'liste',
  fallback: '',
  fallbackList,
  hint,
});

const PAIRS_HINT = 'Une entrée par ligne : « Titre | Texte ».';

export const BLOCKS: Record<ContentGroup, ContentBlock[]> = {
  /* ------------------------------------------------------------ Accueil ---- */
  accueil: [
    {
      key: 'accueil.hero',
      title: 'Bandeau d’accueil',
      page: '/',
      intro: 'La première chose que voit un visiteur. Le titre doit dire en une phrase ce que fait l’agence et où.',
      fields: [
        ligne('titre', 'Titre', 'L’immobilier dans le Mantois, avec une agence qui prend le temps'),
        para(
          'sous_titre',
          'Sous-titre',
          'Vente, achat, location et gestion à Mantes-la-Jolie et alentours. Une estimation argumentée, des acquéreurs qualifiés et un seul interlocuteur du premier appel à la signature.'
        ),
        ligne('recherche_titre', 'Titre au-dessus du moteur de recherche', 'Que recherchez-vous ?'),
      ],
    },
    {
      key: 'accueil.intentions',
      title: 'Les trois entrées : acheter, vendre, louer',
      page: '/',
      fields: [
        ligne('acheter_titre', 'Acheter — titre', 'Acheter'),
        para('acheter_texte', 'Acheter — texte', 'Les maisons et appartements disponibles dans le Mantois, avec le prix honoraires inclus, le DPE et un conseiller joignable pour chaque visite.'),
        ligne('vendre_titre', 'Vendre — titre', 'Vendre'),
        para('vendre_texte', 'Vendre — texte', 'Une estimation gratuite et argumentée sous 48 h, un reportage photo professionnel et des acquéreurs qualifiés avant chaque visite.'),
        ligne('louer_titre', 'Louer & gérer — titre', 'Louer & confier'),
        para('louer_texte', 'Louer & gérer — texte', 'Les biens à louer du moment, et une gestion locative complète pour les propriétaires qui veulent des loyers encaissés sans les tracas.'),
      ],
    },
    {
      key: 'accueil.pourquoi',
      title: 'Pourquoi AUREA',
      page: '/',
      fields: [
        ligne('titre', 'Titre', 'Une agence indépendante, une méthode exigeante'),
        para('intro', 'Introduction', 'Créée en 2024 à Mantes-la-Jolie, AUREA applique le même niveau de service à un studio qu’à une maison de famille. Voici ce que cela change pour vous.'),
        liste(
          'arguments',
          'Arguments',
          [
            'Une estimation argumentée | Quatre méthodes croisées et un avis de valeur écrit : vous savez sur quoi repose le prix.',
            'Une présentation soignée | Reportage photo professionnel, visite virtuelle et vidéo par drone selon le bien.',
            'Des acquéreurs qualifiés | Budget, financement et calendrier vérifiés avant la visite, et un compte rendu après chacune.',
            'Un seul interlocuteur | Chaque conseiller a sa ligne directe. Vous n’aurez pas à réexpliquer votre dossier.',
          ],
          PAIRS_HINT
        ),
      ],
    },
    {
      key: 'accueil.etapes',
      title: 'Comment ça se passe',
      page: '/',
      fields: [
        ligne('titre', 'Titre', 'Vendre avec AUREA, en quatre étapes'),
        para('intro', 'Introduction', 'De l’estimation à la signature chez le notaire, vous savez à chaque moment où en est votre vente.'),
        liste(
          'etapes',
          'Étapes',
          [
            'Estimation | Visite sur place et avis de valeur écrit, gratuit et sans engagement, sous 48 h.',
            'Préparation | Diagnostics, conseils de présentation, reportage photo et visite virtuelle.',
            'Visites | Acquéreurs qualifiés en amont, compte rendu après chaque visite.',
            'Signature | Négociation, compromis et suivi des conditions suspensives jusqu’à l’acte.',
          ],
          PAIRS_HINT
        ),
      ],
    },
    {
      key: 'accueil.equipe',
      title: 'Bloc équipe',
      page: '/',
      fields: [
        ligne('titre', 'Titre', 'Des conseillers que vous pouvez appeler directement'),
        para('texte', 'Texte', 'Neuf professionnels installés 44 rue Nationale, chacun avec sa ligne directe. Vous parlez à la personne qui suit votre dossier, pas à un standard.'),
      ],
    },
    {
      key: 'accueil.cta',
      title: 'Bandeau final',
      page: '/',
      fields: [
        ligne('titre', 'Titre', 'Vous avez un projet ? Parlons-en.'),
        para('texte', 'Texte', 'Une estimation gratuite, une question sur un bien ou sur la gestion de votre logement : un conseiller vous répond sous 24 h ouvrées.'),
      ],
    },
  ],

  /* ------------------------------------------------- Textes des pages ---- */
  textes: [
    {
      key: 'site.identite',
      title: 'Identité',
      page: '/',
      fields: [
        ligne('slogan', 'Signature de l’agence', 'Quand immobilier rime avec qualité'),
        para(
          'pied_de_page',
          'Présentation courte (pied de page)',
          'Agence immobilière indépendante à Mantes-la-Jolie : vente, achat, location, estimation et gestion locative dans le Mantois.'
        ),
      ],
    },
    {
      key: 'page.agence',
      title: 'Notre agence',
      page: '/agence/',
      fields: [
        ligne('titre', 'Titre de la page', 'Une agence indépendante, au cœur de Mantes-la-Jolie'),
        para(
          'chapo',
          'Paragraphe d’introduction',
          'AUREA Immobilier a ouvert ses portes en août 2024, 44 rue Nationale. Le nom vient du latin aurea, « dorée » : une qualité d’exécution constante, quel que soit le montant de la transaction.'
        ),
        para(
          'histoire',
          'Notre histoire',
          'Fondée par Hélène Vermeire Benz et Vincent Maume, l’agence est née d’une conviction simple : remettre l’humain et la qualité du service au cœur de chaque projet immobilier.\n\nUne maison, un appartement, c’est un foyer et des projets de vie, pas une ligne dans un fichier. C’est pourquoi nous prenons le temps de comprendre chaque projet avant de parler de prix.',
          'Une ligne vide sépare deux paragraphes.'
        ),
        liste(
          'engagements',
          'Nos engagements',
          [
            'Une estimation argumentée | Quatre méthodes croisées, et l’explication de ce qui fait le prix.',
            'Une présentation soignée | Reportage photo professionnel, visite virtuelle, vidéo par drone selon le bien.',
            'Un réseau intégré | Courtiers, notaires, diagnostiqueurs, architectes, géomètres et paysagistes du secteur.',
            'Une assistance juridique | Sur les points de droit qui retardent ou font échouer une vente.',
            'Une forte part de mandats exclusifs | La confiance de nos vendeurs nous permet d’engager tous nos moyens sur chaque bien.',
          ],
          PAIRS_HINT
        ),
        para('equipe_intro', 'Introduction du bloc équipe', 'Une dizaine de personnes, un seul interlocuteur par projet. Chacun a sa ligne directe : vous n’aurez pas à réexpliquer votre dossier.'),
        para('partenaires_intro', 'Introduction du bloc partenaires', 'L’immobilier rassemble une multitude de métiers. Plutôt que de vous renvoyer vers des interlocuteurs que nous ne connaissons pas, nous les réunissons autour de l’agence.'),
      ],
    },
    {
      key: 'page.equipe',
      title: 'L’équipe',
      page: '/equipe/',
      fields: [
        ligne('titre', 'Titre de la page', 'L’équipe AUREA Immobilier'),
        para('chapo', 'Paragraphe d’introduction', 'Neuf professionnels, un bureau au 44 rue Nationale à Mantes-la-Jolie, et un principe simple : vous avez un interlocuteur, il connaît votre dossier.'),
      ],
    },
    {
      key: 'page.vendre',
      title: 'Vendre',
      page: '/vendre/',
      fields: [
        ligne('titre', 'Titre de la page', 'Vendre votre bien dans le Mantois'),
        para(
          'chapo',
          'Paragraphe d’introduction',
          'Une méthode identique pour un studio et pour une maison de famille : le même travail de préparation, de présentation et de sélection des acquéreurs.'
        ),
        liste(
          'etapes',
          'Les étapes de la vente',
          [
            'Estimation et avis de valeur | Visite sur place, relevé des caractéristiques, croisement de quatre méthodes, puis remise d’un avis de valeur écrit. Gratuit, sans engagement. | Sous 48 h après votre demande',
            'Mandat et préparation | Signature du mandat, dossier de diagnostics, conseils de présentation. Nous vérifions en amont ce qui bloquerait la vente : DPE, copropriété, servitudes, urbanisme. | Quelques jours',
            'Reportage et mise en marché | Photos professionnelles, visite virtuelle, vidéo par drone selon le bien, rédaction de l’annonce et diffusion sur les portails, notre site et notre fichier d’acquéreurs. | Sous une semaine après le mandat',
            'Visites et sélection | Nous qualifions les candidats avant la visite — budget, financement, calendrier — et vous rendons compte après chacune. | En continu',
            'Offre, compromis, signature | Négociation, vérification du plan de financement, compromis avec le notaire, suivi des conditions suspensives jusqu’à l’acte authentique. | Environ 3 mois entre compromis et acte',
          ],
          'Une étape par ligne : « Titre | Texte | Délai ».'
        ),
        liste(
          'moyens',
          'Ce que nous mettons en œuvre',
          [
            'Reportage photo professionnel | La qualité des photos décide du nombre de visites.',
            'Visite virtuelle | Filtre les curieux et fait venir des acquéreurs déjà convaincus.',
            'Vidéo par drone | Pour les biens dont l’environnement est un argument.',
            'Réseau intégré | Courtiers, notaires, diagnostiqueurs, architectes, géomètres et paysagistes.',
            'Assistance juridique | Sur les points de droit qui ralentissent une vente.',
            'Compte rendu après chaque visite | Vous savez ce qui plaît et ce qui bloque.',
          ],
          PAIRS_HINT
        ),
      ],
    },
    {
      key: 'page.estimation',
      title: 'Estimation',
      page: '/estimation/',
      fields: [
        ligne('titre', 'Titre de la page', 'Faites estimer votre bien, gratuitement'),
        para(
          'chapo',
          'Paragraphe d’introduction',
          'Un chiffre ne vaut que par la méthode qui le produit. Nous croisons quatre approches et nous vous expliquons sur quoi repose chacune d’elles. Un conseiller vous rappelle sous 48 h.'
        ),
        liste(
          'methodes',
          'Les quatre méthodes',
          [
            'Comparaison | Confrontation aux ventes réellement conclues sur des biens comparables du secteur, et non aux prix affichés dans les annonces.',
            'Sol et construction | Valeur du terrain à laquelle s’ajoute le coût de reconstruction, minoré de la vétusté. Utile sur les maisons individuelles.',
            'Capitalisation | Le bien est valorisé à partir du loyer qu’il produirait, rapporté au taux de rendement constaté localement.',
            'Actualisation | Projection des revenus futurs ramenés à leur valeur d’aujourd’hui. Réservée aux immeubles et aux biens de rapport.',
          ],
          PAIRS_HINT
        ),
      ],
    },
    {
      key: 'page.gestion',
      title: 'Gestion locative',
      page: '/gestion-locative/',
      fields: [
        ligne('titre', 'Titre de la page', 'Gestion locative : vos loyers encaissés, sans les tracas'),
        para(
          'chapo',
          'Paragraphe d’introduction',
          'Vous confiez votre bien, nous nous occupons de tout : trouver le bon locataire, encaisser les loyers, suivre les travaux et vous rendre compte. Un seul interlocuteur, joignable.'
        ),
        liste(
          'prestations',
          'Ce que comprend le mandat',
          [
            'Recherche et sélection du locataire | Diffusion, visites, vérification des pièces, analyse de solvabilité et choix du dossier avec vous.',
            'Rédaction du bail | Bail conforme, annexes obligatoires, dossier de diagnostics, notice d’information.',
            'États des lieux | Entrée et sortie, photos datées, comparatif contradictoire et chiffrage des dégradations.',
            'Encaissement des loyers | Appels de loyer, quittances, relances en cas de retard, procédure de recouvrement si nécessaire.',
            'Charges et régularisation | Provisions, régularisation annuelle sur justificatifs, répartition entre bailleur et locataire.',
            'Suivi des travaux | Devis, coordination des artisans, suivi du chantier et contrôle avant paiement.',
            'Déclarations et documents | Récapitulatif annuel pour votre déclaration de revenus fonciers.',
          ],
          PAIRS_HINT
        ),
        para('gestionnaire', 'Présentation de la gestionnaire', 'Marion suit l’ensemble des biens en gestion : c’est elle qui sélectionne les locataires, réalise les états des lieux et vous appelle quand une décision vous revient.'),
      ],
    },
    {
      key: 'page.acheter',
      title: 'Acheter',
      page: '/acheter/',
      fields: [
        ligne('titre', 'Titre de la page', 'Biens à vendre dans le Mantois'),
        para('chapo', 'Paragraphe d’introduction', 'Chaque prix est affiché honoraires inclus, avec le DPE et la partie qui prend les honoraires en charge. Un conseiller identifié vous accompagne à chaque visite.'),
      ],
    },
    {
      key: 'page.louer',
      title: 'Louer',
      page: '/louer/',
      fields: [
        ligne('titre', 'Titre de la page', 'Biens à louer dans le Mantois'),
        para('chapo', 'Paragraphe d’introduction', 'Loyer charges comprises, dépôt de garantie et honoraires affichés sur chaque annonce. Créez une alerte pour être prévenu des prochaines mises en location.'),
      ],
    },
    {
      key: 'page.contact',
      title: 'Contact',
      page: '/contact/',
      fields: [
        ligne('titre', 'Titre de la page', 'Nous contacter'),
        para('chapo', 'Paragraphe d’introduction', 'L’agence est ouverte au public 44 rue Nationale, en centre-ville de Mantes-la-Jolie. Vous pouvez passer, appeler ou écrire : nous répondons sous 24 heures ouvrées.'),
      ],
    },
    {
      key: 'page.alerte',
      title: 'Alerte nouveautés',
      page: '/alerte/',
      fields: [
        ligne('titre', 'Titre de la page', 'Soyez prévenu avant tout le monde'),
        para(
          'chapo',
          'Paragraphe d’introduction',
          'Les biens qui se vendent vite partent souvent avant d’avoir été vus. Dites-nous ce que vous cherchez : nous vous écrivons dès qu’un bien y correspond, et à ce moment-là seulement.'
        ),
      ],
    },
    {
      key: 'page.reussites',
      title: 'Nos réussites',
      page: '/biens-vendus/',
      fields: [
        ligne('titre', 'Titre de la page', 'Les biens que nous avons vendus et loués'),
        para('chapo', 'Paragraphe d’introduction', 'Depuis la création de l’agence en août 2024, ventes et locations dans le Mantois et ses environs. Chaque ligne est une transaction réellement conclue.'),
      ],
    },
    {
      key: 'page.avis',
      title: 'Avis clients',
      page: '/avis/',
      fields: [
        ligne('titre', 'Titre de la page', 'Ce que disent nos clients'),
        para('chapo', 'Paragraphe d’introduction', 'Nous reproduisons les avis tels qu’ils sont publiés sur Google, sans les retoucher ni les corriger. Chaque avis mentionne, quand c’est le cas, le conseiller qui a suivi le dossier.'),
      ],
    },
    {
      key: 'page.actualites',
      title: 'Actualités',
      page: '/actualites/',
      fields: [
        ligne('titre', 'Titre de la page', 'Les actualités de l’agence'),
        para('chapo', 'Paragraphe d’introduction', 'Nouveautés, ventes conclues, vie de l’agence et conseils du moment.'),
      ],
    },
    {
      key: 'page.guides',
      title: 'Guides',
      page: '/guides/',
      fields: [
        ligne('titre', 'Titre de la page', 'Guides et conseils immobiliers'),
        para('chapo', 'Paragraphe d’introduction', 'Des réponses précises, sourcées et signées par un membre de l’équipe. Chaque chiffre réglementaire renvoie à sa source officielle, et chaque page porte sa date de dernière révision.'),
      ],
    },
  ],

  /* --------------------------------------------- Coordonnées & horaires -- */
  coordonnees: [
    {
      key: 'agence.coordonnees',
      title: 'Coordonnées',
      page: '/contact/',
      intro:
        'Reprises dans l’en-tête, le pied de page, la page contact et les données structurées transmises à Google. Une incohérence avec la fiche Google Business pénalise le référencement local.',
      fields: [
        ligne('telephone', 'Téléphone affiché', '01 30 63 50 50'),
        ligne('telephone_e164', 'Téléphone au format international', '+33130635050', 'Sert aux liens « appeler ». Format +33… sans espaces.'),
        ligne('email', 'Email de contact', 'contact@aurea-immobilier.fr'),
        ligne('rue', 'Adresse', '44 rue Nationale'),
        ligne('code_postal', 'Code postal', '78200'),
        ligne('ville', 'Ville', 'Mantes-la-Jolie'),
      ],
    },
    {
      key: 'agence.horaires',
      title: 'Horaires d’ouverture',
      page: '/contact/',
      intro: 'Une ligne par créneau, telle qu’elle doit s’afficher. Doit correspondre exactement à la fiche Google.',
      fields: [
        liste(
          'lignes',
          'Horaires',
          [
            'Lundi : sur rendez-vous',
            'Du mardi au vendredi : 9h30–12h30 et 14h–19h',
            'Samedi : 9h30–12h30 et 14h–18h',
            'Dimanche : fermé',
          ],
          'Une ligne par entrée, par exemple « Du mardi au vendredi : 9h30–12h30 et 14h–19h ».'
        ),
      ],
    },
  ],

  /* ----------------------------------------------------------- Honoraires */
  honoraires: [
    {
      key: 'agence.honoraires',
      title: 'Barème',
      page: '/honoraires/',
      intro:
        'Le barème doit être identique à celui affiché en vitrine : son affichage est une obligation légale, et un écart entre les deux est sanctionnable.',
      fields: [
        ligne('en_vigueur', 'Barème en vigueur depuis le', '', 'Format JJ/MM/AAAA. Laissé vide, la date n’est pas affichée.'),
        liste(
          'vente',
          'Vente',
          [
            'Biens immobiliers à usage d’habitation | 6 % du prix de vente | minimum 10 000 € TTC',
            'Terrain non constructible | 10 % | —',
            'Terrain constructible | 10 % | —',
            'Parkings et box | 10 % | minimum 2 500 € TTC',
          ],
          'Une ligne par tranche : « Nature du bien | Taux ou forfait | Minimum ».'
        ),
        liste('location', 'Location', [], 'Une ligne par prestation : « Prestation | Part locataire | Part bailleur ».'),
        liste('gestion', 'Gestion locative', [], 'Une ligne par prestation : « Prestation | Honoraires ».'),
        para(
          'mention',
          'Mention affichée sous le barème',
          'Honoraires à la charge du vendeur sauf mention contraire sur l’annonce. Les frais de notaire ne sont pas inclus : ils ne nous reviennent pas.'
        ),
      ],
    },
  ],

  /* ---------------------------------------------------------- Avis Google */
  avis: [
    {
      key: 'agence.avis',
      title: 'Note Google',
      page: '/avis/',
      intro:
        'Ces valeurs sont relevées sur la fiche Google, et la date du relevé est affichée à côté de la note — c’est ce qui rend le chiffre vérifiable. Tant que la note est vide, le site n’affiche aucune note.',
      fields: [
        ligne('note', 'Note sur 5', '', 'Par exemple 4,9'),
        ligne('nombre', 'Nombre d’avis', '', 'Par exemple 127'),
        ligne('releve_le', 'Date du relevé', '', 'Format JJ/MM/AAAA'),
        ligne('url_fiche', 'Lien vers la fiche Google', ''),
        ligne('url_avis', 'Lien « laisser un avis »', ''),
      ],
    },
  ],
};

export const GROUP_LABELS: Record<ContentGroup, string> = {
  accueil: 'Page d’accueil',
  textes: 'Textes des pages',
  coordonnees: 'Coordonnées & horaires',
  honoraires: 'Honoraires',
  avis: 'Avis Google',
};

/** Retrouve un champ par sa clé de document et son nom. */
export function findField(docKey: string, name: string): ContentField | null {
  for (const blocks of Object.values(BLOCKS)) {
    const block = blocks.find((b) => b.key === docKey);
    if (block) return block.fields.find((f) => f.name === name) ?? null;
  }
  return null;
}

/** Tous les blocs, toutes rubriques confondues. */
export const allBlocks = (): ContentBlock[] => Object.values(BLOCKS).flat();

/** Découpe une ligne « a | b | c » en colonnes nettoyées. */
export const splitPair = (line: string): string[] => line.split('|').map((s) => s.trim());
