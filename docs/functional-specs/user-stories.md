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

## 👤 Agent Métier (auth via JWT)

### AG-1 – Dépôt sécurisé
> En tant qu’**agent métier (guichetier)**, je veux **effectuer un dépôt** vers un portefeuille utilisateur en appelant un endpoint sécurisé via l’interface applicative.

### AG-2 – Accès restreint
> En tant qu’**agent authentifié via JWT**, je veux que mon **accès soit strictement limité** à l’endpoint `/deposit`, selon mon rôle (`agent`) validé dynamiquement par **OPA**.

### AG-3 – Journalisation pour audit
> En tant qu’**agent**, je veux que **chaque opération de dépôt soit journalisée** avec :
> - mon identifiant (`sub` JWT)
> - le montant
> - le portefeuille cible
> - l’horodatage
>
> Ceci afin d'assurer une **traçabilité complète** et la conformité avec les exigences d’audit.



## 🛡️ Administrateur Utilisateur (JWT `role: admin`)

- **ADM-U-1** : En tant qu’**admin utilisateur**, je veux **modifier les rôles, statuts et profils utilisateurs** afin d’assurer la gestion des comptes.
- **ADM-U-2** : En tant qu’**admin utilisateur**, je veux **suspendre ou réactiver un compte** en fonction de son activité.
- **ADM-U-3** : En tant qu’**admin utilisateur**, je veux **ne pas avoir accès aux données financières**, pour respecter la séparation des privilèges.

---

## 💼 Administrateur Financier (JWT `role: finance`)

- **ADM-F-1** : En tant qu’**admin financier**, je veux **lire l’historique des paiements et soldes utilisateurs** pour analyse.
- **ADM-F-2** : En tant qu’**admin financier**, je veux pouvoir **initier un rollback de transaction** sous condition (montant, temps) via OPA.
- **ADM-F-3** : En tant qu’**admin financier**, je veux **générer des rapports d’activité et exporter les données de transaction**.

---

## ⚙️ Administrateur DevOps (SPIFFE ID)

- **ADM-D-1** : En tant qu’**admin DevOps**, je veux **déployer les microservices avec SPIFFE ID préconfigurés** via SPIRE.
- **ADM-D-2** : En tant qu’**admin DevOps**, je veux **créer et maintenir les RegistrationEntries SPIRE** pour chaque workload.
- **ADM-D-3** : En tant qu’**admin DevOps**, je veux **n’avoir aucun accès aux API applicatives** (paiement, utilisateur).

---

## 👁️ Auditeur Sécurité (JWT `role: audit` ou SPIFFE ID)

- **AUD-1** : En tant qu’**auditeur**, je veux **accéder aux logs SPIFFE, aux alertes Prometheus, et aux décisions OPA** pour identifier les anomalies.
- **AUD-2** : En tant qu’**auditeur**, je veux **tracer les actions critiques** (rollback, dépôt, admin) avec SPIFFE ID, rôle, utilisateur, endpoint et timestamp.
- **AUD-3** : En tant qu’**auditeur**, je veux **ne jamais modifier les données** – lecture seule uniquement.

---

## 🔐 Microservice Authentification

- **AUTH-1** : En tant que **service Auth**, je veux **valider les identifiants** et **émettre un JWT signé**.
- **AUTH-2** : Je veux **obtenir un SPIFFE ID via SPIRE** pour sécuriser mes appels internes.
- **AUTH-3** : Je veux **rejeter les appels provenant de SPIFFE ID non autorisés**.
- **AUTH-4** : Je veux que les JWT aient une **durée limitée et un scope de rôle** précis.
- **AUTH-5** : Je veux séparer l’**authentification technique (SPIFFE)** de l’**authentification métier (JWT rôle)**.
- **AUTH-6** : Je veux **gérer la rotation automatique des JWT**.

---

## 👥 Microservice Utilisateur

- **USER-1** : Fournir les données de profil d’un utilisateur authentifié (JWT + SPIFFE vérifiés).
- **USER-2** : Permettre la modification uniquement si l’identité est légitime (`sub == id`, SPIFFE autorisé).
- **USER-3** : Offrir une vue en lecture seule des profils pour les admins.
- **USER-4** : Logguer chaque appel avec SPIFFE ID, rôle, endpoint et timestamp pour audit.

---

## 💰 Microservice Portefeuille

- **WALLET-1** : Afficher le solde et l’historique d’un utilisateur identifié.
- **WALLET-2** : Accepter ou refuser un dépôt ou retrait selon le rôle métier et le SPIFFE ID (OPA).
- **WALLET-3** : Refuser toute requête non SPIFFE autorisée.
- **WALLET-4** : Déclencher une mise à jour du solde via appel à `payment-service`.

---

## 💸 Microservice Paiement

- **PAYMENT-1** : Valider un transfert d’argent après vérification du solde par `wallet-service`.
- **PAYMENT-2** : Rejeter toute requête sans SPIFFE ID validé.
- **PAYMENT-3** : Enregistrer chaque transaction avec SPIFFE ID, JWT user, montant et timestamp.
- **PAYMENT-4** : Garantir que la mise à jour des soldes est atomique, traçable, et logguée.

---

## 🔁 Composants SPIRE / SPIFFE / OPA / SEC

- **SPIRE-1** : Renouveler automatiquement les SVID (certificats SPIFFE) pour chaque service.
- **SEC-1** : Forcer l’usage du mTLS interservices via SPIFFE ID (aucune communication HTTP simple autorisée).
- **SEC-2** : Appliquer un contrôle OPA strict (`deny-by-default`), autorisant uniquement ce qui est explicitement permis.
- **SEC-3** : Déclencher des alertes Prometheus si :
  - SVID expiré
  - SPIFFE ID non reconnu
  - Accès refusé par OPA
- **SEC-4** : Autoriser OPA à évaluer chaque requête selon : SPIFFE ID, JWT, chemin, méthode, rôle, heure, contexte.
