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

    // 3. Inyectar datos en la plantilla (AEM Section format)
    html = `<div class="section">
      <h1 id="test-header">${pokemon.name.toUpperCase()}</h1>
      <p>ID: #${pokemon.id}</p>
      <p>Si ves esto, el pipeline BYOM funciona con clase section.</p>
    </div>`;

    // 4. Entregar el resultado a Adobe (Fragmento para modo markup)
    const debugComment = `<!-- BYOM Debug: Template=${TEMPLATE_URL} | Time=${new Date().toISOString()} -->`;
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html + debugComment);

  } catch (error) {
    console.error('Error en BYOM Function:', error);
    return res.status(500).send(`Error interno: ${error.message}`);
  }
}
