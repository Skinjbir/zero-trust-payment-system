# 🛡️ Zero Trust Payment System with SPIFFE/SPIRE & Kubernetes

Projet de Fin d'Études (PFA) – Juillet 2025

---

## 📌 Description

Ce projet implémente une architecture **Zero Trust** complète pour un **système de paiement basé sur des microservices**, déployé sur **Kubernetes**.  
L'authentification, l'autorisation et la communication interservices sont entièrement sécurisées via :

- **SPIFFE/SPIRE** pour l’identité des workloads
- **mTLS automatique via Envoy**
- **JWT signés pour les utilisateurs**
- **OPA (Open Policy Agent)** pour l’autorisation dynamique
- **GitHub Actions** pour une CI/CD sécurisée

---

## 🧱 Architecture Technique

- **Langage** : JavaScript (Node.js / Express.js)
- **Conteneurisation** : Docker
- **Orchestration** : Kubernetes (Minikube)
- **Identité & mTLS** : SPIFFE/SPIRE + Envoy Proxy
- **Politiques dynamiques** : Open Policy Agent (OPA)
- **CI/CD** : GitHub Actions + Trivy
- **Sécurité Applicative** : JWT, RBAC, Helmet, Rate Limiting
- **Sécurité Dépôt** : Branch Protection, GitHub Secrets, Secret Scanning
- **Monitoring** : Prometheus + Grafana
- **Observabilité** : Winston (logs JSON), Prometheus Exporter

---

## 🧩 Microservices

| Service           | Description                                      |
|-------------------|--------------------------------------------------|
| `auth-service`    | Authentification (JWT, login, rôles)            |
| `user-service`    | Profil utilisateur, gestion des données         |
| `wallet-service`  | Portefeuille numérique (solde, historique)      |
| `payment-service` | Paiements entre utilisateurs                    |

---

## 👥 Acteurs du Système

### Internes :
- Microservices (auth, user, wallet, payment)
- Kubernetes (Minikube)
- SPIRE Server & Agents
- Envoy Proxy (sidecar)
- Open Policy Agent (OPA)
- CI/CD (GitHub Actions)
- Prometheus & Grafana

### Externes :
- **Utilisateur final** (auth via JWT)
- **Agent Métier (guichetier)** (auth via JWT `role: agent`)
- **Administrateurs** :
  - DevOps (SPIFFE ID)
  - Financier / Utilisateur / Audit (JWT + rôle)
- Frontend (interface utilisateur)
- Attaquant (simulé pour test de résistance)
- Systèmes tiers (KYC, banques, etc.)

---

## 🔐 Fonctionnalités de Sécurité

- 🔒 mTLS automatique entre services (SPIFFE/SPIRE + Envoy)
- 🔑 Authentification forte avec JWT signés
- 🆔 SPIFFE ID unique pour chaque workload
- ⚙️ RBAC Kubernetes + RBAC applicatif par rôle
- 📜 Politiques Rego dynamiques via OPA (SPIFFE ID ou rôle)
- 🐳 Scans de vulnérabilités Docker avec Trivy (CI/CD)
- 🔍 Observabilité centralisée (logs JSON + métriques Prometheus)
- 🛡️ Sécurisation du dépôt GitHub :
  - Branch protection
  - GitHub Secrets (JWT, DB, Docker tokens)
  - Secret scanning & alertes

---

## 🧪 Démo et Tests

- 📦 Scénario de démo complet :
  - Authentification utilisateur
  - Paiement sécurisé inter-service
  - Refus d’accès (OPA deny, SVID invalide)
- 🔍 Simulation d’attaques Zero Trust :
  - JWT modifié
  - SPIFFE ID non autorisé
  - Bypass mTLS refusé
- 📊 Visualisation :
  - Logs Winston dans Grafana
  - Alertes Prometheus (échec mTLS, SPIRE, taux d’erreurs)

---

## 🚀 Lancement rapide (local)

1. Cloner le dépôt :
```bash
git clone https://github.com/mohammedreda/zero-trust-payment-system.git
cd zero-trust-payment-system
