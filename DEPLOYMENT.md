# Mise en ligne de la version partagée

Le site Netlify existant est https://stellar-bienenstitch-be8e88.netlify.app. Les mises à jour GitHub ne le redéploient pas automatiquement lorsqu’il a été créé avec Netlify Drop.

## Préparation nécessaire

1. Créer le projet Supabase et installer `supabase/setup.sql`.
2. Configurer Email/Auth et les URL de redirection, selon [SUPABASE.md](SUPABASE.md).
3. Renseigner `config.js` avec l’URL et la clé publique seulement.
4. Générer le paquet avec `python3 tools/build_release.py`.
5. Vérifier l’inscription et le partage avec deux comptes réels avant le tirage final.
6. Déposer le dossier public généré dans la rubrique Deploys du site Netlify existant, puis vérifier la version servie sur ordinateur et téléphone.

Un `index.html` autonome est livré pour éviter les fichiers CSS ou JS manquants. Le dossier public ne contient ni SQL, ni tests, ni mots de passe. Sa configuration contient uniquement les valeurs publiques nécessaires au client.

## Accès et frais

Le lien du site est public, mais les données familiales nécessitent une connexion et une invitation personnelle. Les liens d’invitation sont des accès personnels à partager uniquement avec leur destinataire. Les moteurs de recherche sont invités à ne pas indexer le site ; cela ne constitue pas une authentification.

Les offres gratuites Netlify/Supabase peuvent convenir pour six personnes sous réserve des conditions et quotas actuels. Les vérifier avant activation. Aucun domaine payant n’est nécessaire. Un fournisseur SMTP peut être nécessaire pour la confirmation d’e-mail et la récupération de mot de passe ; il peut avoir ses propres quotas ou frais. Aucun compte fournisseur ni abonnement payant n’a été créé par l’assistant.

Tarifs officiels : https://supabase.com/pricing et https://www.netlify.com/pricing/.

## Vérifications et limites

Les tests PostgreSQL locaux et le parcours de six navigateurs sont fournis dans `supabase/`. Auth et réseau Supabase sont simulés dans le test navigateur. Le véritable projet, ses e-mails et les connexions depuis les appareils n’ont pas été testés tant qu’il n’a pas été fourni et configuré.

L’accès direct depuis cet environnement au domaine Netlify a été refusé par le proxy réseau. Une autorisation pour ce domaine a été enregistrée dans le brouillon d’environnement ; elle doit être appliquée via les paramètres avant cette vérification. Un refus du proxy n’est pas un diagnostic de panne Netlify.

La version partagée reste en attente de configuration publique Supabase. Ne pas remplacer le site utilisé par la famille avant d’avoir relié le projet. Les anciens tirages locaux ne peuvent pas être consolidés automatiquement : le tirage partagé démarre avec une nouvelle famille.
