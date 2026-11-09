# RT-Dash — Spécifications fonctionnelles

> Statut : **VALIDÉ le 2026-10-14** (version de référence pour le développement)
> Version : 0.4 · 2026-11-02 (aucune règle fonctionnelle modifiée : seuls la technique et la méthode de travail changent, voir design.md § 17 et tasks.md)
> Documents liés : [design.md](design.md) · [tasks.md](tasks.md) · [../CLAUDE.md](../CLAUDE.md)

Convention de ce document :
- Ce qui vient du cahier des charges ou de tes réponses est écrit sans marque.
- **[PROPOSITION]** = choix de ma part pour combler un manque, **validé** le 2026-10-14.
- Les identifiants (`R-…`, `US-…`, `Q-…`) servent à relier specs, design et tâches.

---

## 0. Ressources de référence (à consulter à chaque étape)

| Ressource | Rôle |
|---|---|
| [`docs/design/reference-dashboard.png`](design/reference-dashboard.png) | Référence de **structure et de style** : thème sombre, barre latérale à gauche, grandes cartes colorées, colonne de cartes à droite avec pastilles de statut, coins très arrondis, boutons en pilule. Les couleurs ne viennent **pas** de cette image mais de la palette RT-Dash ([design.md § 10](design.md)). |
| [`docs/design/maquette/`](design/maquette/) | Maquette validée, 5 écrans en `.dc.html` : `Main`, `Tickets`, `Convoi`, `Ville`, `Acces`. Référence de **code** : couleurs, tailles, espacements et textes exacts. Ces fichiers ne s'ouvrent pas seuls dans un navigateur. Leurs données sont des exemples. |
| [`docs/design/discord/message-convoi-exemple.png`](design/discord/message-convoi-exemple.png) | Capture du vrai message Discord posté par RavenBot : référence visuelle de l'aperçu Discord. |
| [`docs/design/discord/message-convoi-exemple.md`](design/discord/message-convoi-exemple.md) | **Texte source Markdown** du même message (fourni le 2026-10-13). Référence au caractère près, et jeu de test « golden ». |
| [`docs/design/truckersmp-event-36491.json`](design/truckersmp-event-36491.json) | Vraie réponse de l'API TruckersMP pour l'événement de l'exemple (récupérée le 2026-10-13 ; listes de participants vidées). |
| [`docs/design/logos/`](design/logos/) | `rt-dash-logo-white.png` / `rt-dash-logo-black.png` : logo complet, avec la mention « Administration Dashboard ». `rt-dash-mark-white.png` / `rt-dash-mark-black.png` : icône seule (le « V »). |

---

## 1. Contexte et objectif

RT-Dash est le dashboard d'administration d'une VTC (entreprise virtuelle de transport) sur **Euro Truck Simulator 2**, utilisée avec TruckersMP.

- Le site est réservé aux membres ajoutés à l'avance par un administrateur.
- Chaque rôle a ses propres outils. En v1, un seul outil existe : la **Gestion des convois** (rôle chargé d'événementiel). L'architecture doit permettre d'ajouter d'autres outils sans refonte.
- L'outil Gestion des convois facilite le traitement des demandes de convoi reçues sur Discord et **garde une trace de tout ce qui est fait**.
- Langue de l'interface : **français uniquement** (textes directement dans le code).

### 1.1 Périmètre v1

- Connexion Discord et contrôle d'accès par ID Discord et rôle.
- Panel d'administration des utilisateurs et des rôles.
- Coque du dashboard (barre latérale, en-tête, registre d'outils extensible).
- Outil Gestion des convois : tickets, convois, archive, historique, aperçu du message Discord.
- Table ville ↔ pays, avec liste initiale, apprentissage et gestion des homonymes.
- Dashboard événementiel : cartes de comptage, graphique d'activité, historique récent, prochain convoi, tickets à traiter.
- Recherche globale extensible, façon Spotlight.
- Notifications dans l'application (villes à compléter uniquement).
- Paramètres : modèle global des consignes, gestion des utilisateurs.
- Docker, CI/CD et déploiement reproductible sur VPS.

### 1.2 Hors périmètre v1

- **Envoi du message sur Discord** : prévu en **v2**, via un bot Discord déclenché par un bouton sur le site. La v1 génère déjà le texte Markdown final, avec le même code que l'aperçu (voir R-MSG-01).
- Bouton « Copier le message » : explicitement **non** demandé.
- Toute intégration Discord automatique pour la réception des tickets : ils sont ajoutés à la main.
- Outils des rôles autres que chargé d'événementiel.
- Toute suppression de données dans l'interface.

---

## 2. Rôles et accès

### 2.1 Rôles

| Code | Libellé affiché | Nature |
|---|---|---|
| `event_manager` | Chargé d'événementiel | Rôle principal |
| `communication` | Chargé de communication | Rôle principal |
| `manager` | Gestionnaire | Rôle principal |
| `hr` | RH | Rôle principal |
| `direction` | Direction | Rôle principal |
| `superadmin` | Superadmin | Rôle principal |
| `accountant` | Comptable | **Attribut cumulable** |

- **R-ROLE-01** : un utilisateur a **exactement un** rôle principal. Les rôles principaux ne se cumulent pas.
- **R-ROLE-02** : « Comptable » est un attribut (oui ou non) qui se cumule avec n'importe quel rôle principal. En v1, il ne donne aucun outil.
- **R-ROLE-03** : le superadmin peut tout faire.
- **R-ROLE-04** : la direction a accès à tous les outils et à toute l'administration, sauf aux **paramètres dangereux** (R-ROLE-05).
- **R-ROLE-05** : paramètres dangereux, réservés au superadmin :
  1. **gestion des superadmins** : donner le rôle superadmin, modifier ou désactiver un compte superadmin ;
  2. **désactiver l'accès d'un compte direction**.
- **R-ROLE-06** : l'ajout d'utilisateurs et l'attribution des rôles se font dans le panel d'administration, par la direction (cas principal) et par le superadmin, dans les limites de R-ROLE-05.
- **R-ROLE-07 [PROPOSITION]** : personne ne peut modifier son **propre** rôle ni désactiver son propre compte, pour éviter de se retirer l'accès par erreur.
- **R-ROLE-08 [PROPOSITION]** : un compte n'est jamais supprimé, seulement **désactivé** ou réactivé, par cohérence avec « rien n'est supprimé ». Un compte désactivé est traité comme non enregistré (R-ACC-03).

### 2.2 Matrice des droits (v1)

| Droit | Événementiel | Communication | Gestionnaire | RH | Direction | Superadmin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Se connecter et voir l'accueil | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Outil Gestion des convois (tickets, convois, archive, historique) | ✓ | – | – | – | ✓ | ✓ |
| Compléter ou modifier les villes et pays (pop-up et page) | ✓ | – | – | – | ✓ | ✓ |
| Paramètres de l'outil convois (modèle des consignes, valeurs par défaut) | ✓ | – | – | – | ✓ | ✓ |
| Gérer les utilisateurs (hors superadmins) | – | – | – | – | ✓ | ✓ |
| Désactiver un compte direction | – | – | – | – | – | ✓ |
| Gérer les superadmins | – | – | – | – | – | ✓ |

L'attribut Comptable n'ajoute aucun droit en v1.

- **R-ROLE-09** : **principe général des droits.** Chaque outil appartient à un ou plusieurs rôles « propriétaires ». Ces rôles l'utilisent **et** gèrent ses paramètres. La direction et le superadmin ont accès à tout et peuvent tout modifier, sauf les paramètres dangereux réservés au superadmin (R-ROLE-05). Un rôle ne peut pas modifier l'outil ni les paramètres d'un autre rôle (ex. un chargé d'événementiel ne touche pas aux outils des gestionnaires). Les rôles non propriétaires ne voient pas l'outil.

### 2.3 Connexion et contrôle d'accès

- **R-ACC-01** : la seule méthode de connexion est **Discord** (OAuth).
- **R-ACC-02** : être connecté à Discord ne donne accès à **rien** par défaut. L'accès exige un enregistrement préalable : ID Discord + rôle principal, compte actif.
- **R-ACC-03** : si l'ID Discord n'est pas enregistré, si aucun rôle n'est attribué ou si le compte est désactivé, toutes les pages redirigent vers **« Vous n'avez pas accès »** (maquette `Acces`). Cette page affiche le pseudo Discord connecté. La **seule action possible est « Se déconnecter »**.
- **R-ACC-04** : les droits sont vérifiés **côté serveur** à chaque page et à chaque action. Masquer un bouton ne suffit pas.
- **R-ACC-05** : un changement de rôle ou une désactivation prend effet à la requête suivante de l'utilisateur concerné, sans attendre une nouvelle connexion.
- **R-ACC-06 [PROPOSITION]** : le nom affiché (« Bonjour, Nathan ») et l'initiale de l'avatar viennent du profil Discord. Ils sont mis à jour à chaque connexion. L'administrateur ne saisit que l'ID Discord, le rôle et l'attribut comptable.
- **R-ACC-07** : le **premier superadmin** est créé au déploiement à partir de la variable d'environnement `BOOTSTRAP_SUPERADMIN_DISCORD_ID`. Valeur fournie : `640173855096307712`.

### 2.4 Extensibilité des outils

- **R-TOOL-01** : chaque outil se déclare dans un registre : identifiant, libellé, icône, entrées de menu, rôles autorisés, widgets du dashboard, fournisseurs de recherche et de notifications.
- **R-TOOL-02** : la barre latérale, l'accueil, la recherche et les notifications se construisent à partir de ce registre, filtré selon les droits de l'utilisateur. Ajouter un outil = ajouter un module et sa déclaration, sans modifier la coque.
- **R-TOOL-03 [PROPOSITION]** : un utilisateur sans aucun outil (communication, gestionnaire, RH en v1) voit un accueil avec le message « Aucun outil n'est encore disponible pour votre rôle » (voir Q-10).

---

## 3. Parcours utilisateurs par rôle

### 3.1 Utilisateur non autorisé
1. Clique sur « Se connecter avec Discord » et accepte sur Discord.
2. Arrive sur « Vous n'avez pas accès », avec son pseudo Discord.
3. Ne peut que se déconnecter.

### 3.2 Chargé d'événementiel
1. Se connecte et arrive sur le **Dashboard événementiel** (maquette `Main`).
2. Reçoit un ticket sur Discord, ouvre **Tickets** et colle le **lien TruckersMP** dans « Ajouter un ticket », puis clique « Récupérer les infos ».
3. Le site récupère les données de l'API TruckersMP et crée le ticket au statut **Nouveau**.
4. Si une ville n'a pas de pays connu, ou si elle est homonyme, le **pop-up « Villes à compléter »** s'ouvre (maquette `Ville`). Il peut compléter ou repousser (« Plus tard »).
5. Un chargé prend en charge le ticket : il passe **En analyse** et ce chargé en devient la personne qui traite. N'importe quel autre chargé peut reprendre la main.
6. Après analyse, il **accepte** le ticket (un convoi est créé) ou le **refuse** (motif obligatoire). Un retour en arrière reste possible tant que le ticket n'est pas archivé.
7. Sur le **convoi** (maquette `Convoi`), il complète et modifie tous les champs. L'**aperçu Discord** se met à jour en direct.
8. 6 h après l'heure de départ, ticket et convoi passent automatiquement dans l'**Archive**, en lecture seule.

### 3.3 Direction
- Tout le parcours du chargé d'événementiel.
- **Paramètres → Utilisateurs** : ajouter un utilisateur (ID Discord + rôle + comptable), changer un rôle, désactiver ou réactiver un compte, dans les limites de R-ROLE-05.
- **Paramètres → Outil convois** : modèle global des consignes et valeurs par défaut (aussi accessible aux chargés d'événementiel).

### 3.4 Superadmin
- Tout ce que fait la direction, plus les paramètres dangereux (R-ROLE-05).

### 3.5 Chargé de communication, gestionnaire, RH (comptable ou non)
- Se connectent et voient l'accueil sans outil (R-TOOL-03). Aucun accès à l'outil convois.

---

## 4. User stories

### Accès et administration
- **US-01** — En tant que visiteur non enregistré, je vois « Vous n'avez pas accès » après la connexion Discord et je ne peux que me déconnecter.
- **US-02** — En tant que membre enregistré, je me connecte avec Discord et j'arrive sur mon accueil, avec les outils de mon rôle.
- **US-03** — En tant que direction, j'ajoute un utilisateur avec son ID Discord, son rôle principal et, si besoin, l'attribut comptable.
- **US-04** — En tant que direction, je change le rôle d'un utilisateur. Le changement s'applique à sa requête suivante.
- **US-05** — En tant que direction, je désactive ou réactive un compte (hors direction et superadmin).
- **US-06** — En tant que superadmin, je gère les superadmins et je peux désactiver un compte direction.
- **US-07** — En tant que direction, je ne vois pas les actions réservées au superadmin, et le serveur les refuse si je tente de les appeler.

### Tickets
- **US-10** — En tant que chargé, je colle un lien TruckersMP et le ticket est créé, prérempli par l'API.
- **US-11** — En tant que chargé, si le lien est invalide ou si l'événement n'existe pas, je vois un message d'erreur clair et aucun ticket n'est créé. Si l'API ne répond pas, je peux créer le ticket à la main (R-TKT-05).
- **US-12** — En tant que chargé, je vois la liste des tickets avec des onglets (Tous, Nouveau, En analyse, Accepté, Refusé, Archive) et leur nombre.
- **US-13** — En tant que chargé, je prends en charge un ticket, même s'il est déjà traité par quelqu'un d'autre. Il passe En analyse et j'en deviens la personne qui traite.
- **US-14** — En tant que chargé, j'accepte un ticket (Nouveau ou En analyse) : un convoi est créé avec toutes les données TruckersMP.
- **US-15** — En tant que chargé, je refuse un ticket en saisissant un **motif obligatoire**. Le motif s'affiche sous le nom dans la liste.
- **US-19** — En tant que chargé, je remets un ticket dans un statut précédent (ex. Accepté → En analyse) ; le convoi est masqué sans perte de données.
- **US-16** — En tant que chargé, j'archive à la main un ticket **Refusé** sans attendre sa date.
- **US-17** — En tant que chargé, je consulte l'historique complet d'un ticket.
- **US-18** — En tant que chargé, je clique « Actualiser » pour récupérer à nouveau les données TruckersMP. Je vois les différences et je confirme avant que quoi que ce soit soit remplacé.

### Convois
- **US-20** — En tant que chargé, je modifie n'importe quel champ du convoi. Chaque modification est enregistrée avec l'ancienne et la nouvelle valeur.
- **US-21** — En tant que chargé, je vois l'aperçu Discord se mettre à jour pendant que je tape.
- **US-22** — En tant que chargé, je remplace l'image du trajet par une image envoyée depuis mon ordinateur.
- **US-23** — En tant que chargé, je modifie les consignes d'un convoi sans changer le modèle global.
- **US-24** — En tant que chargé, je consulte l'historique complet du convoi, étapes du ticket comprises.

### Villes
- **US-30** — En tant que chargé, après l'ajout d'un ticket, un pop-up me montre les villes sans pays (et les homonymes à confirmer) pour que je les complète.
- **US-31** — En tant que chargé, quand je saisis le pays d'une ville inconnue, il est mémorisé et la ville est reconnue la fois suivante.
- **US-32** — En tant que chargé, pour une ville homonyme, je choisis le pays parmi les candidats. Mon choix devient la valeur proposée par défaut la fois suivante.
- **US-33** — En tant que chargé, je consulte et modifie la liste des villes dans « Villes et pays », et je vois la source de chaque ville (liste initiale ou apprise).
- **US-34** — En tant que chargé, la cloche et la carte de la barre latérale m'indiquent combien de villes sont à compléter.

### Dashboard, recherche
- **US-40** — En tant que chargé, je vois sur le dashboard les compteurs Nouveaux, En analyse et Convois à venir, le graphique d'activité, l'historique récent, le prochain convoi et les tickets à traiter.
- **US-41** — En tant qu'utilisateur, j'ouvre la recherche (loupe ou Ctrl/⌘+K). Je trouve tickets, convois (archive comprise) et villes, ainsi que des pages et des actions, avec une recherche tolérante aux fautes et aux accents.

---

## 5. Règles métier — tickets

### 5.1 Ajout
- **R-TKT-01** : le formulaire d'ajout ne contient **que le lien TruckersMP**. Tout le reste est rempli par l'API.
- **R-TKT-02** : formats acceptés : `https://truckersmp.com/events/{id}`, avec ou sans le suffixe de slug (`/events/36491-limpens-franco-bohemian-convoy`), avec ou sans `www.` ou `/` final. L'`{id}` numérique est extrait.
- **R-TKT-03** : le ticket est créé au statut **Nouveau**, avec `créé par` et l'horodatage, et une entrée d'historique « a ajouté le ticket avec le lien TruckersMP ».
- **R-TKT-04** : un même événement TruckersMP ne peut pas avoir deux tickets non archivés. Le formulaire signale le doublon et propose un lien vers le ticket existant.
- **R-TKT-05** : **API TruckersMP indisponible** (pas de réponse, délai dépassé, erreur serveur) : le formulaire propose « Créer quand même sans les données TruckersMP ». **[PROPOSITION]** On saisit alors le lien (obligatoire, pour l'identifiant de l'événement et le contrôle des doublons), puis le nom du convoi, l'entreprise, la date, l'heure de RDV et l'heure de départ (obligatoires, car nécessaires à la liste et à l'archivage). Les villes et lieux sont facultatifs. Le ticket porte une pastille « Données TruckersMP manquantes ». Dès que l'API répond à nouveau, « Actualiser » (§ 5.4) remplit les champs. Si le lien est invalide ou l'événement introuvable (404), il n'y a **pas** de création manuelle.
- **R-TKT-06** : le **lien TruckersMP** est toujours visible et cliquable. C'est un texte cliquable « Voir sur TruckersMP ↗ » qui s'ouvre dans un nouvel onglet : sous le nom dans la liste des tickets, sur le détail du ticket et dans l'en-tête du convoi.

### 5.2 Statuts et transitions

Parcours habituel : `Nouveau → En analyse → Accepté (convoi créé) ou Refusé`.

- **R-TKT-10** : les statuts sont Nouveau, En analyse, Accepté, Refusé. **Toutes les transitions sont permises**, retours en arrière compris, et l'acceptation ou le refus directement depuis Nouveau. Chaque changement est tracé (qui, quand, ancien → nouveau statut).
- **R-TKT-11** : passer à **Refusé** exige un **motif** non vide, saisi à chaque refus. Le motif s'affiche sous le nom du convoi dans la liste (maquette `Tickets`). Quand on quitte Refusé, le motif reste dans l'historique.
- **R-TKT-12** : passer à **Accepté** crée le convoi (première fois) ou le fait réapparaître (fois suivantes). Quitter Accepté **masque** le convoi sans rien effacer : ses données réapparaissent telles quelles s'il est de nouveau accepté.
- **R-TKT-13** : un ticket Accepté **reste** dans « Tickets » (statut Accepté), avec un bouton « Voir le convoi ». Un ticket non accepté n'a pas de convoi visible.
- **R-TKT-14** : **tout membre ayant l'outil peut traiter n'importe quel ticket**, quel que soit le responsable actuel. « Traité par » affiche la dernière personne qui a pris en charge, accepté ou refusé le ticket. « Analyser » et « Reprendre » (maquette) ouvrent le ticket ; « Prendre en charge » fait de soi le responsable.
- **R-TKT-15** : un ticket **archivé** ne change plus de statut (R-ARC-05).

### 5.3 Informations affichées pour un ticket (infos de base)
Nom du convoi (affichage), nom de l'entreprise, date, heure de RDV, heure de départ, statut, personne qui traite. Pour un ticket refusé, le motif en plus. Colonnes de la maquette : Convoi, Entreprise, Date, RDV, Départ, Statut, Traité par, Action.

- **R-TKT-20 [PROPOSITION]** : ticket et convoi sont une **seule fiche**. Les infos de base affichées sur le ticket sont donc toujours celles du convoi, même après modification (aucune divergence possible). Voir design.md § 4.

### 5.4 Actualiser depuis TruckersMP
- **R-TKT-30** : le bouton « Actualiser » est disponible sur un ticket ou un convoi **non archivé**.
- **R-TKT-31** : il récupère à nouveau l'événement et affiche, champ par champ, les différences pour les seuls champs issus de l'API (§ 7.1) : valeur actuelle → nouvelle valeur.
- **R-TKT-32 [PROPOSITION]** : chaque différence est cochée par défaut et peut être décochée. Rien n'est remplacé sans confirmation. Les champs appliqués sont tracés dans l'historique (action « a actualisé depuis TruckersMP », ancienne et nouvelle valeur).

---

## 6. Règles métier — convois

- **R-CNV-01** : un convoi est créé **uniquement** par l'acceptation d'un ticket. Il porte toutes les informations récupérées via l'API, **toutes modifiables**.
- **R-CNV-02** : champs d'un convoi : tous ceux du message Discord (§ 8), plus le **nom du convoi (affichage)** et l'**image du trajet**.
- **R-CNV-03** : l'en-tête du convoi affiche « Accepté par {nom} le {date} à {heure} » (maquette `Convoi`).
- **R-CNV-04** : le bouton « Enregistrer » enregistre les modifications. Chaque champ modifié produit une ligne d'historique avec l'ancienne et la nouvelle valeur (« Lina a modifié l'heure de départ : 21:00 → 21:30 »).
- **R-CNV-05** : les consignes d'un convoi sont initialisées avec le **modèle global** au moment de la création du convoi, puis modifiables convoi par convoi. Changer le modèle global ne modifie pas les convois existants.
- **R-CNV-06** : l'image du trajet est l'image `map` de TruckersMP, **copiée dans notre stockage à la première acceptation** du ticket. Elle peut être **remplacée par un envoi de fichier**.
- **R-CNV-08** : **valeurs par défaut** des champs manuels (Cibi, Pause, GPS, Distance, Cargaison, Lien TB) dans les **paramètres de l'outil convois**. À la première acceptation, elles remplissent les champs **encore vides**, sans jamais écraser une saisie. **[PROPOSITION]** Valeurs initiales reprises du message réel : Cibi « CIBI CONVOI DISCORD », Pause « Aucune », GPS « Le plus rapide » ; Distance, Cargaison et Lien TB vides (propres à chaque convoi).
- **R-CNV-09** : l'accent grave `` ` `` est **refusé** dans tous les champs affichés en code dans le message (Serveur, DLCs, Cibi, villes, lieux, GPS, Distance, Cargaison), car il casserait le rendu Discord. Une valeur préremplie par l'API qui en contient est signalée à corriger avant l'enregistrement.
- **R-CNV-07 [PROPOSITION]** : formats d'image acceptés : PNG, JPEG, WebP, 8 Mo maximum.

---

## 7. Données TruckersMP et règles de saisie

### 7.1 Ce que fournit réellement l'API (vérifié le 2026-10-13)

La page de documentation officielle (`truckersmp.com/developers/api`) est protégée par une vérification anti-bot Cloudflare. Elle n'a donc pas pu être lue automatiquement. Les champs ci-dessous viennent des **vraies réponses** de `GET https://api.truckersmp.com/v2/events/36491` (fichier [`truckersmp-event-36491.json`](design/truckersmp-event-36491.json)) et de `GET /v2/events`.

Champs présents : `id`, `event_type{key,name}`, `name`, `slug`, `game`, `server{id,name}`, `language`, `departure{location,city}`, `arrive{location,city}`, `meetup_at`, `start_at` (format `AAAA-MM-JJ HH:MM:SS`, en UTC), `banner` (URL), `map` (URL d'image), `description` et `rule` (Markdown libre), `voice_link`, `external_link`, `featured`, `vtc{id,name}`, `user{id,username}`, `attendances{…}`, `dlcs` (objet `{id: nom}`, ou `[]` si vide), `url`, `created_at`, `updated_at`.

**L'API ne fournit pas** : pays, distance (seulement dans la description libre), GPS, cargaison, pause, Cibi, consignes, lien TrucksBook.

### 7.2 Correspondance champ par champ (décidée avec toi)

| Champ du convoi | Source | Préremplissage | Exemple 36491 (API → message réel) |
|---|---|---|---|
| Nom du convoi (affichage) | API `name` | oui, modifiable | « Limpens Franco-Bohemian Convoy » |
| Entreprise | API `vtc.name` **si** `vtc.id ≠ 0`, sinon vide | modifiable | API vide → saisi « Limpens Trasporti Italy » |
| Date + heure de départ | API `start_at` (UTC) → Europe/Paris | modifiable | 2026-11-07 20:30 UTC → samedi 7 novembre, **21H30** ✅ |
| Heure de RDV | API `meetup_at` (UTC) → Europe/Paris | modifiable | 19:30 UTC → **20H30** ; le message réel dit **21H00** (corrigé à la main) |
| Serveur | API `server.name` | modifiable | « Event Server » ; le message réel dit « Non défini » |
| DLCs | API `dlcs` : noms séparés par `, ` ; liste vide → « Aucun » | modifiable | `[]` → « Aucun » ✅ |
| Cibi | saisie manuelle | valeur par défaut (R-CNV-08) | « CIBI CONVOI DISCORD » |
| Ville de départ | API `departure.city` | modifiable | « Reims » |
| Pays de départ | table ville ↔ pays (§ 9) | auto | « France » |
| Lieu de départ | API `departure.location` | modifiable | « Steinbruch » |
| Pause | saisie manuelle | valeur par défaut (R-CNV-08) | « Aucune » |
| Ville d'arrivée | API `arrive.city` | modifiable | « Prague » |
| Pays d'arrivée | table ville ↔ pays | auto | « République tchèque » |
| Lieu d'arrivée | API `arrive.location` | modifiable | « Steinbruch » |
| GPS | saisie manuelle | valeur par défaut (R-CNV-08) | « Le plus rapide » |
| Distance | saisie manuelle | valeur par défaut (R-CNV-08) | « ~1173 KM + 2 POINTS » |
| Cargaison | saisie manuelle | valeur par défaut (R-CNV-08) | « -10 Tonnes » |
| Lien TMP | construit depuis `id` : `https://truckersmp.com/events/{id}` | modifiable | `https://truckersmp.com/events/36491` ✅ |
| Lien TB (TrucksBook) | saisie manuelle | valeur par défaut (R-CNV-08) | vide |
| Consignes | modèle global (R-CNV-05) | modifiable | 2 lignes (profil + tag MP) |
| Image du trajet | API `map`, copiée à l'acceptation | remplaçable par envoi | URL `static.truckersmp.com/.../map/36491…png` |

### 7.3 Dates, heures et fuseau
- **R-TIME-01** : les dates de TruckersMP sont stockées telles quelles, en **UTC** (horodatage avec fuseau).
- **R-TIME-02** : tout affichage et toute saisie se font dans le fuseau **Europe/Paris**. La conversion passe par la base des fuseaux (IANA), ce qui gère le **changement d'heure** (été UTC+2, hiver UTC+1). Exemple : 20:30 UTC donne 21H30 le 7 novembre, mais 22H30 en juillet.
- **R-TIME-03** : le texte de date du message (« samedi 7 novembre ») est **toujours généré** à partir de la date de départ en Europe/Paris, en français : jour de la semaine, numéro du jour sans zéro, mois en toutes lettres, en minuscules. Il n'est pas modifiable directement : on modifie la date elle-même.
- **R-TIME-04** : dans le formulaire du convoi, la date est un sélecteur de date, et le RDV et le départ sont des heures `HH:MM` (Europe/Paris).
- **R-TIME-05 [PROPOSITION]** : le RDV est rattaché à la date du départ. Si l'heure de RDV saisie est après l'heure de départ, le RDV est considéré comme la veille (cas d'un RDV avant minuit pour un départ après minuit).
- **R-TIME-06 [PROPOSITION]** : une heure locale qui n'existe pas (passage à l'heure d'été, ex. 02:30 le dernier dimanche de mars) est refusée avec un message. Une heure ambiguë (passage à l'heure d'hiver) prend la première occurrence.
- **R-TIME-07** : affichage des heures dans le message : `21:00` devient `21H00`. **[PROPOSITION]** l'heure est sur deux chiffres (`09H00`) (Q-14).

---

## 8. Message Discord

### 8.1 Principes
- **R-MSG-01** : le texte du message est produit par **une seule fonction**, utilisée à la fois pour l'aperçu en direct (v1) et pour le texte envoyé par le futur bot (v2).
- **R-MSG-02** : c'est du **Markdown Discord** (titres `#` et `##`, citation `>`, gras, italique, code en ligne, lien brut, emojis) suivi d'une **image en pièce jointe**. Ce n'est **pas** un embed.
- **R-MSG-03** : l'aperçu reproduit fidèlement le rendu Discord, **thème sombre par défaut** (fond `#313338`). Le fond violet de la capture vient d'un thème personnalisé et est ignoré.
- **R-MSG-04** : l'aperçu se met à jour **en direct** pendant la saisie, avant tout enregistrement.
- **R-MSG-05** : les réactions (✅ ❌) sont ajoutées par les membres sur Discord. L'application ne les génère pas. L'aperçu peut en montrer à titre d'exemple, comme la maquette.
- **R-MSG-06** : le titre suit toujours le format `INVITATION CONVOI - {date} - {entreprise}`.

### 8.2 Format exact (source)

Gabarit déduit du message réel ([`message-convoi-exemple.md`](design/discord/message-convoi-exemple.md)). `·` marque un espace significatif en fin de ligne, `⏎` une ligne vide. Les lignes « RDV », « TMP » et « TB » commencent par **10 espaces**.

```text
# INVITATION CONVOI - {date} - {entreprise}
⏎
⏎
> **{consignes ligne 1}
> {consignes ligne 2}
> {… consignes ligne n}**
⏎
## INFORMATIONS GÉNÉRALES
⏎
🗓️** Date :** `{date}`
🕤** Horaires :**
          RDV : `{rdv}` | Départ : `{départ}`
💻 **Serveur :** `{serveur}`
🗺️ **DLCs :** `{dlcs}`
🔊 **Cibi :** `{cibi}`
⏎
## TRAJET
⏎
🟩 **Départ :** `{ville départ} ({pays départ}) | {lieu départ}`
🟧 **Pause :** {pause}
🟥 **Arrivée :** `{ville arrivée} ({pays arrivée}) | {lieu arrivée}`
📌 **GPS :** `{gps}`·
📏 **Distance :** `{distance}`
📦 **Cargaison :** `{cargaison}`
⏎
⏎
🔗 **LIENS :**  *(Inscription requise)*
          TMP : {lien TMP}
          TB :·{lien TB}
⏎
**MERCI DE PRÉVENIR DE VOTRE PRÉSENCE:
PRÉSENT ✅ | NON ❌ | INCERTAIN  ⚠️**
```
Puis, hors texte : **l'image du trajet en pièce jointe**.

Points d'attention, à reproduire **exactement** :
- `🗓️** Date :**` et `🕤** Horaires :**` : pas d'espace entre l'emoji et `**`, et un espace **à l'intérieur** du gras. Les autres lignes ont `emoji␠**Libellé :**`.
- L'emoji des horaires est 🕤 (9 h 30), pas 🕙.
- Les consignes sont une citation : chaque ligne commence par `> `. Le gras s'ouvre au début de la première ligne et se ferme à la fin de la dernière.
- Deux espaces dans `**LIENS :**  *(Inscription requise)*` et dans `INCERTAIN  ⚠️`.
- « Pause » n'est **pas** en code en ligne. Les liens TMP et TB ne sont pas en code.
- Le bloc final en gras s'étend sur deux lignes.
- Emojis exacts (points de code) : 🗓️ U+1F5D3 U+FE0F · 🕤 U+1F564 · 💻 U+1F4BB · 🗺️ U+1F5FA U+FE0F · 🔊 U+1F50A · 🟩 U+1F7E9 · 🟧 U+1F7E7 · 🟥 U+1F7E5 · 📌 U+1F4CC · 📏 U+1F4CF · 📦 U+1F4E6 · 🔗 U+1F517 · ✅ U+2705 · ❌ U+274C · ⚠️ U+26A0 U+FE0F.
- Le fichier de référence, créé à partir de ton collage, est considéré comme exact (Q-01).

### 8.3 Pays dans Départ et Arrivée
- **R-MSG-10** : le pays vient de la table ville ↔ pays (§ 9), en français (ex. « République tchèque »).
- **R-MSG-11** : si le pays est inconnu, l'aperçu affiche `{ville} (pays à compléter) | {lieu}` (texte de la maquette). Le champ « Pays (auto) » du formulaire devient un bouton violet « Pays à compléter · Compléter » qui ouvre le pop-up.

### 8.4 Jeu de test de référence
Avec les données suivantes, la fonction doit produire **exactement** le contenu de [`message-convoi-exemple.md`](design/discord/message-convoi-exemple.md) :

| Champ | Valeur |
|---|---|
| Entreprise | Limpens Trasporti Italy |
| Date de départ | 2026-11-07, 21:30 Europe/Paris (= 20:30 UTC) → « samedi 7 novembre », « 21H30 » |
| RDV | 21:00 → « 21H00 » |
| Serveur | Non défini |
| DLCs | Aucun |
| Cibi | CIBI CONVOI DISCORD |
| Départ | Reims (France) \| Steinbruch |
| Pause | Aucune |
| Arrivée | Prague (République tchèque) \| Steinbruch |
| GPS | Le plus rapide |
| Distance | ~1173 KM + 2 POINTS |
| Cargaison | -10 Tonnes |
| Lien TMP | https://truckersmp.com/events/36491 |
| Lien TB | (vide) |
| Consignes | `Utiliser le Profil Convoi et le "RENAULT T EVOLUTION" comme véhicule (Profil obligatoire depuis le 1 Mars 2026)` ⏎ `TAG MP  ➡ RAVEN TRANSPORT (Couleur R:255 G:195 B:0)` |

---

## 9. Villes et pays (auto-apprentissage)

- **R-CITY-01** : une table ville ↔ pays est préremplie avec le maximum de villes d'ETS2, **jeu de base et DLC cartes**. Les villes ProMods ne sont pas importées : elles sont apprises (R-CITY-02b).
- **R-CITY-02** : **source** : extraction des fichiers de définition du jeu (`def/city/*.sui` : nom et pays de chaque ville) depuis ton ETS2 installé (jeu de base + tous les DLC cartes, confirmé), par un script d'import versionné. **Aucune correspondance n'est saisie de mémoire.** Les noms de pays en français viennent de la traduction française du jeu. Méthode de vérification : design.md § 8.
- **R-CITY-02b** : **ProMods** : aucun fichier ProMods n'est extrait, et aucune liste trouvée sur Internet n'est utilisée (décision du 2026-10-15). Les villes ProMods, rares dans les convois, sont **apprises au fil de l'eau** via le pop-up (R-CITY-05). Aucune distinction n'est faite entre villes ProMods et villes du jeu de base.
- **R-CITY-03** : chaque ville a une **source** : `Liste initiale` (import) ou `Apprise` (saisie dans l'application).
- **R-CITY-04** : une ville inconnue **ne bloque rien**. Dès que le ticket est ajouté et ses données récupérées, le pop-up « Villes à compléter » liste les villes sans pays, avec leur rôle (Départ ou Arrivée), et permet de choisir le pays dans une liste. « Plus tard » ferme sans rien enregistrer.
- **R-CITY-05** : **apprentissage** : enregistrer le pays d'une ville inconnue la crée en base (source `Apprise`). Elle est reconnue automatiquement la fois suivante. Texte de la maquette : « Les villes enregistrées sont ajoutées à la liste et reconnues automatiquement la prochaine fois. »
- **R-CITY-06** : **homonymes** (même nom dans plusieurs pays) : le pop-up demande de choisir parmi les pays candidats. Le dernier choix est **mémorisé** et proposé par défaut la fois suivante, mais la confirmation est redemandée à chaque nouveau ticket.
- **R-CITY-07** : la reconnaissance ignore la casse, les accents et les espaces superflus (« reims », « Reims ␠» et « REIMS » correspondent).
- **R-CITY-08** : la page **« Villes et pays »** liste toutes les villes (nom, pays, source), avec recherche et filtres par source et par pays. Elle permet de modifier le pays d'une ville et d'ajouter une ville. Chaque modification est historisée.
- **R-CITY-09 [PROPOSITION]** : compléter une ville met à jour tous les tickets et convois **non archivés** qui l'attendaient. Les éléments archivés ne changent jamais.
- **R-CITY-10 [PROPOSITION]** : chaque ticket ou convoi garde le pays choisi pour lui. Modifier plus tard une ville dans la table ne réécrit pas les convois déjà résolus.
- **R-CITY-11** : la liste des pays proposés dans le pop-up est celle des pays importés du jeu (jeu de base + DLC cartes), plus les pays appris (R-CITY-12).
- **R-CITY-12** : si le pays d'une ville n'est pas dans la liste (cas des pays propres à ProMods), le pop-up propose, en bas de la liste, **« Autre pays… »** : on saisit le nom du pays en français, il est créé (source `Appris`), historisé et proposé ensuite à tout le monde. Le même ajout est possible sur la page « Villes et pays ». Un pays déjà présent (même nom, sans tenir compte de la casse, des accents ni des espaces) n'est pas recréé. Élément hors maquette `Ville` : capture à valider.

---

## 10. Traçabilité

- **R-AUD-01** : **rien n'est supprimé**. L'interface n'offre aucune suppression, et la base la refuse aussi (design.md § 6).
- **R-AUD-02** : chaque étape enregistre **qui** et **quand** : créé, pris en charge, accepté, refusé, modifié, actualisé, archivé.
- **R-AUD-03** : chaque modification de champ garde **l'ancienne et la nouvelle valeur**.
- **R-AUD-04** : l'historique s'affiche sur le ticket **et** sur le convoi, du plus récent au plus ancien : avatar, nom, phrase d'action, date et heure (« 13 oct. 2026 · 09:18 »).
- **R-AUD-05** : l'archivage automatique est attribué à **« Système »**.
- **R-AUD-06 [PROPOSITION]** : sont aussi historisés les ajouts et modifications de villes, les changements de comptes utilisateurs (ajout, rôle, désactivation) et ceux du modèle de consignes, et ils sont consultables dans leurs pages respectives.

---

## 11. Archivage

- **R-ARC-01** : un ticket est archivé automatiquement **6 h après son heure de départ**, quel que soit son statut (Nouveau, En analyse, Accepté, Refusé). Son convoi l'est en même temps.
- **R-ARC-02** : la durée est de 6 heures **réelles** après l'instant de départ, même un jour de changement d'heure.
- **R-ARC-03** : si l'heure de départ d'un convoi est modifiée, l'échéance d'archivage suit la nouvelle heure.
- **R-ARC-04** : un ticket **Refusé** peut être archivé **à la main** avant cette échéance, par les rôles de l'outil, avec historique.
- **R-ARC-05** : un élément archivé est en **lecture seule** : aucune modification, aucun changement de statut, aucun « Actualiser », aucun changement de pays. Seuls la consultation, l'historique et le lien TruckersMP restent disponibles.
- **R-ARC-06** : les éléments archivés sont visibles dans l'onglet « Archive » des Tickets et dans l'entrée « Archive » de la barre latérale.
- **R-ARC-07 [PROPOSITION]** : le passage en archive est vérifié toutes les 5 minutes. De plus, un élément dont l'échéance est passée est **déjà** traité comme en lecture seule, même si la vérification n'a pas encore eu lieu.

---

## 12. Dashboard, recherche, notifications, paramètres

### Dashboard événementiel (maquette `Main`)
- **R-DSH-01** : trois grandes cartes : **Tickets nouveaux** (jaune, « À analyser », nombre de tickets Nouveau non archivés), **En analyse** (violet, « En cours de traitement »), **Convois à venir** (lilas clair, « Acceptés, pas encore passés » : tickets acceptés dont le départ est dans le futur).
- **R-DSH-02** : **Activité des tickets** : deux courbes, « Reçus » (tickets créés) et « Acceptés » (acceptations), sur les 4 dernières semaines (Q-21).
- **R-DSH-03** : **Historique récent** : les 3 dernières actions de l'outil (« Lina a accepté « Reims – Prague » · il y a 12 min »).
- **R-DSH-04** : **Prochain convoi** : le convoi accepté au départ le plus proche, avec pastille de date, nom, entreprise, trajet, RDV, départ.
- **R-DSH-05** : colonne **Tickets à traiter** : tickets Nouveau et En analyse, plus les convois acceptés à venir (maquette), avec pastille de statut et bouton d'action (« Analyser », « Reprendre », « Voir le convoi »), et un lien « Tout voir ».
- **R-DSH-06** : en-tête : « Bonjour, {prénom} », sous-titre, boutons Recherche et Notifications, avatar avec nom et rôle.

### Recherche (façon Spotlight)
- **R-SRC-01** : ouverture par la loupe de l'en-tête ou par **Ctrl+K / ⌘+K**. Fenêtre centrale avec un champ de saisie et des résultats groupés, navigables au clavier.
- **R-SRC-02** : v1 : tickets et convois (**archive comprise**, signalée par une pastille), villes, ainsi que **pages et actions** (ex. « Ajouter un ticket », « Villes et pays »).
- **R-SRC-03** : recherche tolérante (accents, casse, fautes légères, mots partiels).
- **R-SRC-04** : chaque outil fournit ses propres résultats via le registre (R-TOOL-01). Un outil futur s'y branche sans toucher à la recherche. Les résultats sont filtrés selon les droits de l'utilisateur.

### Notifications
- **R-NOT-01** : la cloche affiche un badge avec le nombre de **villes à compléter** (villes sans pays, ou homonymes non confirmés, sur des tickets non archivés).
- **R-NOT-02** : un clic ouvre la liste de ces villes, avec le ticket concerné. « Compléter » ouvre le pop-up.
- **R-NOT-03** : la carte violette de la barre latérale (« 2 villes n'ont pas encore de pays ») affiche la même information.
- **R-NOT-04** : les notifications ne sont visibles que des rôles ayant l'outil convois.

### Paramètres
- **R-SET-01** : **Utilisateurs** (direction, superadmin) : liste (nom Discord, ID Discord, rôle, comptable, actif), ajout, modification, désactivation et réactivation, selon § 2.
- **R-SET-02** : **Paramètres de l'outil convois** (chargés d'événementiel, direction, superadmin) : modèle global des consignes (texte multiligne, une ligne par ligne de citation) et valeurs par défaut des champs manuels (R-CNV-08). Chaque modification est historisée.

---

## 13. Questions ouvertes

Seules restent ouvertes les questions qui attendent une information de ta part. Tout le reste est tranché au § 14.

| # | Sujet | Question | En attendant |
|---|---|---|---|
| Q-20 | Avatar | Image de l'avatar de RavenBot pour l'aperçu (fichier à déposer dans `docs/design/discord/`). | Texte « RAVENBot » de la maquette. |
| Q-25 | Déploiement | **Nom de domaine de production.** À fournir avant la phase 11. | — |

Les propositions R-TKT-05 (ticket créé à la main) et R-CNV-08 (valeurs par défaut initiales) ont été validées le 2026-10-14 avec l'ensemble des documents.

---

## 14. Décisions prises

### 14.1 Cahier des charges et première série de questions (2026-10-13)

| Sujet | Décision |
|---|---|
| Image de référence | Ajoutée : `docs/design/reference-dashboard.png`. |
| Supabase | Hébergé (**cloud**). *Remplacé le 2026-11-08 : voir § 14.4.* |
| Entreprise | `vtc.name` de l'API si présent, sinon saisie manuelle. |
| RDV | Prérempli depuis `meetup_at` de l'API, modifiable. |
| Serveur | Prérempli depuis `server.name` de l'API, modifiable. |
| Image du trajet | Image `map` de l'API, remplaçable par un envoi. |
| Consignes | Modèle global modifiable, copié dans chaque convoi puis modifiable. |
| Copier le message | Non. L'envoi se fera par un bot Discord en v2, via un bouton du site. |
| Archivage | Départ + 6 h, **tous** statuts. Les refusés peuvent être archivés à la main avant. |
| Archivé | Lecture seule. |
| Accès outil convois | Événementiel + direction + superadmin. |
| Superadmins | Gestion réservée au superadmin. |
| Paramètres dangereux | Gestion des superadmins ; désactivation d'un compte direction. |
| Langue | Français uniquement. |
| Source des villes | Fichiers du jeu (base + DLC + ProMods). *Révisé le 2026-10-15 : sans ProMods (Q-17, § 14.2).* |
| Homonymes | Choix dans le pop-up, dernier choix mémorisé. |
| Nom du convoi | Nom de l'événement TruckersMP, modifiable. |
| Date | Stockage en UTC, affichage Europe/Paris (changement d'heure géré) ; texte de date auto. |
| Titre du message | Toujours « INVITATION CONVOI - date - entreprise ». |
| DLCs | Noms séparés par des virgules ; vide → « Aucun ». |
| Code | Hébergé sur GitHub. |
| Périmètre v1 | + graphique d'activité, recherche, notifications, page Villes et pays. |
| Ajout de ticket | Rôles ayant l'outil. |
| Actualiser | Bouton qui montre les différences avant d'écraser. |
| Recherche | Tickets, convois (archive comprise) et villes ; extensible aux futurs outils, façon Spotlight. |
| Notifications | Villes à compléter uniquement. |

### 14.2 Questions ouvertes tranchées (2026-10-14)

| # | Sujet | Décision |
|---|---|---|
| Q-01 | Texte source du message | Le fichier `message-convoi-exemple.md` est considéré comme exact. |
| Q-02 | Limite de 2000 caractères | Compteur de caractères sous l'aperçu, en alerte au-delà de 2000. |
| Q-03 | Accent grave dans une valeur | Le formatage « code » du message est voulu et reste tel quel. Le caractère `` ` `` est **refusé** dans les champs affichés en code (R-CNV-09). |
| Q-04 | Statuts | **Toutes les transitions** sont permises, retours en arrière et acceptation directe depuis Nouveau compris. **Tout le monde peut traiter** n'importe quel ticket (R-TKT-10..15). |
| Q-05 | Doublons | Un seul ticket non archivé par événement TruckersMP. |
| Q-06 | API indisponible | Création manuelle possible (R-TKT-05). |
| Q-07 | Ticket et convoi | Une seule fiche (R-TKT-20). |
| Q-08 | Comptes direction | La direction peut créer un compte direction, mais pas rétrograder ni désactiver un compte direction. |
| Q-09 | Droits | Chaque rôle gère ses outils et leurs paramètres ; direction et superadmin gèrent tout (R-ROLE-09). Les chargés d'événementiel modifient donc le modèle des consignes. |
| Q-10 | Rôles sans outil | Accueil avec « Aucun outil n'est encore disponible pour votre rôle ». |
| Q-11 | Écrans hors maquette | Construits avec les composants et tokens de la maquette, puis soumis en capture à chaque phase. |
| Q-12 | Premier superadmin | ID Discord `640173855096307712`, via `BOOTSTRAP_SUPERADMIN_DISCORD_ID`. |
| Q-13 | Événement d'un autre jeu (ATS) | Avertissement non bloquant. |
| Q-14 | Heures avant 10 h | `09H00`. |
| Q-15 | Noms TruckersMP ≠ noms du jeu | Table d'alias alimentée par l'apprentissage. |
| Q-16 | Valeurs par défaut | Dans les paramètres de l'outil convois (R-CNV-08). |
| Q-17 | Données du jeu | ETS2 + tous les DLC cartes installés et importés. **ProMods (2026-10-15)** : pas de demande d'autorisation, pas d'extraction, pas de liste Internet ; villes ProMods apprises via le pop-up, sans distinction avec le jeu de base ; pays manquant ajoutable via « Autre pays… » (R-CITY-02b, R-CITY-12). |
| Q-18 | Image du trajet | Copiée à l'acceptation. Lien TruckersMP visible partout en texte cliquable (R-TKT-06). |
| Q-19 | Bot v2 et pays inconnu | Le bot refusera d'envoyer un message avec un pays « à compléter » (à préciser en v2). |
| Q-21 | Graphique d'activité | 28 jours glissants, un point par jour. |
| Q-22 | Actions de la recherche | Aller vers chaque page + « Ajouter un ticket ». |
| Q-23 | Favicon | « V » blanc en thème sombre, noir en thème clair. |
| Q-24 | Mobile | Ordinateur en priorité ; mise en page correcte jusqu'à 1024 px. |
| Q-T1 à Q-T8 | Techniques | Voir design.md § 17. |

### 14.3 Reprise du projet (2026-11-02)

| Sujet | Décision |
|---|---|
| Code | Repris de zéro dans un nouveau dossier à partir de ces documents (design.md D-01). Les comptes de la phase 0 sont conservés. |
| Technique | Supabase « classique » à la place de Drizzle (design.md Q-T1). **Aucune règle de ces spécifications ne change.** |
| Méthode | Code découpé et lisible (design.md § 3.2), compte rendu après chaque tâche, périmètre strict (tasks.md, « Mode d'emploi »). |

### 14.4 Abandon de Supabase (2026-11-08)

| Sujet | Décision |
|---|---|
| Technique | Postgres seul dans Docker, connexion Discord et sessions gérées par l'application, images sur un volume (design.md D-06). **Aucune règle de ces spécifications ne change.** |
