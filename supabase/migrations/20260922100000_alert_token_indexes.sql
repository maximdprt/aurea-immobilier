-- =============================================================================
-- AUREA Immobilier — index des jetons d'alerte
--
-- §20.3 : toute colonne servant de filtre porte un index. Les deux pages
-- atteintes depuis un email — /alerte/confirmation/ et /desabonnement/ —
-- retrouvent une inscription par l'EMPREINTE de son jeton, jamais par son
-- identifiant. Sans index, chaque clic dans un email provoque un parcours
-- complet de `alert_subscriptions`.
--
-- Index PARTIELS dans les deux cas : les colonnes sont nulles la plupart du
-- temps (`confirm_token_hash` est vide des que le jeton a servi), et un index
-- partiel ne porte que sur les lignes qu'on interroge reellement.
-- =============================================================================

create index if not exists alerts_confirm_token_idx
  on public.alert_subscriptions (confirm_token_hash)
  where confirm_token_hash is not null;

create index if not exists alerts_unsubscribe_token_idx
  on public.alert_subscriptions (unsubscribe_token_hash)
  where unsubscribe_token_hash is not null;
