async function getMDWInfo() {
  const url = 'https://ursaepru.asisa.es/ASISA/middlewasisa/public/v1/api/searchPortal/network';
  try {
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Ocp-Apim-Subscription-Key': 'ce863b4c72024e2da8414bbf34501ffa'
      }
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`HTTP ${resp.status} for ${url} :: ${txt}`);
    }
    return await resp.json();
  } catch (error) {
    console.error('MDW Info Error:', error);
    return { error: error.message };
  }
}

export default async function handler(req, res) {
  let { name } = req.query;
  const pokemonName = name ? name.toLowerCase().split('.').shift() : '';

  if (!pokemonName) {
    return res.status(400).send('Pokemon name is required');
  }

  try {
    // Lanzamos ambas peticiones en paralelo
    const [pokeResponse, mdwInfo] = await Promise.all([
      fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`),
      getMDWInfo()
    ]);

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
          <div class="mdw">
            <h3>Middleware Network Info</h3>
            <pre>{{mdw}}</pre>
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
      '{{weight}}': pokemon.weight,
      '{{mdw}}': JSON.stringify(mdwInfo, null, 2)
    };

    Object.keys(replacements).forEach(key => {
      html = html.split(key).join(replacements[key]);
    });

    // Si la plantilla de AEM no tenía el placeholder {{mdw}}, lo añadimos al final por seguridad
    if (!html.includes(JSON.stringify(mdwInfo, null, 2))) {
      html += `
        <div class="mdw" style="margin-top: 2rem; border-top: 1px solid #ccc; padding-top: 1rem;">
          <h3>Asisa Middleware Info (Debug)</h3>
          <pre style="background: #f4f4f4; padding: 1rem; overflow: auto;">${JSON.stringify(mdwInfo, null, 2)}</pre>
        </div>
      `;
    }

    // Envolvemos en un main para que Adobe lo procese bien
    const finalHtml = `<!DOCTYPE html><html><head><title>${pokemon.name}</title></head><body><main><div>${html}</div></main></body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).send(finalHtml);

  } catch (error) {
    return res.status(500).send(`Error: ${error.message}`);
  }
}