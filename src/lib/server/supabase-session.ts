/**
 * Session Supabase Auth pour le back-office `/admin/` (§20.4).
 *
 * Equivalent Astro de `utils/supabase/server.ts` et du middleware Next.js du
 * guide Supabase : `@supabase/ssr` est agnostique du framework, on lui passe
 * simplement l'adaptateur de cookies d'Astro (`AstroCookies`).
 *
 * Regles du brief appliquees ici :
 *  - aucune inscription publique : les comptes sont crees par invitation ;
 *  - MFA TOTP obligatoire — la RLS exige `aal2`, l'interface ne fait que le
 *    refleter, elle ne le garantit pas ;
 *  - le JWT porte le role metier dans le claim `app_role`, alimente par un
 *    Custom Access Token Hook, ce qui evite une sous-requete par ligne.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { verifyAccessToken } from './jwt';

/*
 * On accepte les deux conventions de nommage : `PUBLIC_*`, requise par Astro
 * pour tout ce qui peut atteindre le navigateur, et les noms sans prefixe que
 * Supabase injecte automatiquement sur ses Edge Functions.
 */
const url =
  import.meta.env.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key =
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;

export type AppRole = 'admin' | 'agent' | 'rental_manager';

/**
 * Client lie a la session du visiteur : les requetes partent avec SON jeton,
 * donc sous SES politiques RLS. C'est ce client, et jamais la cle secrete, qui
 * sert le back-office.
 *
 * Astro expose les cookies un par un alors que `@supabase/ssr` veut la liste
 * complete : on la reconstruit depuis l'en-tete brut de la requete.
 */
export function sessionClient(
  request: Request,
  cookies: AstroCookies
): SupabaseClient | null {
  if (!url || !key) return null;

  const header = request.headers.get('cookie') ?? '';
  const parsed = header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf('=');
      return {
        name: part.slice(0, index),
        value: decodeURIComponent(part.slice(index + 1)),
      };
    });

  return createServerClient(url, key, {
    cookies: {
      getAll: () => parsed,
      setAll: (list) => {
        for (const { name, value, options } of list) {
          cookies.set(name, value, {
            ...(options as CookieOptions),
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
          });
        }
      },
    },
  });
}

export interface AdminSession {
  user: User;
  role: AppRole;
  /** `aal2` = second facteur validé. La RLS l'exige sur les tables de leads. */
  assuranceLevel: string;
}

/**
 * Renvoie la session du back-office, ou `null` si l'utilisateur n'est pas
 * connecte. La verification des droits reste faite en base : cette fonction
 * sert a afficher la bonne interface, pas a autoriser.
 */
export async function requireAdminSession(
  request: Request,
  cookies: AstroCookies
): Promise<AdminSession | null> {
  const supabase = sessionClient(request, cookies);
  if (!supabase) return null;

  /*
   * `getUser()` interroge le serveur d'authentification : c'est plus lent
   * qu'une verification locale, mais c'est le seul appel qui detecte une
   * session revoquee. Le §20.4 exige la revocation immediate quand un
   * collaborateur quitte l'agence, donc on le conserve ici.
   *
   * La verification locale par JWKS sert ensuite a lire les claims — role
   * metier et niveau d'assurance — sans appel supplementaire.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session } = await supabase.auth.getSession();
  const claims = await verifyAccessToken(session?.session?.access_token ?? null);

  const role = (claims?.app_role ??
    user.app_metadata?.app_role ??
    user.user_metadata?.app_role) as AppRole | undefined;

  if (!role) return null;

  // `aal` vient du jeton lui-meme ; en dernier recours on interroge l'API.
  let assuranceLevel = claims?.aal;
  if (!assuranceLevel) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    assuranceLevel = aal?.currentLevel ?? 'aal1';
  }

  return { user, role, assuranceLevel };
}
