export default async function handler(req, res) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

  const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
  
  try {
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
    if (!tokenData.access_token) throw new Error('Token Error');

    const songRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    let isPlaying = false;
    let title = "Not Playing";
    let artist = "Spotify";

    if (songRes.status === 200) {
      const songData = await songRes.json();
      if (songData && songData.is_playing && songData.item) {
        isPlaying = true;
        title = songData.item.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        artist = songData.item.artists.map(a => a.name).join(', ').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
    }

    const statusText = isPlaying ? "NOW PLAYING ON SPOTIFY" : "OFFLINE / PAUSED";
    const statusColor = isPlaying ? "#1DB954" : "#b3b3b3";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100">
      <rect width="100%" height="100%" fill="#121212" rx="12" stroke="#282828" stroke-width="2"/>
      <circle cx="30" cy="28" r="5" fill="${statusColor}"/>
      <text x="45" y="32" fill="${statusColor}" font-family="sans-serif" font-size="10" font-weight="bold" letter-spacing="1.5">${statusText}</text>
      <text x="30" y="58" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">${title.length > 35 ? title.substring(0, 32) + '...' : title}</text>
      <text x="30" y="78" fill="#b3b3b3" font-family="sans-serif" font-size="12">${artist.length > 40 ? artist.substring(0, 37) + '...' : artist}</text>
    </svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');
    return res.status(200).send(svg);
  } catch (err) {
    const errSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><rect width="100%" height="100%" fill="#121212" rx="12"/><text x="50%" y="50%" fill="#b3b3b3" font-family="sans-serif" font-size="13" dominant-baseline="middle" text-anchor="middle">Spotify Connected</text></svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(errSvg);
  }
}
