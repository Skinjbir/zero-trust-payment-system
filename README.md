# PFA-REPO
# 🛡️ Zero Trust Payment System with SPIFFE/SPIRE & Kubernetes

Projet de Fin d'Études (PFA) – Juillet 2025  
Auteur : Mohammed Reda  
Encadré par : [Nom de l'encadrant]

---

## 📌 Description

Ce projet implémente une architecture **Zero Trust** pour un **système de paiement basé sur des microservices** déployés dans **Kubernetes**, avec l'intégration des composants **SPIFFE/SPIRE** pour la gestion d'identité sécurisée, et l'utilisation de **CI/CD**, **OPA**, et **mTLS** pour garantir l’isolation et la confiance entre les services.

---

## 🧱 Architecture Technique

- **Langage** : JavaScript (Node.js / Express.js)
- **Conteneurisation** : Docker
- **Orchestration** : Kubernetes (Minikube)
- **Identité & mTLS** : SPIFFE/SPIRE + Envoy
- **Politiques dynamiques** : Open Policy Agent (OPA)
- **CI/CD** : GitHub Actions
- **Sécurité** : JWT, RBAC, Trivy Scan, Helmet, Rate Limiting
- **Monitoring** : Prometheus + Grafana
- **Observabilité** : Logs JSON via Winston + Prometheus Exporter

---

## 🧩 Microservices

| Service          | Description                                      |
|------------------|--------------------------------------------------|
| `auth-service`   | Gère l’authentification (JWT, login, rôles)     |
| `user-service`   | Profil utilisateur et gestion des identifiants  |
| `wallet-service` | Portefeuille numérique (soldes, dépôts)         |
| `payment-service`| Paiements entre utilisateurs                    |

---

## 👥 Acteurs du Système

### Internes :
- Microservices (4)
- Kubernetes (Minikube)
- SPIRE Server & Agents
- Envoy Proxy
- Open Policy Agent (OPA)
- Prometheus & Grafana
- CI/CD Pipeline (GitHub Actions)

### Externes :
- Utilisateur final
- **Agent de paiement** (alimente les portefeuilles)
- Administrateur DevOps
- Frontend (optionnel)
- Attaquant (simulation)
- Systèmes tiers (optionnels)

---

## 🔐 Fonctionnalités de Sécurité

- mTLS automatique entre services (via SPIFFE/SPIRE + Envoy)
- Authentification avec JWT signés
- Attestation des workloads avec SPIRE
- RBAC Kubernetes + RBAC applicatif
- Politiques OPA par rôle ou SPIFFE ID
- Scans de sécurité avec Trivy (images Docker)
- Monitoring & alerting : échecs mTLS, anomalies

---

## 🧪 Démo et Tests

- Scénario de démo complet : Authentification, appels sécurisés, mTLS, refus par politiques
- Simulation d’attaques (ex. : SVID invalide)
- Logs et métriques visibles dans Grafana

---

## 🚀 Lancement rapide (local)

1. Cloner le dépôt :
```bash
git clone https://github.com/mohammedreda/zero-trust-payment-system.git
cd zero-trust-payment-system
