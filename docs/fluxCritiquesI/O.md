# Flux critiques de sécurité entre services (Input / Output) avec données sensibles

1. **Authentification → Utilisateur**  
   - **Input :** identifiants (email, mot de passe)  
   - **Output :** JWT signé (token d’accès)  
   - **Données sensibles :** identifiants, mot de passe, JWT

2. **Utilisateur → Portefeuille**  
   - **Input :** requête authentifiée (JWT), identifiant utilisateur  
   - **Output :** solde du portefeuille, historique des transactions  
   - **Données sensibles :** JWT, identifiant utilisateur, solde, transactions

3. **Portefeuille → Paiement**  
   - **Input :** demande de paiement avec identifiants portefeuilles source/destination, montant  
   - **Output :** confirmation de paiement, mise à jour des soldes  
   - **Données sensibles :** montants, identifiants portefeuilles, statut transaction

4. **Agent de paiement → Portefeuille**  
   - **Input :** identifiant utilisateur bénéficiaire, montant du dépôt, JWT agent  
   - **Output :** confirmation de dépôt ou erreur  
   - **Données sensibles :** identifiant utilisateur, montant, JWT agent

5. **Tous services ↔ SPIRE Server & Agents**  
   - **Input :** requête d’attestation avec identifiants workload  
   - **Output :** SVID (certificat SPIFFE)  
   - **Données sensibles :** certificats SPIFFE (SVID), clés privées (locales)

6. **Tous services ↔ Envoy Proxy**  
   - **Input :** requêtes microservices chiffrées  
   - **Output :** réponses microservices chiffrées  
   - **Données sensibles :** tout le trafic chiffré (JWT, données utilisateur)

7. **Tous services ↔ OPA**  
   - **Input :** données contexte accès (SPIFFE ID, rôle, action demandée)  
   - **Output :** décision d’autorisation (allow / deny)  
   - **Données sensibles :** rôles, identifiants SPIFFE, métadonnées

8. **Tous services → Prometheus / Grafana**  
   - **Input :** métriques et logs structurés JSON  
   - **Output :** visualisations et alertes  
   - **Données sensibles :** logs contenant identifiants utilisateurs, statuts transactionnels

---

