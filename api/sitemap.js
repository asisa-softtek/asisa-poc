export default async function handler(req, res) {
  // En una implementación real, podrías hacer fetch a PokeAPI para obtener todos los nombres
  // Por ahora, usaremos una lista de los más populares para validar el sitemap.
  const pokemons = [
    'pikachu', 'charizard', 'mewtwo', 'bulbasaur', 'squirtle', 'eevee', 'lucario', 'gengar'
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pokemons.map(name => `
  <url>
    <loc>https://main--asisa-poc--asisa-softtek.aem.live/pokemon/${name}</loc>
  </url>`).join('')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(sitemap);
}
