export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!client_id || !client_secret || !refresh_token) {
    return renderSVG(res, "ENV ERROR", "Variabel Vercel Belum Lengkap", "Cek Vercel Settings", "#ff4444");
  }

  const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
  
  try {
    // 1. Ambil Access Token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      const msg = tokenData.error_description || tokenData.error || "Token Invalid";
      return renderSVG(res, "AUTH ERROR (400)", msg, "Cek Client ID/Secret/Refresh Token", "#ff4444");
    }

    const headers = { Authorization: `Bearer ${tokenData.access_token}` };

    // 2. Cek Currently Playing
    const songRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers });

    if (songRes.status === 200) {
      const songData = await songRes.json();
      if (songData && songData.item) {
        const title = songData.item.name;
        const artist = songData.item.artists.map(a => a.name).join(', ');
        const isPlaying = songData.is_playing;
        return renderSVG(
          res,
          isPlaying ? "NOW PLAYING ON SPOTIFY" : "PAUSED ON SPOTIFY",
          title,
          artist,
          isPlaying ? "#1DB954" : "#ffb703"
        );
      }
    }

    // 3. Cek Recently Played (Fallback)
    const recentRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', { headers });

    if (recentRes.status === 200) {
      const recentData = await recentRes.json();
      if (recentData.items && recentData.items.length > 0) {
        const lastTrack = recentData.items[0].track;
        const title = lastTrack.name;
        const artist = lastTrack.artists.map(a => a.name).join(', ');
        return renderSVG(res, "LAST PLAYED ON SPOTIFY", title, artist, "#1DB954");
      }
    }

    // Diagnostic jika Spotify API mengembalikan Error Code
    if (songRes.status !== 200 && songRes.status !== 204) {
      return renderSVG(res, `SPOTIFY API ERROR (${songRes.status})`, `Currently Playing code: ${songRes.status}`, "Cek Scope / Spotify Dev Dashboard", "#ff4444");
    }

    if (recentRes.status !== 200 && recentRes.status !== 204) {
      return renderSVG(res, `RECENT API ERROR (${recentRes.status})`, `Recently Played code: ${recentRes.status}`, "Cek Scope user-read-recently-played", "#ff4444");
    }

    return renderSVG(res, "OFFLINE / PAUSED", "Tidak ada lagu yang terdeteksi", "Spotify", "#b3b3b3");

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
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.status(200).send(svg);
}
