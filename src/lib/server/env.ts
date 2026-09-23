/**
 * Lecture d'une variable d'environnement, des deux endroits où elle peut être.
 *
 * NE JAMAIS IMPORTER DEPUIS UN COMPOSANT CLIENT.
 *
 * Le piège, vérifié sur ce projet plutôt que supposé :
 *
 *  - sur Vercel, les variables du projet sont posées dans `process.env` ;
 *  - en développement, Astro (via Vite) charge `.env.local` dans
 *    `import.meta.env` et ne les recopie PAS dans `process.env`.
 *
 * Un module qui ne lit que `process.env` fonctionne donc en production et
 * paraît « non configuré » en local, même avec la variable correctement
 * renseignée — ce qui fait chercher le problème là où il n'est pas.
 *
 * L'ordre compte : `process.env` d'abord, pour qu'en production la valeur
 * réelle l'emporte toujours sur ce que le build aurait pu figer.
 */
export function env(name: string): string | undefined {
  const fromProcess = process.env[name];
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess;

  const meta = import.meta.env as unknown as Record<string, string | undefined>;
  const fromMeta = meta[name];
  return fromMeta !== undefined && fromMeta !== '' ? fromMeta : undefined;
}
