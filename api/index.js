export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

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
      return renderSVG(res, "TOKEN ERROR", "Cek Refresh Token / Client Secret", "Error", "#ff4444");
    }

    const headers = { Authorization: `Bearer ${tokenData.access_token}` };

    // 2. Cek Currently Playing
    const songRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers });

    let title = "";
    let artist = "";
    let statusText = "OFFLINE / PAUSED";
    let statusColor = "#b3b3b3";

    if (songRes.status === 200) {
      const songData = await songRes.json();
      if (songData && songData.item) {
        title = songData.item.name;
        artist = songData.item.artists.map(a => a.name).join(', ');
        if (songData.is_playing) {
          statusText = "NOW PLAYING ON SPOTIFY";
          statusColor = "#1DB954";
        }
      }
    }

    // 3. Fallback ke Recently Played jika Web Player mengembalikan status 204
    if (!title) {
      const recentRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', { headers });
      if (recentRes.status === 200) {
        const recentData = await recentRes.json();
        if (recentData.items && recentData.items.length > 0) {
          const lastTrack = recentData.items[0].track;
          title = lastTrack.name;
          artist = lastTrack.artists.map(a => a.name).join(', ');
          statusText = "LAST PLAYED ON SPOTIFY";
          statusColor = "#1DB954";
        }
      }
    }

    if (!title) {
      title = "Not Playing";
      artist = "Spotify";
    }

    return renderSVG(res, statusText, title, artist, statusColor);

  } catch (err) {
    return renderSVG(res, "SERVER ERROR", err.message || "Unknown error", "Spotify", "#ff4444");
  }
}

function renderSVG(res, statusText, title, artist, statusColor = "#1DB954") {
  const cleanTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanArtist = artist.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100">
    <rect width="100%" height="100%" fill="#121212" rx="12" stroke="#282828" stroke-width="2"/>
    <circle cx="30" cy="28" r="5" fill="${statusColor}"/>
    <text x="45" y="32" fill="${statusColor}" font-family="sans-serif" font-size="10" font-weight="bold" letter-spacing="1.5">${statusText}</text>
    <text x="30" y="58" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">${cleanTitle.length > 35 ? cleanTitle.substring(0, 32) + '...' : cleanTitle}</text>
    <text x="30" y="78" fill="#b3b3b3" font-family="sans-serif" font-size="12">${cleanArtist.length > 40 ? cleanArtist.substring(0, 37) + '...' : cleanArtist}</text>
  </svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');
  return res.status(200).send(svg);
}
