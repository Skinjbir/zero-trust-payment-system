# 📋 User Stories – Système de Paiement Zero Trust (SPIFFE/SPIRE + Kubernetes)

---

## 👤 Utilisateur Final

- **U-1** : En tant qu’**utilisateur**, je veux **m’inscrire** avec un **email** et un **mot de passe** afin de **créer un compte sécurisé**.
- **U-2** : En tant qu’**utilisateur**, je veux **me connecter** pour obtenir un **token JWT** afin d’**accéder aux services protégés**.
- **U-3** : En tant qu’**utilisateur**, je veux **consulter mon profil** pour **vérifier mes informations personnelles**.
- **U-4** : En tant qu’**utilisateur**, je veux **modifier mes informations personnelles** pour les **garder à jour**.
- **U-5** : En tant qu’**utilisateur**, je veux **consulter le solde** de mon **portefeuille** et l’**historique de mes transactions**.
- **U-6** : En tant qu’**utilisateur**, je veux **initier un transfert de fonds** depuis mon **portefeuille** vers un **autre utilisateur**, via un **service sécurisé**.

---

## 🧑‍💼 Administrateur

- **ADM-1** : En tant qu’**administrateur**, je veux **consulter les profils utilisateurs** afin de **superviser l’activité** de la plateforme.
- **ADM-2** : En tant qu’**administrateur**, je veux **accéder à l’historique des paiements** pour effectuer des **audits de sécurité**.
- **ADM-3** : En tant qu’**administrateur**, je veux **accéder aux logs techniques** via **Grafana** afin de **surveiller les comportements suspects**.
- **ADM-4** : En tant qu’**administrateur**, je veux **consulter un journal d’accès unifié** listant les actions effectuées par **SPIFFE ID, utilisateur et rôle**, avec horodatage, pour faciliter les **analyses de sécurité**.

---

## 🤖 Agent de Paiement

- **AG-1** : En tant qu’**agent de paiement**, je veux **créditer un portefeuille utilisateur autorisé** via un **endpoint sécurisé**.
- **AG-2** : En tant qu’**agent de paiement**, je veux que mes **accès soient restreints** à l’**opération de dépôt uniquement** selon mon **rôle métier**, indépendamment de mon **SPIFFE ID**.

---

## 🔐 Microservice Authentification

- **AUTH-1** : En tant que **service Auth**, je veux **valider les identifiants** et **émettre un JWT signé** après connexion.
- **AUTH-2** : En tant que **service Auth**, je veux **récupérer un SPIFFE ID** via **SPIRE** pour **sécuriser mes échanges inter-services**.
- **AUTH-3** : En tant que **service Auth**, je veux **refuser toute requête** provenant d’un **SPIFFE ID invalide** ou **non enregistré**.
- **AUTH-4** : En tant que **service Auth**, je veux que les **JWT émis** aient une **durée de validité** et un **scope limité** (incluant les rôles).
- **AUTH-5** : En tant que **service Auth**, je veux **découpler l’authentification technique (SPIFFE ID)** du **rôle métier (présent dans le JWT)**, afin de garantir une **séparation des responsabilités**.

---

## 👥 Microservice Utilisateur

- **USER-1** : En tant que **service Utilisateur**, je veux **fournir les données de profil** pour un **utilisateur authentifié**.
- **USER-2** : En tant que **service Utilisateur**, je veux **permettre la modification du profil** si le **JWT** et le **SPIFFE ID** sont **valides**.
- **USER-3** : En tant qu’**administrateur**, je veux **consulter tous les profils utilisateurs** en **lecture seule**.
- **USER-4** : En tant que **service Utilisateur**, je veux **journaliser chaque accès** avec **SPIFFE ID**, **rôle métier**, **utilisateur** et **timestamp**, pour garantir la **traçabilité complète**.

---

## 💰 Microservice Portefeuille

- **WALLET-1** : En tant que **service Portefeuille**, je veux **afficher le solde** et l’**historique des transactions** pour un **utilisateur authentifié**.
- **WALLET-2** : En tant que **service Portefeuille**, je veux **permettre les dépôts et retraits** uniquement après **vérification du rôle métier via OPA**, en complément du **SPIFFE ID**.
- **WALLET-3** : En tant que **service Portefeuille**, je veux **autoriser uniquement les appels** provenant de **SPIFFE ID valides**.
- **WALLET-4** : En tant que **service Portefeuille**, je veux **initier un appel** vers le **service Paiement** si un **transfert est demandé**.

---

## 💸 Microservice Paiement

- **PAYMENT-1** : En tant que **service Paiement**, je veux **valider un transfert** uniquement après **confirmation du solde** par le **portefeuille**.
- **PAYMENT-2** : En tant que **service Paiement**, je veux **refuser toute requête** provenant d’un **SPIFFE ID non autorisé**.
- **PAYMENT-3** : En tant que **service Paiement**, je veux **enregistrer chaque transaction** avec les **identifiants source, cible, rôle, SPIFFE ID et timestamp**.
- **PAYMENT-4** : En tant que **service Paiement**, je veux **garantir que la mise à jour des soldes est atomique et traçable**.

---

## 🔁 Composant SPIRE/SPIFFE

- **SPIRE-1** : En tant que **composant SPIRE**, je veux **renouveler automatiquement les SVIDs (certificats)** pour chaque workload afin de garantir une **identité continue et sécurisée**.
