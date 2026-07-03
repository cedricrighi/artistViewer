# Analyse du graphe

Analyse produite à partir du dataset exporté ([data/dataset.json](../data/dataset.json),
export du 03/07/2026), construit en important **3 artistes** depuis MusicBrainz :
**Naps**, **SCH** et **Jul** (scène rap marseillaise). Les 90 autres artistes du
graphe ont été créés automatiquement à partir des crédits de leurs morceaux
(collaborateurs / featurings).

## Vue d'ensemble du dataset

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

Releases : 72 officielles + 1 bootleg — 40 albums, 32 singles, 1 autre.
Chaque morceau apparaît en moyenne sur **1,45 release** (single + album,
rééditions).

## Réponses aux questions de la problématique

### 1. Quels morceaux sont associés à un artiste ?

`(:Artist)-[:PERFORMED]->(:Recording)` — exposé par `GET /api/artists/:id/recordings`.

Les 3 artistes importés : Naps (345 morceaux), SCH (153), Jul (96). Les
artistes non importés n'ont que leurs apparitions en featuring
(`FEATURED_ON`).

### 2. Quels artistes ont collaboré ensemble ?

`(:Artist)-[:COLLABORATED_WITH]-(:Artist)` — exposé par
`GET /api/artists/:id/collaborations`. La relation est créée dès que deux
artistes sont crédités sur le même enregistrement (les `artist-credit`
MusicBrainz encodent déjà les `feat.`, `x`, `&` via les `joinphrase`).

Top duos par morceaux partagés :

| # | Duo | Morceaux en commun |
| --- | --- | --- |
| 1 | Naps × Kalif Hardcore | 18 |
| 2 | Naps × Kalif | 8 |
| 3 | Jul × Naps | 7 |
| 4 | Naps × Gazo | 6 |
| 5 | SCH × Naps | 5 |
| 5 | SCH × Jul | 5 |

### 3. Quels artistes apparaissent en featuring ?

`(:Artist)-[:FEATURED_ON]->(:Recording)` : 214 apparitions en featuring dans
le dataset. Tous les artistes du graphe ont au moins une apparition créditée —
attendu, puisque les 90 artistes non importés n'existent que parce qu'ils
figurent dans les crédits d'un morceau de Naps, SCH ou Jul.

### 4. Quels albums ou releases contiennent ces morceaux ?

`(:Recording)-[:APPEARS_ON]->(:Release)` — exposé par
`GET /api/recordings/:id/releases` et `GET /api/releases/:id/recordings`.
858 liens morceau→release pour 593 morceaux : un même enregistrement
apparaît souvent sur plusieurs supports (single puis album).

### 5. Quels artistes sont les plus connectés ?

Degré = nombre de collaborateurs distincts (`GET /api/stats/top-artists`) :

| # | Artiste | Collaborateurs |
| --- | --- | --- |
| 1 | Naps | 54 |
| 2 | SCH | 44 |
| 3 | Jul | 20 |
| 4 | Soso Maness | 3 |
| 5 | Houari | 3 |

Le graphe est fortement centralisé sur les artistes importés (voir « Biais
d'échantillonnage » plus bas).

### 6. Quels genres musicaux sont les plus présents ?

`(:Artist)-[:ASSOCIATED_WITH_GENRE]->(:Genre)` — `GET /api/stats/top-genres`.
4 genres présents : gangsta rap, hip hop, pop rap, trap (1 artiste chacun).
Les genres ne sont récupérés que lors de l'import complet d'un artiste
(`inc=genres`), d'où leur faible nombre : seuls 3 artistes sur 93 sont
importés avec leurs métadonnées complètes.

### 7. Quels chemins relient deux artistes ?

`shortestPath` Cypher sur `COLLABORATED_WITH` (max 8 sauts) — exposé par
`GET /api/graph/path?from=&to=` et visualisé sur la page Graphe (le chemin est
surligné dans Cytoscape). Le graphe forme **une seule composante connexe de
93 artistes** : n'importe quelle paire d'artistes du dataset est reliée,
généralement en 1 à 3 sauts via les hubs Naps / SCH / Jul.

### 8. Quels morceaux créent des ponts entre plusieurs artistes ?

Morceaux triés par nombre d'artistes crédités (`GET /api/stats/top-recordings`) :

| # | Titre | Artistes crédités |
| --- | --- | --- |
| 1 | Pourquoi tu me fais le gros | 9 |
| 1 | Bande organisée | 9 |
| 1 | Légendaire | 9 |
| 4 | Les Galactiques | 8 |
| 5 | Pochon bleu | 6 |

« Bande organisée » est un cas d'école : un seul enregistrement crée 36
paires de collaborations potentielles entre 9 artistes.

## Structure du graphe

- **Une seule composante connexe** (93/93 artistes, aucun isolé) : tous les
  artistes sont atteignables les uns depuis les autres.
- **Topologie en étoile à 3 hubs** : Naps (54), SCH (44) et Jul (20)
  concentrent l'essentiel des liens ; 80 % des autres artistes ont 1 ou 2
  collaborateurs seulement.
- Les ponts entre hubs sont à la fois directs (SCH × Naps, SCH × Jul,
  Jul × Naps) et indirects via les morceaux collectifs (« Bande organisée »,
  « Les Galactiques »).

## Limites

1. **Biais d'échantillonnage** : le graphe reflète les artistes *importés*,
   pas la réalité musicale. Naps paraît plus connecté que SCH uniquement parce
   que sa discographie importée est plus grosse (345 vs 153 morceaux). Le « top
   artistes connectés » mesure d'abord la profondeur de l'import.
2. **Métadonnées asymétriques** : 3 artistes sur 93 ont leurs métadonnées
   complètes (type, pays, genres, dates). Les 90 autres n'ont que `mbid` +
   `name` tant qu'ils ne sont pas importés explicitement — d'où les stats
   genres/areas très creuses (4 genres, 2 areas).
3. **Import plafonné à 25 releases par artiste** (pagination MusicBrainz,
   temps de réponse) : les discographies très larges (Jul !) sont tronquées.
4. **Collaboration ≠ featuring au sens strict** : la détection repose sur les
   `artist-credit` du morceau. Un artiste co-crédité est traité comme
   featuring même s'il s'agit d'un duo permanent ; les collaborations
   « production » (beatmaker, ingé son) ne sont pas captées.
5. **Instantané** : le dataset est une photo à date d'export ; MusicBrainz
   évolue en continu (le score de recherche et les crédits peuvent changer).

## Reproduire l'analyse

Les tops sont servis en direct par l'API (`/api/stats/*`) et affichés sur la
page **Statistiques** du site. Les chiffres ci-dessus sont recalculables
depuis `data/dataset.json` (voir [data/README.md](../data/README.md) pour
régénérer l'export après de nouveaux imports).
