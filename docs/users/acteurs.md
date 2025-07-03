# 👥 Acteurs du Système

Ce document décrit les différents acteurs internes et externes qui interagissent avec le système de paiement basé sur une architecture Zero Trust utilisant Kubernetes, SPIFFE/SPIRE et Express.js.

---

## ✅ Acteurs Internes

| Acteur                     | Rôle                                                                 |
|---------------------------|----------------------------------------------------------------------|
| **Microservices**         | Gèrent l’authentification, les utilisateurs, les portefeuilles et les paiements |
| **Kubernetes (Minikube)** | Orchestre les conteneurs, applique les règles de sécurité et RBAC     |
| **SPIRE Server & Agents** | Fournissent des identités SPIFFE aux workloads via attestation        |
| **Envoy Proxy**           | Assure le mTLS inter-services et applique les politiques SPIFFE       |
| **OPA (Open Policy Agent)** | Applique des politiques dynamiques d'accès basées sur rôle ou SPIFFE ID |
| **CI/CD Pipeline (GitHub Actions)** | Automatise les tests, scans de sécurité et déploiements       |
| **Prometheus & Grafana**  | Collectent les métriques et logs pour l’observabilité du système      |

---

## 🌐 Acteurs Externes

| Acteur                     | Rôle                                                                 |
|---------------------------|----------------------------------------------------------------------|
| **Utilisateur final**     | Utilise les APIs pour gérer son compte, effectuer des paiements      |
| **Agent de paiement**     | Alimente les portefeuilles utilisateurs via une interface ou un point de dépôt |
| **Utilisateur Admin**     | Utilisateur privilégié (rôle `admin`) pouvant accéder aux **logs de transaction** et aux **détails utilisateurs** via les API |
| **Frontend (optionnel)**  | Interface graphique simplifiant l’interaction utilisateur             |
| **Attaquant (simulé)**    | Utilisé pour tester les mesures Zero Trust (SVID invalide, mTLS rejeté, etc.) |
| **Système tiers (optionnel)** | Services externes connectés pour intégrations (ex. : API paiement, KYC) |

---
