export default async function handler(req, res) {
  // Fetch de todos los Pokémon
  const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=100000');
  const data = await response.json();
  const pokemons = data.results.map(p => p.name);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pokemons.map(name => `
  <url>
    <loc>https://asisa-poc.vercel.app/pokemon/${name}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`).join('')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(sitemap);
}