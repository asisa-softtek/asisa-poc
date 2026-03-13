export default async function handler(req, res) {
  let { name } = req.query;
  const pokemonName = name ? name.toLowerCase().split('.').shift() : '';

  if (!pokemonName) {
    return res.status(400).send('Pokemon name is required');
  }

  try {
    const pokeResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
    if (!pokeResponse.ok) {
      // En modo 'markup', Adobe espera HTML. No podemos mandar un 301 real desde aquí.
      // Mandamos un 200 con meta refresh y noindex para que Adobe lo procese y de-indexe.
      const redirectHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="robots" content="noindex, nofollow">
            <meta http-equiv="refresh" content="0; url=/pokemon">
            <title>Redirigiendo...</title>
          </head>
          <body>
            <main>
              <div>
                <p>Pokémon no encontrado. Redirigiendo al <a href="/pokemon">listado completo</a>...</p>
              </div>
            </main>
          </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(redirectHtml);
    }
    const pokemon = await pokeResponse.json();

    // Intentamos cargar la plantilla desde AEM para que los autores puedan editarla
    const TEMPLATE_URL = `https://main--asisa-poc--asisa-softtek.aem.live/pokemon-template.plain.html`;
    let html;
    try {
      const resp = await fetch(TEMPLATE_URL);
      if (resp.ok) html = await resp.text();
    } catch (e) { /* fallback */ }

    if (!html) {
      // Fallback si la plantilla de AEM no está disponible
      html = `
        <div>
          <h1>{{name}}</h1>
          <p>Nº Pokedex: #{{id}}</p>
          <img src="{{image}}">
          <div class="stats">
            <h3>Stats</h3>
            <ul>{{stats}}</ul>
          </div>
        </div>
      `;
    }

    const replacements = {
      '{{name}}': pokemon.name.toUpperCase(),
      '{{id}}': pokemon.id,
      '{{image}}': pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default,
      '{{stats}}': pokemon.stats.map(s => `<li><strong>${s.stat.name.toUpperCase()}:</strong> ${s.base_stat}</li>`).join(''),
      '{{types}}': pokemon.types.map(t => `<li>${t.type.name.toUpperCase()}</li>`).join(''),
      '{{height}}': pokemon.height,
      '{{weight}}': pokemon.weight
    };

    Object.keys(replacements).forEach(key => {
      html = html.split(key).join(replacements[key]);
    });

    // Envolvemos en un main para que Adobe lo procese bien
    const finalHtml = `<!DOCTYPE html><html><head><title>${pokemon.name}</title></head><body><main><div>${html}</div></main></body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).send(finalHtml);

  } catch (error) {
    return res.status(500).send(`Error: ${error.message}`);
  }
}