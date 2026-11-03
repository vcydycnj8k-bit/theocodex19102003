# Secret Santa en famille

Application web en français, sans dépendance. Participants préremplis : Eva, Théo, Lea, Elio, Lucas et Ella.

## Démarrage

Depuis le dépôt : `python3 -m http.server 3000 --bind 0.0.0.0`.
Ouvrir l’application dans un navigateur via le serveur HTTP (les modules JavaScript ne se chargent pas par double-clic sur un fichier).

## Utilisation

Modifier les participants puis lancer le tirage. Passer l’écran à la personne indiquée, faire tourner la roulette, lire le destinataire et cacher le résultat avant de passer au suivant. Chaque personne offre et reçoit exactement un cadeau, sans se tirer elle-même. Un mélange Fisher-Yates utilisant Web Crypto est répété jusqu’à obtenir une permutation sans point fixe, ce qui garde tous les tirages valides équiprobables.

Les résultats restent en mémoire dans l’onglet : recharger la page les efface. Les révélations sont une discrétion visuelle sur un appareil partagé, pas un système de comptes privés. Aucun message n’est envoyé et aucune donnée n’est stockée sur un serveur.

## Vérification

`node --test draw.test.mjs`

## Budgets et idées cadeaux

Le budget maximum commun est de 50 € par défaut. Chaque participant peut définir son propre plafond pour le cadeau qu’il offre ; un champ vide reprend le plafond commun. Les montants acceptés vont de 0 à 100 000 €, avec deux décimales au maximum.

Chaque participant dispose d’une liste de souhaits (une idée par ligne, 1 000 caractères maximum). À chaque révélation, le Secret Santa voit les souhaits de son destinataire et son propre budget maximum. Les budgets et les souhaits sont verrouillés pendant le tirage ; recommencer le tirage les conserve et permet de les modifier.

Les participants, budgets et souhaits sont sauvegardés dans le stockage local du navigateur. Ils restent sur cet appareil et ne sont pas synchronisés entre téléphones. Les souhaits sont visibles par toutes les personnes utilisant cette page. En cas de stockage indisponible, un message le signale et les réglages restent seulement dans l’onglet. Les attributions ne sont jamais sauvegardées et disparaissent au rechargement.
