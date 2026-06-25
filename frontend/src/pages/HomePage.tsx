import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStatsOverview, type StatsOverview } from "../api";

export default function HomePage() {
  const [stats, setStats] = useState<StatsOverview | null>(null);

  useEffect(() => {
    getStatsOverview().then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <section>
      <div className="hero">
        <h1>Explorez les collaborations musicales</h1>
        <p className="lead">
          MusicGraph récupère des artistes depuis MusicBrainz, les stocke dans un graphe Neo4j et
          révèle qui a collaboré avec qui, sur quels morceaux et quels albums.
        </p>
        <div className="hero-actions">
          <Link to="/search" className="btn">
            Rechercher un artiste
          </Link>
          <Link to="/artists" className="btn btn-ghost">
            Voir les artistes
          </Link>
          <Link to="/stats" className="btn btn-ghost">
            Statistiques
          </Link>
        </div>
      </div>

      {stats && (
        <div className="overview-grid">
          <Stat value={stats.artists} label="artistes" />
          <Stat value={stats.recordings} label="morceaux" />
          <Stat value={stats.releases} label="albums / releases" />
          <Stat value={stats.collaborations} label="collaborations" />
          <Stat value={stats.genres} label="genres" />
          <Stat value={stats.labels} label="labels" />
        </div>
      )}
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      {label}
    </div>
  );
}
