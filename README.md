# MusicGraph

Exploration des collaborations musicales avec MusicBrainz et Neo4j.

Le sujet complet du projet (contexte, fonctionnalités attendues, modèle de données, critères d'évaluation) se trouve dans [sujet.md](./sujet.md).

## Stack technique

- **Backend** : Node.js + Express + TypeScript (`backend/`), driver `neo4j-driver` pour Neo4j
- **Frontend** : React + TypeScript via Vite (`frontend/`)
- **Base de données** : Neo4j (Community Edition, via Docker)
- **Visualisation de graphe** : Cytoscape.js (à intégrer côté frontend)
- **Récupération MusicBrainz** : appels HTTP directs (fetch/axios) avec respect du rate-limit (1 req/s)
- **Infra** : Docker Compose (`neo4j`, `backend`, `frontend`)

## État actuel

- Squelette backend (Express + TS) avec endpoints `/api/health` et `/api/health/neo4j`
- Squelette frontend (Vite + React + TS)
- Docker Compose avec les 3 services en place
- À venir : intégration MusicBrainz, modèle de données Neo4j, interface de visualisation

## Lancer le projet

Depuis la racine du repo (`artistViewer/`, là où se trouve `docker-compose.yaml`) :

```bash
cp .env.example .env
docker compose --env-file .env up --build
```

- Backend : http://localhost:4000 (santé : `/api/health`, `/api/health/neo4j`)
- Frontend : http://localhost:5173
- Neo4j Browser : http://localhost:7474

## Structure du repo

```
artistViewer/
├── backend/
├── frontend/
├── docker-compose.yaml
├── .env.example
├── sujet.md
└── README.md
```
