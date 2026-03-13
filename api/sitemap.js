export default async function handler(req, res) {
  try {
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=10000');

    if (!response.ok) {
      throw new Error(`Error de comunicación con PokeAPI: ${response.status}`);
    }

    const data = await response.json();

    const pokemons = data.results.map(pokemon => pokemon.name);

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pokemons.map(name => `
  <url>
    <loc>https://main--asisa-poc--asisa-softtek.aem.live/pokemon/${name}</loc>
  </url>`).join('')}
</urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

    return res.status(200).send(sitemap);

  } catch (error) {
    console.error("Error generando el sitemap en el proxy:", error);
    return res.status(500).send('<error>Error interno al generar el sitemap</error>');
  }
}