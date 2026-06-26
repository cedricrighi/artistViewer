import { useState } from "react";
import { coverArtUrl } from "../api";

// Cover Art Archive thumbnail with a graceful fallback: many releases have no
// artwork, so a 404 just swaps in a placeholder instead of a broken image.
export default function CoverArt({ mbid, title }: { mbid: string; title: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="cover cover-fallback" aria-hidden="true">
        ♪
      </div>
    );
  }

  return (
    <img
      className="cover"
      src={coverArtUrl(mbid)}
      alt={`Pochette de ${title}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
