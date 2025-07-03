# 🔐 Flux critiques de sécurité entre services (Input / Output + Données sensibles)

Ce document décrit les échanges de données critiques entre les services du système, avec une attention particulière portée sur :
- Les **types d’identités** utilisées (SPIFFE ID ou JWT)
- Les **données sensibles** traitées ou transmises
- Les **mécanismes de sécurité appliqués** (mTLS, SPIRE, OPA, Rego, logs)

---

## 1. Authentification → Utilisateur

- **Input** : email, mot de passe
- **Output** : JWT signé `{ sub, role, exp }`
- **Données sensibles** : credentials (email, pass), JWT
- **Sécurité** : TLS, hashing côté serveur, JWT signé, log audit login

---

## 2. Utilisateur (JWT) → Portefeuille

- **Input** : JWT utilisateur, requête `/wallet`, `user_id`
- **Output** : solde actuel, historique des transactions
- **Données sensibles** : JWT, identifiants utilisateurs, montants
- **Sécurité** : OPA (`jwt.sub == user_id`), mTLS SPIFFE côté service

---

## 3. Utilisateur (JWT) → Paiement

- **Input** : JWT, `receiver_id`, montant
- **Output** : statut du paiement, ID transaction
- **Données sensibles** : JWT, ID source/cible, montants
- **Sécurité** : SPIFFE ID (`payment-service`) + OPA (`role: user`, `limit`)

---

## 4. Paiement-service (SPIFFE) → Wallet-service

- **Input** : SPIFFE ID `spiffe://.../payment`, JWT utilisateur, montant
- **Output** : débit/crédit confirmé, solde mis à jour
- **Données sensibles** : SPIFFE ID, JWT, montant, ID portefeuilles
- **Sécurité** : mTLS, SPIFFE attestation, OPA Rego (seul `payment-service` autorisé)

---

## 5. Agent de paiement (SPIFFE) → Wallet-service

- **Input** : SPIFFE ID `agent`, `receiver_id`, `amount`
- **Output** : succès/échec du dépôt
- **Données sensibles** : SPIFFE ID agent, identifiant utilisateur cible, montant
- **Sécurité** : mTLS, SPIFFE ID restreint, OPA (`path == /deposit`, ID autorisé uniquement)

---

## 6. Administrateur utilisateur (JWT) → User-service

- **Input** : JWT avec `role: admin`, `user_id`, modification
- **Output** : confirmation ou erreur
- **Données sensibles** : JWT admin, profils utilisateurs
- **Sécurité** : OPA (`role == admin`), SPIFFE ID optionnel, logs audit

---

## 7. Administrateur financier (JWT) → Wallet / Payment

- **Input** : JWT `role: finance`, lecture ou rollback transaction
- **Output** : listes de transactions, état du rollback
- **Données sensibles** : historiques financiers, montants, statuts
- **Sécurité** : OPA (`role == finance`), règles spécifiques (`rollback <= 24h`, montant max), logs détaillés

---

## 8. Administrateur DevOps (SPIFFE) → SPIRE / CI/CD

- **Input** : SPIFFE ID de CI/CD agent, `registrationEntry.yaml`, fichiers Helm/K8s
- **Output** : SPIFFE ID enregistrés, déploiements effectués
- **Données sensibles** : configuration infra, SPIFFE ID, secrets
- **Sécurité** : RBAC K8s strict, SPIRE Server, attestation workload

---

## 9. Auditeur sécurité (JWT / SPIFFE) → Logs / Policies

- **Input** : requêtes GET sur Grafana, `/logs`, `/opa/policies`
- **Output** : logs SPIFFE, décisions OPA, métriques
- **Données sensibles** : SPIFFE ID appelants, JWT utilisateur, paths accédés
- **Sécurité** : lecture seule, token `role: audit`, accès réseau restreint, Prometheus

---

## 10. Tous services ↔ SPIRE Agent

- **Input** : demande d’attestation SPIFFE (selector: pod label, SA, namespace)
- **Output** : SVID (`x.509 cert`), clé privée, bundle
- **Données sensibles** : certificats SPIFFE, SPIFFE ID, clés privées (stockées localement)
- **Sécurité** : SPIRE Agent (local), SPIRE Server (centralisé), rotation automatique

---

## 11. Tous services ↔ Envoy Proxy

- **Input** : requête HTTP inter-service (proxifiée)
- **Output** : header `x-spiffe-id`, routage sécurisé
- **Données sensibles** : contenu applicatif (chiffré via mTLS)
- **Sécurité** : TLS bidirectionnel, injection automatique SPIFFE ID, restrictions RBAC Envoy

---

## 12. Tous services ↔ OPA (Rego)

- **Input** : JSON `input` contenant :
  - `method`, `path`, `jwt.sub`, `jwt.role`, `spiffe_id`
- **Output** : `allow: true/false`
- **Données sensibles** : SPIFFE ID appelant, rôle JWT, chemin accédé
- **Sécurité** : politiques Rego par rôle, SPIFFE ID, contexte dynamique (heure, IP, volume, origine)

---

## 13. Services → Prometheus / Grafana / Alertmanager

- **Input** : logs JSON, `/metrics` Prometheus format
- **Output** : Dashboards, alertes
- **Données sensibles** : SPIFFE ID appelant, endpoints, codes erreurs, taux d’échec
- **Sécurité** : accès en lecture seule, Grafana RBAC, alerte sur conditions SPIFFE/OPA

---

## 14. Simulation d’attaquant → Services

- **Input** : requêtes illégitimes :
  - Sans SPIFFE ID
  - JWT falsifié
  - Path interdit
- **Output** : refus mTLS, `403 Forbidden`, alertes
- **Données sensibles** : aucune transmise (blocage en amont)
- **Sécurité** : SPIRE → rejet handshake, OPA → deny, log → alert Prometheus

---

## ✅ Synthèse Sécurité

| Interaction                        | Identité      | Données sensibles                        | Contrôle appliqué                    |
|-----------------------------------|---------------|------------------------------------------|--------------------------------------|
| Authentification utilisateur      | JWT           | email, pass, JWT                         | TLS + JWT signature                  |
| Interservice Payment ↔ Wallet     | SPIFFE        | JWT, montant, receiver ID               | mTLS + OPA Rego                      |
| Agent ↔ Wallet                    | SPIFFE        | montant, receiver ID                    | mTLS SPIFFE + Rego restrictive       |
| Admin Finance ↔ Transactions      | JWT (role)    | historiques financiers, rollback         | OPA par rôle + logs                  |
| Admin Utilisateur ↔ Profiles      | JWT (role)    | infos utilisateurs                      | OPA `admin`, logs, deny autres       |
| DevOps ↔ SPIRE / CI/CD            | SPIFFE        | SPIFFE config, secrets infra            | RBAC + attestation SPIRE             |
| Logs / Grafana ↔ Audit            | JWT/SPIFFE    | SPIFFE ID, décisions OPA, métriques     | Lecture seule + supervision alertes  |

