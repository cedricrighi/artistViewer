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
