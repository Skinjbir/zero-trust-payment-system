# 🔐 Documentation des Principes Zero Trust – Système de Paiement

Ce document décrit les **principes Zero Trust** appliqués dans le cadre de l’implémentation d’un système de paiement basé sur :

- **Kubernetes (Minikube)** pour l’orchestration
- **SPIFFE/SPIRE** pour l’identité des workloads
- **JWT** pour l’authentification des utilisateurs humains
- **OPA (Open Policy Agent)** pour le contrôle d’accès dynamique
- **Envoy Proxy** pour le mTLS interservices

Il sert de référence aux choix techniques de sécurité du projet.

---

## 🎯 Définition – Zero Trust dans ce projet

> Le modèle Zero Trust repose sur le principe fondamental :  
> "**Ne jamais faire confiance, toujours vérifier.**"

Dans cette architecture, **aucun composant, utilisateur, service ou réseau n’est automatiquement fiable**, même s’il est interne au cluster. Chaque accès est :

- **Authentifié** : identité vérifiée (humaine ou machine)
- **Autorisé dynamiquement** : autorisation contextualisée (rôle, heure, endpoint…)
- **Journalisé** : chaque action est traçable

---

## 1. 🔍 Vérification explicite

> *“Always authenticate and authorize explicitly.”*

### Implémentation :

- Les **utilisateurs humains** sont authentifiés via **JWT signés** (`/login`)
- Les **workloads** (services, agents) sont authentifiés via **SPIFFE ID (x.509 SVID)**
- Toute requête interservice est soumise à :
  - **mTLS obligatoire** (via Envoy sidecar)
  - **SPIFFE ID vérifié** (via SPIRE)
  - **Autorisation contextuelle** (via OPA)

### Exemple :
- Un appel de `payment-service` vers `wallet-service` est autorisé **uniquement** si :
  - Le SPIFFE ID correspond à `spiffe://payment.local/service/payment`
  - L’appel est effectué vers un endpoint autorisé (`/wallet/debit`)
  - OPA valide la requête en fonction du SPIFFE ID, de l’heure, du chemin et du rôle utilisateur

---

## 2. 🔐 Principe du moindre privilège

> *“Only grant access to what is strictly necessary.”*

### Implémentation :

- Chaque rôle (humain ou service) dispose uniquement des droits requis :
  - **L’agent** ne peut **que déposer** (`/deposit`)
  - **Admin utilisateur** ne peut pas voir les soldes
  - **Admin finance** ne peut pas modifier les comptes
  - **Services internes** ne peuvent appeler que les endpoints définis
- Les règles OPA interdisent toute action non explicitement autorisée
- Le modèle **“deny-by-default”** est appliqué systématiquement

### Exemple :
- Un appel de `agent-service` vers `/wallet/get-balance` est rejeté par OPA,  
  même si son SPIFFE ID est valide, car **ce n’est pas dans son scope autorisé**

---

## 3. 🧬 Segmentation par identité

> *“Segment everything by workload identity, not by network perimeter.”*

### Implémentation :

- Chaque **workload (pod/service)** reçoit un **SPIFFE ID unique**
- Les SPIFFE ID sont utilisés pour :
  - Authentifier le service via mTLS
  - Identifier l’appelant dans OPA et les logs
  - Appliquer une politique d’accès précise par ID
- Il n’y a **aucune segmentation réseau IP**, la segmentation est **logique par SPIFFE ID**

### Exemple :
```rego
allow {
  input.spiffe_id == "spiffe://payment.local/agent/kiosk-001"
  input.path == ["deposit"]
}
