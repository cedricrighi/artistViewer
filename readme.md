Projet B3 Dev & B3 Data
MusicGraph — Exploration des collaborations musicales avec MusicBrainz et Neo4j

Stack technique retenue
Backend : Node.js + Express + TypeScript, driver neo4j-driver pour Neo4j (dossier backend/)
Frontend : React + TypeScript via Vite (dossier frontend/)
Base de données : Neo4j (Community Edition, via Docker)
Visualisation de graphe : Cytoscape.js (à intégrer côté frontend)
Récupération MusicBrainz : appels HTTP directs (fetch/axios) avec respect du rate-limit (1 req/s)
Infra : Docker Compose (neo4j, backend, frontend)

État actuel : squelettes backend (Express + TS, endpoints /api/health et /api/health/neo4j) et frontend (Vite + React + TS) créés. Docker Compose en place avec les 3 services (neo4j, backend, frontend). Intégration MusicBrainz et modèle de données à venir.

Lancer le projet
Depuis la racine du repo (artistViewer/, là où se trouve docker-compose.yaml) :

cp .env.example .env
docker compose --env-file .env up --build

Backend disponible sur http://localhost:4000 (santé : /api/health, /api/health/neo4j)
Frontend disponible sur http://localhost:5173
Neo4j Browser disponible sur http://localhost:7474

Contexte du projet
Les plateformes musicales contiennent de nombreuses relations entre artistes, morceaux, albums, groupes, collaborations et featuring. Ces relations sont difficiles à représenter dans une base relationnelle classique, mais elles se prêtent très bien à une modélisation sous forme de graphe.

Dans ce projet, vous devez créer une application complète permettant de récupérer des données musicales depuis l’API MusicBrainz, de les stocker dans une base Neo4j, puis de les afficher dans un site web.

L’objectif est de construire une plateforme appelée MusicGraph, capable d’explorer les artistes, leurs morceaux, leurs albums et leurs collaborations.

Objectif général
Vous devez développer une application web permettant de :

rechercher des artistes depuis MusicBrainz,
récupérer leurs informations principales,
récupérer leurs morceaux, albums ou releases associés,
identifier les collaborations et featuring,
stocker les données dans Neo4j,
afficher les artistes dans une interface web,
visualiser les relations entre artistes, morceaux, albums et collaborations,
proposer une analyse simple des artistes les plus connectés.
Le rendu final doit être un repo GitHub complet contenant :

un backend avec API obligatoire,
un frontend,
une base Neo4j,
un fichier docker-compose.yml,
un fichier .env.example,
un README.md complet et professionnel,
un jeu de données récupéré depuis MusicBrainz ou généré à partir de l’API,
une documentation claire du modèle de données et des choix techniques.
Les choix technologiques (langages, frameworks, outils frontend/backend) sont laissés libres aux étudiants.

Problématique
À partir de données issues de MusicBrainz, comment construire un graphe permettant de répondre aux questions suivantes ?

Quels morceaux sont associés à un artiste ?
Quels artistes ont collaboré ensemble ?
Quels artistes apparaissent en featuring ?
Quels albums ou releases contiennent ces morceaux ?
Quels artistes sont les plus connectés ?
Quels genres musicaux sont les plus présents ?
Quels chemins relient deux artistes ?
Quels morceaux créent des ponts entre plusieurs artistes ?
Fonctionnalités minimales attendues

1. Recherche d’artistes
   L’application doit permettre de rechercher un artiste par nom.

Exemples :

Daft Punk,
Beyoncé,
Jay-Z,
Kendrick Lamar,
Angèle,
Stromae,
Ninho,
Damso,
SCH,
PNL.
L’utilisateur doit pouvoir saisir un nom d’artiste dans l’interface web, puis obtenir une liste de résultats.

Chaque résultat doit afficher au minimum :

nom de l’artiste,
identifiant MusicBrainz,
pays,
type d’artiste,
date de début d’activité si disponible,
score de correspondance si disponible. 2. Import d’un artiste dans Neo4j
Depuis un résultat de recherche, l’utilisateur doit pouvoir importer un artiste dans la base Neo4j.

L’import doit créer ou mettre à jour un nœud Artist.

L’application doit éviter les doublons en utilisant l’identifiant MusicBrainz de l’artiste.

3. Récupération des morceaux associés
   Pour chaque artiste importé, l’application doit récupérer une sélection de morceaux associés.

Un morceau doit être représenté par un nœud Track ou Recording.

Chaque morceau doit contenir au minimum :

identifiant MusicBrainz,
titre,
durée si disponible,
date de première publication si disponible,
score de popularité interne si calculé,
source de récupération. 4. Récupération des releases ou albums
L’application doit récupérer les releases ou albums associés aux morceaux.

Chaque release doit être représentée par un nœud Release ou Album.

Chaque release doit contenir au minimum :

identifiant MusicBrainz,
titre,
date de sortie,
pays,
statut,
type,
image de couverture si disponible en bonus. 5. Détection des collaborations
L’application doit identifier les collaborations entre artistes.

Une collaboration peut être détectée de plusieurs façons :

plusieurs artistes crédités sur un même morceau,
présence de termes comme feat., featuring, ft., avec, x, & dans le titre ou le crédit,
relations MusicBrainz disponibles entre artistes, recordings ou releases,
artistes différents présents dans les crédits d’un même enregistrement.
Les collaborations doivent être représentées dans Neo4j par des relations entre artistes et morceaux.

6. Site web de visualisation
   Le site doit permettre d’afficher :

la liste des artistes importés,
la fiche détaillée d’un artiste,
les morceaux associés à un artiste,
les albums ou releases associés,
les collaborations détectées,
les artistes liés à un artiste donné,
un graphe visuel simple des relations.
Modèle de données Neo4j attendu
Nœuds principaux
Artist
{
"mbid": "musicbrainz-artist-id",
"name": "Daft Punk",
"type": "Group",
"country": "FR",
"gender": null,
"beginDate": "1993",
"endDate": "2021",
"disambiguation": "French electronic music duo"
}
Recording
{
"mbid": "musicbrainz-recording-id",
"title": "Get Lucky",
"length": 369000,
"firstReleaseDate": "2013-04-19"
}
Release
{
"mbid": "musicbrainz-release-id",
"title": "Random Access Memories",
"date": "2013-05-17",
"country": "XE",
"status": "Official",
"releaseType": "Album"
}
Label
{
"mbid": "musicbrainz-label-id",
"name": "Columbia",
"country": "US"
}
Genre
{
"name": "electronic"
}
Area
{
"mbid": "musicbrainz-area-id",
"name": "France",
"type": "Country"
}
Relations Neo4j attendues
(:Artist)-[:PERFORMED]->(:Recording)

(:Artist)-[:FEATURED_ON]->(:Recording)

(:Artist)-[:COLLABORATED_WITH]->(:Artist)

(:Recording)-[:APPEARS_ON]->(:Release)

(:Release)-[:RELEASED_BY]->(:Label)

(:Artist)-[:ASSOCIATED_WITH_GENRE]->(:Genre)

(:Artist)-[:FROM_AREA]->(:Area)

(:Release)-[:RELEASED_IN]->(:Area)
API interne attendue (obligatoire)
Le backend doit exposer une API permettant au frontend de communiquer avec les données stockées dans Neo4j.

Endpoints principaux
GET /api/artists
GET /api/artists/:id
GET /api/artists/:id/recordings
GET /api/artists/:id/releases
GET /api/artists/:id/collaborations
GET /api/search/artists
POST /api/import/artists

GET /api/recordings
GET /api/recordings/:id
GET /api/recordings/:id/artists
GET /api/recordings/:id/releases

GET /api/releases
GET /api/releases/:id
GET /api/releases/:id/recordings
GET /api/releases/:id/artists

GET /api/graph
GET /api/graph/artists/:id
GET /api/graph/collaborations

GET /api/stats/overview
GET /api/stats/top-collaborations
GET /api/stats/top-artists
GET /api/stats/top-genres
Interface web attendue
Le site doit proposer au minimum :

une page d’accueil,
une page de recherche,
une page liste des artistes,
une page détail artiste,
une page morceaux,
une page graphe,
une page statistiques.
Partie Data attendue
Les étudiants doivent produire :

top artistes les plus connectés,
top collaborations,
top morceaux,
statistiques globales,
analyse du graphe et des limites.
Règles de qualité des données
utilisation des MBID pour éviter les doublons,
normalisation des données,
gestion des erreurs API,
limitation des appels à MusicBrainz,
gestion des données manquantes.
Rendu attendu
Le rendu doit être un repo GitHub contenant au minimum :

musicgraph/
├── backend/
├── frontend/
├── data/
├── docs/
├── docker-compose.yml
├── README.md
└── .env.example
Contraintes obligatoires
API backend obligatoire,
utilisation de Docker et Docker Compose,
présence d’un fichier .env.example,
présence d’un README complet,
utilisation de Neo4j,
utilisation de MusicBrainz,
documentation du projet.
Critères d’évaluation
Critère Points
Backend & API 4
Intégration MusicBrainz 3
Modélisation Neo4j 4
Qualité des données 3
Interface web 3
Analyse data 3
Docker & organisation 2
README & documentation 3
Présentation orale 5
Total 30
Résultat attendu
Le projet doit démontrer la capacité à :

construire une application complète,
exploiter une API externe,
modéliser un graphe,
analyser des données,
documenter un projet,
dockeriser une application.
Le document est directement utilisable et téléchargeable au format Markdown.
