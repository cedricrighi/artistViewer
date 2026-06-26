# Modèle de données & choix techniques

## Vue d'ensemble

MusicGraph modélise les relations musicales (artistes, morceaux, albums,
collaborations) sous forme de **graphe Neo4j**, alimenté depuis l'API
**MusicBrainz** via un backend **Express/TypeScript**, et exploré via un
frontend **React/Vite**.

```
MusicBrainz  ──>  Backend (Express)  ──>  Neo4j  ──>  Frontend (React)
   (API)            import + lecture        graphe        visualisation
```

## Nœuds

| Label | Clé d'unicité | Propriétés principales |
| --- | --- | --- |
| `Artist` | `mbid` | `name`, `type`, `country`, `disambiguation`, `beginDate`, `endDate` |
| `Recording` | `mbid` | `title`, `length` (ms), `firstReleaseDate` |
| `Release` | `mbid` | `title`, `date`, `country`, `status`, `releaseType` |
| `Label` | `mbid` | `name` |
| `Genre` | `name` | `name` |
| `Area` | `mbid` | `name`, `type` |

Toutes les entités MusicBrainz sont identifiées par leur **MBID**, ce qui
garantit l'absence de doublons (les imports utilisent `MERGE` sur le MBID).
`Genre` est mergé sur `name` (MusicBrainz n'expose pas toujours un id stable).

## Relations

| Relation | Sens | Signification |
| --- | --- | --- |
| `PERFORMED` | `(:Artist)-[:PERFORMED]->(:Recording)` | l'artiste interprète le morceau |
| `FEATURED_ON` | `(:Artist)-[:FEATURED_ON]->(:Recording)` | l'artiste est crédité (feat.) sur le morceau |
| `COLLABORATED_WITH` | `(:Artist)-[:COLLABORATED_WITH]->(:Artist)` | deux artistes crédités sur un même morceau |
| `APPEARS_ON` | `(:Recording)-[:APPEARS_ON]->(:Release)` | le morceau figure sur la release |
| `RELEASED_BY` | `(:Release)-[:RELEASED_BY]->(:Label)` | la release est éditée par le label |
| `ASSOCIATED_WITH_GENRE` | `(:Artist)-[:ASSOCIATED_WITH_GENRE]->(:Genre)` | genre associé à l'artiste |
| `FROM_AREA` | `(:Artist)-[:FROM_AREA]->(:Area)` | zone géographique de l'artiste |

## Détection des collaborations

Pour chaque morceau, MusicBrainz fournit la liste des `artist-credit`. Lors de
l'import :

- l'artiste importé qui figure dans les crédits obtient `PERFORMED`,
- les autres artistes crédités obtiennent `FEATURED_ON` vers le morceau et une
  relation `COLLABORATED_WITH` avec l'artiste importé.

La structure `artist-credit` de MusicBrainz encode déjà les `feat.`, `x`, `&`
via les `joinphrase`, ce qui évite de parser les titres à la main.

## Stratégie d'import (releases-first)

Le endpoint browse `/recording?artist=` n'accepte pas `inc=releases`. On
récupère donc les données **par release** :

```
GET /release?artist=<mbid>&inc=recordings+artist-credits+release-groups+labels
```

Un seul appel paginé ramène les releases, leurs morceaux imbriqués, les crédits
(collaborations) et les labels. Le backend aplatit ensuite cette arborescence
en `(morceau, release)` et ne conserve que les morceaux réellement crédités à
l'artiste importé (pour garder `PERFORMED` exact).

## Qualité des données

- **MBID** comme clé d'unicité → pas de doublons (`MERGE`).
- **Rate-limit MusicBrainz** : 1 requête/s (file d'attente côté client) +
  **retry/backoff** sur erreurs transitoires (`ECONNRESET`, 429, 503).
- **User-Agent** obligatoire (configurable via `.env`).
- **Gestion des champs manquants** : propriétés optionnelles stockées à `null`.
- **Gestion des erreurs API** : les erreurs sont loguées côté serveur et
  renvoyées au client (502 pour MusicBrainz, 500 pour Neo4j).

## API (résumé)

| Méthode | Route | Rôle |
| --- | --- | --- |
| GET | `/api/search/artists?q=` | recherche MusicBrainz |
| POST | `/api/import/artists` | import d'un artiste (+ genres, area) |
| POST | `/api/import/recordings` | import morceaux/albums/collaborations/labels |
| GET | `/api/artists` · `/api/artists/:id` | liste / fiche artiste |
| GET | `/api/artists/:id/recordings` · `/releases` · `/collaborations` | sous-ressources |
| GET | `/api/recordings` · `/api/recordings/:id` | morceaux |
| GET | `/api/releases` · `/api/releases/:id` | releases |
| GET | `/api/graph` · `/api/graph/collaborations` · `/api/graph/artists/:id` | graphes |
| GET | `/api/graph/path?from=&to=` | plus court chemin de collaboration entre deux artistes |
| GET | `/api/stats/overview` · `top-artists` · `top-collaborations` · `top-genres` · `top-recordings` | analyses |

## Choix techniques

- **Neo4j** : les relations many-to-many (collaborations, featuring, chemins
  entre artistes) sont naturelles en graphe et coûteuses en relationnel.
- **Node/TypeScript de bout en bout** : un seul langage backend + frontend.
- **react-router** : navigation multi-pages (accueil, recherche, artistes,
  fiche, morceaux, graphe, stats).
- **Visualisation** : **Cytoscape.js** (zoom / pan / drag), chargé en lazy pour
  ne pas alourdir le bundle initial — layout concentrique pour l'ego-graph d'un
  artiste, layout force (`cose`) pour le graphe global.
- **Plus court chemin** : `shortestPath` Cypher sur les relations
  `COLLABORATED_WITH` (max 8 sauts) pour relier deux artistes.
- **Docker Compose** : `neo4j`, `backend`, `frontend` orchestrés ensemble.

## Limites connues

- Les artistes créés uniquement comme collaborateurs (`FEATURED_ON`) n'ont que
  `mbid`/`name` tant qu'ils ne sont pas importés explicitement (pas de genres,
  area, dates).
- L'import est limité à 25 releases par artiste (pagination MusicBrainz) pour
  rester dans des temps de réponse raisonnables.
- `Area` n'est rattaché qu'à l'artiste (pas encore `RELEASED_IN` pour les
  releases).
