# Flux critiques de sécurité entre services

1. **Authentification → Utilisateur**  
   - Transmission sécurisée (mTLS) du JWT signé pour validation des sessions.  
   - Protection contre la falsification et interception des tokens.

2. **Utilisateur → Portefeuille**  
   - Requête authentifiée avec JWT pour consultation ou modification du solde.  
   - Validation stricte des permissions (RBAC + OPA).

3. **Portefeuille → Paiement**  
   - Communication sécurisée pour vérifier la disponibilité des fonds.  
   - Mise à jour atomique des soldes lors de transfert.

4. **Agent de paiement → Portefeuille**  
   - Communication authentifiée pour créditer les portefeuilles via dépôt.  
   - Vérification des droits d’accès stricts.

5. **Tous services ↔ SPIRE Server & Agents**  
   - Attestation mutuelle des identités SPIFFE.  
   - Échange sécurisé des SVID (SPIFFE Verifiable Identity Documents).

6. **Tous services ↔ Envoy Proxy**  
   - Tunnel mTLS obligatoire pour toutes communications.  
   - Application des politiques de sécurité réseau.

7. **Tous services ↔ OPA**  
   - Évaluation en temps réel des règles d’accès selon contexte, rôle et identité.

8. **Tous services → Prometheus / Grafana**  
   - Export sécurisé des métriques et logs pour monitoring et alerting.
