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

- **Backend** (Express + TS) :
  - Santé : `GET /api/health`, `GET /api/health/neo4j`
  - MusicBrainz : `GET /api/search/artists`, `POST /api/import/artists`, `POST /api/import/recordings` (client avec rate-limit 1 req/s + retry/backoff sur erreurs transitoires)
  - Artistes : `GET /api/artists`, `/api/artists/:id`, `.../recordings`, `.../releases`, `.../collaborations`
  - Morceaux & releases : `GET /api/recordings`, `/api/recordings/:id`, `/api/releases`, `/api/releases/:id`
  - Graphes : `GET /api/graph`, `/api/graph/collaborations`, `/api/graph/artists/:id`
  - Stats : `GET /api/stats/overview`, `top-artists`, `top-collaborations`, `top-genres`, `top-recordings`
- **Frontend** (Vite + React + TS, react-router) : accueil, recherche/import, liste des artistes, fiche détail (onglets morceaux / albums / collaborations / graphe), page statistiques
- **Modèle Neo4j** : nœuds `Artist`, `Recording`, `Release`, `Label`, `Genre`, `Area` ; relations `PERFORMED`, `FEATURED_ON`, `COLLABORATED_WITH`, `APPEARS_ON`, `RELEASED_BY`, `ASSOCIATED_WITH_GENRE`, `FROM_AREA` (voir [docs/data-model.md](./docs/data-model.md))
- **Données** : export du graphe dans [data/dataset.json](./data/dataset.json) (`npm run export:data`)
- Docker Compose avec les 3 services en place

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
├── backend/      # API Express + TS, client MusicBrainz, accès Neo4j
├── frontend/     # SPA React + Vite
├── data/         # export du dataset (dataset.json) + doc
├── docs/         # documentation du modèle de données et des choix techniques
├── docker-compose.yaml
├── .env.example
├── sujet.md
└── README.md
```
