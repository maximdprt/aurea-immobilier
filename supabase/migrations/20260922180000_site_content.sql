-- =============================================================================
-- AUREA Immobilier — contenu editable depuis le back-office
--
-- Les textes des pages vivaient jusqu'ici en dur dans les fichiers `.astro`.
-- Cette table les accueille sous forme de documents JSON reperes par une cle
-- (`page.vendre.hero`, `agence.coordonnees`...). Le site les lit AU BUILD, et
-- retombe sur le texte ecrit dans le fichier quand la cle n'existe pas : une
-- base vide, ou injoignable, produit exactement le site actuel.
--
-- Aucun acces anonyme. L'ecriture passe par la cle serveur dediee
-- (SUPABASE_SECRET_KEY_CONTENT), depuis les routes du back-office uniquement,
-- jamais depuis le navigateur (§20.5).
-- =============================================================================

create table if not exists public.site_content (
  -- Cle hierarchique en minuscules : `rubrique.sous-partie.champ`.
  key text primary key
    check (key ~ '^[a-z0-9]+([.-][a-z0-9]+)*$' and char_length(key) between 3 and 120),
  value jsonb not null,
  -- Qui a enregistre : le back-office a code n'a pas de compte nominatif, on
  -- note donc le moyen d'acces ('code') et non une identite qu'on n'a pas.
  updated_by text not null default 'code',
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- Lecture publique : ce sont les textes affiches sur le site. Ils ne
-- contiennent aucune donnee personnelle — les demandes et les alertes restent
-- dans leurs tables, derriere leurs propres politiques.
drop policy if exists "content_public_read" on public.site_content;
create policy "content_public_read" on public.site_content
  for select to anon, authenticated
  using (true);

grant select on public.site_content to anon, authenticated;

-- Aucune ecriture accordee a anon ni a authenticated : l'enregistrement se
-- fait cote serveur avec la cle secrete, apres verification du code.

create index if not exists site_content_updated_idx on public.site_content (updated_at desc);

-- Horodatage automatique, comme les autres tables du schema.
drop trigger if exists site_content_touch on public.site_content;
create trigger site_content_touch before update on public.site_content
  for each row execute function private.touch_updated_at();
