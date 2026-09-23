/**
 * Rendu d'un texte au « format simple » saisi dans le back-office :
 *
 *   ## Titre de section
 *   Un paragraphe. Une ligne vide sépare deux paragraphes.
 *   - un élément de liste
 *   **gras**, *italique*, [un lien](https://…)
 *
 * Tout est échappé AVANT d'être mis en forme : ce qui vient de la base est
 * une donnée, jamais du HTML. Aucune dépendance : le sous-ensemble est
 * volontairement petit, et donc prévisible pour la personne qui écrit.
 *
 * Importable partout (aucun secret, aucune entrée/sortie).
 */

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Seuls http(s), mailto et tel sont acceptés dans un lien. */
const safeHref = (url: string): string | null => {
  const trimmed = url.trim();
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed) && !/[\s"'<>]/.test(trimmed)) return trimmed;
  return null;
};

/** Mise en forme en ligne : gras, italique, liens. Le texte est déjà échappé. */
function inline(escaped: string): string {
  return escaped
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, url: string) => {
      const href = safeHref(url);
      if (!href) return label;
      const external = /^https?:\/\//i.test(href) ? ' rel="noopener"' : '';
      return `<a href="${href}"${external}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
}

export function renderSimpleMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(escapeHtml(paragraph.join(' ')))}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      out.push(`<ul>${list.map((l) => `<li>${inline(escapeHtml(l))}</li>`).join('')}</ul>`);
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(escapeHtml(heading[2]))}</h${level}>`);
      continue;
    }
    const item = line.match(/^[-*•]\s+(.+)$/);
    if (item) {
      flushParagraph();
      list.push(item[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return out.join('\n');
}

/** Texte brut (sans mise en forme), pour les meta descriptions et extraits. */
export const plainText = (source: string): string =>
  source
    .replace(/^#{2,3}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_]/g, '')
    .replace(/^[-•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
