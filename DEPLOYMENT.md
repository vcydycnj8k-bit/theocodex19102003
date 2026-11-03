# Mise en ligne préparée, non publiée

L’environnement cloud publié est un environnement de développement : il ne constitue pas un hébergement web public permanent.

## Paquet à déployer

Depuis le dépôt, exécuter `python3 tools/build_release.py`.
Le dossier `/workspace/secret-santa-release` contient les seuls fichiers publics : index.html, style.css, app.js, draw.mjs, robots.txt et _headers.
L’archive `/workspace/secret-santa.zip` a index.html à la racine. Aucun dossier Git, test, document interne, stockage navigateur ou secret n’est inclus. Les six prénoms par défaut font partie du code public.

Aucune compilation, base de données, fonction serveur ni clé API n’est nécessaire. Servir en HTTPS avec un hébergeur statique qui reconnaît les modules .mjs comme JavaScript. Ne pas publier l’ensemble du dépôt comme répertoire web.

## Hébergement et frais

Un hébergeur statique comme Netlify ou Cloudflare Pages peut convenir. Leurs offres gratuites peuvent suffire à un petit usage familial, sous réserve des quotas et des conditions en vigueur au moment de l’inscription. Aucun coût n’a été engagé. Vérifier la tarification officielle avant activation, notamment les dépassements, la protection privée et les options payantes :
- https://www.netlify.com/pricing/
- https://www.cloudflare.com/plans/developer-platform/
- https://www.cloudflare.com/plans/zero-trust-services/

Le sous-domaine fourni par l’hébergeur évite d’acheter un domaine. Un domaine personnel est facultatif et implique un achat puis un renouvellement annuel au tarif du registrar. Les fonctions de protection par mot de passe peuvent dépendre de l’offre. Les tarifs et quotas n’ont pas été vérifiés en direct depuis cet environnement.

## Confidentialité : choisir avant de déployer

1. Lien public partagé seulement en famille : simple et potentiellement gratuit, mais toute personne possédant l’URL peut ouvrir le site. robots.txt et noindex réduisent la visibilité dans les moteurs respectueux ; ils ne protègent pas l’accès.
2. Mot de passe contrôlé par l’hébergeur : convient à une famille si l’offre le permet. Le contrôle doit protéger aussi les fichiers JS et les URL alternatives. Ne pas mettre le mot de passe dans le JavaScript : il serait lisible.
3. Accès réservé à des adresses e-mail autorisées, par exemple via un service tel que Cloudflare Access : préférable pour un accès privé. Nécessite une configuration de l’hébergeur, éventuellement un domaine, et la vérification de l’offre et du nombre d’utilisateurs. Restreindre les six personnes et protéger toutes les URL publiques, y compris celles de prévisualisation.

Le code ne contient actuellement ni compte utilisateur ni authentification. Un contrôle d’accès protège l’ouverture du site, pas le secret de chaque attribution vis-à-vis des autres personnes autorisées sur le même appareil.

## Mise en ligne après choix et accord

- Choisir l’hébergeur et le niveau de confidentialité, puis vérifier les frais présentés par le fournisseur.
- Utiliser le compte du propriétaire, sans transmettre de secret dans le chat.
- Pour un dépôt manuel statique (par exemple Netlify), sélectionner le dossier public uniquement ; aucun build à configurer. Ce dépôt déclenche une publication : ne l’effectuer qu’après accord sur l’accès.
- Pour un accès privé, configurer la protection avant toute exposition publique de l’application. Si le fournisseur ne le permet pas avant le premier dépôt, conserver une page neutre jusqu’à ce que la protection soit vérifiée.
- Vérifier HTTPS, chargement des modules, les six révélations, les souhaits et budgets sur ordinateur et téléphone. Pour un site privé, tester aussi le refus d’accès dans un navigateur non connecté et l’absence de contournement par une autre URL.

## Limite entre appareils

La même URL charge l’application sur ordinateur et téléphone, mais les participants, souhaits et budgets restent dans le stockage local de chaque navigateur. Ils ne sont pas transférés automatiquement lors de la mise en ligne. Chaque onglet possède son propre tirage, effacé au rechargement. Pour un tirage familial unique, faire les révélations sur un seul appareil, à tour de rôle. Un espace familial partagé avec souhaits synchronisés et attributions individuelles nécessite un serveur et des comptes ou invitations ; il n’est pas implémenté dans cette version.

## Validation effectuée le 3 novembre 2026

- Trois tests de tirage réussis, dont 10 000 permutations sans doublon ni auto-attribution.
- Paquet public servi localement et contrôlé avec Chromium : six révélations, budgets commun et personnel, souhaits du bon destinataire, refus des budgets invalides, sauvegarde après rechargement, réinitialisation et aucune erreur JavaScript.
- Affichage contrôlé à 320 et 390 pixels de largeur, sans débordement horizontal.
- Réponses HTTP 200 et types MIME corrects pour HTML, CSS, JS et MJS.
- Deux contextes de navigateur indépendants confirment que les souhaits ne se synchronisent pas.

Restent à vérifier après choix du fournisseur : URL HTTPS réelle sur les appareils, protection d’accès et facturation. Aucun compte d’hébergement n’a été utilisé et aucune publication Internet n’a été effectuée.
