import { NavLink, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import ArtistsPage from "./pages/ArtistsPage";
import ArtistDetailPage from "./pages/ArtistDetailPage";
import RecordingsPage from "./pages/RecordingsPage";
import GraphPage from "./pages/GraphPage";
import StatsPage from "./pages/StatsPage";
import { useTheme } from "./theme-context";
import "./App.css";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
      title={theme === "dark" ? "Thème clair" : "Thème sombre"}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <NavLink to="/" className="brand">
          <svg className="brand-mark" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="6" cy="18" r="3" fill="currentColor" />
            <circle cx="18" cy="6" r="3" fill="currentColor" />
            <circle cx="18" cy="18" r="2.2" fill="currentColor" opacity="0.5" />
            <path d="M8 16.5 16 7.5M8 17.5h7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          MusicGraph
        </NavLink>
        <nav className="main-nav">
          <NavLink to="/search">Recherche</NavLink>
          <NavLink to="/artists">Artistes</NavLink>
          <NavLink to="/recordings">Morceaux</NavLink>
          <NavLink to="/graph">Graphe</NavLink>
          <NavLink to="/stats">Statistiques</NavLink>
        </nav>
        <ThemeToggle />
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/artists/:id" element={<ArtistDetailPage />} />
          <Route path="/recordings" element={<RecordingsPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="*" element={<p>Page introuvable.</p>} />
        </Routes>
      </main>
    </div>
  );
}
