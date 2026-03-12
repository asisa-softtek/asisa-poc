import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  let { name } = req.query;
  const pokemonName = name ? name.toLowerCase().replace(/\.html$/, '') : '';

  if (!pokemonName) {
    return res.status(400).send('Pokemon name is required');
  }

  try {
    // 1. Obtener datos de la PokeAPI
    const pokeResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
    
    if (!pokeResponse.ok) {
      if (pokeResponse.status === 404) {
        return res.status(404).send('Pokémon no encontrado');
      }
      throw new Error('Error fetch PokeAPI');
    }

    const pokemon = await pokeResponse.json();

    // 2. Obtener la plantilla desde AEM (Gestionada por autores)
    // Añadimos un query param aleatorio para evitar caché agresiva de la plantilla durante pruebas
    const TEMPLATE_URL = `https://main--asisa-poc--asisa-softtek.aem.live/pokemon-template.plain.html?cb=${Date.now()}`;
    let html;
    
    try {
      const templateResponse = await fetch(TEMPLATE_URL);
      if (templateResponse.ok) {
        html = await templateResponse.text();
      } else {
        console.warn(`Plantilla remota no encontrada (${templateResponse.status}), usando base fallback`);
        html = '<div><h1>{{name}}</h1><p>ID: #{{id}}</p><img src="{{image}}"><div class="stats"><ul>{{stats}}</ul></div></div>';
      }
    } catch (e) {
      console.error('Error cargando plantilla remota:', e);
      html = '<div><h1>{{name}}</h1><p>ID: #{{id}}</p><img src="{{image}}"><div class="stats"><ul>{{stats}}</ul></div></div>';
    }

    // 3. Inyectar datos en la plantilla (Placeholders)
    const statsHtml = pokemon.stats
      .map(s => `<li><strong>${s.stat.name.toUpperCase()}:</strong> ${s.base_stat}</li>`)
      .join('');
    
    const typesHtml = pokemon.types
      .map(t => `<li>${t.type.name.toUpperCase()}</li>`)
      .join('');

    const replacements = {
      '{{name}}': pokemon.name.toUpperCase(),
      '{{name_id}}': pokemon.name.toLowerCase(),
      '{{image}}': pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default,
      '{{id}}': pokemon.id,
      '{{stats}}': statsHtml,
      '{{types}}': typesHtml,
      '{{weight}}': pokemon.weight / 10,
      '{{height}}': pokemon.height / 10
    };

    // Aplicar reemplazos
    Object.keys(replacements).forEach(key => {
      html = html.split(key).join(replacements[key]);
    });

    // Fix específico por si el autor dejó src="about:error" en la imagen
    html = html.replace('src="about:error"', `src="${replacements['{{image}}']}"`);

    // Envoltura estándar de AEM
    const finalHtml = `<div class="section">
      ${html}
    </div>`;

    // 4. Entregar el resultado a Adobe (Fragmento para modo markup)
    const debugComment = `<!-- BYOM Debug: Time=${new Date().toISOString()} | Size=${finalHtml.length} | Template=${html.length > 500 ? 'Loaded' : 'Fallback'} -->`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(finalHtml + debugComment);

  } catch (error) {
    console.error('Error en BYOM Function:', error);
    return res.status(500).send(`Error interno: ${error.message}`);
  }
}
