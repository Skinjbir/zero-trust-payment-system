# 👥 Acteurs du Système

Ce document décrit les **acteurs internes et externes** interagissant avec le système de paiement, structuré selon une architecture **Zero Trust**. Le système repose sur **Kubernetes (Minikube)** pour l’orchestration, **SPIFFE/SPIRE** pour l’identité, **Envoy/OPA** pour l’autorisation, et des **microservices Express.js** pour les fonctions métier.

Les acteurs sont organisés par **couches du système** :

- Couche Applicative : APIs, microservices, logique métier
- Couche Infrastructure : Kubernetes, CI/CD, pipeline
- Couche Sécurité : SPIRE, OPA, mTLS, contrôle d’accès
- Couche Réseau & Observabilité : proxy, métriques, logs

---

## Acteurs Internes

| Acteur                             | Couche(s)               | Rôle principal |
|------------------------------------|--------------------------|----------------|
| Microservices (Auth, Users, Wallet, Payment) | Applicative  | Fournissent les fonctionnalités métier : authentification, paiement, gestion de comptes. Chaque service a un SPIFFE ID et ne communique qu’en mTLS via Envoy. |
| Kubernetes (Minikube)              | Infrastructure           | Orchestration des conteneurs, gestion du réseau et des accès via RBAC, NetworkPolicy, serviceAccount. |
| SPIRE Server & Agents              | Sécurité / Infrastructure| Attribution d’identités SPIFFE aux workloads via attestation (RegistrationEntry). Définition du Trust Domain. |
| Envoy Proxy (sidecar)              | Réseau / Sécurité        | Proxy intégré dans chaque pod. Assure le mTLS, la vérification SPIFFE ID, et le filtrage des connexions. |
| OPA (Open Policy Agent)            | Sécurité                 | Exécute les règles Rego d'autorisation. Décisions basées sur le rôle, le SPIFFE ID, le contexte (heure, endpoint, etc.). |
| CI/CD Pipeline (GitHub Actions)    | Infrastructure           | Automatise lint, tests, scan Trivy, build Docker, déploiements vers Kubernetes. Gère les secrets via GitHub. |
| Prometheus & Grafana               | Réseau / Observabilité   | Collecte de métriques système, logs JSON, alertes (ex. : erreurs mTLS, SVID expirés, comportements anormaux). |

---

## Acteurs Externes

| Acteur                              | Couche(s)                     | Rôle principal |
|-------------------------------------|-------------------------------|----------------|
| Utilisateur final                   | Applicative                   | Crée un compte, se connecte, consulte son solde et effectue des paiements. Authentification via JWT signé. |
| Agent de paiement                   | Applicative / Sécurité        | Agent automatisé (pod ou job interne) chargé d'effectuer des dépôts via une API sécurisée (/api/deposit). Il possède un **SPIFFE ID attesté** par SPIRE et contrôlé par OPA. |
| Administrateurs                     | Applicative / Infrastructure / Sécurité | Groupe segmenté :<br>- **DevOps** : automatisé, identifié par SPIFFE ID (ex. job CI/CD)<br>- **Financier, User Admin, Audit** : humains, identifiés par JWT avec rôle (`admin`, `finance`, `audit`).<br>Chaque rôle est contrôlé séparément via OPA et journalisé. |
| Frontend (optionnel)                | Applicative                   | Interface utilisateur connectée via HTTPS et JWT. Consomme les APIs protégées. |
| Attaquant (simulé)                  | Sécurité (test)               | Utilisé pour des tests d'intrusion : faux SVID, appels sans mTLS, élévation de privilèges, OPA bypass. |
| Systèmes tiers (optionnel)          | Réseau / Sécurité             | Services KYC, banques, API externes. Connexion sécurisée via API Gateway + contrôle SPIFFE/OPA. |

---
