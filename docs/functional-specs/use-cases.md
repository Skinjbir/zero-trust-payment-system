# Cas d’usage par acteur

Ce document décrit les cas d’usage spécifiques associés à chaque acteur du système, en lien avec leur rôle, leur niveau d’accès, et leur position dans l’architecture Zero Trust.

---

## Acteurs Internes

### Microservices (couche applicative)
- **auth-service** : Gère l’inscription, la connexion et la génération de JWT pour les utilisateurs. Valide les identifiants et fournit une couche d’authentification humaine. Protégé via SPIFFE ID (inter-service) et JWT (client).
- **user-service** : Permet la lecture et mise à jour des profils utilisateurs. Applique les droits selon le rôle JWT ou le SPIFFE ID appelant (OPA).
- **wallet-service** : Gère le solde, les dépôts, les historiques. Autorise uniquement les appels avec un JWT ou un SPIFFE ID validé (agent, service).
- **payment-service** : Exécute les transferts. Vérifie le solde via `wallet-service`, loggue les transactions et applique des politiques de sécurité OPA (montant, fréquence, SPIFFE ID appelant).

---

## Acteurs Externes

### Utilisateur final (JWT)
- Crée un compte et se connecte via `auth-service` → reçoit un JWT signé.
- Consulte ses propres données : profil, solde, historique.
- Effectue un transfert sécurisé via `payment-service`, après vérification de solde.
- Toutes les requêtes sont filtrées par OPA pour s'assurer qu’il agit uniquement sur ses propres ressources (`sub == user_id`).

### Agent de paiement (SPIFFE ID)
- Est un pod ou workload interne identifié par un SPIFFE ID spécifique.
- Appelle exclusivement `/deposit` sur `wallet-service`.
- Ne peut ni lire le solde ni consulter d'autres endpoints (rejet OPA).
- Tous les dépôts sont journalisés avec le SPIFFE ID, le destinataire et le montant.

---

### Administrateurs (rôles séparés)

#### Administrateur Financier (JWT `role: finance`)
- Accède aux historiques de paiements et soldes utilisateurs via des endpoints restreints.
- Peut déclencher un rollback sur transaction récente (OPA contrôle le contexte : date, montant, SPIFFE ID appelant).
- Ne peut pas interagir avec les profils utilisateurs.

#### Administrateur Utilisateur (JWT `role: admin`)
- Gère les statuts et rôles des utilisateurs (`user-service`).
- Suspend ou réactive des comptes.
- Ne peut pas interagir avec les endpoints financiers.

#### Administrateur DevOps (SPIFFE ID)
- Déploie les services, enregistre les workloads via SPIRE.
- Gère les fichiers SPIFFE RegistrationEntries, secrets, accès K8s, CI/CD.
- Aucun accès aux services métier (`/users`, `/wallet`, `/payment`).

#### Auditeur Sécurité (JWT `role: audit` ou SPIFFE ID)
- Accède en lecture seule aux logs d’accès SPIFFE, aux règles OPA, et aux tableaux de bord Grafana.
- Ne peut pas exécuter d’action (GET uniquement sur des dashboards ou APIs de monitoring).

---

### Frontend (optionnel)
- Interface web côté client pour les utilisateurs humains.
- Envoie des requêtes sécurisées avec JWT uniquement.
- Toute logique métier est traitée dans les microservices backend (Zero Trust au niveau du frontend).

---

### Attaquant (simulation)
- Utilisé pour tester les protections Zero Trust :
  - Appel sans SPIFFE ID → rejeté mTLS.
  - JWT falsifié → rejeté lors de la validation de signature.
  - Accès à une ressource protégée → rejeté par OPA.
  - Injection dans les champs → détectée par validation des inputs.
- Tous les essais sont loggués pour audit et déclenchent des alertes Prometheus.

---
