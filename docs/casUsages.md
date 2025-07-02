# Cas d’usage par acteur

## Acteurs Internes

### Microservices
- **Authentification** : Valider les identifiants et émettre des JWT sécurisés.
- **Utilisateur** : Gérer les profils utilisateurs et leurs rôles.
- **Portefeuille** : Consulter le solde, gérer les dépôts et retraits.
- **Paiement** : Effectuer et enregistrer les transferts entre portefeuilles.

---

## Acteurs Externes

### Utilisateur final
- S’inscrire, se connecter et obtenir un token d’accès.
- Consulter son solde et l’historique de ses transactions.
- Effectuer des paiements vers d’autres utilisateurs.

### Agent de paiement
- Authentification avec rôle spécifique.
- Alimenter le portefeuille d’un utilisateur via un dépôt sécurisé.
- **(Pas d’accès à la consultation des dépôts ou autres fonctions)**

### Utilisateur Admin (rôle `admin`)
- Consulter les détails des utilisateurs.
- Accéder aux logs des transactions pour audit.
- Gérer les rôles utilisateurs (lecture uniquement dans ce scope).

### Frontend (optionnel)
- Interface pour simplifier les actions des utilisateurs et agents.
- Gérer l’authentification et sécuriser les appels API.

### Attaquant (simulation)
- Tester les mécanismes de sécurité en tentant des accès non autorisés.
- Vérifier la robustesse face aux attaques classiques (ex : injection, usurpation).

