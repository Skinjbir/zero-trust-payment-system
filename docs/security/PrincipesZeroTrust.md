# 🔐 Principes Zero Trust appliqués à mon système de paiement

## 🎯 Objectif

Dans le cadre de ce projet, j’ai appliqué une approche **Zero Trust** à l’ensemble du système de paiement basé sur des microservices, en m’appuyant sur **SPIFFE/SPIRE**, **Kubernetes**, et des mécanismes de contrôle d’accès dynamique (OPA, JWT, RBAC). Cette page documente les **principes Zero Trust que j’ai respectés** et ceux que j’ai identifiés comme nécessaires pour renforcer la sécurité du système.

---

## 🧱 Principes Zero Trust respectés

### 1. 🔍 Vérification explicite
Aucune confiance implicite n’est accordée à un utilisateur ou un service, même s’il est « interne ». L’authentification est obligatoire à chaque étape via :
- **JWT signés** (AUTH-1, AUTH-4)
- **SPIFFE ID vérifié** pour les communications inter-services (AUTH-2, AUTH-3, WALLET-3, PAYMENT-2)
- Découplage rôle / SPIFFE ID pour une meilleure séparation (AUTH-5)

### 2. 🔐 Moindre privilège
J’ai limité les droits d’accès au strict nécessaire :
- L’agent de paiement ne peut faire que des dépôts (AG-2)
- Les accès sont restreints via des rôles métiers et politiques OPA (WALLET-2)

### 3. 🧨 Supposition de compromission
Le système est conçu pour considérer qu’une brèche est possible :
- SPIFFE ID non autorisé = requête refusée (AUTH-3, PAYMENT-2)
- Journaux d’accès complets pour audit et investigation (ADM-4, PAYMENT-3)
- Ajout d’une règle SPIRE/OPA de refus par défaut (SEC-2)

### 4. 🧬 Micro-segmentation
Chaque microservice a un rôle défini et des permissions limitées :
- Les communications sont validées via SPIFFE ID (WALLET-3)
- Interactions avec services restreintes par design (PAYMENT-1, WALLET-4)

### 5. 🔐 mTLS entre services (via SPIRE)
Les échanges inter-services sont chiffrés et authentifiés :
- Ajout explicite d’une User Story dédiée à cette exigence (SEC-1)

### 6. 🆔 Identité forte des workloads
Les workloads sont authentifiés à l’aide de **SVIDs** générés par SPIRE :
- Implémenté avec SPIRE Server + Agent (SPIRE-1)
- SPIFFE ID exigé pour toute communication inter-service (AUTH-2, PAYMENT-2)

### 7. 📜 Contrôle d’accès dynamique (OPA + JWT)
L’accès aux ressources est conditionné par :
- Le **rôle métier dans le JWT** (AUTH-4, WALLET-2)
- L’**identité technique (SPIFFE ID)** validée par OPA (SEC-2)

### 8. ♻️ Rotation et renouvellement d’identifiants
- Les certificats SPIRE (SVIDs) sont renouvelés automatiquement (SPIRE-1)
- Les JWT utilisateurs ont une durée de validité courte et sont renouvelés régulièrement (AUTH-6)

### 9. 📊 Observabilité et journalisation
Chaque appel critique est journalisé avec :
- SPIFFE ID
- rôle métier
- identifiant utilisateur
- timestamp

Références : USER-4, PAYMENT-3, ADM-4, ADM-5

### 10. 🚨 Détection d’anomalies et alerting
- Des alertes sont prévues en cas d’erreur SPIRE (ex. SVID invalide ou expiré) — (SEC-3)
- Grafana permet aux administrateurs de visualiser les logs filtrés par SPIFFE ID (ADM-5)

---

## ❌ Points non respectés initialement, ajoutés par la suite

J’ai identifié les points suivants comme **manquants** dans la version initiale du système, et les ai ajoutés via de nouvelles User Stories dédiées :

| Principe | User Story |
|----------|------------|
| mTLS explicite interservices | `SEC-1` |
| Politique deny-all SPIRE/OPA | `SEC-2` |
| Alerte SPIRE sur SVID expiré/invalide | `SEC-3` |
| Rotation sécurisée des JWT utilisateurs | `AUTH-6` |
| Journalisation et filtrage par SPIFFE ID | `ADM-5` |

---

## 📌 Conclusion

Grâce à cette implémentation, mon système respecte les exigences d’une architecture **Zero Trust complète**, alignée sur les recommandations NIST et les standards SPIFFE/SPIRE.  
Les User Stories et les composants techniques assurent une **sécurité défensive**, **dynamique**, et **observable**, adaptée aux environnements cloud-native modernes.

