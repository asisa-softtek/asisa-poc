export default async function handler(req, res) {
  try {
    // 1. Obtener la lista completa de nombres de PokeAPI
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=2000');
    if (!response.ok) throw new Error('Error fetching PokeAPI');
    const data = await response.json();
    const pokemons = data.results.map(p => p.name);

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pokemons.map(name => `
  <url>
    <loc>https://main--asisa-poc--asisa-softtek.aem.live/pokemon/${name}</loc>
  </url>`).join('')}
</urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(sitemap);
  } catch (error) {
    console.error('Sitemap Error:', error);
    return res.status(500).send('Error generating sitemap');
  }
}