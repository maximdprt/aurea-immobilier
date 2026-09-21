-- =============================================================================
-- Tests RLS (pgTAP) — executes en CI sur une base ephemere (`supabase test db`)
-- Prompt v3 §20.3 : chaque role x chaque table x chaque operation.
--
-- Ces tests sont bloquants avant tout merge sur `main`.
-- =============================================================================

begin;
select plan(24);

create extension if not exists pgtap with schema extensions;

-- -----------------------------------------------------------------------------
-- Jeu d'essai
-- -----------------------------------------------------------------------------

insert into public.communes (slug, name, postal_code)
values ('mantes-la-jolie', 'Mantes-la-Jolie', '78200');

insert into public.agents (id, slug, name, role)
values
  ('11111111-1111-1111-1111-111111111111', 'agent-un', 'Agent Un', 'Négociateur'),
  ('22222222-2222-2222-2222-222222222222', 'agent-deux', 'Agent Deux', 'Négociatrice');

insert into public.listings
  (reference, slug, title, status, transaction_type, property_type, commune_slug,
   exact_address, agent_id, agent_slug)
values
  (100, '100-publie', 'Bien publié', 'published', 'vente', 'maison', 'mantes-la-jolie',
   '12 rue Secrète', '11111111-1111-1111-1111-111111111111', 'agent-un'),
  (101, '101-brouillon', 'Bien en brouillon', 'draft', 'vente', 'maison', 'mantes-la-jolie',
   '9 impasse Privée', '11111111-1111-1111-1111-111111111111', 'agent-un');

insert into public.leads (id, type, firstname, lastname, email, consent_version, assigned_agent_id)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'contact', 'Alice', 'Martin',
   'alice@example.test', '2026-09-21', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'contact', 'Bruno', 'Petit',
   'bruno@example.test', '2026-09-21', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'gestion', 'Carole', 'Roux',
   'carole@example.test', '2026-09-21', null);

insert into public.alert_subscriptions (email) values ('veille@example.test');

-- -----------------------------------------------------------------------------
-- Toutes les tables exposees ont la RLS activee
-- -----------------------------------------------------------------------------

select is_empty(
  $$select tablename from pg_tables
    where schemaname = 'public'
      and tablename not in (select tablename from pg_tables where rowsecurity)$$,
  'RLS activée sur 100 % des tables du schéma public'
);

-- -----------------------------------------------------------------------------
-- Role anon
-- -----------------------------------------------------------------------------

set local role anon;

select is(
  (select count(*) from public.listings)::int, 1,
  'anon ne voit que le bien publié, jamais le brouillon'
);

select throws_ok(
  $$select exact_address from public.listings limit 1$$,
  '42501',
  null,
  'anon n''a aucun droit sur la colonne exact_address'
);

select throws_ok(
  $$select exact_lat from public.listings limit 1$$,
  '42501',
  null,
  'anon n''a aucun droit sur les coordonnées exactes'
);

select is_empty(
  $$select * from public.leads$$,
  'anon ne lit aucun lead'
);

select is_empty(
  $$select * from public.alert_subscriptions$$,
  'anon ne lit aucune inscription aux alertes'
);

select is_empty(
  $$select * from public.profiles$$,
  'anon ne lit aucun profil'
);

select throws_ok(
  $$insert into public.leads (type, firstname, lastname, email, consent_version)
    values ('contact', 'Spam', 'Bot', 'spam@example.test', 'x')$$,
  null, null,
  'anon ne peut insérer aucun lead'
);

select throws_ok(
  $$update public.listings set price = 1 where reference = 100$$,
  null, null,
  'anon ne peut modifier aucun bien'
);

select throws_ok(
  $$delete from public.listings where reference = 100$$,
  null, null,
  'anon ne peut supprimer aucun bien'
);

select throws_ok(
  $$insert into public.reviews (author, body, rating) values ('Faux', 'Avis inventé', 5)$$,
  null, null,
  'anon ne peut publier aucun avis'
);

select isnt_empty(
  $$select * from public.communes$$,
  'anon lit les communes'
);

select isnt_empty(
  $$select * from public.agents$$,
  'anon lit les conseillers'
);

reset role;

-- -----------------------------------------------------------------------------
-- Role agent, sans second facteur (aal1)
-- -----------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","app_role":"agent","aal":"aal1"}';

select is_empty(
  $$select * from public.leads$$,
  'un conseiller sans MFA ne voit AUCUN lead'
);

-- -----------------------------------------------------------------------------
-- Role agent, avec second facteur (aal2)
-- -----------------------------------------------------------------------------

insert into public.profiles (id, role, agent_id)
values ('33333333-3333-3333-3333-333333333333', 'agent', '11111111-1111-1111-1111-111111111111');

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","app_role":"agent","aal":"aal2"}';

select is(
  (select count(*) from public.leads)::int, 2,
  'un conseiller avec MFA voit ses leads et les leads non assignés, pas ceux d''un collègue'
);

select is_empty(
  $$select * from public.leads where email = 'bruno@example.test'$$,
  'un conseiller ne voit pas le lead assigné à un collègue'
);

select is(
  (select count(*) from public.listings)::int, 2,
  'un conseiller voit aussi les brouillons'
);

select throws_ok(
  $$delete from public.leads where email = 'alice@example.test'$$,
  null, null,
  'un conseiller ne peut pas supprimer un lead'
);

select throws_ok(
  $$update public.profiles set role = 'admin'
    where id = '33333333-3333-3333-3333-333333333333'$$,
  null, null,
  'un utilisateur ne peut pas s''octroyer le rôle admin'
);

select is_empty(
  $$select * from public.alert_subscriptions$$,
  'un conseiller ne lit pas les inscriptions aux alertes'
);

-- -----------------------------------------------------------------------------
-- Role rental_manager
-- -----------------------------------------------------------------------------

insert into public.profiles (id, role) values ('44444444-4444-4444-4444-444444444444', 'rental_manager');
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","app_role":"rental_manager","aal":"aal2"}';

select is(
  (select count(*) from public.leads)::int, 1,
  'la gestionnaire locative ne voit que les leads de type gestion'
);

select is(
  (select type from public.leads limit 1)::text, 'gestion',
  'le seul lead visible est bien de type gestion'
);

-- -----------------------------------------------------------------------------
-- Role admin
-- -----------------------------------------------------------------------------

insert into public.profiles (id, role) values ('55555555-5555-5555-5555-555555555555', 'admin');
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","app_role":"admin","aal":"aal2"}';

select is(
  (select count(*) from public.leads)::int, 3,
  'un admin avec MFA voit tous les leads'
);

select lives_ok(
  $$delete from public.leads where email = 'bruno@example.test'$$,
  'un admin peut supprimer un lead'
);

set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-555555555555","app_role":"admin","aal":"aal1"}';

select is_empty(
  $$select * from public.leads$$,
  'même un admin ne voit aucun lead sans second facteur'
);

reset role;
select * from finish();
rollback;
