# Actions hors site — AUREA Immobilier

Livrable du §16 du brief. Ces actions ne sont pas exécutables depuis le code, mais elles pèsent
au moins autant que le site lui-même sur la visibilité locale. Le pack local Google — la carte,
là où va la majorité des clics sur « agence immobilière + ville » — est déterminé en grande
partie par la fiche Google Business Profile, pas par le site.

Document à tenir à jour par l'agence. Dernière révision : 21 septembre 2026.

---

## 1. Google Business Profile — priorité absolue

### Paramétrage

| Élément | Valeur à renseigner | État |
|---|---|---|
| Catégorie principale | Agence immobilière | à vérifier |
| Catégories secondaires | Agent de gestion locative · Service d'estimation immobilière | à ajouter |
| Nom | AUREA Immobilier (exactement, sans mot-clé ajouté) | à vérifier |
| Adresse | 44 rue Nationale, 78200 Mantes-la-Jolie | à vérifier |
| Téléphone | 01 30 63 50 50 | à vérifier |
| Site | https://www.aurea-immobilier.fr/ avec UTM | à faire |
| Horaires | **à définir** — voir ci-dessous | bloquant |
| Description | Reprendre le positionnement du site, avec la zone réelle | à faire |
| Services | Vente · Achat · Location · Estimation · Gestion locative | à détailler |
| Zone desservie | Les 14 communes où nous avons une présence réelle | à renseigner |

### Cohérence NAP — le point bloquant

Les horaires publiés sur le site, sur la fiche Google et sur les annuaires doivent être
**strictement identiques**. Une divergence affaiblit directement le classement dans le pack
local.

Le site n'affiche aujourd'hui **aucun horaire** : ils étaient absents du HTML de l'ancien site
et n'ont pas été confirmés. C'est volontaire — publier des horaires approximatifs serait pire
que de n'en publier aucun. Dès que l'agence les communique, ils sont renseignés dans
`src/lib/site.ts` (`OPENING_HOURS`) et apparaissent simultanément dans le pied de page, sur la
page contact et dans le balisage `openingHoursSpecification`.

### Paramètres UTM pour le lien du site

```
https://www.aurea-immobilier.fr/?utm_source=google&utm_medium=organic&utm_campaign=gbp
```

Ils permettent de distinguer, dans l'outil de mesure, le trafic venant de la fiche de celui
venant des résultats classiques.

### Routine mensuelle

- **Chaque semaine** : une publication (nouvelle exclusivité, vente réalisée, conseil saisonnier).
- **Chaque mois** : ajouter des photos — agence, équipe, biens. Les fiches alimentées en photos
  récentes sont favorisées.
- **À 100 %** : répondre aux avis, en citant le service rendu et la commune (« Merci pour votre
  confiance lors de la vente de votre maison à Mantes-la-Ville »). Cette formulation nourrit la
  compréhension de l'activité par Google, et se retrouve dans les réponses des moteurs
  génératifs.
- **Après chaque signature** : demander un avis via le lien court du Business Profile, imprimé en
  QR code et affiché en agence.

---

## 2. Citations NAP — cohérence sur les annuaires

Même nom, même adresse, même téléphone, partout. Une divergence sur un annuaire à forte autorité
dilue le signal.

| Plateforme | Statut | Action |
|---|---|---|
| Google Business Profile | existe | compléter (voir §1) |
| RealAdvisor | **fiche repérée** dans le scraping | vérifier et revendiquer |
| PagesJaunes | à vérifier | créer ou corriger |
| Mappy | à vérifier | créer ou corriger |
| Infobel | à vérifier | créer ou corriger |
| Bing Places | à vérifier | créer |
| Apple Business Connect (Plans) | à vérifier | créer |
| Waze | à vérifier | créer |
| Yelp | à vérifier | créer ou revendiquer |
| Facebook | **URL inconnue** | à fournir par l'agence |
| Instagram, LinkedIn | **URL inconnues** | à fournir par l'agence |
| Leboncoin (boutique) | à vérifier | vérifier la cohérence |
| SeLoger, Bien'ici, Logic-Immo | diffusion via Orisha | vérifier le nom et l'adresse affichés |
| MeilleursAgents | à vérifier | revendiquer la fiche |

Le scraping n'a trouvé **aucun lien vers un compte social** sur le site actuel : seules des URL
de partage (`sharer.php`, `intent/tweet`) étaient présentes. Les comptes existent peut-être, mais
ils ne sont liés nulle part — ce qui les rend inutiles pour le `sameAs` du balisage comme pour la
consolidation de l'entité de marque. C'est une action à coût nul et à effet immédiat.

---

## 3. Backlinks locaux

Aucun achat de lien, aucun réseau de sites : sur une zone comme le Mantois, quelques liens réels
valent mieux que cent liens artificiels, et le risque de pénalité est disproportionné pour une
agence indépendante.

### L'angle le plus fort : l'étude trimestrielle des prix

La page `/prix-immobilier-mantes-la-jolie/` est conçue pour être citée. Une fois alimentée par
les données DVF et signée par la direction, elle devient un contenu que la presse locale peut
reprendre — ce qui produit exactement le type de lien qui compte.

À démarcher chaque trimestre, à la publication :

- Le Courrier de Mantes
- 78actu
- Le Parisien — édition Yvelines
- La Gazette en Yvelines

Format à leur proposer : un communiqué court, deux chiffres marquants, un tableau réutilisable,
une citation attribuée, et un contact direct.

### Partenaires réels

Le site revendique un réseau intégré : courtiers, notaires, diagnostiqueurs, architectes,
géomètres, paysagistes. Une page « Nos partenaires » réciproque est légitime — à condition que
les partenaires existent et acceptent d'y figurer. La liste reste à fournir.

### Ancrage territorial

- Associations et clubs sportifs de Mantes-la-Jolie et Mantes-la-Ville, en cas de sponsoring
- Événements locaux soutenus par l'agence
- Office de tourisme du Mantois
- CCI Versailles-Yvelines
- Fédérations professionnelles (FNAIM, SNPI) en cas d'adhésion
- Écoles et organismes de formation, via les offres d'alternance

---

## 4. Suivi GEO — être cité par les moteurs génératifs

Le site applique déjà les leviers techniques : robots IA explicitement autorisés, `llms.txt`,
rendu HTML côté serveur, réponses directes de 40 à 60 mots, chiffres sourcés et datés, guides
signés par une personne identifiée, tableaux en HTML et non en image.

Reste à mesurer. **Chaque mois**, tester le même panel de requêtes dans ChatGPT, Perplexity,
Gemini et Google AI Mode, et noter si AUREA est citée et via quelle source.

### Panel fixe (20 requêtes)

1. meilleure agence immobilière à Mantes-la-Jolie
2. agence immobilière Mantes-la-Jolie avis
3. qui peut estimer ma maison à Mantes-la-Jolie
4. estimation gratuite maison Mantes-la-Jolie
5. prix au m² Mantes-la-Jolie 2026
6. prix immobilier Mantes-la-Ville
7. acheter une maison à Mantes-la-Jolie
8. appartement à vendre Mantes-la-Jolie proche gare
9. louer un appartement à Mantes-la-Jolie
10. agence de gestion locative dans le Mantois
11. combien coûte la gestion locative à Mantes-la-Jolie
12. mandat simple ou exclusif pour vendre
13. frais de notaire Yvelines calcul
14. puis-je louer un logement classé F
15. vendre sa maison étapes et délais Yvelines
16. vivre à Mantes-la-Jolie quartiers
17. temps de trajet Mantes-la-Jolie La Défense
18. agence immobilière Limay
19. agence immobilière Rosny-sur-Seine
20. AUREA Immobilier

### Grille de relevé

| Date | Requête | Moteur | AUREA citée ? | Source citée | Concurrents cités |
|---|---|---|---|---|---|

Deux signaux à surveiller particulièrement : les moteurs génératifs s'appuient fortement sur des
**sources tierces** — fiche Google, annuaires, avis, presse. Une progression sur les §1 à §3
ci-dessus se lit directement dans ce tableau. Et lorsqu'AUREA est citée, notez **quelle page**
l'est : c'est l'indication la plus fiable de ce qu'il faut produire ensuite.

---

## 5. Mesure

- **Google Search Console** : réclamer la propriété existante. L'ancien site porte déjà une
  vérification (`google-site-verification: Kx9pGKJ2C561y8uNJ6pIXxT6G1gI5VLJAZS5ujilnfs`) —
  récupérer cet accès conserve l'historique de positions, qui ne se rattrape pas.
- **Bing Webmaster Tools** : propriété de domaine, sitemap soumis. Bing alimente Copilot et
  plusieurs moteurs génératifs.
- **Analytics sans cookie** (Plausible ou Matomo en exemption CNIL).
- **Événements de conversion** : clic téléphone, clic email, formulaire contact, estimation
  (chaque étape et l'envoi), demande de visite.
- **Tableau de bord mensuel** : positions par cluster de mots-clés, trafic organique par cluster,
  apparitions dans le pack local, leads par source, citations IA.
- **Post-migration** : suivi hebdomadaire pendant 8 semaines des 276 URL redirigées et des pages
  d'atterrissage qui perdent du trafic.
