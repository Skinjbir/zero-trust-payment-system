# 🔐 Analyse STRIDE des microservices – Architecture Zero Trust

Ce document présente une analyse des menaces STRIDE pour les principaux microservices du système de paiement, déployés sur Kubernetes, protégés par SPIFFE/SPIRE, OPA, Envoy, JWT et mTLS.

Les microservices sont :

- `auth-service` : Authentification et émission des tokens JWT
- `user-service` : Gestion des comptes utilisateurs
- `wallet-service` : Gestion des portefeuilles et soldes
- `payment-service` : Création et traitement des paiements

Des rôles métiers ont été ajoutés :  
Utilisateur, Agent (SPIFFE), Admin Utilisateur, Admin Financier, DevOps, Auditeur Sécurité.

---

## 🟦 Microservice `auth-service`

| **Menace**             | **Exemple**                                                | **Mesures** |
|------------------------|------------------------------------------------------------|-------------|
| **Spoofing**           | Un attaquant simule un utilisateur pour obtenir un JWT     | Auth par mot de passe + MFA possible ; SPIFFE pour les appels internes |
| **Tampering**          | Modification manuelle du JWT (ex: changer `role: user → admin`) | JWT signé (HMAC/RSA), vérifié à chaque requête |
| **Repudiation**        | Un utilisateur nie s’être connecté                         | Logs JSON horodatés, ID token (`jti`) persisté |
| **Information Disclosure** | JWT intercepté ou sensible (email/password) exposé     | mTLS entre services ; JWT limité à l’essentiel (`sub`, `role`) |
| **DoS**                | Attaque par brute force sur `/login`                       | Rate limiting + liveness probes + alertes Prometheus |
| **Elevation of Privilege** | Un user obtient `admin` sans droit                     | Rôle contrôlé côté `auth-service` + OPA en validation secondaire |

---

## 👤 Microservice `user-service`

| **Menace**             | **Exemple**                                                      | **Mesures** |
|------------------------|------------------------------------------------------------------|-------------|
| **Spoofing**           | Un agent ou service usurpe un utilisateur via SPIFFE             | Vérification croisée SPIFFE + JWT (`sub == user_id`) |
| **Tampering**          | Modifier le rôle d’un utilisateur par appel direct à l’API       | OPA (`only admin can PATCH roles`) + audit logs |
| **Repudiation**        | Admin nie avoir modifié un compte                                | Journaux détaillés avec SPIFFE ID + JWT + timestamp |
| **Information Disclosure** | Admin lit un profil sans autorisation                         | OPA filtre l’accès par rôle (`audit`, `admin`, etc.) |
| **DoS**                | Requêtes massives sur `GET /users`                               | Rate limiting + quotas + observabilité |
| **Elevation of Privilege** | Utilisateur accède à `/admin/users` via un token modifié     | SPIFFE ID rejeté + OPA deny + JWT signature requise |

---

## 💰 Microservice `wallet-service`

| **Menace**             | **Exemple**                                                     | **Mesures** |
|------------------------|------------------------------------------------------------------|-------------|
| **Spoofing**           | `agent-service` falsifié tente un dépôt                          | mTLS obligatoire + SPIFFE ID validé par Envoy |
| **Tampering**          | Modification directe du solde dans la requête                    | Aucun accès en écriture sans OPA (`/deposit`, `/debit` restreints) |
| **Repudiation**        | Agent ou user nie une transaction                                | Logs persistants avec SPIFFE ID / JWT / montant / horodatage |
| **Information Disclosure** | Lecture d’un solde par un admin non autorisé                 | OPA role-based access : `admin user` ≠ `admin finance` |
| **DoS**                | Spam sur `get-balance` ou `deposit`                              | Limites par SPIFFE ID + seuils de dépôt (OPA) + alertes |
| **Elevation of Privilege** | Un user effectue un dépôt (réservé à agent)                 | SPIFFE ID autorisé = obligatoire + deny-by-default sur route |

---

## 💳 Microservice `payment-service`

| **Menace**             | **Exemple**                                                     | **Mesures** |
|------------------------|------------------------------------------------------------------|-------------|
| **Spoofing**           | Service non autorisé tente de créer une transaction             | SPIFFE ID contrôlé, seul `payment-service` autorisé à écrire |
| **Tampering**          | Changer le `receiver_id` ou `amount` d’un paiement en transit   | Validation stricte du payload + logs complets |
| **Repudiation**        | Nier un virement effectué                                       | Log structuré avec SPIFFE ID + JWT + ID transaction |
| **Information Disclosure** | Voir l’historique d’un autre utilisateur                    | OPA (`jwt.sub == sender_id`), SPIFFE ID vérifié |
| **DoS**                | Génération de paiements fantômes en masse                      | Filtrage de fréquence + quota SPIFFE ID + alertes Prometheus |
| **Elevation of Privilege** | Paiement effectué en contournant OPA (ex: admin non financier) | Vérification stricte du `role: finance` sur rollback, `role: user` sur `/payment` |

---
