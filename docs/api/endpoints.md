# 📘 Endpoints REST par microservice (Sprint 1)

Ce tableau regroupe tous les endpoints à implémenter dans les microservices du projet, avec leur méthode, rôle et objectif

## 🧾 auth-service

| Méthode | Endpoint      | Description                           | Rôles autorisés                   |
|---------|---------------|----------------------------------------|----------------------------------|
| POST    | `/register`   | Création de compte + génération JWT    | Utilisateur, Agent, Admins       |
| POST    | `/login`      | Authentification, renvoie JWT          | Tous les rôles                   |
| GET     | `/validate`   | Vérification du JWT + rôle             | Services internes, OPA           |

---

## 👤 user-service

| Méthode | Endpoint               | Description                                 | Rôles autorisés       |
|---------|------------------------|---------------------------------------------|------------------------|
| GET     | `/me`                  | Consulter son profil                        | Utilisateur, Agent     |
| PUT     | `/me`                  | Modifier ses informations                   | Utilisateur, Agent     |
| GET     | `/users/:id`           | Lire un utilisateur par ID                  | Admin utilisateur      |
| PATCH   | `/users/:id/status`    | Suspendre ou réactiver un compte            | Admin utilisateur      |
| PATCH   | `/users/:id/role`      | Modifier le rôle d’un utilisateur           | Admin utilisateur      |

---

## 💰 wallet-service

| Méthode | Endpoint               | Description                                 | Rôles autorisés         |
|---------|------------------------|---------------------------------------------|--------------------------|
| GET     | `/wallet/balance`      | Consulter son solde                         | Utilisateur, Agent       |
| GET     | `/wallet/history`      | Voir l’historique de ses transactions       | Utilisateur              |
| POST    | `/wallet/deposit`      | Faire un dépôt                              | Agent de paiement        |
| GET     | `/admin/wallets`       | Voir les soldes des utilisateurs            | Admin financier          |

---

## 💳 payment-service

| Méthode | Endpoint                        | Description                             | Rôles autorisés      |
|---------|---------------------------------|-----------------------------------------|-----------------------|
| POST    | `/payment`                      | Effectuer un paiement                   | Utilisateur           |
| GET     | `/payment/history`              | Voir ses paiements                      | Utilisateur           |
| POST    | `/admin/rollback/:txid`         | Annuler une transaction récente         | Admin financier       |

---

## 🔐 infra_sécurité

| Méthode | Endpoint               | Description                                 | Rôles autorisés        |
|---------|------------------------|---------------------------------------------|-------------------------|
| POST    | `/deploy/service`      | Déploiement SPIRE / Kubernetes              | Admin DevOps            |
| GET     | `/logs`                | Logs d’accès, SPIFFE, OPA                   | Auditeur                |
| GET     | `/opa/policies`        | Lire les règles d’autorisation (Rego)       | Auditeur                |
| GET     | `/metrics`             | Accès aux métriques Prometheus / Grafana    | Grafana, Observabilité  |
