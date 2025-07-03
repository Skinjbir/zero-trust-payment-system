# 🔁 Points d’interaction entre services

Ce document décrit les échanges critiques entre les microservices du système de paiement et les composants Zero Trust.  
Toutes les communications interservices sont :
- Authentifiées via **SPIFFE ID (SPIRE)**
- Sécurisées par **mTLS (mutual TLS via Envoy)**
- Autorisées dynamiquement par **OPA** (Open Policy Agent)
- Conformes au **principe du moindre privilège**

---

## 1. `auth-service` ↔ Utilisateur (humain via frontend)
- L’utilisateur s’authentifie avec email/mot de passe (`/login`).
- Le service émet un **JWT signé** contenant `sub`, `role`, `exp`.
- Ce JWT est ensuite utilisé par l’utilisateur pour toute requête vers les APIs applicatives.

## 2. `user-service` ↔ JWT utilisateur
- L’utilisateur consulte ou modifie son profil via `user-service`.
- Le JWT est validé, et OPA vérifie que `sub == user_id`.
- Toute tentative de modification d’un autre compte est rejetée.

## 3. `wallet-service` ↔ JWT utilisateur
- L’utilisateur interroge son solde ou l’historique de ses transactions.
- Le JWT est vérifié, et OPA autorise l’accès uniquement si le `sub` correspond au portefeuille.

## 4. `payment-service` ↔ `wallet-service` (via SPIFFE)
- `payment-service` demande à `wallet-service` de vérifier le solde (`/wallet/balance`) avant de débiter.
- SPIFFE ID `spiffe://payment.local/service/payment` est validé via mTLS.
- OPA autorise uniquement les appels interservices attendus.

## 5. `wallet-service` ↔ `user-service` (notification)
- Après une opération de débit/crédit, `wallet-service` notifie `user-service` pour affichage côté utilisateur.
- L’appel est fait via mTLS entre SPIFFE ID valides.

## 6. `agent-service` ↔ `wallet-service` (dépôt sécurisé)
- Un workload identifié par SPIFFE ID (`spiffe://payment.local/agent/...`) appelle `/deposit`.
- OPA vérifie que cet ID est autorisé **uniquement** à cet endpoint.
- Toute autre tentative est rejetée par OPA ou par Envoy (deny-by-default).

## 7. Frontend ↔ Microservices (via JWT uniquement)
- Le frontend transmet le JWT dans chaque requête (`Authorization: Bearer ...`).
- Aucune logique de sécurité n’est implémentée côté client.
- Toute la validation se fait dans le backend (OPA + SPIFFE interservices).

## 8. Administrateur Financier ↔ `wallet-service` / `payment-service`
- Utilise un JWT avec rôle `finance` pour accéder à :
  - `/admin/transactions`
  - `/admin/wallets`
  - `/admin/rollback/:txid`
- OPA autorise les rollback uniquement sous condition (montant, durée, SPIFFE ID).

## 9. Administrateur Utilisateur ↔ `user-service`
- JWT avec rôle `admin` pour modifier des profils via `/admin/users`.
- SPIFFE ID du service appelant + rôle JWT sont validés.
- L’accès aux endpoints financiers est bloqué (OPA deny).

## 10. Administrateur DevOps ↔ SPIRE / CI/CD / Kubernetes
- Ne passe **jamais** par les APIs métier.
- Gère : `registrationEntry`, rotation SVID, RBAC, secrets, GitHub Actions.
- Possède un SPIFFE ID dédié (`spiffe://payment.local/admin/devops`) pour identifier ses workloads.

## 11. Auditeur Sécurité ↔ OPA / SPIRE / Grafana
- Accède uniquement en **lecture** aux règles Rego, logs OPA, métriques SPIRE.
- Ne peut exécuter aucune requête applicative ou action en base.

## 12. Tous services ↔ SPIRE Server & Agent
- Chaque service obtient un certificat SVID à son démarrage.
- SPIRE Agent atteste le workload selon son `pod label` ou `serviceAccount`.
- SPIFFE ID est injecté automatiquement dans le mTLS.

## 13. Tous services ↔ Envoy Proxy (sidecar)
- Envoy gère :
  - Le mTLS entrant et sortant
  - L’injection du header `x-spiffe-id`
  - Le routage sécurisé basé sur le Trust Domain
- Refuse toute connexion non certifiée ou expirée.

## 14. Tous services ↔ OPA (Rego authz)
- Chaque action critique (`/payment`, `/deposit`, `/admin/...`) déclenche une évaluation OPA.
- Rego vérifie :
  - `input.jwt.role`
  - `input.spiffe_id`
  - `input.method`, `input.path`
  - Conditions contextuelles (heure, IP, fréquence)

## 15. Tous services ↔ Prometheus & Grafana
- Chaque service expose `/metrics` (CPU, erreurs, appels, refus OPA).
- Grafana affiche des tableaux de bord et déclenche des alertes :
  - SVID expiré
  - mTLS échoué
  - Requêtes interdites
  - Taux d’échec anormal sur un SPIFFE ID

## 16. Attaquant (simulé) ↔ système
- Permet de tester :
  - Appels non SPIFFE → refus mTLS
  - JWT invalide ou modifié → rejet signature
  - Endpoint interdit → OPA deny
  - Injection / élévation de privilège → rejet applicatif ou OPA
- Tous les événements sont loggués et visibles dans Grafana.

---

## 🧠 Synthèse : principes appliqués

- ✅ **Authentification forte**
  - JWT pour utilisateurs humains
  - SPIFFE ID pour workloads
- ✅ **mTLS obligatoire**
  - Assuré par Envoy avec certificat SPIRE
- ✅ **Autorisation dynamique**
  - Toutes les règles sont externalisées dans OPA (Rego)
- ✅ **Observabilité complète**
  - Logs Winston JSON
  - Métriques Prometheus
  - Dashboards Grafana
- ✅ **Isolation stricte des rôles**
  - Chaque rôle (user, agent, admin) a son SPIFFE ID ou JWT avec un scope contrôlé
- ❌ **Zéro accès implicite** : Deny-by-default partout

