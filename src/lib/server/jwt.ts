/**
 * Vérification locale des jetons Supabase via JWKS.
 *
 * Le projet utilise des clés asymétriques (ES256 — vérifié sur
 * `/auth/v1/.well-known/jwks.json`). La signature d'un jeton peut donc être
 * vérifiée **localement**, sans aller-retour vers le serveur d'authentification,
 * avec le jeu de clés publiques mis en cache par `jose`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Ce que cette vérification garantit, et ce qu'elle ne garantit PAS
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ✅ Le jeton a bien été émis par ce projet Supabase, n'a pas été altéré, et
 *    n'est pas expiré.
 *
 * ❌ Elle ne dit rien d'une session **révoquée**. Un compte désactivé conserve
 *    un jeton d'accès valide jusqu'à son expiration (une heure ici).
 *
 * Le §20.4 du brief exige la révocation immédiate quand un collaborateur quitte
 * l'agence. La vérification locale est donc utilisée pour lire rapidement les
 * claims, jamais comme seule autorisation : l'accès aux données reste décidé
 * par la RLS, côté PostgreSQL, qui revalide le jeton à chaque requête.
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const projectUrl =
  process.env.PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  import.meta.env.PUBLIC_SUPABASE_URL;

const jwksUrl =
  process.env.SUPABASE_JWKS_URL ??
  (projectUrl ? `${projectUrl}/auth/v1/.well-known/jwks.json` : undefined);

/** `createRemoteJWKSet` met les clés en cache et gère leur rotation. */
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;

export interface SupabaseClaims extends JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  /** Niveau d'assurance : `aal2` = second facteur validé. */
  aal?: string;
  /** Rôle métier, injecté par le Custom Access Token Hook. */
  app_role?: 'admin' | 'agent' | 'rental_manager';
  app_metadata?: Record<string, unknown>;
}

/**
 * Vérifie un jeton d'accès et renvoie ses claims, ou `null` si le jeton est
 * absent, mal signé, expiré ou émis par un autre projet.
 */
export async function verifyAccessToken(token: string | null): Promise<SupabaseClaims | null> {
  if (!token || !jwks || !projectUrl) return null;

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${projectUrl}/auth/v1`,
      // Supabase émet `aud: "authenticated"` pour un utilisateur connecté.
      audience: 'authenticated',
    });
    return payload as SupabaseClaims;
  } catch {
    // Jeton invalide : on ne distingue pas les causes côté appelant, pour ne
    // rien révéler d'exploitable.
    return null;
  }
}

/** Extrait le jeton porteur d'un en-tête `Authorization: Bearer …`. */
export const bearerToken = (request: Request): string | null => {
  const header = request.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
};

export const isJwtVerificationConfigured = (): boolean => Boolean(jwks);
