# 🔐 Analyse MITRE ATT&CK appliquée à l’architecture Zero Trust

Ce document identifie les **techniques d’attaque MITRE ATT&CK** applicables aux microservices de notre système de paiement sécurisé, basé sur :

- Express.js
- Kubernetes (Minikube)
- SPIFFE/SPIRE pour l’identité
- mTLS avec Envoy
- Autorisation dynamique avec OPA
- JWT pour les utilisateurs humains

## 🧠 Qu’est-ce que MITRE ATT&CK ?

**MITRE ATT&CK** (Adversarial Tactics, Techniques & Common Knowledge) est une base de données mondialement reconnue qui répertorie les **comportements et techniques d’attaque** utilisés par les adversaires contre les systèmes d'information. Elle est structurée en :

- **Tactics** : objectifs d’attaque (ex. : accès initial, élévation de privilèges)
- **Techniques (TXXXX)** : méthodes spécifiques utilisées pour atteindre ces objectifs
- **Mitigations** : moyens de défense

Nous utilisons ici le modèle **Enterprise / Cloud** appliqué à des microservices en environnement containerisé.

---

## 🧩 Table de correspondance MITRE ATT&CK ↔ microservices

| 🎯 Service        | 🎯 Tactic               | 🧨 Technique (ID)                        | 🧾 Description                                                             | 🔥 Gravité | 🛡️ Contremesure principale |
|------------------|------------------------|-----------------------------------------|---------------------------------------------------------------------------|------------|----------------------------|
| `auth-service`   | Credential Access      | **T1110.003** – Password Spraying       | Tentatives massives d’authentification `/login` avec mots de passe faibles | Haute      | Rate limiting, captcha     |
| `auth-service`   | Initial Access         | **T1078** – Valid Accounts              | Utilisation de JWT volé ou toujours valide pour accéder à l’API          | Élevée     | Expiration + OPA + logs    |
| `auth-service`   | Discovery              | **T1087.001** – Account Discovery       | Énumération d’emails ou ID utilisateurs                                  | Moyenne    | Rejet silencieux des erreurs |
| `user-service`   | Privilege Escalation   | **T1068** – Exploitation via Faille    | Appels vers `/admin/users` avec un JWT falsifié                          | Critique   | OPA strict + tests unitaires |
| `user-service`   | Defense Evasion        | **T1027** – Obfuscation                | Manipulation du JWT ou payload encodé                                   | Moyenne    | Validation stricte + logs   |
| `wallet-service` | Impact                 | **T1499** – DoS via API Overload       | Flood de `/balance` ou `/history`                                       | Haute      | Rate limit, cache, QoS      |
| `wallet-service` | Initial Access         | **T1609** – Kubernetes Exploitation    | Pod compromis → appel vers d'autres services via mTLS                    | Critique   | RBAC + SPIFFE + deny-by-default |
| `payment-service`| Privilege Escalation   | **T1548** – Abuse Elevation            | Appel à `/admin/rollback/:txid` via un rôle non autorisé                | Critique   | OPA multi-facteur (role + contexte) |
| `payment-service`| Impact                 | **T1496** – Resource Hijacking         | Déclenchement de multiples paiements pour épuiser la ressource           | Haute      | Quotas, alertes Prometheus  |
| Global services  | Lateral Movement       | **T1557.003** – TLS Spoofing           | Tentative de contournement du mTLS via proxy interposé                  | Haute      | SPIRE + Envoy + SVID        |
| Global services  | Persistence            | **T1525** – Container Implantation     | Injection de backdoor dans une image Docker ou un script pipeline       | Critique   | Trivy CI/CD + signature + scan |
| Global services  | Credential Access      | **T1552** – Cleartext Credential Logs  | Tokens JWT ou secrets exposés dans les logs Winston                    | Haute      | Masquage des logs + audit   |

---


