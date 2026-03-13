export default async function handler(req, res) {
  const { limit = 20, offset = 0, secret } = req.query;

  // Una capa simple de seguridad para evitar ejecuciones accidentales
  const SYNC_SECRET = process.env.SYNC_SECRET;
  if (SYNC_SECRET && secret !== SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ADMIN_TOKEN = process.env.HLX_ADMIN_API_TOKEN;
  if (!ADMIN_TOKEN) {
    return res.status(500).json({ error: 'HLX_ADMIN_API_TOKEN not configured on Vercel' });
  }

  const OWNER = "asisa-softtek";
  const REPO = "asisa-poc";
  const BRANCH = "main";

  try {
    // Obtenemos la lista de pokemons (mismo origen que sitemap)
    const pokeListResp = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
    if (!pokeListResp.ok) throw new Error(`PokeAPI error: ${pokeListResp.status}`);
    const data = await pokeListResp.json();

    const results = [];

    // Iteramos y notificamos a Adobe
    for (const p of data.results) {
      const path = `/pokemon/${p.name}`;
      
      // Trigger Preview
      const previewResp = await fetch(`https://admin.hlx.page/preview/${OWNER}/${REPO}/${BRANCH}${path}`, {
        method: 'POST',
        headers: { 'x-auth-token': ADMIN_TOKEN }
      });

      // Trigger Live
      const liveResp = await fetch(`https://admin.hlx.page/live/${OWNER}/${REPO}/${BRANCH}${path}`, {
        method: 'POST',
        headers: { 'x-auth-token': ADMIN_TOKEN }
      });

      results.push({
        name: p.name,
        preview: previewResp.status,
        live: liveResp.status
      });
    }

    return res.status(200).json({
      message: `Sync completed for ${results.length} pokemons`,
      offset,
      nextOffset: parseInt(offset) + parseInt(limit),
      results
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
