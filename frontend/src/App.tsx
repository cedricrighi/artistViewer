import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import SearchPage from "./pages/SearchPage";
import ArtistsPage from "./pages/ArtistsPage";
import ArtistDetailPage from "./pages/ArtistDetailPage";
import "./App.css";

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
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/artists" replace />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/artists/:id" element={<ArtistDetailPage />} />
          <Route path="*" element={<p>Page introuvable.</p>} />
        </Routes>
      </main>
    </div>
  );
}
