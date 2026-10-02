export default async function handler(req, res) {
  // Ambil username dari URL (?user=xxx) atau default
  const username = req.query.user || "YuuAntiSuki";
  const apiKey = "b25b959554ed76058ac220b7b2e0a026"; // Public Last.fm API Key

  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`
    );
    const data = await response.json();

    if (data.error) {
      return renderSVG(res, "LAST.FM ERROR", data.message, "Cek Username Last.fm", "#ff4444");
    }

    const track = data.recenttracks?.track?.[0];
    if (!track) {
      return renderSVG(res, "OFFLINE / PAUSED", "Belum ada riwayat lagu", "Last.fm", "#b3b3b3");
    }

    const title = track.name;
    const artist = track.artist["#text"] || track.artist.name;
    const isPlaying = track["@attr"] && track["@attr"].nowplaying === "true";

    const statusText = isPlaying ? "NOW PLAYING ON SPOTIFY" : "LAST PLAYED ON SPOTIFY";
    const statusColor = isPlaying ? "#1DB954" : "#b3b3b3";

    return renderSVG(res, statusText, title, artist, statusColor);
  } catch (err) {
    return renderSVG(res, "SERVER ERROR", err.message || "Unknown error", "Vercel", "#ff4444");
  }
}

function renderSVG(res, statusText, title, artist, statusColor = "#1DB954") {
  const cleanTitle = String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanArtist = String(artist).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100">
    <rect width="100%" height="100%" fill="#121212" rx="12" stroke="#282828" stroke-width="2"/>
    <circle cx="30" cy="28" r="5" fill="${statusColor}"/>
    <text x="45" y="32" fill="${statusColor}" font-family="sans-serif" font-size="10" font-weight="bold" letter-spacing="1.5">${statusText}</text>
    <text x="30" y="58" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">${cleanTitle.length > 35 ? cleanTitle.substring(0, 32) + '...' : cleanTitle}</text>
    <text x="30" y="78" fill="#b3b3b3" font-family="sans-serif" font-size="12">${cleanArtist.length > 40 ? cleanArtist.substring(0, 37) + '...' : cleanArtist}</text>
  </svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
 res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0');
  return res.status(200).send(svg);
}
