/**
 * Enregistrement d'un bloc de contenu, commun aux rubriques du registre.
 *
 * NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT.
 *
 * Point de sécurité : la clé envoyée par le formulaire n'est jamais reprise
 * telle quelle. Elle est cherchée dans le registre de LA rubrique appelante,
 * et rejetée si elle n'y figure pas. Sans ce contrôle, un formulaire de la
 * page « Avis » pourrait écrire le barème des honoraires en changeant un
 * champ caché.
 */
import { BLOCKS, type ContentBlock, type ContentGroup } from '~/lib/content-schema';
import { AdminDataError, adminDataReady, readDoc, writeDoc } from './admin-data';
import { publishMessage, publishSite } from './publish';

/** Nombre de lignes acceptées dans un champ de type liste. */
const MAX_LIGNES = 60;

export async function saveBloc(form: FormData, group: ContentGroup): Promise<string> {
  const cle = String(form.get('cle') ?? '').trim();
  const block = BLOCKS[group].find((b) => b.key === cle);
  if (!block) throw new AdminDataError('Bloc inconnu.', `cle hors rubrique ${group} : ${cle}`);

  const value: Record<string, unknown> = {};

  for (const field of block.fields) {
    const raw = String(form.get(field.name) ?? '');

    if (field.kind === 'liste') {
      const lignes = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l !== '')
        .slice(0, MAX_LIGNES)
        .map((l) => l.slice(0, 600));
      // Liste identique au repli, ou vide : on n'enregistre rien.
      const same =
        lignes.length === (field.fallbackList ?? []).length &&
        lignes.every((l, i) => l === field.fallbackList?.[i]);
      if (lignes.length && !same) value[field.name] = lignes;
      continue;
    }

    const texte = raw.replace(/\r\n/g, '\n').trim().slice(0, field.kind === 'paragraphe' ? 6000 : 300);
    // Case vidée, ou identique au repli : inutile de figer en base une valeur
    // qui est déjà celle du site. La rubrique reste marquée « d'origine ».
    if (texte !== '' && texte !== field.fallback) value[field.name] = texte;
  }

  await writeDoc(cle, value);
  return publishMessage(await publishSite());
}

export interface GroupPageState {
  blocks: ContentBlock[];
  notice: { text: string; ok: boolean } | null;
  saved: Record<string, Record<string, unknown> | null>;
  loadError: string | null;
}

/**
 * Tout ce qu'une page de rubrique a à faire : traiter un éventuel POST, puis
 * relire EN DIRECT les documents de la rubrique. Écrit une fois, partagé par
 * les six pages qui n'ont rien d'autre à dire.
 */
export async function groupPage(
  request: Request,
  group: ContentGroup,
  /** Corps déjà lu par la page appelante (il ne peut l'être qu'une fois). */
  form: FormData | null = null
): Promise<GroupPageState> {
  const blocks = BLOCKS[group];
  let notice: GroupPageState['notice'] = null;

  const data = request.method === 'POST' ? (form ?? (await request.formData())) : null;
  if (data && data.has('cle')) {
    try {
      notice = { text: await saveBloc(data, group), ok: true };
    } catch (error) {
      if (error instanceof AdminDataError) {
        if (error.internal) console.warn(`[admin/${group}]`, error.internal);
        notice = { text: error.message, ok: false };
      } else {
        console.warn(`[admin/${group}] erreur inattendue`, error);
        notice = { text: 'Enregistrement impossible.', ok: false };
      }
    }
  }

  let saved: GroupPageState['saved'] = {};
  let loadError: string | null = null;

  if (adminDataReady()) {
    try {
      const docs = await Promise.all(blocks.map((b) => readDoc(b.key)));
      saved = Object.fromEntries(blocks.map((b, i) => [b.key, docs[i]]));
    } catch (error) {
      loadError = error instanceof AdminDataError ? error.message : 'Lecture impossible.';
    }
  } else {
    loadError =
      'La base n’est pas configurée : renseignez SUPABASE_SECRET_KEY_CONTENT pour modifier cette rubrique.';
  }

  return { blocks, notice, saved, loadError };
}
