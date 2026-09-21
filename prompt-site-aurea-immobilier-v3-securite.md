# PROMPT — Refonte du site AUREA Immobilier, à partir du scraping de l'existant

> **Version 3** : reprend intégralement la v2 et ajoute l'architecture **Supabase (base de données, RLS) + Vercel (mise en production)**, tout le volet **sécurité** (§20) et les **pages légales complètes** — mentions légales, politique de confidentialité, CGU, cookies (§15.1 et §21).

> Version 2 du brief. Elle remplace `prompt-site-aurea-immobilier-seo-geo.md` : même objectif (SEO local + GEO + performance), mais **ancrée sur le scraping réel** du site actuel, réalisé le **18/09/2026** et stocké dans `scrapper_aurea/`.
> Tout ce qui était un `[[placeholder]]` dans la v1 et que le scraping permet de remplir a été rempli et marqué **✅ vérifié**. Ce qui reste `[[entre doubles crochets]]` n'est **pas** dans les données : ne l'invente jamais, laisse le placeholder visible et reporte-le en §19.

---

## 0. Ton rôle

Tu es à la fois lead développeur front-end, expert SEO local (Google Business Profile, pack local, SEO technique) et expert GEO (Generative Engine Optimization : être cité par Google AI Overviews / AI Mode, ChatGPT Search, Perplexity, Gemini, Claude). Tu refonds le site vitrine + catalogue d'annonces d'une agence immobilière indépendante **à partir d'un corpus de scraping déjà constitué**.

**Ordre de travail imposé — tu ne codes pas avant d'avoir livré ces 6 livrables d'analyse :**

1. **Rapport d'exploitation du scraping** : inventaire de ce qui est réutilisable / à réécrire / à jeter (§4), avec le tableau `référence ↔ products_id ↔ ancienne URL ↔ nouvelle URL`.
2. **Arborescence finale** avec le mot-clé principal de chaque page (§7).
3. **Table de redirections 301 complète**, générée depuis `scrapper_aurea/data/pages.csv` + `doublons.csv` + `erreurs.csv` (§10).
4. **Design token system** dérivé du logo réel (§14).
5. **Liste des informations manquantes** (§19).
6. **Dossier d'architecture sécurité** : schéma de la base Supabase, matrice des droits RLS par rôle et par table, liste des variables d'environnement par environnement Vercel, en-têtes HTTP de sécurité (§20).

Tu me montres ces 6 livrables, j'arbitre, **puis** tu construis.

---

## 1. Le corpus de scraping — ce que tu as réellement sous la main

Dossier racine : `scrapper_aurea/` (à la racine du dépôt, à côté de ce fichier).

```
scrapper_aurea/
  RAPPORT.md              rapport de crawl lisible (inventaire des 80 pages, contacts, erreurs)
  texte_complet.txt       246 Ko — tout le texte du site concaténé
  pages/                  160 fichiers : 80 pages × (.md lisible + .json structuré)
  images/                 277 fichiers réellement présents (photos biens, portraits, logo)
  files/                  nos-honoraires-385554.pdf (+ un doublon -2.pdf)
  data/
    site.json             index complet : métas, Hn, paragraphes, liens, images, JSON-LD, par page
    pages.csv             80 lignes — url ; titre ; description ; mots ; images ; liens_internes ; fichier_md
    images.csv            773 lignes — url ; alt ; fichier_local ; octets ; pages_utilisant
    fichiers.csv          6 lignes — PDF et documents
    liens_externes.csv    76 lignes — url ; occurrences
    doublons.csv          144 lignes — url_ignoree ; identique_a   ⚠️ mine d'or SEO, voir §3
    erreurs.csv           18 lignes — url ; erreur (toutes des 404)
    medias.csv            vide (aucune vidéo / visite virtuelle détectée dans le HTML) ⚠️
```

**Chiffres du crawl (✅ vérifiés — source : `RAPPORT.md` + `data/site.json`)**
- 80 pages récupérées, profondeur max 3 — 56 905 mots au total
- 772 images téléchargées sur 773 (135,8 Mo) — 277 fichiers uniques après déduplication
- 5 fichiers sur 6 téléchargés — 18 erreurs, **toutes des 404**
- Date du crawl : **2026-09-18 09:08**

### Comment lire un fichier de page

Chaque page existe en deux formats, à utiliser différemment :

| Fichier | Usage |
|---|---|
| `pages/<slug>.md` | lecture humaine et extraction rapide : H1–H4, contenu texte nettoyé (menus/footer retirés), listes, images avec alt, liens internes/externes, contacts |
| `pages/<slug>.json` | **source de vérité pour le code** : `meta` (title, description, robots, og:*, canonical), `titres[]`, `paragraphes[]`, `listes[]`, `tableaux[]`, `texte_principal`, `texte_integral`, `images[{url,alt,title}]`, `liens_internes[]`, `liens_externes[]`, `fichiers[]`, `emails[]`, `telephones[]`, `donnees_structurees[]` (JSON-LD d'origine), `statut`, `nb_mots` |

⚠️ **Encodage** : le site d'origine est en ISO-8859-1. Les `.json` contiennent des caractères mal décodés (`pi?ces`). Ouvre systématiquement en UTF-8, et **re-saisis les textes accentués à la main** plutôt que de les copier mécaniquement. C'est aussi l'origine des `&agrave;` visibles dans les descriptions de partage du site actuel.

### Répartition des 80 pages scrapées

| Type | Nb | Motif de nom de fichier |
|---|---|---|
| Fiches biens (uniques) | **21** | `pages/fiches-*.json` — plus 4 doublons avec paramètres `?cPath=…&products_id=…` |
| Listes annonces vente/location + pagination | 5 | `annonces-transaction*`, `catalog-annonce` |
| Archives « biens vendus/loués » | 7 pages sur 11 | `catalog-products_selled*` ⚠️ **pages 7 à 10 non scrapées** |
| Pages conseiller | 8 | `annonces-agent-<id>-<prenom-nom>` |
| Pages ville × type (`ville_bien`) | 6 | `ville_bien-<commune>__<type>__vente-*` |
| Pages fiche imprimable | 7 | `catalog-products_print-*` (aucune valeur, à ne pas reconstruire) |
| Formulaires contact pré-remplis | 8 | `catalog-contact_us-*` |
| Contenu / légal / outils | ~18 | `accueil`, `content-5-notre-agence`, `catalog-estimation`, `catalog-outils`, `catalog-news`, `catalog-mentions`, `catalog-gdpr`, `catalog-cookies-policy`, `catalog-cookies`, `catalog-site_plan`, `catalog-account` |

---

## 2. Faits vérifiés extraits du scraping

### 2.1 Identité et NAP

| Donnée | Valeur | Statut |
|---|---|---|
| Raison sociale | AUREA IMMOBILIER — SAS, capital 1 000 € | ✅ `pages/catalog-mentions.md` |
| SIRET | 931 635 924 00018 | ✅ idem |
| RCS | 931635924 — Pontoise | ✅ idem |
| TVA intra | FR30931635924 | ✅ idem |
| Adresse | 44 rue Nationale, 78200 Mantes-la-Jolie | ✅ `pages/catalog-mentions.md` (liste 6) + footer de toutes les pages |
| Téléphone | +33 1 30 63 50 50 | ✅ `telephones[]` de toutes les pages |
| Email public | contact@aurea-immobilier.fr | ✅ `RAPPORT.md` § Contacts |
| Hébergeur actuel | Orisha Real Estate SAS — 206 Bd Anatole France, 93200 Saint-Denis | ✅ mentions légales |
| Coordonnées GPS | [[à récupérer sur la fiche Google Business Profile]] (≈ 48.9903, 1.7143) | ❌ absent du scraping |
| Horaires | [[à confirmer avec l'agence — non trouvés en clair dans le HTML scrapé]] | ❌ |
| Note et nombre d'avis Google | [[à relever sur la fiche le jour de la mise en ligne]] | ❌ aucun avis dans le scraping |
| Réseaux sociaux | [[URL Facebook / Instagram / LinkedIn à demander]] | ❌ `liens_externes.csv` ne contient que des URL de *partage* (sharer.php, intent/tweet), pas de compte |

⚠️ **Nettoyage des téléphones** : le champ `telephones[]` des `.json` est bruité — il a capté le SIRET (`0931635924`), des numéros de simulateur (`0498181322`, `0528076433`, `0706887694`) et des libellés de calculatrice. **Seuls `+33 1 30 63 50 50` (agence) et `+33 6 83 70 66 01` (mobile trouvé sur une fiche) sont exploitables** ; valide-les auprès de l'agence avant publication.

### 2.2 Équipe (✅ 8 pages conseiller + portraits dans `images/`)

| Conseiller | ID ancien site | Email (scrapé) | Portrait disponible |
|---|---|---|---|
| Hélène Vermeire Benz — Directrice / Présidente | 839239 | helene.vermeire@aurea-immobilier.fr | `images/helene-vermeire-benz-839239.jpg` |
| Vincent Maume — Directeur associé, cofondateur | 839238 | vincent.maume@aurea-immobilier.fr | `images/vincent-maume-839238.jpg` |
| Oriane Cherel — Négociatrice | 840371 | oriane.cherel@aurea-immobilier.fr | `images/oriane-cherel-840371.jpg` |
| Justine Vitry — Négociatrice | 839272 | [[à demander]] | `images/justine-vitry-839272.jpg` |
| Natacha Laly — Négociatrice | 839273 | natachalaly.immo@gmail.com ⚠️ adresse perso | `images/natacha-laly-natacha-laly.jpeg` |
| Aimée Vaillant — Négociatrice | 847433 | aimee.vaillant@aurea-immobilier.fr | `images/aimee-vaillant-847433.jpg` |
| Jill Thépaut — Négociatrice | 869668 | [[à demander]] | ⚠️ `images/jill-thepaut-no-picture.svg` — **portrait manquant sur l'ancien site**, à faire photographier |
| Evan Fernandes — Négociateur | 839241 | evan.fernandes@aurea-immobilier.fr | `images/evan-fernandes-839241.jpg` |
| Marion Nicaise — Gestionnaire locative | pas de page | marion.nicaise@aurea-immobilier.fr | `images/marion-nicaise.png` |
| Zachary Denat | pas de page | zachary.denat@aurea-immobilier.fr | ❌ aucun portrait — cité uniquement dans la description du bien réf. 789 ; **rôle à confirmer** |

⚠️ Deux adresses personnelles fuient dans le code actuel : `vincentmaume@hotmail.fr` (trouvée sur une fiche bien et utilisée comme contact RGPD) et `natachalaly.immo@gmail.com`. **Les remplacer par des adresses @aurea-immobilier.fr** sur le nouveau site (§15).

### 2.3 Catalogue — 21 biens exploitables (✅ extraits des `pages/fiches-*.json`)

Mapping **référence agence ↔ `products_id` ↔ URL d'origine**. C'est la clé de voûte de la table 301 (§10) et du rapprochement avec le flux du logiciel métier.

| Réf | products_id | cPath | Statut | Prix | Titre d'origine |
|---|---|---|---|---|---|
| 356 | 58305605 | — (archivé) | Vendu | — | Maison - Mantes La Ville - 110m2 |
| 431 | 58637843 | — | Vendu | — | APPARTEMENT - MANTES LA JOLIE - 4Pièces |
| 512 | 58864209 | — | Vendu | — | MAISON - VERNEUIL SUR SEINE - 5 pIèces |
| 529 | 59083377 | — | Loué | — | Studio refait à neuf de 16,41 m² à Évreux |
| **649** | 59514626 | 4-40-26 | En ligne | 850 000 € | MAISON CHATOU - 5Pièces - RER A |
| **776** | 60114296 | 4-40-26 | En ligne | 199 000 € | Maison plain-pied La Couture-Boussey 4 pièces 90 m² |
| 786 | 60160723 | — | Vendu | — | Appartement Mantes-la-Jolie 3 pièces 57,92 m² |
| **789** | 60185157 | 4-40-26 | En ligne | 249 000 € | Maison 5 pièces, 3 chambres à Mantes-la-Jolie |
| **807** | 60299040 | 4-40-26 | En ligne | 200 000 € | MAISON - MÉRICOURT - 4 PIÈCES |
| 859 | 60550074 | — | Vendu | — | Maison Le Cormier 5 pièces 144 m² |
| **871** | 60609523 | 3-33-29 | En ligne | 200 000 € | APPARTEMENT - 3 PIÈCES - ANDRÉSY |
| 876 | 60655527 | — | Vendu | — | Immeuble de rapport sur Mantes-la-Jolie |
| 886 | 60705368 | — | Loué | — | MAISON - ARTHIES - 6 Pièces |
| 912 | 60828276 | — | Vendu | — | APPARTEMENT - MANTES LA JOLIE - BORDS DE SEINE - 3Pièces |
| 922 | 60906460 | — | Vendu | — | APPARTEMENT - MANTES LA JOLIE - GARE - 2Pièces |
| **932** | 60962717 | 3-33-29 | En ligne | 142 000 € | APPARTEMENT - MANTES LA JOLIE - GARE |
| **938** | 60992633 | 3-33-27 | En ligne | 90 000 € | Joli studio à Mantes-la-Jolie de 28 m² |
| 967 | 61190328 | — | Loué | — | Appartement 2 pièces 47,54 m² à Juziers |
| **983** | 61452626 | 4-40-26 | En ligne | 370 000 € | MAISON FAMILIALE - 8 PIÈCES - MANTES-LA-VILLE |
| **1002** | 61483159 | 3-32-37 | En ligne (location) | — | Appartement lumineux de 4 pièces à Mantes-la-Jolie |
| 1013 | 61507497 | — | Loué | — | Appartement 1 pièce |

**Décodage du `cPath`** (✅ déduit des fils d'Ariane, liste 5 de chaque `.md`) : `type-transaction-soustype`.
`3` = Appartements, `4` = Maisons · `32` = À louer, `33`/`40` = À vendre · 3ᵉ segment = sous-type (`26` Maison, `27` Studio T1, `29` 3 pièces, `37` 4 pièces).
Les fiches en `/fiches/_<products_id>/…` **sans cPath** sont les biens **archivés** (vendus/loués) : c'est le marqueur de statut le plus fiable du scraping.

**Champs disponibles par fiche** (à mapper 1:1 vers le nouveau modèle de données) : prix, référence, type, transaction, description longue, « Diagnostics énergétiques » avec fourchette de dépenses annuelles et années d'indexation, mention ERP + lien Géorisques, code postal, ville, mitoyenneté, accès bus, encadrement des loyers, taxe foncière, copropriété (oui/non, nb de lots, charges), surface, surface séjour, surface terrain, jardin, année de construction, forme de toiture, neuf/ancien, standing, état général, vis-à-vis, état extérieur, fenêtres, chauffage, honoraires et charge des honoraires, conseiller en charge.

### 2.4 Zone réelle d'activité (✅ extraite des 7 pages d'archives scrapées)

Occurrences par commune sur les biens vendus/loués : **Mantes-la-Jolie 33**, Mantes-la-Ville 9, Juziers 3, Limay 3, Cergy 3, L'Isle-Adam 2, Porcheville 2, Bonnières-sur-Seine 2, puis 1 chacune : Vernon, Rosny-sur-Seine, Pontoise, Maule, Flacourt, Éragny, Gargenville, Illiers-l'Évêque, Aubergenville, Saint-Rémy-sur-Avre, Oinville-sur-Montcient, Montrouge, Jumeauville, Bray-et-Lû, Saint-Cyr-en-Arthies, Follainville-Dennemont, Les Mureaux, Maudétour-en-Vexin, Verneuil-sur-Seine, Évreux, Le Cormier, Arthies.

⚠️ Comptage **partiel** : les pages 7 à 10 des archives n'ont pas été scrapées (§3.16). Recompte sur le corpus complet ou sur l'export du logiciel métier avant de figer la liste des pages communes.

Les 6 pages `ville_bien` que l'ancien site avait créées (donc les communes qu'il jugeait prioritaires) : Mantes-la-Jolie (appartement + maison), Mantes-la-Ville, Vienne-en-Arthies, Follainville-Dennemont, Bonnières-sur-Seine.

### 2.5 Volumétrie des archives

11 pages de `products_selled.php`, ~12 biens par page, 6 sur la dernière → **≈ 126 biens archivés**. C'est la valeur à utiliser (et à recouper avec l'agence) partout où la v1 disait « ~127 ».

---

## 3. Audit de l'existant — ce que le scraping révèle, et que la refonte doit corriger

Chacun de ces points est **sourcé dans les données**. Traite-les comme des exigences, pas comme des remarques.

1. **Duplication massive par chemins relatifs — le problème n°1.** `data/doublons.csv` contient **144 URL dupliquées**, dont **67 servant la page d'accueil** et 54 déjà signalées comme formes dupliquées. Le serveur répond 200 sur n'importe quel préfixe : `/annonces/annonces/transaction/Vente.html`, `/fiches/content/5/notre-agence.html`, `/content/5/account.php`… Le site génère donc une infinité d'URL indexables pour le même contenu. **Exigence** : routing strict, 404 sur tout chemin non déclaré, canonical absolue sur chaque page, aucun lien interne relatif ambigu.
2. **Le serveur sert le mauvais type de fichier.** `data/fichiers.csv` : le PDF des honoraires demandé en `/annonces/segments/…/385554.pdf` renvoie **un PNG**, en `/fiches/segments/…/385554.pdf` **un JPG**, en `/content/…` un échec. Même cause que le point 1. **Exigence** : un asset = une URL hachée immuable, `Content-Type` correct.
3. **18 URL en 404 encore liées depuis le site** (`data/erreurs.csv`) : `/estimation.php`, `/annonce.php`, `/account.php`, `/selection.php`, `/create_alerte_mail.php`, `/contact_us.php?form=1`, `?form=3`, `/content/1/notre-agence.html`, `/catalog/try`, et 6 variantes `/content/ville_bien/…`. **Exigence** : zéro lien interne cassé ; ces URL entrent dans la table 301 (§10).
4. **Métadonnées indigentes.** `data/pages.csv` : la description de l'accueil est littéralement « AUREA IMMOBILIER », reprise à l'identique sur au moins 15 pages ; le title de l'accueil est « immobilier | AUREA IMMOBILIER ». Les pages archives partagent toutes le même title tronqué. **Exigence** : title et meta description **uniques** sur 100 % des pages (§8).
5. **Deux H1 par fiche bien.** Dans `pages/fiches-*.json`, `titres[]` montre un `H1` répété (une fois en tête, une fois avant « Nous contacter »), et ce H1 contient un saut de ligne suivi de la ville en doublon. **Exigence** : un seul H1 par page.
6. **Titres d'annonces en majuscules et communes mal orthographiées** : « MAISON - MÉRICOURT - 4 PIÈCES », « MAISON - VERNEUIL SUR SEINE - 5 pIèces », « Vienne en arthies », « Bonnieres sur seine ». **Exigence** : casse normale, toponymes corrects avec traits d'union et accents, table de normalisation des communes appliquée à l'import.
7. **Encodage ISO-8859-1** → `&agrave;` dans les partages, accents cassés. **Exigence** : UTF-8 de bout en bout.
8. **Aucun média riche détecté** : `data/medias.csv` est **vide**. Les visites virtuelles et vidéos drone mises en avant commercialement ne sont pas embarquées dans le HTML du site actuel. **Exigence** : si l'agence en dispose, prévoir le champ dans le modèle de données ; sinon, ne pas promettre ce qui n'est pas livrable. [[URL des visites virtuelles / vidéos à demander]]
9. **Images déclarées générées par IA.** Les mentions légales indiquent que certaines images proviennent de **Gemini, immofacile, immowise, scout**. **Exigence critique** : aucune image du dossier `images/` ne doit être présentée comme une photo réelle d'un bien ou de l'agence sans validation de l'agence. Trie en trois lots — photos réelles de biens / portraits d'équipe / visuels génériques ou IA — et conserve la mention de transparence IA dans les mentions légales si des visuels IA sont réutilisés.
10. **Qualité des `alt`** : `data/images.csv` montre des `alt` du type « Maison 5 pièces, 3 chambres à Mantes-la-Jolie 1/14 », numérotés et non descriptifs, et un logo à **436 Ko en PNG**. **Exigence** : `alt` factuels et descriptifs, logo en SVG.
11. **Poids des images** : 135,8 Mo pour 772 fichiers, soit ~176 Ko en moyenne pour des vignettes. **Exigence** : pipeline AVIF + WebP, `srcset`, budget §6.
12. **Fuites d'adresses personnelles** : `vincentmaume@hotmail.fr` et `natachalaly.immo@gmail.com` présents dans le HTML public. **Exigence** : à supprimer.
13. **Mentions légales incomplètes** : « Assurance RCP : **NC** », « Nom du médiateur : **NC** », adresse et site du médiateur « NC », **aucun numéro de carte professionnelle CPI ni garant financier** trouvés. Irrégulier pour un agent immobilier. **Exigence** : §15.
14. **Contact RGPD = une adresse Hotmail personnelle** (`pages/catalog-gdpr.md`). **Exigence** : responsable de traitement joignable à une adresse professionnelle.
15. **Pages sans valeur à ne pas reconstruire** : `products_print.php` (7 pages scrapées), `contact_us.php?products_id=…` (8 pages), `catalog/try`. Elles diluent le crawl. **Exigence** : impression gérée en CSS `@media print`, contact géré par un formulaire pré-rempli côté client, sans URL indexable.
16. **Trou dans le corpus** : les pages 7 à 10 de `products_selled.php` n'ont pas été crawlées. Si le contenu des archives doit être repris, **complète le scraping sur ces 4 URL** avant de générer les pages « biens vendus ».

---

## 4. Règles d'exploitation des assets scrapés

### Textes
- **Réécris tout**, ne recopie jamais. Le corpus sert de source de faits (surfaces, prix, équipements, quartiers), pas de source de style.
- Corrige les fautes présentes dans `texte_complet.txt` : « Fière de notre métier », « tout à chacun », « aux services de tous », « limmobilier » (apostrophe perdue à l'encodage), « 5 pIèces ».
- Les **descriptions de biens** appartiennent à l'agence : tu peux les reformuler, mais **aucun fait chiffré ne doit changer** (surface, prix, année, DPE, taxe foncière, honoraires).
- Les **textes légaux** (`catalog-gdpr.md` 1 993 mots, `catalog-mentions.md` 818, `catalog-cookies-policy.md` 953) sont à reprendre comme base puis à compléter (§15) — pas à réinventer.

### Images
- Source : `scrapper_aurea/images/` (277 fichiers) + index `data/images.csv` (`url ; alt ; fichier_local ; octets ; pages_utilisant`). La colonne `pages_utilisant` donne le rattachement image → bien.
- Convention de nommage du scraper : `<slug-du-bien>-<products_id><lettre>.jpg` (ex. `maison-plain-pied-la-couture-b-60114296a.jpg`) → le `products_id` permet de rattacher chaque photo à sa fiche via le tableau §2.3. La lettre finale est l'ordre dans la galerie.
- Traitement : AVIF + WebP fallback, `srcset` 3–4 tailles, dimensions explicites, renommage en kebab-case descriptif, `alt` factuel et unique (« Séjour double de 32 m² d'une maison de 110 m² à Mantes-la-Jolie »).
- Assets identifiés : logo `images/aurea-immobilier-aurea-logoe-ok.png` (436 Ko, **à revectoriser en SVG**), visuel d'accueil `images/home1a-min.jpg`, façade/agence `images/photo-agence-1.jpg`, portraits d'équipe (§2.2).
- ⚠️ Applique d'abord le tri « réel / IA / générique » du §3.9.

### Fichiers
- `files/nos-honoraires-385554.pdf` (78 Ko) = barème des honoraires. **Transcris-le en HTML** (il doit être accessible depuis toutes les pages) et garde le PDF en téléchargement secondaire. `nos-honoraires-385554-2.pdf` est un artefact du bug serveur du §3.2 : ignore-le.

### Annonces
- **Ne fige jamais les annonces dans le code.** Le scraping est un **jeu de données de départ et de secours**, pas la source. La source est le logiciel métier (Orisha Real Estate — confirmé comme hébergeur du site actuel) : import automatique par flux passerelle (XML / Poliris / API — [[format et identifiants à confirmer avec l'agence et Orisha]]), synchronisation au moins quotidienne, revalidation des pages concernées.
- Utilise le mapping `référence ↔ products_id` du §2.3 pour raccorder le flux aux anciennes URL et vérifier que la table 301 couvre 100 % du catalogue.
- **Détection de doublons à l'import** (le site actuel affiche des biens en double) : clé de rapprochement = commune + type + surface ± 2 m² + prix ± 2 %.

---

## 5. Stratégie de mots-clés

Les volumes fournis à l'origine (capture d'outil SEO) portaient sur **Paris** : « agence immobiliere paris » 2 400/mois, « agence immobiliere paris 15 » 1 300, « location agence immobiliere paris » 720, etc.

**Règle : tu ne cibles PAS ces requêtes.** L'agence est à Mantes-la-Jolie (~55 km de Paris) et le scraping confirme qu'elle n'a **aucun bien à Paris** (§2.4 — commune la plus proche : Montrouge, 1 bien archivé). Créer des pages « agence immobilière Paris 15 » = **doorway pages**, contraire aux règles anti-spam de Google, avec risque de pénalité sur tout le domaine ; et même classé, ce trafic ne convertirait pas.

**Ce qu'on garde de ces données, c'est le modèle** : la requête tête « agence immobilière + ville » concentre le volume (→ accueil) ; chaque subdivision géographique a son propre volume (→ pages communes) ; la variante « location » a un volume réel à faible concurrence (CPC 0,45 €) (→ pages location + gestion locative dédiées) ; les variantes orthographiques se traitent par **une seule page par intention**.

**Action requise avant le build** : relancer l'outil sur la zone réelle et remplir ce tableau. **Une page n'est créée que si elle a du volume ET une présence réelle** — biens actifs ou ventes réalisées dans la commune, mesurés sur les données du §2.4.

| Cluster | Requêtes à mesurer | Page cible | Présence réelle (scraping) |
|---|---|---|---|
| Tête locale | agence immobilière mantes la jolie / 78200 | `/` | ✅ 33 biens archivés + biens actifs |
| Communes | mantes la ville, limay, juziers, porcheville, bonnières sur seine, rosny sur seine, gargenville, follainville-dennemont… | `/agence-immobiliere/[commune]/` | ✅ voir §2.4 |
| Achat | maison à vendre mantes la jolie, appartement à vendre mantes la jolie… | `/acheter/` + filtres | ✅ |
| Vente / estimation | estimation immobilière mantes la jolie, prix m2 mantes la jolie | `/estimation/`, `/vendre/`, `/prix-immobilier-mantes-la-jolie/` | ✅ page estimation existante |
| Location | location appartement mantes la jolie, agence location mantes la jolie | `/louer/` | ✅ biens en `cPath 3-32-*` |
| Gestion locative | gestion locative mantes la jolie, administrateur de biens mantes | `/gestion-locative/` | ⚠️ aujourd'hui un simple formulaire |
| Marque | aurea immobilier, avis aurea immobilier | `/`, `/agence/`, `/avis/` | ✅ |
| Informationnel (GEO) | prix immobilier mantes la jolie 2026, frais de notaire, DPE location, RER E Mantes | `/guides/…` | ❌ `catalog/news.php` = 212 mots, vide |

Volumes : [[à coller ici]]. Priorise par volume × intention commerciale × faisabilité (KD) × présence réelle.

---

## 6. Stack technique et budgets de performance

- **Framework** : Astro en mode hybride (pages publiques pré-rendues + routes serveur pour les formulaires, l'import et le back-office) avec l'adaptateur `@astrojs/vercel`, ou Next.js (App Router, SSG/ISR). Zéro JS par défaut sur les pages de contenu.
- **Base de données** : **Supabase** (PostgreSQL managé, Auth, Storage) — région **UE, Paris (`eu-west-3`)**. Détail complet en §20.
- **CSS** : CSS natif moderne (custom properties, container queries) ou Tailwind purgé. Pas de framework UI lourd.
- **Animations** : CSS + View Transitions API ; une librairie légère (Motion One, ou GSAP core en lazy) uniquement pour les séquences orchestrées. N'anime que `transform` et `opacity`.
- **Carte** : MapLibre ou Leaflet chargés **à l'interaction** (façade statique cliquable), jamais au chargement.
- **Polices** : 1–2 familles, auto-hébergées en WOFF2, sous-ensemble latin, `font-display: swap`, preload de la seule graisse au-dessus de la ligne de flottaison.
- **Formulaires** : envoi vers une route serveur Vercel (jamais d'écriture directe du navigateur vers Supabase) + validation Zod + honeypot + Cloudflare Turnstile vérifié côté serveur + limitation de débit. Pas de reCAPTCHA. Détail en §20.5.
- **Hébergement** : **Vercel** — CDN mondial pour les pages statiques, fonctions serveur en région **Paris (`cdg1`)** au plus près de la base, HTTP/2+, Brotli, cache immuable sur assets hachés. Détail de la mise en production en §20.7.
- **Encodage** : UTF-8 partout (§3.7).
- **Pipeline images** : étape de build qui consomme `scrapper_aurea/images/` + `data/images.csv` et produit les variantes AVIF/WebP. Objectif : passer de 135,8 Mo à **moins de 15 Mo** pour le même catalogue.

### Budgets (critères d'acceptation, mobile 4G simulée)
- LCP < 2,0 s · INP < 200 ms · CLS < 0,05
- Lighthouse ≥ 95 en Performance, SEO, Accessibilité, Bonnes pratiques — sur accueil, liste d'annonces, fiche bien, page commune
- JS total < 90 Ko gzip sur l'accueil ; 0 Ko de JS bloquant
- Hero : `fetchpriority="high"`, pas de lazy-load ; toutes les autres images en `loading="lazy"` + `decoding="async"`

---

## 7. Arborescence

```
/                                   Accueil — "agence immobilière Mantes-la-Jolie"
/acheter/                           Biens à vendre (filtres : ville, type, budget, pièces)
/acheter/[commune]/                 Uniquement si ≥ 3 biens actifs ou volume suffisant
/acheter/[type]-[commune]/          ex. /acheter/maison-mantes-la-jolie/ (si volume)
/louer/                             Biens à louer + pitch location
/bien/[ref]-[slug]/                 Fiche bien (ex. /bien/789-maison-5-pieces-mantes-la-jolie/)
/vendre/                            Vendre avec AUREA (méthode, exclusivité, marketing, preuves)
/estimation/                        Estimation gratuite (formulaire multi-étapes)
/gestion-locative/                  Offre complète (vraie page, pas un formulaire)
/agence-immobiliere/[commune]/      Pages communes
/prix-immobilier-mantes-la-jolie/   Page données (prix au m², évolution, par quartier)
/biens-vendus/                      Réalisations (≈ 126 biens, §2.5)
/agence/                            Agence, histoire, valeurs, partenaires
/equipe/                            Équipe
/equipe/[prenom-nom]/               Page conseiller (E-E-A-T) — 9 pages, §2.2
/avis/                              Avis clients + lien Google
/guides/  /guides/[slug]/           Contenus informationnels (GEO)
/contact/
/honoraires/                        Barème en HTML (+ PDF)
/mentions-legales/  /confidentialite/  /cgu/  /cookies/   (§15.1 et §21)
/admin/                             Back-office agence — authentifié, noindex, hors sitemap (§20.4)
/plan-du-site/
```

Règles d'URL : minuscules, tirets, sans accents, sans paramètres pour les pages indexables, slash final cohérent partout. Les filtres combinés (budget, pièces…) sont en `noindex, follow` + canonical vers la page parente ; seules les combinaisons ville/type à volume réel sont des pages statiques indexables.

**Le slug de fiche utilise la référence agence, pas le `products_id`** : `/bien/789-maison-5-pieces-mantes-la-jolie/`. La référence est stable côté logiciel métier et lisible ; le `products_id` reste stocké en interne pour le raccordement 301.

---

## 8. Templates de page — contenu et SEO on-page

### Règles communes
- **Un seul H1** par page, contenant le mot-clé principal, formulé naturellement (corrige le §3.5).
- **Title** unique, 50–60 caractères, mot-clé en début, marque en fin : `[Mot-clé] | AUREA Immobilier`.
- **Meta description** unique, 140–155 caractères, bénéfice concret + preuve + appel à l'action. Jamais « AUREA IMMOBILIER » seul (§3.4).
- `canonical` **absolue** sur chaque page (§3.1).
- Open Graph + Twitter Card complets, image 1200×630 dédiée par page / par bien.
- Fil d'Ariane visible + `BreadcrumbList`. L'ancien site en avait un (présent dans `donnees_structurees[]`) mais avec des `item.name` contenant des chemins relatifs cassés — à refaire proprement.
- `<html lang="fr">`, hiérarchie Hn sans saut de niveau.
- Date « Mis à jour le … » visible sur les pages de contenu et les guides.
- Téléphone cliquable et CTA estimation visibles sur mobile (barre fixe discrète en bas).

### Exemples de balises

| Page | Title | Meta description |
|---|---|---|
| Accueil | Agence immobilière Mantes-la-Jolie – AUREA Immobilier | Vendre, acheter, louer ou faire gérer votre bien à Mantes-la-Jolie. [[note]]/5 sur Google, ≈ 126 biens vendus ou loués. Estimation gratuite sous 48 h. |
| Estimation | Estimation immobilière gratuite à Mantes-la-Jolie | Estimez votre maison ou appartement avec 4 méthodes croisées et un conseiller local. Avis de valeur gratuit, sans engagement. |
| Gestion locative | Gestion locative à Mantes-la-Jolie et dans le Mantois | Loyers encaissés, locataires sélectionnés, travaux suivis : confiez votre bien à notre gestionnaire dédiée. Honoraires transparents. |
| Fiche bien (réf. 789) | Maison 5 pièces 110 m² avec jardin – Mantes-la-Jolie | Maison de 1950, 3 chambres, jardin de 880 m², sous-sol total, bus à 2 min. 249 000 € honoraires inclus. Réf. 789, en exclusivité. |
| Page commune | Agence immobilière à Limay (78520) – AUREA Immobilier | Biens à vendre et à louer à Limay, prix au m² du marché et conseils d'un agent qui y a déjà vendu [[N]] biens. |

### Accueil
1. **Hero** : H1 + promesse en une phrase + barre de recherche (Acheter / Louer / Estimer) + preuve immédiate (note Google avec lien vers la fiche).
2. **Dernières exclusivités** (6 biens, dynamiques).
3. **Pourquoi AUREA** : 3–4 arguments chiffrés — délai moyen de vente, part d'exclusivités, nombre de ventes. **Chiffres réels uniquement** [[à demander à l'agence : le scraping ne donne que le volume d'archives, ≈ 126]].
4. **Estimation** : CTA fort vers `/estimation/`.
5. **Avis clients** (§13).
6. **Zone d'intervention** : liens vers les pages communes (maillage interne).
7. **Équipe** (aperçu + lien `/equipe/`).
8. **FAQ courte** (4–6 questions réelles).
9. **Footer** : NAP complet, horaires, liens légaux, lien barème, réseaux sociaux [[URL à demander]].

### Fiche bien
- H1 = type + pièces + surface + commune, en casse normale, commune correctement orthographiée (§3.6).
- Galerie performante (1ʳᵉ image prioritaire, suite en lazy) ; visite virtuelle et vidéo drone en façade cliquable (iframe chargée au clic) **si et seulement si l'agence fournit les URL** (§3.8).
- **Résumé factuel en haut**, en liste de caractéristiques (surface, terrain, chambres, année, chauffage, DPE/GES, taxe foncière, charges de copro, nb de lots) : c'est ce que les moteurs génératifs extraient. Tous ces champs existent déjà dans le scraping (§2.3).
- DPE et GES avec étiquettes + **estimation des dépenses énergétiques** (obligatoire — le format du site actuel, « entre 2 630 € et 3 570 €, indexées aux années 2021, 2022 et 2023, abonnement compris », est correct : conserve-le).
- Mention ERP + lien Géorisques (déjà présent, 18 occurrences dans `liens_externes.csv`) ; honoraires, montant et charge (vendeur/acquéreur) ; lien vers le barème HTML.
- Bloc **« Le quartier »** : 3–4 phrases uniques (transports, écoles, commerces) + lien vers la page commune.
- Conseiller en charge : photo, lien vers sa page, téléphone, formulaire pré-rempli avec la référence.
- Biens similaires (maillage).
- **Cycle de vie** : bien vendu → la page reste en ligne avec le statut « Vendu » (preuve sociale, conserve les liens entrants), `noindex` après 6 mois, ou 301 vers la page commune. Jamais de 404 en masse — c'est exactement ce que fait mal le site actuel.

### Pages communes `/agence-immobiliere/[commune]/`
Créées **uniquement** là où l'agence a des biens actifs ou des ventes réalisées (§2.4). Chaque page doit être **réellement unique** (≥ 60 % de contenu propre), sinon elle n'est pas créée. Contenu obligatoire :
- H1 « Agence immobilière à [Commune] » + intro de 2–3 phrases qui répond directement.
- Biens actifs dans la commune (dynamique) + biens vendus dans la commune (depuis les archives).
- Prix au m² médian maisons / appartements **avec source et date** (DVF — data.gouv.fr / app.dvf.etalab.gouv.fr) [[à extraire]].
- Quartiers, transports (gares, lignes, temps vers Paris-Saint-Lazare / La Défense), écoles, projets urbains — **faits vérifiables uniquement**, avec liens sources.
- Conseiller référent du secteur.
- FAQ locale (3–5 questions réellement posées).

### Page « Prix immobilier Mantes-la-Jolie »
Page données pensée pour être citée par les IA : tableau prix m² par type et par quartier, évolution sur 3–5 ans, nombre de transactions, source DVF + date de mise à jour, commentaire d'expert signé (Hélène Vermeire Benz ou Vincent Maume). Mise à jour trimestrielle.

### Page gestion locative
Aujourd'hui un simple `contact_us.php?form=3` de 566 mots. À transformer en vraie page de vente : ce qui est inclus (recherche et sélection du locataire, bail, états des lieux, encaissement, relances, régularisation des charges, suivi des travaux, déclarations), honoraires en % HT/TTC, garantie loyers impayés en option [[à confirmer]], calendrier d'interdiction de location des passoires énergétiques (source Légifrance / service-public.fr), portrait de **Marion Nicaise**, FAQ, formulaire.

### Pages conseiller
Photo, rôle, parcours, secteur, langues, biens en cours, biens vendus, avis qui le/la citent nommément, contact. Balisage `Person` avec `worksFor` et `jobTitle`. Principal levier E-E-A-T. **9 pages à créer** (§2.2) — et un portrait à produire pour Jill Thépaut.

---

## 9. SEO technique — checklist

- `sitemap.xml` généré automatiquement (index : pages, biens, guides), `lastmod` réel, soumis à Google Search Console et Bing Webmaster Tools. (L'ancien site porte une vérification GSC : `google-site-verification: Kx9pGKJ2C561y8uNJ6pIXxT6G1gI5VLJAZS5ujilnfs` — ✅ `data/site.json`. **Récupère l'accès à cette propriété**, c'est l'historique de positions.)
- `robots.txt` : autoriser tout le contenu public ; bloquer `/compte/`, `/selection/`, les URL de recherche à paramètres. **Ne pas bloquer** les robots IA (§11).
- Pagination indexable en URL propres (`/acheter/page/2/`), canonical auto-référent.
- Pages 404 et 410 utiles (recherche + liens vers les biens).
- HTTPS, HSTS, redirection unique www ↔ non-www, **aucune chaîne de redirections**.
- Accessibilité WCAG 2.2 AA : contrastes, focus visible, navigation clavier, `alt`, labels de formulaires, `prefers-reduced-motion`.
- Pas de `hreflang` (site monolingue).
- Maillage interne : page commune ↔ biens de la commune ↔ conseiller ↔ guides liés. Aucune page orpheline. Ancres descriptives (jamais « cliquez ici »).
- **Contrôle anti-duplication** (§3.1) : un crawl de recette doit produire **0 URL dupliquée**, là où l'ancien site en produit 144.
- Vérification finale : Rich Results Test + Schema Markup Validator sur chaque template, Screaming Frog (0 erreur 4xx/5xx interne, 0 title/description dupliqué, 0 H1 manquant ou multiple).

---

## 10. Migration — table de redirections 301, construite depuis le scraping

**Méthode imposée, reproductible :**

1. Source des URL à rediriger = `data/pages.csv` (80 URL en 200) **+** `data/doublons.csv` (144 URL dupliquées) **+** `data/erreurs.csv` (18 URL en 404 encore liées) = **242 URL** à traiter. Aucune ne doit rester sans décision.
2. Pour chaque fiche bien, la correspondance ancienne URL → nouvelle URL passe par le mapping du §2.3 (`products_id` → référence agence).
3. Produire `redirects.csv` (`ancienne_url ; nouvelle_url ; code`) consommé par la configuration d'hébergement.
4. Après bascule : recrawler les 242 URL et vérifier que **100 %** renvoient un 301 unique vers une page en 200 (zéro chaîne, zéro boucle).

| Ancien format (observé dans le scraping) | Nouveau |
|---|---|
| `/` | `/` |
| `/content/5/notre-agence.html` | `/agence/` |
| `/content/1/notre-agence.html` (404 mais liée depuis le footer) | `/agence/` |
| `/annonces/transaction/Vente.html` et `/…/vente.html` | `/acheter/` |
| `/../annonces/transaction_____2/vente.html`, `_____3/` | `/acheter/page/2/`, `/acheter/page/3/` |
| `/annonces/transaction/Location.html` | `/louer/` |
| `/fiches/[cPath]_[products_id]/[slug].html` (+ variantes `?cPath=…&products_id=…`) | `/bien/[ref]-[slug]/` via §2.3 |
| `/fiches/_[products_id]/[slug].html` (biens archivés) | `/bien/[ref]-[slug]/` avec statut « Vendu / Loué » |
| `/catalog/products_selled.php` et `?page=2…11` | `/biens-vendus/` et `/biens-vendus/page/N/` |
| `/catalog/estimation.php` · `/estimation.php` (404) | `/estimation/` |
| `/catalog/contact_us.php?form=1` · `/contact_us.php?form=1` (404) | `/contact/` |
| `/catalog/contact_us.php?form=3` · `/annonces/transaction/contact_us.php?form=3` | `/gestion-locative/` |
| `/catalog/contact_us.php?manufacturer_id=385554&products_id=X` (8 URL) | `/bien/[ref]-[slug]/#contact` |
| `/catalog/products_print.php?products_id=X` (7 URL) | `/bien/[ref]-[slug]/` |
| `/catalog/news.php` | `/guides/` |
| `/catalog/mentions.php` | `/mentions-legales/` |
| `/catalog/gdpr.php` | `/confidentialite/` |
| `/catalog/cookies-policy.php` · `/catalog/cookies.php` | `/cookies/` |
| `/catalog/site_plan.php` | `/plan-du-site/` |
| `/catalog/annonce.php` · `/annonce.php` (404) | `/acheter/` |
| `/catalog/account.php` · `/account.php` (404) · `/catalog/selection.php` · `/selection.php` (404) | `/` en 301, ou 410 si la fonctionnalité n'est pas reprise |
| `/create_alerte_mail.php` (404) | `/contact/`, ou page d'alerte si la fonctionnalité est reprise |
| `/ville_bien/[ville]__[type]__vente/immobilier-[ville].html` (6 URL) | `/acheter/[type]-[commune]/` ou `/agence-immobiliere/[commune]/` |
| `/annonces/agent/[id]-[prenom-nom].html` (8 URL, §2.2) | `/equipe/[prenom-nom]/` |
| `/catalog/simul_*.php`, `/catalog/outils.php` | `/guides/outils/` (calculatrices reconstruites, légères) |
| `/segments/immo/catalog/images/manufacturers_bareme/385554.pdf` (+ `?v=…`) | `/honoraires/` |
| **Toutes les URL de `doublons.csv`** (préfixes parasites `/annonces/…`, `/fiches/…`, `/content/…`, `/ville_bien/…`) | 301 vers l'URL canonique correspondante, puis **404 sur tout nouveau chemin de ce type** |
| `/catalog/try` (404) | 410 |

---

## 11. GEO — être cité par les moteurs génératifs

Principes (études GEO Princeton/KDD 2024 et pratiques 2026) : les moteurs génératifs citent en priorité les contenus **précis, sourcés, structurés et faisant autorité**, et s'appuient énormément sur des **sources tierces** (fiche Google, annuaires, avis, presse). Le bourrage de mots-clés n'a aucun effet.

1. **Titres sous forme de vraies questions** sur les guides et FAQ (« Combien coûte une estimation immobilière à Mantes-la-Jolie ? »), suivis d'une **réponse directe de 40–60 mots** en premier paragraphe, puis du détail.
2. **Chiffres précis avec source et date** plutôt que des formules vagues (« prix médian de X €/m² au T2 2026 selon DVF »).
3. **Citations d'experts identifiés** : chaque guide signé par un membre de l'équipe (nom, rôle, photo, lien vers sa page) — les 9 profils du §2.2 sont ton capital E-E-A-T.
4. **Couverture des sous-questions** (query fan-out) : une page pilier répond explicitement aux questions voisines (prix, délais, frais, documents, fiscalité, quartiers).
5. **Tableaux comparatifs en HTML** (jamais en image) : prix par quartier, frais de notaire ancien/neuf, étapes d'une vente avec délais.
6. **Entité de marque cohérente** : même nom, adresse, téléphone, description et logo partout (site, Google, annuaires, réseaux) + `sameAs` dans le schema.
7. **Fraîcheur** : dates de mise à jour visibles, révision trimestrielle des pages données et guides.
8. `robots.txt` : autoriser explicitement `Googlebot`, `Bingbot`, `OAI-SearchBot`, `ChatGPT-User`, `GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`.
9. `llms.txt` à la racine : présentation Markdown de l'agence, zone, services, honoraires, liens vers les pages clés.
10. **Rendu HTML côté serveur** de tout le contenu : beaucoup de robots IA n'exécutent pas le JavaScript. Aucune information clé (prix, surface, adresse, avis) ne doit dépendre du JS client.

### Premiers guides (8–10 au lancement, puis 2/mois)
`catalog/news.php` ne contient que 212 mots : il n'y a **rien à reprendre**, tout est à écrire.
- Prix de l'immobilier à Mantes-la-Jolie en 2026 : quartier par quartier
- Vendre sa maison à Mantes-la-Jolie : étapes, délais, documents
- Estimation immobilière : les 4 méthodes utilisées et comment les lire
- Mandat simple ou exclusif : que choisir ?
- Frais de notaire dans les Yvelines : calcul et exemples
- DPE et location : ce que doivent faire les propriétaires bailleurs (calendrier officiel)
- Gestion locative : ce qu'elle coûte et ce qu'elle couvre
- Vivre à Mantes-la-Jolie : quartiers, transports, écoles
- Acheter à Mantes pour travailler à Paris ou à La Défense : temps de trajet réels

[[Chaque fait réglementaire ou chiffré doit être vérifié sur la source officielle — service-public.fr, Légifrance, notaires de France, DVF — et lié.]]

---

## 12. Données structurées (JSON-LD)

L'ancien site n'émet qu'un `BreadcrumbList`, avec des `item.name` contenant des chemins relatifs cassés (`../type_bien/4/maisons.html`) — ✅ vérifié dans `donnees_structurees[]`. Tout est donc à reconstruire.

Sur toutes les pages : `Organization`/`RealEstateAgent` (version complète sur l'accueil et `/agence/`, version courte référencée par `@id` ailleurs), `WebSite`, `BreadcrumbList`.

```json
{
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "@id": "https://www.aurea-immobilier.fr/#agence",
  "name": "AUREA Immobilier",
  "url": "https://www.aurea-immobilier.fr/",
  "logo": "https://www.aurea-immobilier.fr/img/logo-aurea-immobilier.svg",
  "image": "https://www.aurea-immobilier.fr/img/agence-aurea-mantes-la-jolie.jpg",
  "description": "Agence immobilière indépendante à Mantes-la-Jolie : vente, achat, location, estimation et gestion locative dans le Mantois.",
  "telephone": "+33130635050",
  "email": "contact@aurea-immobilier.fr",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "44 rue Nationale",
    "addressLocality": "Mantes-la-Jolie",
    "postalCode": "78200",
    "addressRegion": "Île-de-France",
    "addressCountry": "FR"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": "[[lat]]", "longitude": "[[lng]]" },
  "openingHoursSpecification": "[[à remplir après confirmation des horaires — §19]]",
  "areaServed": ["Mantes-la-Jolie","Mantes-la-Ville","Limay","Juziers","Porcheville","Bonnières-sur-Seine","Rosny-sur-Seine","Gargenville","Follainville-Dennemont","Buchelay","Magnanville"],
  "hasMap": "[[URL Google Maps de la fiche]]",
  "sameAs": [
    "[[URL fiche Google]]","[[Facebook]]","[[Instagram]]","[[LinkedIn]]",
    "https://realadvisor.fr/fr/agences-immobilieres/agence-aurea-immobilier",
    "[[Leboncoin boutique]]","[[PagesJaunes]]"
  ],
  "founder": [
    { "@id": "https://www.aurea-immobilier.fr/equipe/helene-vermeire-benz/#person" },
    { "@id": "https://www.aurea-immobilier.fr/equipe/vincent-maume/#person" }
  ],
  "foundingDate": "2024-08",
  "priceRange": "€€",
  "vatID": "FR30931635924",
  "taxID": "93163592400018"
}
```

- **Fiche bien** : `RealEstateListing` (`datePosted`, `url`, `image`) dont l'`about`/`mainEntity` est un `SingleFamilyResidence` ou `Apartment` (`numberOfRooms`, `numberOfBedrooms`, `floorSize` en `QuantitativeValue` unité `MTK`, `yearBuilt`, `address` **au niveau commune seulement**), + `offers` (`Offer` : `price`, `priceCurrency: EUR`, `availability`). Les valeurs viennent directement des champs du §2.3.
- **Conseiller** : `Person` (`name`, `jobTitle`, `image`, `worksFor` → `@id` de l'agence, `telephone`).
- **Guides** : `Article` avec `author` (Person), `datePublished`, `dateModified`.
- **FAQ** : `FAQPage` uniquement si la FAQ est visible sur la page.
- ⚠️ **Avis : NE PAS baliser** en `Review` ni `AggregateRating` sur l'entité de l'agence. Les avis sur une entreprise affichés sur son propre site (y compris les avis Google repris) sont « auto-promotionnels » au sens des consignes Google, inéligibles aux étoiles, et les baliser expose à une action manuelle. Les avis restent affichés en HTML visible, sans balisage.

---

## 13. Avis clients Google

⚠️ **Le scraping ne contient aucun avis** : le site actuel n'en affiche pas. Tout ce bloc dépend d'une collecte manuelle sur la fiche Google.

**Affichage** : section « Ils nous ont fait confiance » sur l'accueil (3 avis en rotation) + page `/avis/` (5 avis), avec :
- la note globale et le nombre d'avis, **avec la date du relevé** (« [[note]]/5 — [[N]] avis Google au [[date]] ») ;
- pour chaque avis : prénom + initiale du nom tels qu'affichés sur Google, 5 étoiles, **texte exact** (sans réécriture ni correction), mois/année, conseiller cité ;
- bouton **« Voir tous nos avis sur Google »** → [[URL de la fiche Google Maps]] ;
- bouton **« Laisser un avis »** → [[lien court « Demander des avis » depuis Google Business Profile]] ;
- mention « Avis publiés sur Google, reproduits sans modification » [[selon choix de l'agence]].

**Avis à collecter** (5 avis 5/5, variés : vente, achat, visite, trois conseillers différents) — texte intégral à copier **mot pour mot depuis la fiche Google** :

| # | Auteur (tel qu'affiché) | Sujet | Conseiller cité | Texte |
|---|---|---|---|---|
| 1 | Melissa Dantin | Vente d'une maison après de mauvaises expériences ailleurs ; qualité des photos, communication | Aimée Vaillant | [[copier depuis Google]] |
| 2 | Estelle Broussard | Efficacité, écoute, professionnalisme | Aimée Vaillant | [[copier depuis Google]] |
| 3 | Bilel B. Khalifa | Visite d'une maison : professionnalisme, réactivité, disponibilité | Oriane Cherel | [[copier depuis Google]] |
| 4 | Carlo Depellegrin | Suivi acheteur/vendeur sérieux, ponctualité | — | [[copier depuis Google]] |
| 5 | Chris B | Accompagnement efficace et déterminé d'une vente | Vincent Maume | [[copier depuis Google]] |

Alternative : Selma Nk (accueil par Aimée Vaillant et Marion Nicaise — utile pour la page gestion locative).

**Mise en œuvre** : avis stockés en **JSON statique dans le repo** (pas de widget tiers qui charge du JS lourd et dégrade l'INP). En option, script mensuel via l'API Google Places (`Place Details`, champ `reviews`, 5 avis maximum) pour rafraîchir la note et le nombre d'avis, dans le respect des conditions d'attribution Google. **Pas de scraping de Google Maps** : contraire aux conditions d'utilisation de Google.

---

## 14. Design et animations

**Direction** : rester dans l'esprit simple et épuré du site actuel, en plus élégant. Le nom « Aurea » (latin : *doré*) et le logo sont le point d'ancrage.

**Point de départ concret** : `scrapper_aurea/images/aurea-immobilier-aurea-logoe-ok.png` — **extrais-en les couleurs exactes** et revectorise-le en SVG (le PNG fait 436 Ko et est servi sur toutes les pages).

Avant de coder, propose un token system :
- **Couleurs** : 4–6 valeurs hex nommées, dérivées du logo. Un doré sobre (jamais un dégradé « or bling ») réservé aux CTA et aux repères, un fond clair neutre, un texte très sombre à fort contraste. Évite les palettes génériques du moment (crème + terracotta, noir + vert acide). Contraste AA vérifié pour chaque paire texte/fond.
- **Typographie** : 1 ou 2 familles choisies pour ce projet, échelle typographique nette. Pas de titres tout en majuscules — c'est précisément le défaut du site actuel (§3.6). Pas de petites étiquettes en capitales au-dessus de chaque section. Longueur de ligne < 75 caractères.
- **Mise en page** : les photos des biens sont les héroïnes. Grilles aérées, beaucoup d'espace, pas de cartes toutes identiques avec la même ombre grise.

**Animations** (fluides, jamais au détriment du LCP ou de l'INP) :
- **Un seul moment orchestré** au chargement de l'accueil : révélation de la photo hero (léger zoom / clip-path) + apparition du H1, < 900 ms au total, le H1 visible dès le premier rendu (l'animation ne doit pas retarder le LCP).
- **View Transitions** entre la liste d'annonces et la fiche bien : la photo de la carte s'agrandit vers la galerie.
- Galerie : glissement tactile fluide (scroll-snap natif), transitions en `transform` uniquement.
- Micro-interactions en réponse à une action : ajout en favori, étapes du formulaire d'estimation, envoi confirmé, filtres qui se mettent à jour.
- Pas de fade-in au scroll sur chaque section, pas de parallaxe lourde, pas de carrousel automatique.
- `prefers-reduced-motion: reduce` → toutes les animations non essentielles désactivées.
- Aucune animation ne provoque de décalage de mise en page (CLS).

**Formulaire d'estimation** multi-étapes (type de bien → adresse → surface/pièces → état → coordonnées), barre de progression, validation en direct, sauvegarde locale de la saisie. C'est le formulaire le plus rentable du site : événement analytics à chaque étape.

---

## 15. Conformité légale — non négociable

Le scraping montre des manquements réels, à corriger (✅ `pages/catalog-mentions.md`, `pages/catalog-gdpr.md`) :

| Point | État actuel | À faire |
|---|---|---|
| Carte professionnelle (CPI) + CCI émettrice | **absente des mentions légales** | [[numéro et CCI à demander]] — obligatoire |
| Garant financier (nom, adresse, montant) | **absent** ; le site déclare seulement « ne pouvoir ni recevoir ni détenir d'autres fonds que ceux représentatifs de sa rémunération » | [[à confirmer]] — si maniement de fonds, mention obligatoire |
| Assurance RCP (assureur, n° de contrat) | **« NC »** | [[à demander]] — obligatoire |
| Médiateur de la consommation (nom, adresse, site) | **« NC » sur les trois champs** | [[à demander]] — obligatoire (art. L.612-1 C. conso.) |
| Contact RGPD | adresse **Hotmail personnelle** | adresse professionnelle @aurea-immobilier.fr |
| Adresse dans les mentions | ville seule, sans le numéro de rue | « 44 rue Nationale, 78200 Mantes-la-Jolie » |
| Barème des honoraires | PDF uniquement, servi de façon instable (§3.2) | page HTML `/honoraires/` accessible depuis toutes les pages, + PDF secondaire |
| Sur chaque annonce | présent mais irrégulier | prix honoraires inclus, montant des honoraires, partie qui les prend en charge |
| DPE / GES + dépenses énergétiques | présent, format correct | conserver et systématiser |
| Mention ERP + Géorisques | présent | conserver |
| Transparence IA sur les visuels | déclarée (Gemini, immofacile, immowise, scout) | conserver la mention si des visuels IA sont réutilisés, et ne jamais présenter un visuel IA comme une photo du bien |
| Cookies | bannière + page dédiée existantes | bannière conforme CNIL (refus aussi simple que l'acceptation), analytics sans cookies de préférence (Plausible, ou Matomo en exemption) |
| Bloctel | lien présent (36 occurrences) | conserver |

### 15.1 Les pages légales à produire

Quatre pages, accessibles depuis le pied de page de **toutes** les pages, **rendues en HTML côté serveur** (contenu lisible sans JavaScript, indexables, avec title et meta description dédiés). Contenu détaillé en §21.

| URL | Title | Meta description |
|---|---|---|
| `/mentions-legales/` | Mentions légales – AUREA Immobilier | Éditeur, carte professionnelle, garantie, assurance, médiateur, hébergeurs et propriété intellectuelle du site AUREA Immobilier. |
| `/confidentialite/` | Politique de confidentialité et données personnelles | Données collectées par AUREA Immobilier, finalités, durées de conservation, sous-traitants et exercice de vos droits RGPD. |
| `/cgu/` | Conditions générales d'utilisation du site | Règles d'utilisation du site AUREA Immobilier : annonces, estimation en ligne, alertes, formulaires et responsabilités. |
| `/cookies/` | Politique cookies – AUREA Immobilier | Cookies et traceurs utilisés sur le site, durée, finalité et gestion de votre consentement. |

**Pourquoi des CGU et pas des CGV** : le site ne vend rien en ligne. Les prestations de l'agence (transaction, location, gestion) sont encadrées par des **mandats écrits** régis par la loi Hoguet, avec leurs propres conditions, et leur prix est donné par le **barème des honoraires** (`/honoraires/`). Des CGV de vente en ligne seraient inadaptées, voire trompeuses. N'ajoute une page CGV que si un service payant en ligne est créé un jour (ex. estimation premium payée par carte) — et dans ce cas, fais-la valider par un juriste.

Chaque page affiche sa **date de dernière mise à jour** et un **numéro de version**, conservé dans la table `legal_documents` (§20.2) pour prouver quelle version un utilisateur a acceptée.

---

## 16. Off-site : Google Business Profile, citations, backlinks

Livre, en plus du site, un document d'actions (non exécutables côté code, mais d'un poids au moins égal au site).

**Google Business Profile** (premier facteur du pack local) :
- Catégorie principale « Agence immobilière », secondaires pertinentes (« Agent de gestion locative », « Service d'estimation immobilière »)
- Horaires **strictement identiques** à ceux du site et des annuaires (cohérence NAP), description avec la zone réelle, services détaillés, attributs, photos de l'agence et de l'équipe ajoutées chaque mois
- Posts hebdomadaires (nouvelles exclusivités, ventes réalisées)
- Réponse à 100 % des avis, en citant le service et la commune
- Lien du site vers l'accueil avec paramètres UTM
- Routine de collecte d'avis après chaque signature (lien court + QR code en agence)

**Citations NAP cohérentes** : PagesJaunes, Mappy, Infobel, RealAdvisor (✅ fiche existante repérée : `realadvisor.fr/fr/agences-immobilieres/agence-aurea-immobilier`), Leboncoin (boutique), SeLoger, Bien'ici, Logic-Immo, MeilleursAgents, Apple Business Connect (Plans), Bing Places, Waze, Yelp, Facebook. Corriger les horaires et adresses divergents.

**Backlinks locaux de qualité** (aucun achat de liens, aucun réseau de sites) :
- Presse locale (Le Courrier de Mantes, 78actu, Le Parisien Yvelines) : proposer l'étude trimestrielle des prix du Mantois comme contenu citable
- Partenaires réels (courtiers, notaires, diagnostiqueurs, architectes, géomètres, paysagistes) : page « Nos partenaires » réciproque et légitime
- Associations, clubs sportifs, événements locaux sponsorisés
- Office de tourisme, CCI Versailles-Yvelines, fédérations professionnelles si adhésion (FNAIM, SNPI…)
- Écoles et organismes de formation (offres d'alternance)

**Suivi GEO** : chaque mois, tester un panel fixe de 15–20 requêtes (« meilleure agence immobilière à Mantes-la-Jolie », « qui peut estimer ma maison à Limay », « agence gestion locative Mantois »…) dans ChatGPT, Perplexity, Gemini et Google AI Mode, et noter si AUREA est citée et avec quelle source.

---

## 17. Mesure

- Google Search Console (**réclamer la propriété existante**, §9) + Bing Webmaster Tools, liaison GA4 ou Plausible
- Événements de conversion : appel (clic tel), email, formulaire contact, estimation (chaque étape + envoi), alerte créée, demande de visite
- Tableau de bord mensuel : positions sur les requêtes du §5, trafic organique par cluster, apparitions dans le pack local (GSC « Performances » + GBP Insights), leads par source, citations IA
- **Contrôle post-migration** : suivi hebdomadaire pendant 8 semaines des 242 URL redirigées (§10) et des pages d'atterrissage qui perdent du trafic

---

## 18. Livrables et critères d'acceptation

1. Rapport d'exploitation du scraping + mapping `référence ↔ products_id ↔ ancienne URL ↔ nouvelle URL` complet (21 biens minimum, plus le catalogue du flux)
2. Arborescence + mapping mots-clés validés (volumes réels)
3. Token system design validé, dérivé du logo réel
4. Site complet, responsive (320 → 1920 px), accessible AA
5. Import automatique des annonces fonctionnel + gestion du cycle de vie + **détection de doublons** (§4)
6. `redirects.csv` couvrant les **242 URL** du §10, implémenté et testé à 100 % (301 unique → 200)
7. **0 URL dupliquée** au crawl de recette (contre 144 aujourd'hui)
8. JSON-LD valide sur chaque template (0 erreur au validateur)
9. Lighthouse ≥ 95 dans les 4 catégories sur les 4 templates clés ; Core Web Vitals dans les seuils du §6
10. Aucun title, description ni H1 dupliqué ; **un seul H1 par page** ; aucune page orpheline ; aucune erreur 4xx interne
11. Pipeline images livré : catalogue sous 15 Mo, AVIF + WebP, `alt` descriptifs uniques, logo en SVG
12. `sitemap.xml`, `robots.txt`, `llms.txt` en place
13. 8 guides publiés, sourcés et signés
14. Section avis avec les 5 avis exacts + liens vers Google
15. Mentions légales complètes (§15) — **bloquant pour la mise en ligne**
16. Document d'actions off-site (§16)
17. **Base Supabase livrée par migrations versionnées** (`supabase/migrations/`), RLS activée sur 100 % des tables exposées, **0 alerte** dans le Security Advisor et le Performance Advisor de Supabase (§20.2–20.3)
18. **Tests RLS automatisés** (pgTAP) exécutés en CI, couvrant chaque rôle × chaque table × chaque opération (§20.3)
19. Clé secrète Supabase **absente** du bundle client et du dépôt (vérifié par scan du build et `gitleaks`) (§20.1)
20. En-têtes de sécurité : note **A+** sur securityheaders.com et Mozilla Observatory ; CSP sans `unsafe-inline` pour les scripts (§20.6)
21. Environnements Vercel séparés (Production / Preview / Development), chacun avec **son propre projet Supabase** ; previews protégées par authentification (§20.7)
22. Pages légales complètes et validées (§15.1, §21) — **bloquant pour la mise en ligne**
23. Plan de réponse à incident et procédure de rotation des clés documentés (§20.9)

---

## 19. Informations manquantes — à obtenir avant la mise en ligne

Le scraping ne les contient pas. **Ne les invente jamais** : laisse un placeholder visible dans le code et reporte-les ici.

**Bloquant pour la mise en ligne (légal)**
- [ ] Numéro de carte professionnelle CPI + CCI émettrice
- [ ] Garant financier : nom, adresse, montant (ou confirmation écrite de non-maniement de fonds)
- [ ] Assurance RCP : assureur et numéro de contrat
- [ ] Médiateur de la consommation : nom, adresse, site
- [ ] Adresse email professionnelle pour le responsable de traitement RGPD

**Bloquant pour le SEO local**
- [ ] Coordonnées GPS exactes de la fiche Google Business Profile
- [ ] Horaires d'ouverture officiels, à aligner site / Google / annuaires
- [ ] URL de la fiche Google Maps + lien court « Demander des avis »
- [ ] Note et nombre d'avis Google au jour de la mise en ligne, + texte exact des 5 avis
- [ ] Accès à la propriété Google Search Console existante
- [ ] URL des comptes Facebook / Instagram / LinkedIn (pour `sameAs`)

**Bloquant pour le catalogue**
- [ ] Format et identifiants du flux passerelle Orisha (XML / Poliris / API)
- [ ] URL des visites virtuelles et vidéos drone (absentes du HTML actuel)
- [ ] Complément de scraping : pages 7 à 10 de `products_selled.php`

**Bloquant pour la sécurité et la mise en production**
- [ ] Propriétaire des comptes Vercel, Supabase, registrar du domaine, Cloudflare (Turnstile) et service d'emailing : **ils doivent être au nom de l'agence**, pas du prestataire
- [ ] Accès au DNS de `aurea-immobilier.fr` (bascule, SPF, DKIM, DMARC)
- [ ] Liste des utilisateurs du back-office et leur rôle (admin / conseiller / gestionnaire locative)
- [ ] Nom du directeur de la publication (a priori la présidente, Hélène Vermeire Benz — à confirmer)
- [ ] Contrats de sous-traitance (DPA) signés avec Vercel, Supabase, le service d'emailing et l'outil d'analytics
- [ ] Choix du service d'envoi d'emails transactionnels (Brevo, Resend, Postmark…)
- [ ] Durées de conservation validées par l'agence (proposition en §21.2)

**Nécessaire pour le contenu**
- [ ] Chiffres réels pour le bloc « Pourquoi AUREA » : délai moyen de vente, part de mandats exclusifs, nombre de ventes sur 12 mois
- [ ] Rôle exact de Zachary Denat
- [ ] Emails professionnels de Justine Vitry et Jill Thépaut
- [ ] Portrait photo de Jill Thépaut
- [ ] Validation du tri « photo réelle / visuel IA » sur l'ensemble du dossier `images/`
- [ ] Honoraires de gestion locative en % HT/TTC et existence d'une garantie loyers impayés
- [ ] Données DVF extraites par commune (prix médian m², nb de transactions, date)

---

## 20. Architecture Supabase + Vercel et sécurité

Principe directeur : **le navigateur ne détient jamais de droit d'écriture**. Les pages publiques sont pré-rendues, les lectures publiques passent par des politiques RLS minimales, et **toute écriture** (formulaires, import, back-office sensible) passe par du code serveur Vercel qui valide, filtre et journalise. La RLS est la dernière ligne de défense, pas la seule.

```
Navigateur ──► CDN Vercel (pages statiques, cache)
     │
     └─► Routes serveur Vercel (région cdg1 Paris)
            │  Turnstile · Zod · rate limit · Origin check
            ├─► Supabase (eu-west-3 Paris) : Postgres + RLS · Auth · Storage
            ├─► Service email (notifications conseillers, double opt-in alertes)
            └─◄ Vercel Cron ─► flux Orisha (import quotidien des annonces)

Back-office /admin ──► Supabase Auth (MFA obligatoire) ──► Postgres avec JWT utilisateur (RLS par rôle)
```

### 20.1 Clés et secrets

Supabase remplace les anciennes clés `anon` / `service_role` par des clés `sb_publishable_…` et `sb_secret_…` ; les anciennes seront supprimées fin 2026. **Utilise exclusivement les nouvelles clés dès le départ.**

| Clé | Où elle vit | Règle |
|---|---|---|
| `sb_publishable_…` | variable `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, peut être dans le bundle client | Ne donne accès qu'à ce que la RLS autorise pour les rôles `anon` / `authenticated`. Sûre **uniquement** si la RLS est correcte. |
| `sb_secret_…` | variable serveur `SUPABASE_SECRET_KEY`, marquée *Sensitive* dans Vercel | **Contourne totalement la RLS** (rôle `service_role`). Jamais dans le code client, jamais préfixée `PUBLIC_` / `NEXT_PUBLIC_`, jamais dans le dépôt, jamais dans les logs. Une clé secrète distincte par usage (formulaires, import, cron) pour pouvoir en révoquer une seule. |

- Le client serveur est dans un module importable **uniquement côté serveur** (`src/lib/server/supabase-admin.ts` ; en Next.js, `import 'server-only'`). Un test CI échoue si la chaîne `sb_secret_` apparaît dans le build client.
- Scan de secrets à chaque push (`gitleaks` en CI + GitHub secret scanning). `.env*` dans `.gitignore`, un `.env.example` sans valeurs.

### 20.2 Schéma de base de données

Tout est créé par **migrations SQL versionnées** (`supabase/migrations/`), jamais à la main dans le dashboard de production.

Deux schémas :
- `public` — exposé à l'API Data, **RLS activée sur chaque table sans exception**
- `private` — **non exposé** à l'API (retiré des « Exposed schemas »), pour ce qui ne doit jamais être atteignable depuis l'extérieur, même en cas d'erreur de politique

| Table | Schéma | Contenu | Remarques sécurité |
|---|---|---|---|
| `listings` | public | biens (réf., `legacy_products_id`, slug, statut, transaction, type, commune, prix, honoraires + qui les paie, surfaces, pièces, DPE/GES, dépenses énergie, description, conseiller, dates) | l'**adresse exacte et les coordonnées précises ne sont pas lisibles par `anon`** (sécurité du vendeur, risque de cambriolage) : grant de colonnes, seule la commune et un point approximatif sont publics |
| `listing_photos` | public | chemin Storage, ordre, alt, dimensions, `is_ai_visual` | photos **débarrassées de leurs métadonnées EXIF/GPS** dans le pipeline |
| `communes` | public | nom, CP, slug, textes, données DVF + source + date | lecture publique |
| `agents` | public | profil public des conseillers (nom, rôle, photo, bio, téléphone pro) | lecture publique, écriture admin |
| `reviews` | public | les 5 avis Google sélectionnés + note globale et date du relevé | lecture publique, écriture admin |
| `legal_documents` | public | slug, version, contenu, date de publication | lecture publique des versions publiées |
| `profiles` | public | lien `auth.users` ↔ rôle (`admin`, `agent`, `rental_manager`) ↔ `agent_id` | chacun lit son propre profil ; seul un admin modifie les rôles |
| `leads` | public | demandes de contact, visite, estimation, gestion locative : identité, coordonnées, message, bien concerné, `consent_version`, `consent_at`, statut, conseiller assigné, `purge_after` | **aucun accès `anon`** ; lecture par rôle (§20.3) ; exige MFA |
| `alert_subscriptions` | public | email, critères, `confirmed_at`, hachés des jetons de confirmation et de désabonnement | aucun accès `anon` ; tout passe par le serveur avec jetons à usage unique |
| `audit_log` | **private** | qui a fait quoi, sur quelle ligne, quand | écrit par triggers, lisible par admin via une fonction dédiée |
| `import_runs` | **private** | journal des imports Orisha (début, fin, nb créés/modifiés/retirés, erreurs) | |
| `rate_limits` | **private** | compteurs par IP hachée et par route | |

Règles transverses :
- `revoke all on all tables in schema public from anon, authenticated;` puis **grants explicites** table par table et colonne par colonne ; même chose pour `alter default privileges` afin que toute nouvelle table naisse fermée.
- Les vues sont créées avec `security_invoker = true` (sinon elles contournent la RLS).
- Les fonctions `security definer` sont rangées dans `private`, avec `set search_path = ''` et des noms entièrement qualifiés.
- Désactive ce qui n'est pas utilisé : `pg_graphql` si l'API GraphQL ne sert pas, Realtime sur toutes les tables.
- Contraintes au niveau de la base, pas seulement dans le formulaire : `check` sur longueurs (message ≤ 2 000 caractères, email ≤ 254), format email, énumérations de statuts.
- IP jamais stockée en clair : hachage salé (HMAC) pour la limitation de débit uniquement.

### 20.3 Row Level Security — matrice des droits

Le rôle métier est porté dans le JWT via un **Custom Access Token Hook** Supabase (claim `app_role`, lu depuis `profiles`), ce qui évite une sous-requête par ligne.

| Table | `anon` (visiteur) | `agent` | `rental_manager` | `admin` | serveur (`sb_secret`) |
|---|---|---|---|---|---|
| `listings` | SELECT si `status in ('published','under_offer','sold')`, colonnes publiques seulement | SELECT tout ; UPDATE des champs éditoriaux de **ses** biens | SELECT tout | tout | import (UPSERT) |
| `listing_photos` | SELECT si le bien est lisible | SELECT | SELECT | tout | import |
| `communes`, `agents`, `reviews` | SELECT | SELECT | SELECT | tout | — |
| `legal_documents` | SELECT des versions publiées | SELECT | SELECT | tout | — |
| `profiles` | ∅ | SELECT de sa ligne | SELECT de sa ligne | tout | — |
| `leads` | ∅ | SELECT/UPDATE si assigné à lui ou non assigné, **si MFA validée** | SELECT/UPDATE des leads `type = 'gestion'`, **si MFA validée** | tout, **si MFA validée** ; seul DELETE autorisé | INSERT depuis les formulaires |
| `alert_subscriptions` | ∅ | ∅ | ∅ | SELECT, DELETE | INSERT / UPDATE via jetons |

Exemples de politiques attendues :

```sql
alter table public.leads enable row level security;

create policy "leads_select_agent"
on public.leads for select
to authenticated
using (
  (select auth.jwt() ->> 'aal') = 'aal2'                     -- MFA obligatoire
  and (
    (select auth.jwt() ->> 'app_role') = 'admin'
    or ((select auth.jwt() ->> 'app_role') = 'agent'
        and (assigned_agent_id is null
             or assigned_agent_id = (select private.current_agent_id())))
    or ((select auth.jwt() ->> 'app_role') = 'rental_manager' and type = 'gestion')
  )
);

create policy "listings_public_read"
on public.listings for select
to anon, authenticated
using (status in ('published', 'under_offer', 'sold'));

grant select (id, reference, slug, status, transaction_type, property_type, commune_id,
              price, fees_amount, fees_payer, living_area, land_area, rooms, bedrooms,
              dpe_class, ges_class, energy_cost_min, energy_cost_max, description,
              agent_id, published_at, approx_lat, approx_lng)
  on public.listings to anon;
```

Performance des politiques : `auth.uid()` / `auth.jwt()` toujours enveloppés dans `(select …)`, clause `to <rôle>` systématique, **index** sur chaque colonne utilisée dans une politique (`status`, `assigned_agent_id`, `type`).

**Tests obligatoires** (pgTAP, `supabase test db`, exécutés en CI sur une base éphémère) — pour chaque table et chaque rôle, au minimum :
- `anon` ne lit **aucune** ligne de `leads`, `alert_subscriptions`, `profiles` et ne peut **rien** insérer, modifier ou supprimer nulle part ;
- `anon` ne voit ni l'adresse exacte ni les coordonnées précises d'un bien, ni un bien en brouillon ;
- un conseiller ne voit pas les leads assignés à un collègue ; sans MFA (`aal1`), il ne voit **aucun** lead ;
- la gestionnaire ne voit que les leads de gestion locative ;
- un utilisateur ne peut pas modifier son propre `app_role`.

### 20.4 Authentification du back-office

- **Aucune inscription publique** : « Enable signups » désactivé, comptes créés par invitation par un admin.
- **MFA TOTP obligatoire** pour tous les comptes, imposée par la RLS (`aal2`) et pas seulement par l'interface.
- Mots de passe ≥ 12 caractères, protection contre les mots de passe divulgués activée, Turnstile sur l'écran de connexion (intégration CAPTCHA native de Supabase Auth).
- Liste blanche stricte des URL de redirection (domaine de production uniquement, plus les previews si nécessaire).
- SMTP personnalisé sur le domaine de l'agence (pas l'expéditeur par défaut de Supabase).
- Durée de session limitée, déconnexion automatique après inactivité, révocation immédiate des sessions quand un collaborateur quitte l'agence.
- `/admin/` : `noindex`, hors sitemap, bloqué dans `robots.txt` **et** protégé côté serveur (le `robots.txt` n'est pas une protection).
- **Pas de comptes clients publics au lancement** : « Ma sélection » est stockée dans le navigateur (localStorage), les alertes fonctionnent par email avec double opt-in. Moins de comptes = moins de surface d'attaque et moins de données personnelles.

### 20.5 Formulaires et routes serveur

Chaque route (`/api/leads`, `/api/estimation`, `/api/alerts`, `/api/alerts/confirm`, `/api/alerts/unsubscribe`) applique, dans cet ordre :
1. méthode `POST` uniquement, `Content-Type` attendu, taille de corps ≤ 16 Ko ;
2. contrôle de l'en-tête `Origin` (domaine de production ou preview autorisée) — protection CSRF ;
3. vérification serveur du jeton **Turnstile** (`siteverify`) et du champ honeypot ;
4. **limitation de débit** : règle Vercel Firewall (ex. 5 requêtes / minute / IP sur `/api/*`) + compteur applicatif en base ;
5. validation **Zod** stricte (types, longueurs, formats, liste blanche des champs) ; aucun champ inconnu accepté ;
6. insertion avec le client serveur ; le consentement enregistre la **version** du texte affiché ;
7. notification email au conseiller : contenu utilisateur **échappé**, jamais injecté dans les en-têtes (sujet, destinataire, reply-to contrôlés) ;
8. réponse générique (pas de détail d'erreur interne) ; erreurs journalisées **sans données personnelles**.

Aucun upload de fichier depuis le site public. Si l'agence en veut un plus tard : bucket privé, types MIME et taille limités, URL signées de courte durée, analyse antivirus.

### 20.6 En-têtes HTTP de sécurité

Définis dans `vercel.json` (ou le middleware) et appliqués à toutes les routes :

| En-tête | Valeur |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (inscription à la liste preload après vérification de tous les sous-domaines) |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-…' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data: https://[[projet]].supabase.co; font-src 'self'; connect-src 'self' https://[[projet]].supabase.co [[analytics]]; frame-src https://challenges.cloudflare.com [[hôtes visites virtuelles / vidéos]]; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests` — nonce sur les pages rendues côté serveur, **hashes** sur les pages statiques ; déploie d'abord en `Content-Security-Policy-Report-Only` une semaine |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `X-Frame-Options` | `DENY` (doublon de `frame-ancestors` pour les vieux navigateurs) |
| `Cross-Origin-Opener-Policy` | `same-origin` |

Cookies éventuels (session back-office) : `Secure`, `HttpOnly`, `SameSite=Lax` minimum.

### 20.7 Mise en production sur Vercel

**Environnements** — trois environnements, trois projets Supabase distincts :

| Vercel | Branche | Supabase | Données |
|---|---|---|---|
| Production | `main` | projet `aurea-prod` (Paris) | réelles |
| Preview | toute PR | projet `aurea-staging` | fictives ou anonymisées, **jamais de vrais leads** |
| Development | local | `supabase start` (Docker) | seed de test |

**Variables d'environnement** (valeurs différentes par environnement, secrets marqués *Sensitive*) : `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY_FORMS`, `SUPABASE_SECRET_KEY_IMPORT`, `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CRON_SECRET`, `ORISHA_FEED_URL`, `ORISHA_FEED_TOKEN`, `EMAIL_API_KEY`, `IP_HASH_SALT`, `REVALIDATE_TOKEN`.

**Pipeline CI (GitHub Actions), bloquant avant tout merge sur `main`** : lint + typecheck → tests unitaires → `supabase db lint` + tests pgTAP (§20.3) → build + scan du bundle (aucun `sb_secret_`) → `gitleaks` → `npm audit --audit-level=high` → Lighthouse CI (budgets §6) → scan OWASP ZAP *baseline* sur l'URL de preview. Branche `main` protégée, revue obligatoire, pas de push direct.

**Ordre de déploiement** : migrations Supabase appliquées d'abord (`supabase db push` depuis la CI, jamais depuis un poste), puis déploiement Vercel. Chaque migration est rétrocompatible avec la version précédente du code.

**Protections Vercel** :
- *Deployment Protection* (Vercel Authentication) sur toutes les previews : elles ne sont pas publiques ni indexables (`X-Robots-Tag: noindex` en plus).
- **Vercel Firewall** : règles de limitation de débit sur `/api/*` et `/admin/*`, blocage des sondes connues (`/wp-admin`, `/.env`, `/phpmyadmin`…), protection anti-bots ; *Attack Challenge Mode* documenté pour les incidents.
- Fonctions serveur épinglées en région `cdg1`.
- Domaine : apex et `www` redirigés vers une seule version canonique, certificat automatique.

**Import des annonces (Vercel Cron)** : `vercel.json` déclare `/api/cron/import-orisha` (quotidien, ou plusieurs fois par jour). La route refuse toute requête sans `Authorization: Bearer ${CRON_SECRET}`, télécharge le flux en HTTPS, valide chaque enregistrement (Zod), rejette ce qui est invalide sans bloquer le reste, fait un UPSERT idempotent, applique la détection de doublons (§4), écrit un `import_runs`, puis déclenche la revalidation des pages modifiées. Alerte email si l'import échoue ou si plus de 20 % du catalogue disparaît d'un coup (flux corrompu → on ne dépublie rien).

**Supabase en production** :
- Plan payant avec sauvegardes quotidiennes ; PITR recommandé ; **test de restauration** documenté avant la mise en ligne, puis tous les trimestres.
- SSL imposé sur les connexions directes ; restrictions réseau sur les connexions directes à la base (CI uniquement) si l'offre le permet.
- Security Advisor et Performance Advisor à **0 alerte** avant la mise en ligne, contrôlés à chaque migration.
- Accès au dashboard Supabase et à Vercel : comptes nominatifs, MFA obligatoire, rôles minimaux, **propriété au nom de l'agence**.

**Emails** : SPF, DKIM et DMARC (`p=quarantine` puis `p=reject`) configurés sur `aurea-immobilier.fr` avant le premier envoi.

### 20.8 Tâches planifiées de conformité (pg_cron)

- Suppression des leads dont `purge_after` est dépassé (durée par défaut en §21.2).
- Suppression des inscriptions aux alertes non confirmées après 7 jours, et des alertes sans ouverture depuis 3 ans.
- Purge des journaux (`audit_log`, `rate_limits`) selon leurs durées.
- Chaque exécution est elle-même journalisée.

### 20.9 Supervision et réponse à incident

- Suivi des erreurs (Sentry ou équivalent, région UE, **nettoyage des données personnelles** avant envoi), logs Vercel et Supabase, monitoring de disponibilité avec alerte.
- **Procédure de rotation des clés** écrite : créer une nouvelle clé secrète → la déployer partout → vérifier → supprimer l'ancienne. À appliquer immédiatement si une clé fuite.
- **Procédure de violation de données** : identifier, contenir, évaluer ; notification à la **CNIL sous 72 heures** si risque pour les personnes, information des personnes concernées si le risque est élevé ; registre interne des violations tenu dans tous les cas.
- Mises à jour de dépendances automatisées (Renovate ou Dependabot), revue mensuelle.
- Référentiel de contrôle : **OWASP ASVS niveau 1** comme checklist de recette.

---

## 21. Contenu des pages légales

⚠️ Ces textes engagent la responsabilité de l'agence : tu rédiges une **base complète et structurée**, en reprenant les textes scrapés (`catalog-mentions.md`, `catalog-gdpr.md`, `catalog-cookies-policy.md`) quand ils sont justes, puis tu signales en tête de chaque page « **à faire valider par un juriste avant publication** ». Toute information absente reste un `[[placeholder]]` visible.

### 21.1 Mentions légales (`/mentions-legales/`)

1. **Éditeur** : AUREA IMMOBILIER, SAS au capital de 1 000 €, RCS Pontoise 931 635 924, SIRET 931 635 924 00018, TVA FR30931635924, siège social [[adresse exacte selon le Kbis — une annonce légale de création mentionne une autre adresse que le 44 rue Nationale : à vérifier]], téléphone 01 30 63 50 50, email [[adresse pro]].
2. **Directeur de la publication** : [[nom, a priori la présidente]].
3. **Activité réglementée (loi n° 70-9 du 2 janvier 1970, dite loi Hoguet)** : carte professionnelle n° [[CPI …]] délivrée par la CCI [[…]], mentions « Transactions sur immeubles et fonds de commerce » [[et « Gestion immobilière » si la carte la porte]].
   - ⚠️ **Incohérence à lever avant publication** : le site actuel déclare que l'agence ne détient pas de fonds autres que sa rémunération, alors qu'elle propose de la **gestion locative**, qui implique normalement l'encaissement de loyers et donc une **garantie financière**. Fais-le confirmer par l'agence et adapte le texte en conséquence.
   - Garant financier : [[nom, adresse, montant]] — ou mention de non-détention de fonds si elle est exacte.
4. **Assurance RCP** : [[assureur, n° de contrat, couverture géographique]].
5. **Médiateur de la consommation** : [[nom, adresse, site]].
6. **Hébergement** :
   - Site : **Vercel Inc.**, 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis — vercel.com
   - Base de données et fichiers : **Supabase Inc.** [[adresse du siège à reprendre depuis le DPA Supabase]] — données hébergées dans l'Union européenne (région Paris)
7. **Propriété intellectuelle** : textes, photos, logo, charte appartiennent à l'agence ou à leurs auteurs ; reproduction interdite sans autorisation. **Crédits photos** et mention des **visuels générés par IA** (conservée depuis l'ancien site) : aucun visuel IA n'est présenté comme une photo réelle du bien.
8. Liens vers la politique de confidentialité, les CGU, la politique cookies et le **barème des honoraires**.
9. Date de mise à jour et version.

### 21.2 Politique de confidentialité (`/confidentialite/`)

1. **Responsable de traitement** : AUREA IMMOBILIER, contact dédié [[email pro, ex. dpo@ ou rgpd@aurea-immobilier.fr]] — remplace l'adresse Hotmail actuelle.
2. **Tableau des traitements** (une ligne par finalité) :

| Finalité | Données | Base légale | Durée de conservation (proposition à valider) |
|---|---|---|---|
| Répondre à une demande de contact ou de visite | identité, coordonnées, message, bien concerné | mesures précontractuelles (art. 6.1.b) | 3 ans après le dernier contact |
| Estimation d'un bien | identité, coordonnées, caractéristiques et adresse du bien | mesures précontractuelles | 3 ans après le dernier contact |
| Alertes email sur les nouveaux biens | email, critères | consentement (art. 6.1.a), double opt-in | jusqu'au désabonnement ; suppression après 3 ans sans interaction |
| Prospection commerciale par email | email | consentement | jusqu'au retrait du consentement |
| Exécution des mandats (vente, location, gestion) | données du mandant, du bien, pièces du dossier | contrat (art. 6.1.b) et obligations légales | durée du mandat + délais légaux de conservation [[à valider]] |
| Obligations de lutte contre le blanchiment (LCB-FT), l'agent immobilier y étant assujetti | pièces d'identité, justificatifs | obligation légale (art. 6.1.c) | 5 ans après la fin de la relation [[à valider]] |
| Sécurité du site (anti-spam, limitation de débit, journaux) | IP hachée, journaux techniques | intérêt légitime (art. 6.1.f) | 6 mois à 1 an |
| Mesure d'audience | statistiques agrégées sans cookie | intérêt légitime | [[selon l'outil]] |
| Accès au back-office | identité des collaborateurs, journaux de connexion | intérêt légitime | durée d'emploi + 1 an pour les journaux |

3. **Destinataires** : conseillers et gestionnaire de l'agence, dans la limite de leurs attributions ; aucune vente ni location de données.
4. **Sous-traitants** (tableau : nom, rôle, localisation des données, garanties) : Vercel (hébergement du site, États-Unis — Data Privacy Framework UE–États-Unis et/ou clauses contractuelles types), Supabase (base de données, UE), Cloudflare (Turnstile, anti-spam), [[service email]], [[outil d'analytics]], Orisha (logiciel métier et diffusion des annonces).
5. **Transferts hors UE** et garanties associées.
6. **Sécurité** : résumé des mesures (chiffrement en transit, contrôle d'accès par rôle, MFA, journalisation, sauvegardes, hébergement de la base en France).
7. **Droits** : accès, rectification, effacement, limitation, opposition, portabilité, retrait du consentement, directives post-mortem ; réponse sous un mois ; droit de réclamation auprès de la **CNIL** (cnil.fr).
8. **Estimation en ligne** : précise qu'aucune décision produisant des effets juridiques n'est prise de façon entièrement automatisée ; l'estimation est confirmée par un conseiller.
9. **Démarchage téléphonique** : mention et lien **Bloctel** (conservés de l'ancien site).
10. Date de mise à jour et version.

### 21.3 Conditions générales d'utilisation (`/cgu/`)

1. Objet et acceptation des CGU ; éditeur (renvoi aux mentions légales).
2. Accès au site : gratuit, sans garantie de disponibilité continue.
3. **Annonces** : informations fournies à titre indicatif et non contractuel (surfaces, photos, visuels, disponibilité) ; prix affichés **honoraires inclus** avec indication de la partie qui les supporte ; barème accessible sur `/honoraires/` ; seuls le mandat et le compromis font foi.
4. **Estimation en ligne** : fourchette indicative, qui ne constitue ni un avis de valeur signé ni une expertise.
5. **Alertes et « Ma sélection »** : fonctionnement, désabonnement en un clic, stockage local de la sélection dans le navigateur.
6. **Utilisations interdites** : extraction automatisée massive des annonces, tentative d'intrusion ou de contournement des protections, envoi de contenus illicites ou de spam via les formulaires, usurpation d'identité.
7. Propriété intellectuelle.
8. Responsabilité et liens externes.
9. Données personnelles : renvoi à la politique de confidentialité.
10. Modification des CGU (version datée), droit applicable (français), médiation de la consommation puis tribunaux compétents.

### 21.4 Politique cookies (`/cookies/`) et bandeau

- Objectif : **aucun cookie soumis à consentement au chargement**. Analytics sans cookie (Plausible, ou Matomo configuré en exemption CNIL) ; Turnstile est nécessaire à la sécurité.
- Les contenus tiers qui déposent des traceurs (Google Maps, YouTube, visites virtuelles) sont chargés **uniquement après action de l'utilisateur**, via la façade cliquable déjà prévue (§6), avec une mention du service concerné sur la façade.
- S'il reste des traceurs soumis à consentement : bandeau conforme CNIL, boutons **« Tout accepter » et « Tout refuser » de même niveau**, choix par finalité, aucun dépôt avant consentement, choix mémorisé au plus 6 mois, lien « Gérer mes cookies » permanent dans le pied de page.
- Tableau des traceurs : nom, émetteur, finalité, durée.
