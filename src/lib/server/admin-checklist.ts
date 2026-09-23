/**
 * Suivi de ce qui reste à faire avant la mise en ligne définitive.
 *
 * NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT.
 *
 * Une seule liste, trois sortes de tâches :
 *  - « auto »   : l'état est déduit du contenu ou de la configuration (note
 *                 Google saisie, barème rempli, variable présente…) — rien à
 *                 cocher, la tâche passe au vert d'elle-même ;
 *  - « manuel » : ce que seule l'agence peut confirmer (médiateur, DNS…) —
 *                 une case à cocher, mémorisée dans `site_content`
 *                 (document `admin.suivi`) ;
 *  - « réglé »  : ce qui a déjà été vérifié dans une source publique, avec la
 *                 source, pour garder la trace de ce qui a été établi.
 *
 * Le site public n'affiche jamais un « à fournir » : c'est ici, et seulement
 * ici, que le manque est visible.
 */
import { env } from './env';
import { adminDataReady, readDoc, writeDoc } from './admin-data';
import { readReviews } from './admin-reviews';
import { readAssets } from './admin-media';

export type TaskState = 'fait' | 'a-faire';

export interface Task {
  id: string;
  label: string;
  /** Pourquoi c'est nécessaire, et ce qu'il faut faire concrètement. */
  detail: string;
  /** Page du back-office où agir, le cas échéant. */
  href?: string;
  kind: 'auto' | 'manuel' | 'regle';
  state: TaskState;
  /** Tâche qui bloque la mise en ligne définitive. */
  blocking?: boolean;
}

export interface TaskGroup {
  title: string;
  tasks: Task[];
}

const DOC = 'admin.suivi';

interface Context {
  avis: Record<string, unknown> | null;
  honoraires: Record<string, unknown> | null;
  reviews: number;
  assets: Set<string>;
  ticked: Set<string>;
}

const filled = (v: unknown) => (typeof v === 'string' ? v.trim() !== '' : Array.isArray(v) && v.length > 0);

async function context(): Promise<Context> {
  if (!adminDataReady()) {
    return { avis: null, honoraires: null, reviews: 0, assets: new Set(), ticked: new Set() };
  }
  const [avis, honoraires, reviews, assets, suivi] = await Promise.all([
    readDoc('agence.avis').catch(() => null),
    readDoc('agence.honoraires').catch(() => null),
    readReviews().catch(() => []),
    readAssets().catch(() => new Map()),
    readDoc(DOC).catch(() => null),
  ]);
  const done = Array.isArray(suivi?.fait) ? (suivi!.fait as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  return { avis, honoraires, reviews: reviews.length, assets: new Set(assets.keys()), ticked: new Set(done) };
}

/** Définition des tâches, dans l'ordre d'affichage. */
function definitions(c: Context): TaskGroup[] {
  const has = (name: string) => Boolean(env(name));
  const auto = (ok: boolean): TaskState => (ok ? 'fait' : 'a-faire');
  const manual = (id: string): TaskState => (c.ticked.has(id) ? 'fait' : 'a-faire');

  return [
    {
      title: 'Légal — obligatoire avant la mise en ligne',
      tasks: [
        {
          id: 'mediateur',
          label: 'Adhérer à un médiateur de la consommation et me communiquer ses coordonnées',
          detail:
            'Obligation légale pour tout professionnel qui traite avec des particuliers. L’ancien site affiche toujours « NC ». Les fédérations (FNAIM, UNIS, SNPI) en proposent un à leurs adhérents ; sinon, un médiateur agréé par la CECMC. Il faut son nom, son adresse et son site.',
          kind: 'manuel',
          state: manual('mediateur'),
          blocking: true,
        },
        {
          id: 'cpi-rcp',
          label: 'Vérifier que la carte professionnelle et l’assurance RCP sont au nom d’AUREA IMMOBILIER',
          detail:
            'Carte CPI 9501 2024 000 000 031 et RCP VERSPIEREN n° 41543943 : elles proviennent du barème PDF, lui-même repris de la SAS MAUME VR. À contrôler sur la carte et l’attestation d’assurance, ou en cherchant « AUREA IMMOBILIER » dans le registre officiel des CCI : cci.fr › Trouver un professionnel de l’immobilier (la fiche indique aussi la garantie financière déclarée).',
          kind: 'manuel',
          state: manual('cpi-rcp'),
          blocking: true,
        },
        {
          id: 'garantie',
          label: 'Préciser la garantie financière',
          detail:
            'La gestion locative implique d’encaisser des loyers pour le compte des propriétaires, ce qui exige une garantie financière (organisme et montant). Le barème déclare au contraire ne détenir aucun fonds. Le registre des CCI (lien dans la tâche précédente) indique ce qui a été déclaré à la délivrance de la carte.',
          kind: 'manuel',
          state: manual('garantie'),
          blocking: true,
        },
        {
          id: 'bareme-pdf',
          label: 'Refaire le barème des honoraires au nom d’AUREA',
          detail:
            'Le PDF d’origine portait le RCS 909 023 830 (MAUME VR) : il a été retiré. La page Honoraires affiche désormais le barème saisi ici, avec les mentions d’AUREA, et son bouton « Imprimer ou enregistrer en PDF » produit la version pour la vitrine. Complétez la location et la gestion, imprimez, affichez, puis cochez.',
          href: '/admin/honoraires/',
          kind: 'manuel',
          state: manual('bareme-pdf'),
          blocking: true,
        },
        {
          id: 'rgpd',
          label: 'Choisir l’adresse email des demandes RGPD',
          detail: 'À défaut, contact@aurea-immobilier.fr est indiquée dans la politique de confidentialité.',
          kind: 'manuel',
          state: manual('rgpd'),
        },
        {
          id: 'rcs',
          label: 'Numéro RCS : 931 635 924 (Pontoise)',
          detail: 'Réglé : le 909 023 830 du barème appartient à la SAS MAUME VR (Cergy). Source : annuaire-entreprises.data.gouv.fr.',
          kind: 'regle',
          state: 'fait',
        },
        {
          id: 'siege',
          label: 'Siège social et SIRET de l’agence',
          detail:
            'Réglé : siège au 2 route de la Grand Mare, 95420 Maudetour-en-Vexin ; agence de Mantes = établissement secondaire, SIRET 931 635 924 00026. Source : registre national des entreprises.',
          kind: 'regle',
          state: 'fait',
        },
        {
          id: 'directeur',
          label: 'Directrice de la publication',
          detail: 'Réglé : Hélène Vermeire Benz, présidente de la SAS (registre national des entreprises).',
          kind: 'regle',
          state: 'fait',
        },
      ],
    },
    {
      title: 'Avis et référencement local',
      tasks: [
        {
          id: 'note-google',
          label: 'Saisir la note Google, le nombre d’avis et le lien de la fiche',
          detail:
            'Tant qu’elle est vide, le site n’affiche aucune note. Relevez-la sur votre fiche Google Business (un annuaire indique 4,9/5 sur 56 avis, à confirmer).',
          href: '/admin/avis/',
          kind: 'auto',
          state: auto(filled(c.avis?.note) && filled(c.avis?.nombre)),
          blocking: true,
        },
        {
          id: 'avis',
          label: 'Ajouter au moins trois avis clients',
          detail: `Copiés mot pour mot depuis Google. ${c.reviews} avis saisi${c.reviews > 1 ? 's' : ''} pour l’instant ; la section reste masquée tant qu’il n’y en a aucun.`,
          href: '/admin/avis/',
          kind: 'auto',
          state: auto(c.reviews >= 3),
        },
        {
          id: 'fiche-google',
          label: 'Aligner la fiche Google Business sur le site',
          detail:
            'Même nom, même adresse (44 rue Nationale), même téléphone et mêmes horaires que le site. Toute différence pénalise le référencement local.',
          kind: 'manuel',
          state: manual('fiche-google'),
        },
        {
          id: 'search-console',
          label: 'Donner accès à la Google Search Console existante',
          detail:
            'La balise de validation de votre propriété actuelle a été reprise sur le nouveau site : elle restera validée après la bascule. Il reste à y déclarer le plan du site (https://www.aurea-immobilier.fr/sitemap-index.xml) le jour de la bascule.',
          kind: 'manuel',
          state: manual('search-console'),
        },
        {
          id: 'reseaux',
          label: 'Communiquer les pages Facebook ou LinkedIn de l’agence, si elles existent',
          detail: 'Aucune n’a été trouvée. Instagram et TikTok sont déjà reliés au site.',
          kind: 'manuel',
          state: manual('reseaux'),
        },
        {
          id: 'gps-horaires',
          label: 'Coordonnées GPS et horaires',
          detail:
            'Réglé : point officiel de la Base Adresse Nationale ; horaires identiques sur l’ancien site et les annuaires.',
          kind: 'regle',
          state: 'fait',
        },
      ],
    },
    {
      title: 'Contenu du site',
      tasks: [
        {
          id: 'bareme-location',
          label: 'Compléter le barème de location',
          detail: 'Visite, dossier, bail, état des lieux : part locataire et part bailleur. Affichage obligatoire.',
          href: '/admin/honoraires/',
          kind: 'auto',
          state: auto(filled(c.honoraires?.location)),
          blocking: true,
        },
        {
          id: 'bareme-gestion',
          label: 'Compléter le barème de gestion locative',
          detail: 'Taux de gestion courante en % HT et TTC, et la garantie loyers impayés si elle est proposée.',
          href: '/admin/honoraires/',
          kind: 'auto',
          state: auto(filled(c.honoraires?.gestion)),
          blocking: true,
        },
        {
          id: 'portrait-jill',
          label: 'Ajouter le portrait de Jill Thépaut',
          detail: 'Sa fiche affiche aujourd’hui l’ancienne photo de basse qualité.',
          href: '/admin/medias/#equipe',
          kind: 'auto',
          state: auto(c.assets.has('agent:jill-thepaut')),
        },
        {
          id: 'emails-equipe',
          label: 'Renseigner les emails de Justine Vitry et Jill Thépaut',
          detail: 'Sans email professionnel, leur fiche ne propose que le téléphone.',
          href: '/admin/equipe/',
          kind: 'manuel',
          state: manual('emails-equipe'),
        },
        {
          id: 'zachary',
          label: 'Décider si Zachary Denat figure dans l’équipe',
          detail:
            'Agent commercial indépendant (EI, SIREN 912 612 744) qui se présente comme « AUREA Immobilier » sur Instagram. Si oui : « Ajouter un conseiller » dans Équipe, puis son portrait.',
          href: '/admin/equipe/',
          kind: 'manuel',
          state: manual('zachary'),
        },
        {
          id: 'chiffres',
          label: 'Communiquer le délai moyen de vente et la part de mandats exclusifs',
          detail: 'Deux chiffres rassurants pour les vendeurs, publiés seulement s’ils sont vérifiables.',
          kind: 'manuel',
          state: manual('chiffres'),
        },
        {
          id: 'medias-biens',
          label: 'Fournir les liens des visites virtuelles et vidéos drone',
          detail: 'Ils s’afficheront sur les fiches des biens concernés.',
          kind: 'manuel',
          state: manual('medias-biens'),
        },
        {
          id: 'archives-dvf',
          label: 'Biens vendus et prix du marché',
          detail:
            'Réglé : les 127 transactions de l’ancien site sont reprises ; prix médians DVF 2024-2025 publiés pour 17 communes (mise à jour annuelle : npm run dvf).',
          kind: 'regle',
          state: 'fait',
        },
      ],
    },
    {
      title: 'Technique et mise en production',
      tasks: [
        {
          id: 'env-contenu',
          label: 'Clé du back-office et publication automatique',
          detail: 'SUPABASE_SECRET_KEY_CONTENT et VERCEL_DEPLOY_HOOK_URL.',
          kind: 'auto',
          state: auto(has('SUPABASE_SECRET_KEY_CONTENT') && has('VERCEL_DEPLOY_HOOK_URL')),
          blocking: true,
        },
        {
          id: 'env-formulaires',
          label: 'Formulaires reliés à la base',
          detail: 'SUPABASE_SECRET_KEY_FORMS et IP_HASH_SALT.',
          kind: 'auto',
          state: auto(has('SUPABASE_SECRET_KEY_FORMS') && has('IP_HASH_SALT')),
          blocking: true,
        },
        {
          id: 'env-email',
          label: 'Envoi des emails (Resend)',
          detail:
            'Sans lui, les demandes sont enregistrées mais vous ne recevez pas d’email, et l’alerte nouveautés ne peut pas confirmer les inscriptions. Créer un compte sur resend.com, vérifier le domaine, puis fournir EMAIL_API_KEY.',
          kind: 'auto',
          state: auto(has('EMAIL_API_KEY') && has('EMAIL_FROM') && has('EMAIL_TO_AGENCY')),
          blocking: true,
        },
        {
          id: 'env-turnstile',
          label: 'Anti-spam des formulaires (Cloudflare Turnstile)',
          detail: 'Créer un site sur dash.cloudflare.com › Turnstile, puis fournir la Site Key et la Secret Key.',
          kind: 'auto',
          state: auto(has('PUBLIC_TURNSTILE_SITE_KEY') && has('TURNSTILE_SECRET_KEY')),
        },
        {
          id: 'domaine',
          label: 'Relier le domaine aurea-immobilier.fr au nouveau site',
          detail:
            'Les domaines sont déjà rattachés au projet Vercel. Le jour de la bascule, chez Namebay (registrar actuel), remplacer UNIQUEMENT : l’enregistrement CNAME de « www » (aujourd’hui mojo46.immo-facile.com) par un A vers 76.76.21.21, et ajouter un A « @ » vers 76.76.21.21. Ne pas toucher aux enregistrements MX (Vadesecure) : ce sont vos emails. L’ancien site s’arrête à ce moment-là.',
          kind: 'manuel',
          state: manual('domaine'),
          blocking: true,
        },
        {
          id: 'comptes',
          label: 'Mettre les comptes au nom de l’agence',
          detail: 'Vercel, Supabase, registrar du domaine, Cloudflare, service d’emails.',
          kind: 'manuel',
          state: manual('comptes'),
        },
        {
          id: 'orisha',
          label: 'Obtenir l’accès au flux d’annonces Orisha',
          detail:
            'Format (XML, Poliris ou API) et identifiants. Tant qu’il n’est pas branché, les biens se modifient à la main dans la rubrique Biens.',
          kind: 'manuel',
          state: manual('orisha'),
        },
        {
          id: 'rgpd-contrats',
          label: 'Signer les contrats de sous-traitance (DPA) et valider les durées de conservation',
          detail: 'Vercel, Supabase et le service d’emails proposent un DPA standard à accepter en ligne.',
          kind: 'manuel',
          state: manual('rgpd-contrats'),
        },
        {
          id: 'comptes-demandes',
          label: 'Lister les personnes qui auront accès aux demandes reçues',
          detail: 'Chacune reçoit un compte nominatif avec double authentification.',
          href: '/admin/demandes/',
          kind: 'manuel',
          state: manual('comptes-demandes'),
        },
      ],
    },
  ];
}

export async function checklist(): Promise<TaskGroup[]> {
  return definitions(await context());
}

/** Identifiants des tâches cochables, pour valider une requête. */
export async function manualIds(): Promise<Set<string>> {
  const groups = definitions({ avis: null, honoraires: null, reviews: 0, assets: new Set(), ticked: new Set() });
  return new Set(groups.flatMap((g) => g.tasks.filter((t) => t.kind === 'manuel').map((t) => t.id)));
}

/** Coche ou décoche une tâche manuelle. */
export async function toggleTask(id: string, done: boolean): Promise<void> {
  const allowed = await manualIds();
  if (!allowed.has(id)) return;
  const current = await readDoc(DOC).catch(() => null);
  const list = new Set(Array.isArray(current?.fait) ? (current!.fait as string[]) : []);
  if (done) list.add(id);
  else list.delete(id);
  await writeDoc(DOC, { fait: [...list] });
}
