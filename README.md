# Secret Santa — espace familial partagé

Application en français pour Eva, Théo, Lea, Elio, Lucas et Ella. Hébergement statique sur Netlify et comptes/base PostgreSQL sur Supabase.

Chaque personne rejoint son prénom via une invitation personnelle, se connecte avec son propre compte, enregistre ses souhaits et son budget. L’organisateur fixe le plafond commun (50 € par défaut) et lance un tirage unique une fois les six personnes inscrites. Les attributions persistent après fermeture et reconnexion. Chaque compte ne peut consulter que son destinataire.

## Première configuration

Suivre [SUPABASE.md](SUPABASE.md). Installer le SQL dans Supabase puis renseigner l’URL et la clé publique dans `config.js`. Ne jamais y mettre une clé secrète ou service_role. Le projet distant n’est pas créé automatiquement.

Sans configuration, le site affiche une page d’attente ; il ne prétend pas sauvegarder de données. La création des comptes, l’envoi des e-mails éventuels et les connexions réelles doivent être vérifiés sur le projet du propriétaire.

## Développement

Depuis le dépôt : `python3 -m http.server 3000 --bind 0.0.0.0`. Ouvrir via HTTP. Aucun paquet n’est requis par l’application : les échanges Auth et RPC utilisent fetch.

La session personnelle est conservée dans le navigateur, les souhaits et attributions dans Supabase. Les données de la famille sont relues toutes les huit secondes lorsque l’onglet est visible. Seuls les champs explicitement enregistrés sont transmis. Les champs en cours d’édition sont préservés.

## Paquet Netlify

`python3 tools/build_release.py` produit :
- `site/index.html` autonome, avec styles, configuration publique et scripts intégrés ;
- `site/robots.txt` et `site/_headers` ;
- `/workspace/secret-santa.zip` prêt à extraire et à déposer dans Netlify.

Après configuration et vérification, déposer le dossier `site` dans les déploiements du site existant pour conserver son URL. Ne pas publier l’ensemble du dépôt. Le ZIP à la racine du dépôt est une copie préparée pour le téléchargement depuis GitHub ; le rafraîchir après génération si nécessaire.

## Tests

Installer les outils de test dans un dossier séparé (pas de dépendance à installer pour héberger le site) :

```
npm install --prefix /tmp/santa-tests --no-package-lock @electric-sql/pglite playwright
NODE_PATH=/tmp/santa-tests/node_modules node supabase/security.test.cjs
NODE_PATH=/tmp/santa-tests/node_modules node supabase/browser.test.cjs
```

Le test navigateur utilise `/usr/bin/chromium` et le port local 3099. Adapter le chemin si nécessaire. Il charge `site/index.html` généré avec configuration vide, puis injecte un projet fictif réservé au test.

Le test SQL vérifie les rôles et permissions, les invitations, l’isolation de familles, les plafonds, les contraintes d’attribution et l’idempotence du tirage. Le test navigateur utilise six comptes distincts et le vrai SQL ; les endpoints Auth/API sont simulés. Ces tests ne remplacent pas la vérification du vrai service Supabase et des connexions depuis les appareils de la famille.

Pour une nouvelle année, créer un autre espace familial ; aucun bouton n’efface le tirage existant. Les anciennes données locales ne sont pas transférées automatiquement.
