# Jeu de données

Ce dossier contient un export du graphe MusicGraph généré à partir de l'API MusicBrainz.

## `dataset.json`

Dump complet du graphe Neo4j (nœuds + relations) au format JSON :

```json
{
  "exportedAt": "...",
  "counts": { "nodes": 774, "relationships": 1860 },
  "nodes": [{ "label": "Artist", "properties": { "mbid": "...", "name": "..." } }],
  "relationships": [{ "type": "PERFORMED", "source": "<mbid>", "target": "<mbid>" }]
}
```

Composition de cet export :

| Nœuds | Nb | Relations | Nb |
| --- | --- | --- | --- |
| Artist | 93 | PERFORMED | 594 |
| Recording | 593 | APPEARS_ON | 858 |
| Release | 73 | FEATURED_ON | 214 |
| Label | 9 | COLLABORATED_WITH | 116 |
| Genre | 4 | RELEASED_BY | 49 |
| Area | 2 | ASSOCIATED_WITH_GENRE | 4 |
|  |  | RELEASED_IN | 24 |
|  |  | FROM_AREA | 1 |

## Comment le régénérer

Le dataset est produit par le script d'export du backend, qui interroge Neo4j :

```bash
cd backend
npm run export:data   # écrit data/dataset.json
```

## Comment reconstituer les données

Les données proviennent de MusicBrainz via l'application elle-même : il suffit
de lancer la stack (`docker compose up`), puis depuis l'interface web ou l'API
de rechercher et d'importer des artistes :

```bash
# Importer un artiste puis ses morceaux / albums / collaborations
curl -X POST http://localhost:4000/api/import/artists \
  -H "Content-Type: application/json" -d '{"mbid": "<mbid>"}'
curl -X POST http://localhost:4000/api/import/recordings \
  -H "Content-Type: application/json" -d '{"mbid": "<mbid>"}'
```

Chaque import crée/met à jour les nœuds via leur MBID (pas de doublon).
