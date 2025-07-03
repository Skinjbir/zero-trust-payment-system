# Points d’interaction entre services

1. **Authentification ↔ Utilisateur**  
   - L’authentification valide les identifiants et, après succès, transmet le token JWT pour l’accès aux services utilisateur.  
   - Le service utilisateur récupère les données de profil à afficher ou modifier.

2. **Utilisateur ↔ Portefeuille**  
   - L'utilisateur demande au service portefeuille les informations de solde et l’historique des transactions pour un utilisateur donné.  

3. **Portefeuille ↔ Paiement**  
   - Le service paiement vérifie auprès du portefeuille la disponibilité des fonds avant d’exécuter une transaction.  
   - Après paiement, le portefeuille est mis à jour (débit/crédit) et notifie le service utilisateur.

4. **Agent de paiement → Portefeuille**  
   - L’agent de paiement effectue des requêtes directes au portefeuille pour alimenter les comptes via dépôt sécurisé.

5. **Tous services ↔ SPIRE Server & Agents**  
   - Chaque service obtient son identité SPIFFE via SPIRE pour l’attestation et sécurisation des communications.

6. **Tous services ↔ Envoy Proxy (sidecar)**  
   - Envoy assure le chiffrement mTLS et le routage sécurisé entre les microservices.

7. **Tous services ↔ OPA**  
   - OPA évalue dynamiquement les politiques d’accès en fonction des rôles, SPIFFE ID et règles de sécurité.

8. **Services ↔ Prometheus & Grafana**  
   - Les microservices exportent des métriques et logs vers Prometheus.  
   - Grafana affiche et alerte sur ces données pour la supervision.

---

Chaque interaction est sécurisée par mTLS, avec des politiques Zero Trust garantissant le moindre privilège et la vérification explicite.

