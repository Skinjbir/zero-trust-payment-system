#!/bin/bash

read -p "Nom du microservice : " SERVICE

if [[ -z "$SERVICE" ]]; then
  echo "⛔ Nom invalide. Abandon."
  exit 1
fi

TARGET="services/$SERVICE"

if [[ -d "$TARGET" ]]; then
  echo "⚠️ Le service '$SERVICE' existe déjà."
  exit 1
fi

echo "📁 Création du squelette vide pour le microservice '$SERVICE'..."

# Créer les dossiers
mkdir -p "$TARGET/src/controllers"
mkdir -p "$TARGET/src/routes"
mkdir -p "$TARGET/src/middlewares"
mkdir -p "$TARGET/src/validators"
mkdir -p "$TARGET/tests"

# Créer les fichiers vides
touch "$TARGET/src/index.js"
touch "$TARGET/package.json"
touch "$TARGET/Dockerfile"
touch "$TARGET/.env"
touch "$TARGET/README.md"
touch "$TARGET/tests/basic.test.js"

echo "✅ Squelette du service '$SERVICE' généré avec succès."
