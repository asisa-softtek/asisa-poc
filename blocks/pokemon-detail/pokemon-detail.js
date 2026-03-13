export default async function decorate(block) {
  const slug = window.location.pathname.split('/').pop().replace('.html', '');
  
  // Loading state
  block.innerHTML = `
    <div class="pokemon-detail-loading">
      <div class="loader"></div>
      <p>Buscando a ${slug.toUpperCase()}...</p>
    </div>
  `;

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${slug}`);
    if (!response.ok) throw new Error('Pokemon not found');
    const data = await response.json();

    const name = data.name.toUpperCase();
    const image = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
    const stats = data.stats.map(s => `
      <div class="stat-row">
        <span class="stat-name">${s.stat.name.replace('-', ' ').toUpperCase()}</span>
        <div class="stat-bar-container">
          <div class="stat-bar" style="width: ${(s.base_stat / 255) * 100}%"></div>
        </div>
        <span class="stat-value">${s.base_stat}</span>
      </div>
    `).join('');
    
    const types = data.types.map(t => `<span class="type-badge ${t.type.name}">${t.type.name.toUpperCase()}</span>`).join('');

    block.innerHTML = `
      <div class="pokemon-detail-card">
        <div class="pokemon-header">
          <div class="pokemon-id">#${data.id.toString().padStart(3, '0')}</div>
          <div class="pokemon-image-container">
            <img src="${image}" alt="${name}" class="pokemon-image">
          </div>
          <h1 class="pokemon-name">${name}</h1>
          <div class="pokemon-types">${types}</div>
        </div>
        
        <div class="pokemon-body">
          <div class="pokemon-info">
            <div class="info-item">
              <span class="label">PESO</span>
              <span class="value">${data.weight / 10} kg</span>
            </div>
            <div class="info-item">
              <span class="label">ALTURA</span>
              <span class="value">${data.height / 10} m</span>
            </div>
          </div>
          
          <div class="pokemon-stats">
            <h3>ESTADÍSTICAS BASE</h3>
            ${stats}
          </div>
        </div>
        
        <div class="pokemon-footer">
          <a href="/pokemon" class="button secondary">Volver al catálogo</a>
        </div>
      </div>
    `;

    // Update page title
    document.title = `${name} | Pokédex`;

  } catch (error) {
    block.innerHTML = `
      <div class="pokemon-error">
        <h2>Pokémon no encontrado</h2>
        <p>No pudimos encontrar a "${slug}". Verifica el nombre o intenta con otro.</p>
        <a href="/pokemon" class="button">Ir al catálogo</a>
      </div>
    `;
  }
}
