# 🔐 Principes Zero Trust appliqués à mon système de paiement

## 🎯 Objectif

Ce système de paiement, basé sur des microservices orchestrés par Kubernetes, a été conçu selon les **principes Zero Trust**, avec une architecture défensive fondée sur :

- **SPIFFE/SPIRE** pour l’identité des workloads
- **JWT signés** pour les utilisateurs humains
- **OPA (Rego)** pour l’autorisation dynamique
- **mTLS** via Envoy sidecar
- **RBAC et segmentation stricte** par rôle

Le présent document synthétise les principes respectés, les mécanismes techniques mis en œuvre, et les compléments apportés en cours de projet.

---

## ✅ Principes Zero Trust appliqués

### 1. 🔍 Vérification explicite de chaque entité

> Aucun service ou utilisateur n’est « de confiance » par défaut

- Authentification humaine par **JWT signé**
- Authentification machine par **SPIFFE ID attesté (SVID)**
- Validation croisée par **OPA** (SPIFFE + rôle)
- Rejet explicite de toute requête sans preuve valide (`AUTH-3`, `SEC-2`, `WALLET-3`)

---

### 2. 🔐 Principe du moindre privilège (Least Privilege)

> Chaque acteur n’accède qu’aux ressources strictement nécessaires

- L’**agent de paiement** ne peut appeler que `/deposit` (`AG-2`)
- L’**admin utilisateur** ne peut pas lire les soldes (`ADM-U-3`)
- L’**admin financier** n’a accès qu’aux transactions (`ADM-F-1`)
- Le **DevOps** ne voit que les composants SPIRE et K8s (`ADM-D-3`)
- Politique OPA restrictive sur chaque action (`WALLET-2`, `USER-2`, `PAYMENT-4`)

---

### 3. 🧨 Supposition de compromission

> Le système assume que tout composant peut être compromis

- SPIFFE ID non reconnu → rejet automatique (`SEC-2`)
- Toutes les actions critiques sont journalisées (`PAYMENT-3`, `USER-4`)
- Mécanisme `deny-by-default` sur tous les endpoints (`SEC-2`)
- Contrôles croisés JWT + SPIFFE (OPA)

---

### 4. 🧬 Micro-segmentation des services

> Chaque microservice est isolé, avec des responsabilités et des accès clairs

- Aucun service n’a accès global au système
- SPIFFE ID unique par service/pod (`SPIRE-1`)
- Appels filtrés par Envoy + OPA selon `path + method + ID` (`AUTH-2`, `PAYMENT-2`, `WALLET-3`)

---

### 5. 🔐 mTLS généralisé via Envoy

> Toutes les communications interservices sont chiffrées

- Implémenté via sidecars Envoy sur chaque pod
- Utilisation de certificats SPIRE (SVID)
- Header `x-spiffe-id` injecté automatiquement
- Validé par politiques SPIRE + OPA (`SEC-1`)

---

### 6. 🆔 Identité forte et attestée des workloads

> Tous les pods reçoivent un certificat SPIFFE via SPIRE Agent

- Attestation automatique à l’exécution (`SPIRE-1`)
- Rotation automatique configurée
- Refus de toute identité non validée (`AUTH-3`, `PAYMENT-2`)

---

### 7. 📜 Contrôle d’accès dynamique (OPA + Rego)

> L’accès dépend du contexte, pas d’un rôle statique codé

- OPA consulté à chaque appel sensible
- Règles Rego utilisant :
  - `spiffe_id`
  - `jwt.role`, `jwt.sub`
  - `method`, `path`, `heure`
- Requêtes rejetées si non autorisées (`SEC-2`, `AG-2`, `ADM-F-2`)

---

### 8. ♻️ Rotation et expiration des identifiants

> Les identifiants (JWT, SVID) sont à durée de vie limitée

- JWT : expiration courte, renouvellement automatique (`AUTH-4`, `AUTH-6`)
- SVID : renouvelés automatiquement via SPIRE (`SPIRE-1`)
- SVID expirés → alerte Prometheus (`SEC-3`)

---

### 9. 📊 Observabilité complète

> Tous les événements critiques sont visibles et traçables

- Logs JSON (`Winston`) incluant :
  - `x-spiffe-id`
  - `jwt.role`
  - `user_id`
  - `endpoint`, `timestamp`
- Dashboard Grafana pour :
  - Tentatives refusées (OPA deny)
  - Appels suspects
  - Requêtes par SPIFFE ID (`ADM-4`, `ADM-5`, `AUD-1`, `AUD-2`)

---

### 10. 🚨 Détection d’anomalies

> Le système réagit à toute action non conforme

- Alertes configurées sur :
  - SVID invalide/expiré
  - Rejet OPA répétitif
  - Appel interdit par SPIFFE ID
- Visualisation via Grafana et alerte par seuil (`SEC-3`, `ADM-5`)

---
