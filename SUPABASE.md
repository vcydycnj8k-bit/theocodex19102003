# Activer l’espace familial partagé

Cette version nécessite un projet Supabase. Tant que config.js ne contient pas ses deux valeurs publiques, le site affiche « Relions votre espace familial ». Ne remplacez pas le site familial existant avant d’avoir terminé la configuration et les tests avec deux comptes.

## 1. Créer le projet

1. Ouvrir https://supabase.com/ et créer un compte.
2. Créer une organisation puis un projet, par exemple « Secret Santa famille », sur l’offre Free si ses conditions vous conviennent. Ne sélectionner aucune option payante sans vérifier son prix. Un domaine personnalisé n’est pas nécessaire.
3. Choisir une région appropriée, par exemple dans l’Union européenne pour une famille en France. Conserver le mot de passe de base de données dans votre gestionnaire de mots de passe. Ne jamais le mettre dans le site ou le chat.

L’offre gratuite peut suffire à six personnes. Vérifier les conditions actuelles, les quotas et la mise en pause des projets inactifs sur https://supabase.com/pricing. Le projet n’a pas été créé par l’assistant et aucun coût n’a été engagé. La sauvegarde partagée dépend de la disponibilité de ce projet ; ne le supprimez pas après le tirage.

## 2. Installer la base et ses droits

Dans le projet : SQL Editor → New query. Copier le contenu entier de `supabase/setup.sql`, puis Run.

Le script crée des tables dans un schéma privé non exposé à l’API. Les fonctions publiques contrôlent le compte connecté avant chaque opération. Aucune clé secret ou service_role n’est nécessaire au navigateur. Ne pas exposer le schéma santa_private dans les réglages d’API et ne pas accorder d’accès direct à ses tables.

Le tirage est transactionnel et verrouille la famille. Une seconde demande conserve le résultat existant. Les comptes n’ont pas accès à la liste complète des attributions, y compris celui de l’organisateur. Les administrateurs du projet Supabase conservent naturellement l’accès aux données en base : ils doivent respecter les secrets des participants.

## 3. Configurer les connexions

Activer le fournisseur Email et les nouvelles inscriptions dans Authentication.
Dans la configuration des URL d’authentification :
- Site URL : https://stellar-bienenstitch-be8e88.netlify.app
- Autoriser cette même URL comme destination de redirection (avec slash final si nécessaire).

Deux possibilités pour la confirmation d’e-mail :

- Pour un démarrage familial sans service d’e-mail : désactiver temporairement « Confirm email ». Les six personnes créent leur compte avec e-mail et mot de passe et sont connectées immédiatement. Les adresses ne sont alors pas vérifiées ; l’accès à un prénom repose sur son lien d’invitation personnel. Envoyer chaque lien uniquement à son destinataire. Utiliser des mots de passe uniques d’au moins 10 caractères.
- Pour vérifier les adresses : conserver « Confirm email » et configurer un fournisseur SMTP dans Supabase. Son service d’e-mail par défaut peut limiter l’envoi aux membres de l’organisation et appliquer des quotas : ne pas supposer qu’il enverra les invitations aux six personnes. Les identifiants SMTP doivent rester dans les réglages Supabase, jamais dans config.js ou dans le chat. Vérifier les frais et quotas du fournisseur avant activation.

Le bouton « Mot de passe oublié » utilise également les e-mails Supabase et nécessite un envoi SMTP fonctionnel pour les adresses familiales. Sans SMTP, ne pas compter sur cette récupération automatique ; demander de l’aide à l’organisateur, qui pourra utiliser les outils d’administration de Supabase. Ne pas partager un même compte pour toute la famille.

## 4. Relier le site

Dans les paramètres du projet, chercher l’URL de projet et les API Keys (les intitulés peuvent évoluer).
Modifier `config.js` :

```js
window.SANTA_CONFIG = {
  url: 'https://VOTRE-REFERENCE.supabase.co',
  publishableKey: 'sb_publishable_...'
};
```

Ces deux valeurs sont publiques et peuvent être intégrées au site. L’ancienne clé `anon` est aussi prise en charge. Ne jamais utiliser une clé `sb_secret_...`, `service_role`, le mot de passe de base de données ou un jeton personnel Supabase. Le serveur protège les données avec les comptes et les fonctions SQL, pas avec le caractère secret de cette clé publique.

Puis exécuter `python3 tools/build_release.py`. Le dossier `site` et `/workspace/secret-santa.zip` sont générés sans requête vers Supabase. Ne publier que le dossier `site` ou son archive, pas l’intégralité du dépôt contenant les scripts internes.

## 5. Créer la famille et inviter les cinq autres personnes

1. Se connecter sur le nouveau site, ou créer son compte.
2. Créer une famille et choisir son propre prénom. Les six prénoms sont Eva, Théo, Lea, Elio, Lucas et Ella.
3. Pour chaque autre prénom, cliquer « Invitation » et envoyer son lien personnel à la bonne personne, par un canal privé. Le lien permet d’associer un compte au prénom ; il ne doit pas être publié dans une conversation publique. L’assistant ne l’envoie pas à votre place.
4. Chaque personne ouvre son lien sur son appareil, crée son compte ou se connecte, puis enregistre ses souhaits et éventuellement son plafond personnel.
5. L’organisateur fixe le plafond commun, 50 € par défaut. Lorsque les six personnes ont rejoint, il lance le tirage définitif.
6. Chacun clique sur la roulette de son propre compte pour découvrir uniquement son destinataire. Les connexions suivantes retrouvent la même attribution.

Les changements sont relus automatiquement toutes les huit secondes lorsque l’onglet est visible. Les champs en cours de modification ne sont pas écrasés. Cliquer « Enregistrer mes envies » pour transmettre ses modifications. Les souhaits sont visibles par la famille ; seul leur auteur peut les modifier. Les budgets sont verrouillés après le tirage, les souhaits restent modifiables.

L’ancien tirage local et les anciens souhaits ne sont pas transférés automatiquement : ils n’existaient que dans les navigateurs. Cette nouvelle famille effectue son tirage partagé une seule fois. Aucun bouton de remise à zéro n’est fourni afin de préserver le résultat ; pour une autre année, créer un autre espace familial.

## 6. Vérifier avant de partager

Utiliser deux navigateurs indépendants avec deux vrais comptes pour vérifier inscription, connexion, invitation, sauvegarde après rechargement et synchronisation des souhaits. Finir l’inscription des six personnes avant le tirage. Après tirage, chacun doit retrouver son propre destinataire en se déconnectant puis en se reconnectant. Ne pas utiliser les mêmes identifiants sur les deux appareils pour tester deux personnes différentes.

Si une erreur apparaît, garder son texte exact sans communiquer de mot de passe ni de jeton. Une erreur SMTP, une URL incorrecte ou un script SQL non installé doit être corrigé avant de considérer le site partagé comme opérationnel.

## Validation locale fournie

Le test `supabase/security.test.cjs` exécute le vrai script SQL avec PostgreSQL embarqué (PGlite), des rôles anon/authenticated et des comptes distincts simulés. Installer @electric-sql/pglite dans un répertoire de test hors du dépôt puis lancer le test avec NODE_PATH adapté. Les tests de navigateur utilisent une API locale simulée et ne remplacent pas la validation Auth/API du vrai projet Supabase.
