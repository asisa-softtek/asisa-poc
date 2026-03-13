export default async function handler(req, res) {
  try {
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=10000');
    if (!response.ok) throw new Error(`PokeAPI error: ${response.status}`);
    const data = await response.json();

    // Helix sitemaps expect a JSON structure similar to query-index
    // with data in a "data" property
    const pokemons = data.results.map(pokemon => ({
      path: `/pokemon/${pokemon.name}`,
      lastmod: new Date().toISOString().split('T')[0]
    }));

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      total: pokemons.length,
      offset: 0,
      limit: pokemons.length,
      data: pokemons
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
