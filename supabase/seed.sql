-- Seed genere par scripts/extract-scraping.mjs — NE PAS EDITER A LA MAIN.
-- Source : scrapper_aurea (crawl du 2026-09-18). Donnees de depart et de secours ;
-- la source de verite en production est le flux Orisha (prompt v3 §4).

begin;

-- Communes -----------------------------------------------------------------
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('mantes-la-jolie', 'Mantes-la-Jolie', '78200', 4, 33) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('mantes-la-ville', 'Mantes-la-Ville', '78711', 1, 9) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('juziers', 'Juziers', '78820', 0, 3) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('limay', 'Limay', '78520', 0, 3) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('cergy', 'Cergy', null, 0, 3) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('l-isle-adam', 'L''Isle-Adam', null, 0, 2) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('porcheville', 'Porcheville', '78440', 0, 2) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('bonnieres-sur-seine', 'Bonnières-sur-Seine', '78270', 0, 2) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('arthies', 'Arthies', '95420', 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('andresy', 'Andrésy', '78570', 1, 0) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('le-cormier', 'Le Cormier', null, 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('mericourt', 'Méricourt', '78270', 1, 0) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('la-couture-boussey', 'La Couture-Boussey', null, 1, 0) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('chatou', 'Chatou', null, 1, 0) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('evreux', 'Évreux', null, 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('verneuil-sur-seine', 'Verneuil-sur-Seine', '78480', 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('maule', 'Maule', '78580', 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('pontoise', 'Pontoise', null, 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('eragny', 'Éragny', null, 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('illiers-l-eveque', 'Illiers-l''Évêque', null, 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('flacourt', 'Flacourt', '78200', 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('saint-cyr-en-arthies', 'Saint-Cyr-en-Arthies', null, 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('follainville-dennemont', 'Follainville-Dennemont', '78520', 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('vernon', 'Vernon', null, 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('gargenville', 'Gargenville', '78440', 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('bray-et-lu', 'Bray-et-Lû', null, 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('saint-remy-sur-avre', 'Saint-Rémy-sur-Avre', null, 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('montrouge', 'Montrouge', null, 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('aubergenville', 'Aubergenville', '78410', 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('les-mureaux', 'Les Mureaux', '78130', 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('jumeauville', 'Jumeauville', '78580', 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('maudetour-en-vexin', 'Maudétour-en-Vexin', null, 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('rosny-sur-seine', 'Rosny-sur-Seine', '78710', 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;
insert into public.communes (slug, name, postal_code, active_count, sold_count) values ('oinville-sur-montcient', 'Oinville-sur-Montcient', '78250', 0, 1) on conflict (slug) do update set name = excluded.name, postal_code = excluded.postal_code, active_count = excluded.active_count, sold_count = excluded.sold_count;

-- Conseillers --------------------------------------------------------------
insert into public.agents (slug, name, role, email, phone, bio, photo_file, legacy_id) values ('helene-vermeire-benz', 'Hélène Vermeire Benz', 'Directrice, présidente', 'helene.vermeire@aurea-immobilier.fr', '06 33 63 02 55', 'Diplômée d’un Master en Management de Patrimoine immobilier, avec une dizaine d’années d’expérience en France et à l’étranger, j’ai décidé de me lancer afin de vous offrir ma vision de l’immobilier. Ce métier est pour moi bien plus qu’un travail de commercial, notre champ d’action est vaste et doit être maîtrisé à la perfection afin que votre tranquillité reste intacte. À l’heure où le service client devient de plus en plus déplorable j’ai pour souhait de montrer que les choses peuvent changer et que le professionnalisme a encore de belles heures devant lui. Votre projet de vie, ma priorité !', 'helene-vermeire-benz-839239.jpg', '839239') on conflict (slug) do update set name = excluded.name, role = excluded.role, email = excluded.email, phone = excluded.phone, bio = excluded.bio, photo_file = excluded.photo_file;
insert into public.agents (slug, name, role, email, phone, bio, photo_file, legacy_id) values ('vincent-maume', 'Vincent Maume', 'Directeur associé, cofondateur', 'vincent.maume@aurea-immobilier.fr', '06 83 70 66 01', 'Fort d’une solide expérience en gestion d’agences et en accompagnement de projets immobiliers variés, j’ai choisi de co-fonder AUREA Immobilier avec une conviction simple mais essentielle : remettre l’humain et la qualité du service au cœur de chaque projet. Être conseiller immobilier, c’est avant tout comprendre un projet de vie, anticiper les besoins, sécuriser chaque étape et créer une relation de confiance durable. AUREA Immobilier, quand immobilier rime avec qualité', 'vincent-maume-839238.jpg', '839238') on conflict (slug) do update set name = excluded.name, role = excluded.role, email = excluded.email, phone = excluded.phone, bio = excluded.bio, photo_file = excluded.photo_file;
insert into public.agents (slug, name, role, email, phone, bio, photo_file, legacy_id) values ('oriane-cherel', 'Oriane Cherel', 'Négociatrice', 'oriane.cherel@aurea-immobilier.fr', '06 99 39 88 48', null, 'oriane-cherel-840371.jpg', '840371') on conflict (slug) do update set name = excluded.name, role = excluded.role, email = excluded.email, phone = excluded.phone, bio = excluded.bio, photo_file = excluded.photo_file;
insert into public.agents (slug, name, role, email, phone, bio, photo_file, legacy_id) values ('aimee-vaillant', 'Aimée Vaillant', 'Négociatrice', 'aimee.vaillant@aurea-immobilier.fr', '06 28 46 57 71', null, 'aimee-vaillant-847433.jpg', '847433') on conflict (slug) do update set name = excluded.name, role = excluded.role, email = excluded.email, phone = excluded.phone, bio = excluded.bio, photo_file = excluded.photo_file;
insert into public.agents (slug, name, role, email, phone, bio, photo_file, legacy_id) values ('justine-vitry', 'Justine Vitry', 'Négociatrice', null, '06 10 96 01 31', null, 'justine-vitry-839272.jpg', '839272') on conflict (slug) do update set name = excluded.name, role = excluded.role, email = excluded.email, phone = excluded.phone, bio = excluded.bio, photo_file = excluded.photo_file;
insert into public.agents (slug, name, role, email, phone, bio, photo_file, legacy_id) values ('natacha-laly', 'Natacha Laly', 'Négociatrice', null, '06 73 71 23 89', null, 'natacha-laly-natacha-laly.jpeg', '839273') on conflict (slug) do update set name = excluded.name, role = excluded.role, email = excluded.email, phone = excluded.phone, bio = excluded.bio, photo_file = excluded.photo_file;
insert into public.agents (slug, name, role, email, phone, bio, photo_file, legacy_id) values ('jill-thepaut', 'Jill Thépaut', 'Négociatrice', null, '06 73 26 93 38', null, 'jill-thepaut-jill.jpg', '869668') on conflict (slug) do update set name = excluded.name, role = excluded.role, email = excluded.email, phone = excluded.phone, bio = excluded.bio, photo_file = excluded.photo_file;
insert into public.agents (slug, name, role, email, phone, bio, photo_file, legacy_id) values ('evan-fernandes', 'Evan Fernandes', 'Négociateur', 'evan.fernandes@aurea-immobilier.fr', '06 68 42 59 73', null, 'evan-fernandes-839241.jpg', '839241') on conflict (slug) do update set name = excluded.name, role = excluded.role, email = excluded.email, phone = excluded.phone, bio = excluded.bio, photo_file = excluded.photo_file;
insert into public.agents (slug, name, role, email, phone, bio, photo_file, legacy_id) values ('marion-nicaise', 'Marion Nicaise', 'Gestionnaire locative', 'marion.nicaise@aurea-immobilier.fr', '06 24 71 07 39', null, 'marion-nicaise-marion.jpg', null) on conflict (slug) do update set name = excluded.name, role = excluded.role, email = excluded.email, phone = excluded.phone, bio = excluded.bio, photo_file = excluded.photo_file;

-- Biens (fiches completes) ------------------------------------------------
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (1013, '61507497', '1013-appartement-1-piece-s', 'Appartement 1 pièce(s)', 'rented', 'vente', 'appartement', 'juziers', null, null, null, null, null, 1, null, null, null, null, false, null, null, null, null, null, null, null, null, null, false, null, 'vincent-maume') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (1013, 0, 'appartement-1-piece-s-61507497a.jpg', 'Appartement  1 pièce(s) 1/6') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (1013, 1, 'appartement-1-piece-s-2-61507497b.jpg', 'Appartement  1 pièce(s) 2/6') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (1002, '61483159', '1002-appartement-lumineux-de-4-pieces-a-mantes-la-jolie', 'Appartement lumineux de 4 pièces à Mantes-la-Jolie', 'published', 'location', 'appartement', 'mantes-la-jolie', '78200', 1400, 'locataire', 80, null, 4, 3, 4, 2021, 'Collectif · Gaz · Radiateur', false, null, null, null, 'B', 'B', 51.4, 10.3, 400, 560, false, 'Vincent Maume, vous présente en exclusivité chez AUREA IMMOBILIER :
Situé à Mantes-la-Jolie, venez découvrir ce magnifique appartement de 4 pièces très lumineux qui sera vous séduire.
A proximité de toutes commodités et des transports, cet appartement est composé de;
- une entrée donnant sur couloir desservant 3 belles chambres, un WC, une salle de douche ainsi qu''une salle de bain.
- Un salon avec cuisine aménagée et équipée donnant sur une terrasse (côté cuisine) et un balcon (côté salon)
Une place de parking en sous-sol complète l''ensemble
Disponible à partir du 15 Octobre - Une visite s''impose, contactez-moi rapidement !
Loyer de base : 1115 euros par mois
Provision pour charges : 285 euros, soumise à régularisation annuelle (inclus chauffage, eau, entretien des communs, place de parking et ascenseur)
Honoraires charge locataire: 883 euros
dont:
Visite, constitution dossier, rédaction de bail: 640 euros
Etablissement état des lieux: 243 euros
Dépôt de garantie: 1115 euros
Afin de visiter ce bien, le dépôt d''un dossier complet est obligatoire, prenez contact avec moi par email afin que nous puissions faire le nécessaire ensemble !
Loyer 1 400 €/mois
charges comprises
dont charges récupérables: 285 €/mois
|
Honoraires charge locataire: 883 € TTC
dont honoraires d''état des lieux: 243 € TTC
|
Dépôt de garantie: 1 115 €
|
78200 MANTES LA JOLIE
|
Surface habitable: 80m²', 'vincent-maume') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (1002, 0, 'appartement-lumineux-de-4-piec-61483159a.jpg', 'Appartement lumineux de 4 pièces à Mantes-la-Jolie 1/10') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (1002, 1, 'appartement-lumineux-de-4-piec-61483159b.jpg', 'Appartement lumineux de 4 pièces à Mantes-la-Jolie 2/10') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (1002, 2, '61483159c.jpg', 'Appartement lumineux de 4 pièces à Mantes-la-Jolie 3/10') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (983, '61452626', '983-maison-familiale-8-pieces-mantes-la-ville', 'Maison familiale - 8 pièces - Mantes-la-Ville', 'published', 'vente', 'maison', 'mantes-la-ville', '78711', 370000, 'vendeur', 188, 749, 8, 6, null, 1900, 'Individuel · Pompe à chaleur air/eau · Radiateur', false, null, null, 2094, 'D', 'B', 248, 9, 3620, 4920, true, 'Oriane CHEREL, AUREA Immobilier, vous présente :
Idéalement située à Mantes-la-Ville, venez découvrir cette spacieuse maison familiale de 188 m² habitables, comprenant :
Au rez-de-chaussée : une entrée dessert un séjour lumineux, une salle à manger ainsi qu''une cuisine ouverte. Ce niveau comprend également une première chambre, une salle d''eau avec WC, des WC indépendants ainsi qu''une grande salle de jeux.
Au premier étage : un couloir dessert 5 chambres, une salle de bains ainsi que des WC indépendants.
Au sous-sol : une buanderie ainsi qu''un dressing viennent compléter les espaces de rangement de la maison.
Côté extérieur : vous profiterez d''un agréable jardin piscinable, d''une terrasse de plus de 27 m² ainsi que de deux garages indépendants.
LES PLUS :
- Beaux volumes
- Jardin piscinable
- Gare de Mantes-Station 5 min à pied (Future desserte du RER E)
- Centre-ville de Mantes-la-Jolie à 10 min à pied
- Toutes les commodités à moins de 5 min à pied
Une maison familiale aux volumes généreux, bénéficiant d''un emplacement privilégié permettant de profiter de toutes les commodités du quotidien à pied. Un bien idéal pour une grande famille à la recherche d''espace, d''un extérieur agréable et d''une excellente accessibilité.
N''attendez plus et venez découvrir votre futur lieu de vie !', 'oriane-cherel') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (983, 0, 'maison-familiale-8-pieces-mant-61452626a.jpg', 'MAISON FAMILIALE - 8 PIÈCES - MANTES LA VILLE 1/18') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (983, 1, 'maison-familiale-8-pieces-mant-61452626b.jpg', 'MAISON FAMILIALE - 8 PIÈCES - MANTES LA VILLE 2/18') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (983, 2, '61452626c.jpg', 'MAISON FAMILIALE - 8 PIÈCES - MANTES LA VILLE 3/18') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (983, 3, 'maison-favrieux-11-pieces-350m-60256759a.jpg', 'MAISON- FAVRIEUX - 11 Pièces  350m²') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (983, 4, 'maison-favrieux-11-pieces-350m-60256759b.jpg', 'MAISON- FAVRIEUX - 11 Pièces  350m² 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (983, 5, 'maison-follainville-dennemont-60974149a.jpg', 'MAISON - FOLLAINVILLE DENNEMONT - 6Pièces') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (983, 6, 'maison-follainville-dennemont-60974149b.jpg', 'MAISON - FOLLAINVILLE DENNEMONT - 6Pièces 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (983, 7, 'maison-rosny-sur-seine-6pieces-56344004a.jpg', 'MAISON - ROSNY SUR SEINE - 6Pièces') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (983, 8, 'maison-rosny-sur-seine-6pieces-56344004b.jpg', 'MAISON - ROSNY SUR SEINE - 6Pièces 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (967, '61190328', '967-appartement-2-pieces-47-54-m-a-juziers', 'Appartement 2 pièces 47.54 m² à Juziers', 'rented', 'vente', 'appartement', 'juziers', null, null, null, null, null, 2, null, null, null, null, false, null, null, null, null, null, null, null, null, null, false, 'Vincent Maume, AUREA IMMOBILIER, vous présente en exclusivité :
Situé dans une rue calme et proche de l''ensemble des commodités (transports, commerces, école...), venez découvrir ce magnifique appartement au dernier étage d''un ensemble immobilier entièrement refait à neuf à Juziers.
Dans une petite copropriété, cet appartement est composé d''une entrée donnant sur une cuisine ouverte et un salon, une chambre et d''une salle de bain avec WC.
Une place de parking privative complète l''ensemble.
N''attendez plus pour venir vous installer dans votre nouveau chez vous !
Loyer de base : 780 euros par mois
Provision pour charges : 60 euros, soumise à régularisation annuelle
Honoraires charge locataire: 618,02 euros
dont:
Visite, constitution dossier, rédaction de bail: 475,4 euros
Etablissement état des lieux: 142,62 euros
Dépôt de garantie: 780 euros', 'vincent-maume') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (967, 0, 'appartement-2-pieces-47.54-m2-61190328a.jpg', 'Appartement  2 pièces 47.54 m2 à JUZIERS 1/8') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (967, 1, 'appartement-2-pieces-47.54-m2-61190328b.jpg', 'Appartement  2 pièces 47.54 m2 à JUZIERS 2/8') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (938, '60992633', '938-joli-studio-a-mantes-la-jolie-de-28-m', 'Joli studio à Mantes-la-Jolie de 28 m²', 'published', 'vente', 'appartement', 'mantes-la-jolie', '78200', 90000, 'vendeur', 28.61, null, 1, 1, null, 1983, 'Individuel · Electrique · Radiateur', true, 17, 700, null, 'E', 'B', 294.3, 11, 660, 900, true, 'Vincent Maume, vous présente en exclusivité chez AUREA IMMOBILIER :
Situé à Mantes-la-Jolie, venez découvrir ce beau studio à proximité de la gare de Mantes-Station et à proximité de l''ensemble des commerces et écoles.
Il se compose de la manière suivante : entrée donnant sur la pièce de vie, cuisine, WC et salle de bain.
En extérieur, une terrasse privative ainsi qu''une place de parking complète l''ensemble.
Actuellement loué 570euros (charges comprises),.
Idéal pour investissement locatif.
N''hésitez pas à prendre contact avec moi rapidement pour plus d''informations !', 'vincent-maume') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (938, 0, 'joli-studio-a-mantes-la-jolie-60992633a.jpg', 'Joli studio à Mantes-la-Jolie de 28 m2 1/6') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (938, 1, 'joli-studio-a-mantes-la-jolie-60992633b.jpg', 'Joli studio à Mantes-la-Jolie de 28 m2 2/6') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (938, 2, '60992633c.jpg', 'Joli studio à Mantes-la-Jolie de 28 m2 3/6') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (938, 3, 'appartement-centre-ville-3piec-59174394a-2.jpg', 'APPARTEMENT - CENTRE VILLE - 3Pièces') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (938, 4, 'appartement-centre-ville-3piec-59174394b.jpg', 'APPARTEMENT - CENTRE VILLE - 3Pièces 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (938, 5, 'appartement-mantes-la-jolie-5-60257269a.jpg', 'Appartement Mantes La Jolie 5 pièces de 93,6 m2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (938, 6, 'appartement-mantes-la-jolie-5-60257269b.jpg', 'Appartement Mantes La Jolie 5 pièces de 93,6 m2 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (938, 7, 'appartement-t2-mantes-la-jolie-61181110a.jpg', 'APPARTEMENT T2 - MANTES LA JOLIE') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (938, 8, 'appartement-t2-mantes-la-jolie-61181110b.jpg', 'APPARTEMENT T2 - MANTES LA JOLIE 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (938, 9, 'appartement-mantes-la-jolie-ga-60962717a.jpg', 'APPARTEMENT - MANTES LA JOLIE - GARE') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (938, 10, 'appartement-mantes-la-jolie-ga-60962717b.jpg', 'APPARTEMENT - MANTES LA JOLIE - GARE 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (938, 11, 'appartement-limay-4pieces-61457529a.jpg', 'APPARTEMENT - LIMAY - 4Pièces') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (938, 12, 'appartement-limay-4pieces-2-61457529b.jpg', 'APPARTEMENT - LIMAY - 4Pièces 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (932, '60962717', '932-appartement-mantes-la-jolie-gare', 'Appartement - Mantes-la-Jolie - Gare', 'published', 'vente', 'appartement', 'mantes-la-jolie', '78200', 142000, 'vendeur', 50, null, 3, 2, 3, 1900, 'Individuel · Electrique · Radiateur', true, 8, 136, 774, 'D', 'B', 245, 9, 1150, 1590, true, 'Oriane CHEREL, AUREA Immobilier, vous présente en exclusivité :
Idéalement situé à deux pas de la gare de Mantes-la-Jolie, découvrez cet appartement de type T3, au dernier étage, comprenant :
Une entrée, un séjour, une cuisine ouverte, deux chambres, une salle d''eau et un WC indépendant.
Une grande cave complète ce bien.
LES PLUS :
- Emplacement recherché
- Gare et commerces accessibles à pied
- Appartement traversant
- Fenêtres en PVC double vitrage
- Bonne isolation
- Faibles charges de copropriété
Idéal pour un primo-accédant ou un investissement locatif.
Une belle opportunité à ne pas manquer ! Contactez-moi rapidement pour organiser une visite.', 'oriane-cherel') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (932, 0, 'appartement-mantes-la-jolie-ga-60962717a.jpg', 'APPARTEMENT - MANTES LA JOLIE - GARE 1/6') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (932, 1, 'appartement-mantes-la-jolie-ga-60962717b.jpg', 'APPARTEMENT - MANTES LA JOLIE - GARE 2/6') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (932, 2, '60962717c.jpg', 'APPARTEMENT - MANTES LA JOLIE - GARE 3/6') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (932, 3, 'appartement-a-mantes-la-jolie-61161077a.jpg', 'Appartement à Mantes-La-Jolie de 3 pièces (49m2)') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (932, 4, 'appartement-a-mantes-la-jolie-61161077b.jpg', 'Appartement à Mantes-La-Jolie de 3 pièces (49m2) 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (932, 5, 'appartement-centre-ville-3piec-59174394a-2.jpg', 'APPARTEMENT - CENTRE VILLE - 3Pièces') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (932, 6, 'appartement-centre-ville-3piec-59174394b.jpg', 'APPARTEMENT - CENTRE VILLE - 3Pièces 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (932, 7, 'appartement-limay-4pieces-61457529a.jpg', 'APPARTEMENT - LIMAY - 4Pièces') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (932, 8, 'appartement-limay-4pieces-2-61457529b.jpg', 'APPARTEMENT - LIMAY - 4Pièces 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (932, 9, 'joli-studio-a-mantes-la-jolie-60992633a.jpg', 'Joli studio à Mantes-la-Jolie de 28 m2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (932, 10, 'joli-studio-a-mantes-la-jolie-60992633b.jpg', 'Joli studio à Mantes-la-Jolie de 28 m2 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (932, 11, 'appartement-mantes-la-jolie-5-60257269a.jpg', 'Appartement Mantes La Jolie 5 pièces de 93,6 m2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (932, 12, 'appartement-mantes-la-jolie-5-60257269b.jpg', 'Appartement Mantes La Jolie 5 pièces de 93,6 m2 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (922, '60906460', '922-appartement-mantes-la-jolie-gare-2-pieces', 'Appartement - Mantes-la-Jolie - Gare - 2 pièces', 'sold', 'vente', 'appartement', 'mantes-la-jolie', null, null, 'vendeur', null, null, 2, null, null, null, null, false, null, null, null, null, null, null, null, null, null, false, 'Evan FERNANDES, AUREA Immobilier, vous propose :
À Mantes-la-Jolie, à quelques pas des commodités, dans une résidence de standing, un appartement 2 pièces de 36 m² comprenant :
Entrée, salon avec cuisine ouverte, chambre, salle d''eau et WC.
LES PLUS :
- Cave
- Place de parking
- Proximité de toutes commodités
Appartement en très bon état, à visiter sans plus attendre.', 'evan-fernandes') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (922, 0, 'appartement-mantes-la-jolie-ga-60906460a.jpg', 'APPARTEMENT - MANTES LA JOLIE - GARE - 2Pièces 1/6') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (922, 1, 'appartement-mantes-la-jolie-ga-60906460b.jpg', 'APPARTEMENT - MANTES LA JOLIE - GARE - 2Pièces 2/6') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (912, '60828276', '912-appartement-mantes-la-jolie-bords-de-seine-3-pieces', 'Appartement - Mantes-la-Jolie - Bords de seine - 3 pièces', 'sold', 'vente', 'appartement', 'mantes-la-jolie', null, null, 'vendeur', null, null, 3, null, null, null, null, false, null, null, null, null, null, null, null, null, null, false, 'Evan FERNANDES, AUREA Immobilier, vous propose :
À Mantes-la-Jolie, au coeur d''une résidence privée et verdoyante située en bord de Seine, découvrez cet appartement de type T3 comprenant :
Entrée, séjour lumineux ouvrant sur un balcon, cuisine aménagée et équipée, deux chambres, une salle de bains et WC indépendants.
EN ANNEXES :
- 2 place de stationnement en sous-sol
LES PLUS :
- Bus à 1 minutes à pieds
- Gare à 12 minutes en transports
- Espaces verts dans la copropriété
- Résidence récente avec belles prestations
Appartement en excellent état, à visiter sans attendre !', 'evan-fernandes') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (912, 0, 'appartement-mantes-la-jolie-bo-60828276a.jpg', 'APPARTEMENT - MANTES LA JOLIE - BORDS DE SEINE - 3Pièces 1/7') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (912, 1, 'appartement-mantes-la-jolie-bo-60828276b.jpg', 'APPARTEMENT - MANTES LA JOLIE - BORDS DE SEINE - 3Pièces 2/7') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (886, '60705368', '886-maison-arthies-6-pieces', 'Maison - Arthies - 6 pièces', 'rented', 'vente', 'appartement', 'arthies', null, null, null, null, null, 6, null, null, null, null, false, null, null, null, null, null, null, null, null, null, false, 'Hélène VERMEIRE BENZ, AUREA Immobilier, vous propose en exclusivité :
Au coeur du Vexin, dans un village calme et verdoyant une jolie maison de 150m² avec jardin exposé SUD comprenant :
AU REZ DE CHAUSSE
entrée, double salon séjour avec cheminée, cuisine indépendante, une chambre et WC indépendants
A L''ETAGE
Pièce palière desservant 3 chambres et une salle de bains avec WC.
EN ANNEXES
Un garage
N''attendez plus et venez la visiter !
Loyer de base : 1420 euros par mois
Provision pour charges : 30 euros, soumise à régularisation annuelle
Honoraires charge locataire: 1450 euros
dont:
Visite, constitution dossier, rédaction de bail: 1 000 euros
Etablissement état des lieux: 450 euros
Dépôt de garantie: 1 420 euros', 'marion-nicaise') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (886, 0, 'maison-arthies-6-pieces-60705368a.jpg', 'MAISON - ARTHIES - 6 Pièces 1/13') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (886, 1, 'maison-arthies-6-pieces-2-60705368b.jpg', 'MAISON - ARTHIES - 6 Pièces 2/13') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (876, '60655527', '876-immeuble-de-rapport-sur-mantes-la-jolie', 'Immeuble de rapport sur Mantes-la-Jolie', 'sold', 'vente', 'immeuble', 'mantes-la-jolie', null, null, 'vendeur', null, null, null, null, null, null, null, false, null, null, null, null, null, null, null, null, null, false, 'Vincent Maume, AUREA Immobilier, vous présente en exclusivité :
Au coeur du centre ville de Mantes-la-Jolie, à deux pas des commerces, écoles et transports, un immeuble de rapport composé de 3 appartements.
Appartement 1 : T2 loué 790 euros CC avec jardin
Appartement 2 : T2 loué 765 euros CC
Appartement 3 : T2 duplex loué 700 euros CC
3 caves privatives en sous-sol.
Revenus locatifs : 2255 euros
LES PLUS :
- Emplacement de qualité avec parking en face
- Bon profil de locataires
- Compteurs eau et électrique individuels
Un emplacement de qualité et aucun travaux à prévoir.
N''hésitez plus et contactez moi rapidement pour venir le visiter !', 'vincent-maume') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (876, 0, 'immeuble-de-rapport-sur-mantes-60655527a.jpg', 'Immeuble de rapport sur Mantes-la-Jolie 1/10') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (876, 1, 'immeuble-de-rapport-sur-mantes-60655527b.jpg', 'Immeuble de rapport sur Mantes-la-Jolie 2/10') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (871, '60609523', '871-appartement-3-pieces-andresy', 'Appartement - 3 pièces - Andrésy', 'published', 'vente', 'appartement', 'andresy', '78570', 200000, 'vendeur', 73.4, null, 3, 2, 2, 1980, 'Mixte · Electrique · Radiateur', true, 100, 2686.57, 1932, 'C', 'B', 169, 6, 1190, 1660, false, 'Oriane CHEREL, AUREA Immobilier, vous présente :
Idéalement situé à Andrésy, dans une résidence calme, proche de toutes les commodités et des transports, venez découvrir cet appartement de type F3 comprenant :
Entrée avec dressing, salon lumineux donnant accès à un balcon, cuisine, couloir avec rangements desservant deux chambres, un dressing, une salle de bains et des WC indépendants.
En annexe : une place de parking en sous-sol ainsi qu''une cave.
LES PLUS :
- Commerces et transports à moins de 10 minutes à pied
- Calme et lumineux
- Bonne performance énergétique
- Beaux espaces
- Stationnement facile au sein de la résidence
Appartement lumineux à proximité de toutes les commodités. N''attendez plus et venez le visiter !', 'oriane-cherel') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (871, 0, 'appartement-3-pieces-andresy-60609523a.jpg', 'APPARTEMENT - 3 PIÈCES - ANDRÉSY 1/9') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (871, 1, 'appartement-3-pieces-andresy-2-60609523b.jpg', 'APPARTEMENT - 3 PIÈCES - ANDRÉSY 2/9') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (871, 2, '60609523c.jpg', 'APPARTEMENT - 3 PIÈCES - ANDRÉSY 3/9') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (859, '60550074', '859-maison-le-cormier-5-piece-s-144-m', 'Maison Le Cormier 5 pièce(s) 144 m²', 'sold', 'vente', 'appartement', 'le-cormier', null, null, 'vendeur', null, null, 5, null, null, null, null, false, null, null, null, null, null, null, null, null, null, true, 'Natacha et Justine, AUREA Immobilier, vous présentent en exclusivité :
Située au coeur de Le Cormier à moins de 10 min de Pacy sur Eure ce pavillon à rénover intégralement .
Cela représente une belle opportunité pour les amateurs de travaux ou les investisseurs en quête de valorisation.
Le bien offre une base intéressante avec:
Au rez-de-chaussée : entrée, cuisine, séjour salon, 2 chambres, 1 WC et une salle de bain
À l''étage : 2 chambres et une salle de bain avec WC
Les + :
Sous sol total
Une opportunité rare pour créer un bien à votre image dans un secteur recherché.
N''attendez plus, venez la visiter ! Contactez nous au 0673712389 ou au 0610960131', 'natacha-laly') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (859, 0, 'maison-le-cormier-5-piece-s-14-60550074a.jpg', 'Maison Le Cormier 5 pièce(s) 144 m2 1/9') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (859, 1, 'maison-le-cormier-5-piece-s-14-60550074b.jpg', 'Maison Le Cormier 5 pièce(s) 144 m2 2/9') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (807, '60299040', '807-maison-mericourt-4-pieces', 'Maison - Méricourt - 4 pièces', 'published', 'vente', 'maison', 'mericourt', '78270', 200000, 'vendeur', 113, 585, 4, 2, null, 1959, 'Individuel · Pompe à chaleur air/eau · Radiateur', false, null, null, 1141, 'D', 'B', 210, 6, 1550, 2170, true, 'Oriane CHEREL, AUREA Immobilier, vous présente en exclusivité :
Idéalement située à Méricourt, charmante maison alliant parfaitement le cachet de l''ancien et le confort moderne, comprenant :
Au rez-de-chaussée : Un double séjour lumineux comprenant un magnifique superbe salon troglodyte, une cuisine aménagée et équipée, une buanderie ainsi qu''un WC indépendant.
À l''étage : Une belle pièce palière desservant deux chambres dont une spacieuse chambre de 19 m² avec balcon, une salle de bains et WC indépendant.
Au sous-sol : Une grande cave, offrant un bel espace de stockage avec un fort potentiel d''aménagement.
Côté extérieur : Vous profiterez d''un agréable jardin clos et facile d''entretien, comprenant une partie arborée, ainsi qu''une terrasse idéale pour les beaux jours.
Les plus :
- Pompe à chaleur
- Poêle à bois
- Aucun vis-à-vis
- Aucun travaux à prévoir
- Possibilité d''aménager la cave
- Bus à 3 minutes à pied, desservant les gares de Rosny-sur-Seine et Bonnières-sur-Seine
Une maison pleine de charme, rare sur le secteur, qui séduira les amateurs d''authenticité à la recherche d''un bien clé en main.
N''hésitez plus et contactez nous !', 'oriane-cherel') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (807, 0, 'maison-mericourt-4-pieces-60299040a.jpg', 'MAISON - MÉRICOURT - 4 PIÈCES 1/12') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (807, 1, 'maison-mericourt-4-pieces-2-60299040b.jpg', 'MAISON - MÉRICOURT - 4 PIÈCES 2/12') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (807, 2, 'maison-5-pieces-3-chambres-a-m-60185157a.jpg', 'Maison 5 pièces, 3 chambres à Mantes-la-Jolie') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (807, 3, 'maison-5-pieces-3-chambres-a-m-60185157b.jpg', 'Maison 5 pièces, 3 chambres à Mantes-la-Jolie 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (807, 4, 'maison-rosny-sur-seine-6pieces-56344004a.jpg', 'MAISON - ROSNY SUR SEINE - 6Pièces') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (807, 5, 'maison-rosny-sur-seine-6pieces-56344004b.jpg', 'MAISON - ROSNY SUR SEINE - 6Pièces 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (807, 6, 'maison-a-renover-mantes-la-jol-60706451a.jpg', 'Maison à rénover - Mantes-la-Jolie - 5 pièces') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (807, 7, 'maison-a-renover-mantes-la-jol-60706451c.jpg', 'Maison à rénover - Mantes-la-Jolie - 5 pièces 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (789, '60185157', '789-maison-5-pieces-3-chambres-a-mantes-la-jolie', 'Maison 5 pièces, 3 chambres à Mantes-la-Jolie', 'published', 'vente', 'maison', 'mantes-la-jolie', '78200', 249000, 'vendeur', 110, 880, 5, 3, null, 1950, 'Individuel · Gaz de ville · Radiateur', false, null, null, 1600, 'E', 'E', 272.3, 59, 2630, 3570, true, 'Vincent Maume et Zachary Denat vous présentent en exclusivité chez AUREA IMMOBILIER;
A deux pas du centre ville de Mantes la Jolie et proches de l''ensemble des commodités (transports, commerces, écoles...)
Venez découvrir cette belle maison composée de:
AU REZ DE CHAUSSEE
Entrée avec placards, séjour double/ salle à manger, cuisine aménagée et équipée, WC, une chambre.
AU PREMIER ETAGE
Deux chambres de plus de 15m2 avec une salle d''eau, une salle de bain et un WC.
EN ANNEXES :
Un sous-sol total avec espace garage et chaufferie/buanderie.
Côté extérieur :
Un très beau jardin de plus de 800m2 avec cabane pour ranger l''ensemble de vos outils.
La proximité des commodités du centre ville avec la tranquillité d''une petite rue calme, n''attendez plus et venez la découvrir.', 'vincent-maume') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (789, 0, 'maison-5-pieces-3-chambres-a-m-60185157a.jpg', 'Maison 5 pièces, 3 chambres à Mantes-la-Jolie 1/14') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (789, 1, 'maison-5-pieces-3-chambres-a-m-60185157b.jpg', 'Maison 5 pièces, 3 chambres à Mantes-la-Jolie 2/14') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (789, 2, '60185157c.jpg', 'Maison 5 pièces, 3 chambres à Mantes-la-Jolie 3/14') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (789, 3, 'maison-follainville-dennemont-60974149a.jpg', 'MAISON - FOLLAINVILLE DENNEMONT - 6Pièces') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (789, 4, 'maison-follainville-dennemont-60974149b.jpg', 'MAISON - FOLLAINVILLE DENNEMONT - 6Pièces 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (789, 5, 'maison-familiale-8-pieces-mant-61452626a.jpg', 'MAISON FAMILIALE - 8 PIÈCES - MANTES LA VILLE') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (789, 6, 'maison-familiale-8-pieces-mant-61452626b.jpg', 'MAISON FAMILIALE - 8 PIÈCES - MANTES LA VILLE 2') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (786, '60160723', '786-appartement-mantes-la-jolie-3-piece-s-57-92-m', 'Appartement Mantes-la-Jolie 3 pièce(s) 57.92 m²', 'sold', 'vente', 'appartement', 'mantes-la-jolie', null, null, 'vendeur', null, null, 3, null, null, null, null, false, null, null, null, null, null, null, null, null, null, true, 'Dimitri LEFEVRE, AUREA immobilier vous présente :
A seulement quelques pas du centre-ville , au 2ème étage d''une copropriété entretenue de 2016, appartement de type F3 avec balcon comprenant :
Entrée, séjour avec cuisine ouverte toute équipée, dégagement avec rangements, WC séparé, salle de bains et 2 chambres dont une avec rangements.
En annexes :
Un balcon de 5.33m² ainsi qu''une place de parking en sous-sol complète cet ensemble.
La proximité des commerces et des transports et sans aucun travaux à prévoir, n''attendez plus et venez le visiter !', 'aimee-vaillant') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (786, 0, 'appartement-mantes-la-jolie-3-60160723a.jpg', 'Appartement Mantes La Jolie 3 pièce(s) 57.92 m2 1/9') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (786, 1, 'appartement-mantes-la-jolie-3-60160723b.jpg', 'Appartement Mantes La Jolie 3 pièce(s) 57.92 m2 2/9') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (776, '60114296', '776-maison-plain-pied-la-couture-boussey-4-pieces-90-m', 'Maison plain-pied La Couture-Boussey 4 pièces 90 m²', 'published', 'vente', 'maison', 'la-couture-boussey', '27750', 199000, 'vendeur', 90, 1226, 4, 3, null, 2018, 'Individuel · Electrique · Radiateur', false, null, null, null, 'C', 'A', 126.2, 4.8, 890, 1220, true, 'Vincent Maume, en exclusivité chez AUREA IMMOBILIER vous présente:
Venez découvrir cette belle maison de type chalet sur la commune de LA COUTURE BOUSSEY.
Proche de l''ensemble des commodités et des transports, ses finitions et son terrain seront vous séduire !
Composée de : entrée donnant sur salon/salle à manger avec cuisine aménagée et équipée de 40m2, un débarras, 3 chambres, WC séparé et une salle d''eau incluant baignoire et cabine de douche.
En extérieur : un terrain de plus de 1200m2 en très grande partie constructible !
Les plus :
Terrain de 1200m2
Maison aux dernières normes
3 chambres
Proche des commodités et des transports
N''attendez plus et venez visiter votre futur chez vous !', 'vincent-maume') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (776, 0, 'maison-plain-pied-la-couture-b-60114296a.jpg', 'Maison plain-pied La Couture Boussey 4 pièces 90 m2 1/14') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (776, 1, 'maison-plain-pied-la-couture-b-60114296b.jpg', 'Maison plain-pied La Couture Boussey 4 pièces 90 m2 2/14') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (776, 2, '60114296c.jpg', 'Maison plain-pied La Couture Boussey 4 pièces 90 m2 3/14') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (649, '59514626', '649-maison-chatou-5-pieces-rer-a', 'Maison Chatou - 5 pièces - RER A', 'published', 'vente', 'maison', 'chatou', '78400', 850000, 'vendeur', 160, 426, 5, 3, null, 1930, 'Mixte · Gaz · Convecteurs', false, null, null, 1688, 'D', 'D', 220.8, 48, 3010, 4090, true, 'Hélène VERMEIRE BENZ, AUREA Immobilier, vous présente en exclusivité.
Au coeur d''un quartier résidentiel familial de CHATOU, proche des écoles, commerces et transports, maison de 160m² édifiée sur un terrain de 426m² comprenant :
AU REZ DE CHAUSSEE SUR ELEVEE
Vaste pièce de vie avec salon, salle à manger, cuisine aménagée et équipée et WC indépendants
EN REZ DE JARDIN
Suite parentale d''environ 50m² avec espace chambre, dressing, salle d''eau avec jacuzzi
A L''ETAGE
Palier desservant 2 chambres avec dressing et salle d''eau
Côté extérieur :
Un garage, une vaste terrasse un joli jardin ensoleillé
LES PLUS :
- RER A Chatou - Croissy 30 minutes à pieds
- Aucune mitoyenneté
- Ecoles publiques et privées à proximité
- Portail électrique
- Belle luminosité
Vous recherchez un quartier familial, une maison lumineuse et sans gros travaux, ne cherchez plus et venez la visiter !', 'helene-vermeire-benz') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (649, 0, 'maison-chatou-5pieces-rer-a-59514626a.jpg', 'MAISON CHATOU - 5Pièces - RER A 1/13') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (649, 1, 'maison-chatou-5pieces-rer-a-2-59514626b.jpg', 'MAISON CHATOU - 5Pièces - RER A 2/13') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (649, 2, '59514626c.jpg', 'MAISON CHATOU - 5Pièces - RER A 3/13') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (529, '59083377', '529-studio-refait-a-neuf-de-16-41-m-a-evreux', 'Studio refait à neuf de 16,41 m² à Évreux', 'rented', 'vente', 'appartement', 'evreux', null, null, null, null, null, null, null, null, null, null, false, null, null, null, null, null, null, null, null, null, false, 'Vincent Maume, AUREA IMMOBILIER, vous présente en exclusivité :
Situé dans une rue calme et proche de toutes les commodités, venez découvrir ce magnifique appartement au 1er étage de 16,41m2 à Evreux !
Dans une petite copropriété, cet appartement a entièrement été refait à neuf.
Il est composé d''une belle pièce de vie donnant sur un coin cuisine, une salle de douche avec WC ainsi qu''un beau balcon pour profiter de l''extérieur.
Une place de parking ainsi qu''une cave complète le tout.
N''attendez plus pour venir vous installer dans votre nouveau chez vous !
Loyer de base : 360 euros par mois
Provision pour charges : 120 euros, soumise à régularisation annuelle
Honoraires charge locataire: 191,85 euros
dont:
Visite, constitution dossier, rédaction de bail: 139,6 euros
Etablissement état des lieux: 52,35 euros
Dépôt de garantie: 410 euros
Afin de visiter ce bien, le dépôt d''un dossier complet est obligatoire, prenez contact avec moi par email afin que nous puissions faire le nécessaire ensemble !', 'vincent-maume') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (529, 0, 'studio-refait-a-neuf-de-16-41m-59083377a.jpg', 'Studio refait à neuf de 16,41m2 à Evreux 1/4') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (529, 1, 'studio-refait-a-neuf-de-16-41m-59083377b.jpg', 'Studio refait à neuf de 16,41m2 à Evreux 2/4') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (512, '58864209', '512-maison-verneuil-sur-seine-5-pieces', 'Maison - Verneuil-sur-Seine - 5 pièces', 'sold', 'vente', 'appartement', 'verneuil-sur-seine', null, null, 'vendeur', null, null, 5, null, null, null, null, false, null, null, null, null, null, null, null, null, null, true, 'Aimée VAILLANT, AUREA Immobilier, vous propose en exclusivité ;
Située sur les hauteurs de Verneuil sur Seine, cette agréable maison familiale vous offre,
AU REZ DE CHAUSSEE
Entrée, salon-séjour, lumineux et traversant avec poêle à granulés, cuisine aménagée et équipée, cellier et WC.
AU PREMIER ETAGE
Palier desservant 3 chambres, une salle de bains avec douche et baignoire et WC indépendants.
EN ANNEXES
Un garage attenant avec possibilité de garer d''autres véhicules dans l''allée
L''ensemble donnant sur un beau jardin.
Côté transport: Paris Saint Lazare à 30 min ligne J. L''arrivée prochaine de RER E renforcera encore l''accessibilité du secteur.
Une maison prête à accueillir votre famille alliant confort, économies d''énergie et qualité de vie.', 'aimee-vaillant') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (512, 0, 'maison-verneuil-sur-seine-5-pi-58864209a.jpg', 'MAISON - VERNEUIL SUR SEINE - 5 pIèces 1/12') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (512, 1, 'maison-verneuil-sur-seine-5-pi-58864209b.jpg', 'MAISON - VERNEUIL SUR SEINE - 5 pIèces 2/12') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (431, '58637843', '431-appartement-mantes-la-jolie-4-pieces', 'Appartement - Mantes-la-Jolie - 4 pièces', 'sold', 'vente', 'appartement', 'mantes-la-jolie', null, null, 'vendeur', null, null, 4, null, null, null, null, false, null, null, null, null, null, null, null, null, null, true, 'Evan FERNANDES, AUREA Immobilier, vous propose en exclusivité :
Bien vendu loué 1162 euros charges comprises.
Un appartement de type F4 situé à Mantes la Jolie dans le secteur du Val fourrée, proche des commerces et des écoles, comprenant :
Entrée, cellier, cuisine aménagée et équipée, séjour lumineux avec balcon, 3 chambres dont une avec accès sur le balcon, salle de bains et WC indépendants.
EN ANNEXES :
- Une cave
LES PLUS :
- Bus à 3 minutes à pieds
- Gare à 15 minutes en transports
- Façade extérieur récente
- A proximité des commodités
À visiter sans plus tarder !', 'evan-fernandes') on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (431, 0, 'appartement-mantes-la-jolie-4p-58637843a.jpg', 'APPARTEMENT - MANTES LA JOLIE -  4Pièces 1/8') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (431, 1, 'appartement-mantes-la-jolie-4p-58637843b.jpg', 'APPARTEMENT - MANTES LA JOLIE -  4Pièces 2/8') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listings (reference, legacy_products_id, slug, title, status, transaction_type, property_type, commune_slug, postal_code, price, fees_payer, living_area, land_area, rooms, bedrooms, floor_number, year_built, heating, is_condo, condo_lots, condo_annual_charges, property_tax, dpe_class, ges_class, dpe_value, ges_value, energy_cost_min, energy_cost_max, is_exclusive, description, agent_slug) values (356, '58305605', '356-maison-mantes-la-ville-110-m', 'Maison - Mantes-la-Ville - 110 m²', 'sold', 'vente', 'appartement', 'mantes-la-ville', null, null, 'vendeur', null, null, null, null, null, null, null, false, null, null, null, null, null, null, null, null, null, false, 'Zachary DENAT, Aurea immobilier vous propose :
Au sein d''un domaine privé composé de 7 habitations, découvrez ce bien d''exception offrant un cadre de vie calme, sécurisé et privilégié.
Au rez-de-chaussée :
- Une cuisine ouverte
- Un salon séjour spacieux et lumineux de 60m²
À l''étage :
- Deux chambres confortables
- Une salle d''eau
Les plus :
- Jardin de 250m2
- Une terrasse ensoleillée avec jardin
- Deux places de parking
- Une cave.
- Une piscine d''intérieur avec jacuzzi
Muni de 2 pompes à chaleur régulant chacune la température de l''eau et la température de l''air.
L''accès aux installations équestres : un box pour cheval, une carrière pour les entraînements et un pré
Plus qu''une maison, un style de vie.
Contactez-nous dès aujourd''hui pour organiser une visite !', null) on conflict (reference) do update set slug = excluded.slug, title = excluded.title, status = excluded.status, price = excluded.price, description = excluded.description;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (356, 0, 'maison-mantes-la-ville-110m2-58305605a.jpg', 'Maison - Mantes La Ville - 110m2 1/11') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;
insert into public.listing_photos (listing_reference, position, file_name, alt) values (356, 1, 'maison-mantes-la-ville-110m2-2-58305605b.jpg', 'Maison - Mantes La Ville - 110m2 2/11') on conflict (listing_reference, position) do update set file_name = excluded.file_name, alt = excluded.alt;

-- Biens archives (listes « nos reussites ») --------------------------------
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (966, 'Studio à Mantes-la-Ville de 26.71 m²', 'mantes-la-ville', 'rented', 27, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (869, 'Maison - Mantes-la-Jolie - Martraits - 6 pièces', 'mantes-la-jolie', 'sold', 104, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (802, 'Appartement 4 pièces de 71 m² à Mantes-la-Jolie', 'mantes-la-jolie', 'rented', 71, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (794, 'Appartement de 2 pièces sur Maule', 'maule', 'rented', 36, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (775, 'Appartement - Gare de paramain l''isle adam - 3 pièces', 'l-isle-adam', 'sold', 52, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (771, 'Studio de 30 m² avec jardin sur Mantes-la-Jolie', 'mantes-la-jolie', 'sold', 30, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (744, 'Appartement - Pontoise centre ville - 5 pièces', 'pontoise', 'sold', 80, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (741, 'Appartement 3 pièces Mantes-la-Ville', 'mantes-la-ville', 'rented', 62, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (726, 'Immeuble de rapport - Juziers', 'juziers', 'sold', 134, 'immeuble') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (681, 'Appartement - Gare - 3 pièces', 'l-isle-adam', 'sold', 52, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (672, 'Appartement 2 pièces à Éragny SUR OISE', 'eragny', 'sold', 41, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (671, 'Immeuble de rapport - Mantes-la-Ville - Gare', 'mantes-la-ville', 'sold', 160, 'immeuble') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (670, 'Appartement 2 pièces sur Limay', 'limay', 'rented', 36, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (667, 'Maison Illiers-l''Évêque 3 pièces 57 m²', 'illiers-l-eveque', 'sold', 57, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (627, 'Appartement 4 pièces 80 m² à Cergy', 'cergy', 'rented', 80, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (623, 'Maison Flacourt 7 pièce(s) 169 m²', 'flacourt', 'sold', 167, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (620, 'Maison - Saint-Cyr-en-Arthies - 6 pièces', 'saint-cyr-en-arthies', 'sold', 125, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (618, 'Appartement 2 pièces sur Mantes-la-Jolie', 'mantes-la-jolie', 'rented', 34, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (610, 'Maison - Limay - 4 pièces', 'limay', 'sold', 81, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (580, 'Maison - Follainville-Dennemont 5 pièces', 'follainville-dennemont', 'sold', 100, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (571, 'Maison Vernon 5 pièce(s) 120 m²', 'vernon', 'rented', 120, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (566, 'Maison 5 pièces 105 m²', 'porcheville', 'sold', 105, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (544, 'Appartement Mantes-la-Jolie 2 pièces', 'mantes-la-jolie', 'rented', 47, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (537, 'Appartement 2 pièces 39.69 m²', 'mantes-la-jolie', 'rented', 40, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (533, 'Appartement 2 pièces à Mantes-la-Jolie', 'mantes-la-jolie', 'rented', 32, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (528, 'Maison de 5 pièces 96 m² à Mantes-la-Ville', 'mantes-la-ville', 'rented', 96, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (527, 'APPARTEMENT Gargenville 5 pièces 123 m²', 'gargenville', 'sold', 123, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (526, 'Appartement F4 à Mantes-la-Jolie', 'mantes-la-jolie', 'sold', 71, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (523, 'Maison - Vexin - 5 pièces', 'bray-et-lu', 'sold', 101, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (513, 'Maison de ville - Porcheville', 'porcheville', 'sold', 88, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (511, 'Appartement Mantes-la-Jolie 3 pièce(s) 52 m²', 'mantes-la-jolie', 'rented', 51, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (505, 'Appartement Bonnières-sur-Seine 2 pièce 29.44 m²', 'bonnieres-sur-seine', 'rented', 29, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (502, 'Local commercial Mantes-la-Jolie sur 2 étages de 95 m²', 'mantes-la-jolie', 'rented', 95, 'local') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (499, 'Studio disponible à Mantes-la-Jolie', 'mantes-la-jolie', 'rented', 32, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (483, 'Studio - Mantes-la-Ville - 1 pièce', 'mantes-la-ville', 'sold', 37, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (470, 'Appartement Mantes-la-Jolie 3 pièces 70m²', 'mantes-la-jolie', 'sold', 70, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (453, 'Maison - Saint-Rémy-sur-Avre - 4 pièces', 'saint-remy-sur-avre', 'sold', 85, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (448, 'Appartement de 2 pièces avec balcon à Montrouge', 'montrouge', 'sold', 44, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (434, 'Appartement - Mantes-la-Jolie - Gare', 'mantes-la-jolie', 'sold', 69, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (433, 'Appartement - Mantes-la-Jolie - Centre ville - 4 pièces', 'mantes-la-jolie', 'sold', 76, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (417, 'Appartement - Aubergenville - Centre ville', 'aubergenville', 'sold', 82, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (413, 'Maison Mantes-la-Jolie 4 pièces avec jardin', 'mantes-la-jolie', 'rented', 92, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (410, 'MAISON - Mantes-la-Ville - 10 Pièces , Mantes-la-Ville', 'mantes-la-ville', 'sold', 147, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (395, 'Appartement - Limay - 3 pièces 65 m²', 'limay', 'sold', 65, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (376, 'Maison Cergy 4 pièces de 76,37 m²', 'cergy', 'sold', 76, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (368, 'Appartement de 2 pièces de 41 m² sur Mantes-la-Jolie', 'mantes-la-jolie', 'rented', 41, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (343, 'Bureaux Les Mureaux 1 pièce(s) 25.74 m²', 'les-mureaux', 'sold', 26, 'local') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (338, 'Appartement PREMIUM 4 pièces à Mantes-la-Jolie', 'mantes-la-jolie', 'rented', 88, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (337, 'Maison de ville Mantes-la-Jolie 3 pièces', 'mantes-la-jolie', 'rented', 68, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (324, 'Maison de 5 pièces disponible à la location !', 'jumeauville', 'rented', 80, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (289, 'Maison - Mantes-la-Ville - 6 pièces', 'mantes-la-ville', 'sold', 115, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (274, 'Appartement T3 sur Cergy (72 m²)', 'cergy', 'sold', 72, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (269, 'Appartement 2 pièces de 53.84 m² à Mantes-la-Jolie', 'mantes-la-jolie', 'rented', 54, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (251, 'Appartement - Mantes-la-Jolie - Gare - 4 pièces', 'mantes-la-jolie', 'sold', 87, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (241, 'Terrain constructible à Mantes-la-Ville', 'mantes-la-ville', 'sold', 507, 'terrain') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (221, 'Immeuble de rapport - Bonnières-sur-Seine - 4 appartements', 'bonnieres-sur-seine', 'sold', 140, 'immeuble') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (166, 'Parking / box Mantes-la-Jolie 15 m²', 'mantes-la-jolie', 'sold', 11, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (146, 'Maison de ville 125m² - Mantes-la-Jolie', 'mantes-la-jolie', 'sold', 125, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (139, 'Maison - Mantes-la-Jolie - Centre ville - 3 pièces', 'mantes-la-jolie', 'sold', 78, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (96, 'Maison - Maudétour-en-Vexin - 6 pièces', 'maudetour-en-vexin', 'sold', 159, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (81, 'Maison Rosny-sur-Seine 6 pièce(s) 120 m²', 'rosny-sur-seine', 'sold', 120, 'maison') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (59, 'Appartement - Mantes-la-Jolie - Centre ville - 5 pièces', 'mantes-la-jolie', 'sold', 91, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (58, 'Appartement - Mantes-la-Jolie - Bords de seine - 4 pièces', 'mantes-la-jolie', 'sold', 80, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (57, 'Appartement - Mantes-la-Jolie - 2 pièces', 'mantes-la-jolie', 'sold', 52, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (56, 'Appartement - Mantes-la-Jolie - Bords de seine - 2 pièces', 'mantes-la-jolie', 'sold', 41, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (39, 'Appartement - Mantes-la-Jolie - Centre ville - 4 pièces', 'mantes-la-jolie', 'sold', 77, 'appartement') on conflict (reference) do nothing;
insert into public.archived_listings (reference, title, commune_slug, status, area, property_type) values (36, 'Maison - Oinville-sur-Montcient - 8 pièces', 'oinville-sur-montcient', 'sold', 216, 'maison') on conflict (reference) do nothing;

commit;
