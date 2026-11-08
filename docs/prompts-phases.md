# RT-Dash — Prompts de démarrage des phases

> Version : 1.0 · 2026-11-02. Un prompt par phase, à coller dans une **nouvelle discussion**, ouverte dans le dossier du projet, **une fois la phase précédente validée**.
> Les règles détaillées sont dans `CLAUDE.md` (lu automatiquement) et dans le « Mode d'emploi » de `docs/tasks.md`. Les prompts les rappellent sans les répéter.

---

## Phase 1 — Socle, qualité, Docker et CI/CD

```text
On (re)démarre le développement de RT-Dash, de zéro, à partir des documents validés. PHASE 1 de docs/tasks.md (T-1.1 à T-1.12).

Avant toute chose, lis entièrement CLAUDE.md, docs/specs.md, docs/design.md (en particulier § 3.2 conventions de code, § 14, § 16 et § 18 leçons de la première tentative) et docs/tasks.md (en particulier le « Mode d'emploi »). La phase 0 est faite : les comptes GitHub, Supabase et Discord existent déjà (voir T-0.1 à T-0.3).

Points d'attention :
- T-1.1 pose les garde-fous de lisibilité (ESLint du design § 3.2, zéro avertissement) : ils s'appliqueront à tout le reste du projet.
- T-1.2 : demande-moi si on réutilise le dépôt PandaSkys/rt-dash ou si on en crée un nouveau.
- Applique les leçons L-04, L-05, L-06 et L-08 du design § 18.
- Je débute en CI/CD : explique simplement ce que tu mets en place.

Méthode (CLAUDE.md et Mode d'emploi de tasks.md) : une tâche à la fois ; tests d'abord ; ne modifie que ce que la tâche demande ; compte rendu de chaque tâche dans docs/comptes-rendus/phase-1.md (modèle _modele.md), avec chaque fichier touché et pourquoi ; ne me demande jamais de coller un secret ; commits signés, et seulement avec mon accord. À la fin de la phase : bilan, puis arrête-toi et attends ma validation.
```

## Phase 2 — Supabase (local et cloud), base et authentification Discord

```text
On continue RT-Dash : PHASE 2 de docs/tasks.md (T-2.1 à T-2.6).

Lis entièrement CLAUDE.md, docs/specs.md, docs/design.md (§ 2, § 4, § 5, § 6, § 13, § 14, § 18) et docs/tasks.md. Vérifie que la phase 1 est cochée et que son compte rendu est validé ; sinon, dis-le-moi et arrête-toi.

Points d'attention :
- Supabase « classique » : client supabase-js côté serveur avec la session de l'utilisateur, RLS, fonctions SQL, migrations et types par la CLI Supabase. Pas d'ORM.
- T-2.2 : droits par défaut fermés et test structurel pgTAP dès la première migration (design § 6.6).
- T-2.3 : je dois ajouter la redirection locale dans l'application Discord ; guide-moi pas à pas. Les identifiants Discord ne passent jamais par la discussion.
- T-2.6 : guide-moi pour générer la paire de clés age ; la clé privée reste chez moi.
- Leçons L-01, L-02, L-03 et L-07 du design § 18.

Méthode habituelle (CLAUDE.md, Mode d'emploi) : une tâche à la fois, tests d'abord, périmètre strict, compte rendu de chaque tâche dans docs/comptes-rendus/phase-2.md, pas de secret dans la discussion, commits signés avec mon accord. Fin de phase : bilan, puis arrêt jusqu'à ma validation.
```

## Phase 3 — Rôles, accès et administration

```text
On continue RT-Dash : PHASE 3 de docs/tasks.md (T-3.1 à T-3.8, y compris T-3.4b).

Lis entièrement CLAUDE.md, docs/specs.md (§ 2), docs/design.md (§ 3.2, § 5, § 6, § 16, § 18) et docs/tasks.md. Vérifie que la phase 2 est cochée et validée ; sinon, arrête-toi.

Points d'attention :
- Phase la plus sensible pour la sécurité : RLS de app_users et activity_log, triggers d'audit (acteur lu dans le jeton), has_permission en SQL + permissionsOf en TypeScript + test de concordance, admin_save_user en SQL + canApplyUserChange en TypeScript testés sur la même table de cas, defineAction et le test de la matrice des droits.
- L'ID Discord se lit dans auth.identities, jamais dans user_metadata (L-01) : un test le prouve.
- Page « Vous n'avez pas accès » : exactement docs/design/maquette/Acces.dc.html.
- Paramètres → Utilisateurs : hors maquette, découpé en petits composants ; montre-moi une capture.
- Premier superadmin local via supabase/seed.sql (ID 640173855096307712).

Méthode habituelle : une tâche à la fois, tests d'abord (pgTAP et Vitest), périmètre strict, compte rendu dans docs/comptes-rendus/phase-3.md, pas de secret dans la discussion, commits signés avec mon accord. Fin de phase : bilan, puis arrêt jusqu'à ma validation.
```

## Phase 4 — Coque du dashboard

```text
On continue RT-Dash : PHASE 4 de docs/tasks.md (T-4.1 à T-4.11).

Lis entièrement CLAUDE.md, docs/specs.md, docs/design.md (§ 3, § 10, § 12) et docs/tasks.md. Vérifie que la phase 3 est cochée et validée ; sinon, arrête-toi.

Points d'attention :
- Ouvre docs/design/reference-dashboard.png et lis docs/design/maquette/Main.dc.html comme du code (couleurs, tailles, espacements, textes exacts).
- Tokens de globals.css exactement comme le design § 10 ; aucune couleur en dur ailleurs.
- Coque découpée en petits composants dans src/components/layout/ (un par fichier), construite depuis le registre d'outils.
- T-4.10 (fuseau Europe/Paris) : tests d'abord, avec les changements d'heure.
- T-4.11 : capture de la coque comparée à la maquette Main.

Méthode habituelle : une tâche à la fois, tests d'abord, périmètre strict, compte rendu dans docs/comptes-rendus/phase-4.md, commits signés avec mon accord. Fin de phase : bilan, puis arrêt jusqu'à ma validation.
```

## Phase 5 — Tickets (et client de l'API TruckersMP)

```text
On continue RT-Dash : PHASE 5 de docs/tasks.md (T-5.1 à T-5.10, y compris T-5.5b).

Lis entièrement CLAUDE.md, docs/specs.md (§ 5, § 7), docs/design.md (§ 4, § 6, § 7) et docs/tasks.md. Vérifie que la phase 4 est cochée et validée ; sinon, arrête-toi.

Points d'attention :
- T-5.1 : RLS, colonnes autorisées et fonctions SQL de statut (take, accept, refuse, change_ticket_status), testées rôle par rôle en pgTAP avant tout code TypeScript.
- API TruckersMP : uniquement la vraie réponse docs/design/truckersmp-event-36491.json et specs § 7. Les tests n'appellent jamais l'API réelle ; un appel réel ponctuel pour relever le format d'une 404 seulement avec mon accord.
- Statuts : toutes les transitions permises, tout membre ayant l'outil peut traiter n'importe quel ticket, motif obligatoire à chaque refus, « désaccepter » masque le convoi sans rien effacer.
- Page Tickets : exactement docs/design/maquette/Tickets.dc.html, découpée en composants. Détail du ticket hors maquette : capture à valider.

Méthode habituelle : une tâche à la fois, tests d'abord, périmètre strict, compte rendu dans docs/comptes-rendus/phase-5.md, commits signés avec mon accord. Fin de phase : bilan, puis arrêt jusqu'à ma validation.
```

## Phase 6 — Convois (formulaire, Actualiser, image, paramètres)

```text
On continue RT-Dash : PHASE 6 de docs/tasks.md (T-6.1 à T-6.8).

Lis entièrement CLAUDE.md, docs/specs.md (§ 6, § 7), docs/design.md (§ 3.2, § 6, § 7, § 16) et docs/tasks.md. Vérifie que la phase 5 est cochée et validée ; sinon, arrête-toi.

Points d'attention :
- Page Convoi : exactement docs/design/maquette/Convoi.dc.html (sauf la colonne d'aperçu, phase 8), découpée par section, état du formulaire dans un hook.
- Accent grave ` refusé dans les champs affichés en code (R-CNV-09).
- Envoi d'image sécurisé (premiers octets, 8 Mo, ré-encodage, bucket privé, URL signée), testé avec un fichier piégé.
- « Actualiser » : différences avant d'écraser ; complète aussi un ticket créé à la main.
- Écrans hors maquette (Actualiser, liste des convois, paramètres de l'outil) : captures à valider.

Méthode habituelle : une tâche à la fois, tests d'abord, périmètre strict, compte rendu dans docs/comptes-rendus/phase-6.md, commits signés avec mon accord. Fin de phase : bilan, puis arrêt jusqu'à ma validation.
```

## Phase 7 — Villes et pays

```text
On continue RT-Dash : PHASE 7 de docs/tasks.md (T-7.1 à T-7.9).

Lis entièrement CLAUDE.md, docs/specs.md (§ 9), docs/design.md (§ 8) et docs/tasks.md. Vérifie que la phase 6 est cochée et validée ; sinon, arrête-toi.

Points d'attention :
- RÈGLE ABSOLUE : aucune correspondance ville ↔ pays de mémoire. Tout vient des fichiers du jeu.
- T-7.1 : guide-moi pas à pas pour extraire ETS2 (jeu de base + tous les DLC cartes) avec l'extracteur officiel de SCS, dans un dossier hors du dépôt. Pas de ProMods.
- Relève la structure réelle des fichiers avant d'écrire le script ; mets à jour le design § 8.1 si elle diffère.
- T-7.3 : je valide moi-même le rapport de vérification.
- Pop-up : exactement docs/design/maquette/Ville.dc.html, découpé en composants. Page « Villes et pays » hors maquette : capture à valider.

Méthode habituelle : une tâche à la fois, tests d'abord, périmètre strict, compte rendu dans docs/comptes-rendus/phase-7.md, commits signés avec mon accord. Fin de phase : bilan, puis arrêt jusqu'à ma validation.
```

## Phase 8 — Message et aperçu Discord

```text
On continue RT-Dash : PHASE 8 de docs/tasks.md (T-8.1 à T-8.6).

Lis entièrement CLAUDE.md, docs/specs.md (§ 8), docs/design.md (§ 9) et docs/tasks.md. Vérifie que les phases 6 et 7 sont cochées et validées ; sinon, arrête-toi.

Points d'attention :
- T-8.1 : test golden D'ABORD. buildConvoyMessage doit produire un texte identique octet par octet à docs/design/discord/message-convoi-exemple.md. Ne modifie jamais ce fichier de référence pour faire passer le test.
- T-8.2 : le Markdown de Discord n'est pas du CommonMark (`** Date :**` est en gras sur Discord). Spike du parseur, résultat noté dans le design § 9.2.
- Aperçu découpé en composants, thème sombre Discord (#313338), sans HTML brut, comparé à docs/design/discord/message-convoi-exemple.png (ignorer le fond violet).
- T-8.5 : c'est moi qui valide la ressemblance.

Méthode habituelle : une tâche à la fois, tests d'abord, périmètre strict, compte rendu dans docs/comptes-rendus/phase-8.md, commits signés avec mon accord. Fin de phase : bilan, puis arrêt jusqu'à ma validation.
```

## Phase 9 — Archivage

```text
On continue RT-Dash : PHASE 9 de docs/tasks.md (T-9.1 à T-9.4).

Lis entièrement CLAUDE.md, docs/specs.md (§ 11), docs/design.md (§ 6, § 11) et docs/tasks.md. Vérifie que la phase 8 est cochée et validée ; sinon, arrête-toi.

Points d'attention :
- Archivage automatique 6 h réelles après le départ, tous statuts, attribué à « Système » ; tests pgTAP d'abord, y compris un jour de changement d'heure.
- Lecture seule dès l'échéance, même avant le passage du job (ticket_guard).
- Archivage manuel uniquement pour un ticket Refusé.
- Page Archive hors maquette : capture à valider.

Méthode habituelle : une tâche à la fois, tests d'abord, périmètre strict, compte rendu dans docs/comptes-rendus/phase-9.md, commits signés avec mon accord. Fin de phase : bilan, puis arrêt jusqu'à ma validation.
```

## Phase 10 — Dashboard, recherche, notifications

```text
On continue RT-Dash : PHASE 10 de docs/tasks.md (T-10.1 à T-10.4).

Lis entièrement CLAUDE.md, docs/specs.md (§ 12), docs/design.md (§ 12) et docs/tasks.md. Vérifie que la phase 9 est cochée et validée ; sinon, arrête-toi.

Points d'attention :
- Dashboard : exactement docs/design/maquette/Main.dc.html, avec de vraies données, découpé en composants.
- Recherche façon Spotlight : fonctions SQL en security invoker (chacun ne trouve que ce qu'il a le droit de voir), fournisseurs déclarés par le registre pour les outils futurs ; archive comprise ; un test vérifie les droits.
- Notifications : uniquement les villes à compléter.
- Capture du dashboard comparée à la maquette Main.

Méthode habituelle : une tâche à la fois, tests d'abord, périmètre strict, compte rendu dans docs/comptes-rendus/phase-10.md, commits signés avec mon accord. Fin de phase : bilan, puis arrêt jusqu'à ma validation.
```

## Phase 11 — Tests finaux, sécurité et déploiement

```text
On termine RT-Dash : PHASE 11 de docs/tasks.md (T-11.1 à T-11.8).

Lis entièrement CLAUDE.md, docs/specs.md, docs/design.md (§ 13 à § 16) et docs/tasks.md. Vérifie que les phases 1 à 10 sont cochées et validées ; sinon, arrête-toi.

Points d'attention :
- Prérequis à me demander : le nom de domaine (Q-25) et l'accès à mon VPS Debian 12 (SSH par clé). Je débute en hébergement : guide-moi pas à pas.
- T-11.3 : revue de sécurité complète, y compris l'appel direct de l'API Supabase avec un vrai jeton de chaque rôle. Rapport dans docs/security-review.md. AUCUNE mise en production tant qu'un point bloquant reste ouvert.
- T-11.8 : teste une vraie restauration de sauvegarde avant la mise en production, et écris docs/runbook.md.
- Avant le premier déploiement en production, arrête-toi et demande ma confirmation explicite.

Méthode habituelle : une tâche à la fois, périmètre strict, compte rendu dans docs/comptes-rendus/phase-11.md, pas de secret dans la discussion, commits signés avec mon accord.
```
