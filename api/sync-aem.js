export default async function handler(req, res) {
  const { secret } = req.query;

  // Una capa simple de seguridad
  const SYNC_SECRET = process.env.SYNC_SECRET;
  if (SYNC_SECRET && secret !== SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ADMIN_TOKEN = process.env.HLX_ADMIN_API_TOKEN;
  if (!ADMIN_TOKEN) {
    // Note: If you just added this to Vercel, you need to redeploy the project for it to take effect.
    return res.status(500).json({ error: 'HLX_ADMIN_API_TOKEN not configured' });
  }

  const OWNER = "asisa-softtek";
  const REPO = "asisa-poc";
  const BRANCH = "main";

  try {
    // 1. Leer el sitemap generado dinámicamente
    const sitemapResp = await fetch(`https://asisa-poc.vercel.app/sitemap.xml`);
    if (!sitemapResp.ok) throw new Error(`Error al leer sitemap: ${sitemapResp.status}`);
    const xml = await sitemapResp.text();

    // 2. Extraer URLs (usamos regex para evitar dependencias de parsing pesadas en Vercel)
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
    
    // Filtramos solo las de pokemon
    const pokemonUrls = urls.filter(u => u.includes('/pokemon/'));

    console.log(`Iniciando sincronización de ${pokemonUrls.length} URLs...`);

    const results = [];
    
    // 3. Procesamiento en paralelo controlado
    // NOTA: Con 10.000 URLs, es muy probable que excedas el timeout de Vercel (10s en Free, 60-300s en Pro).
    // Recomendamos llamar a este endpoint por lotes si el servidor corta la conexión.
    const CONCURRENCY = 8;
    for (let i = 0; i < pokemonUrls.length; i += CONCURRENCY) {
      const batch = pokemonUrls.slice(i, i + CONCURRENCY);
      
      await Promise.all(batch.map(async (url) => {
        try {
          const path = new URL(url).pathname;
          
          // Notificamos Preview
          const previewResp = await fetch(`https://admin.hlx.page/preview/${OWNER}/${REPO}/${BRANCH}${path}`, {
            method: 'POST',
            headers: { 'x-auth-token': ADMIN_TOKEN }
          });

          // Notificamos Live
          const liveResp = await fetch(`https://admin.hlx.page/live/${OWNER}/${REPO}/${BRANCH}${path}`, {
            method: 'POST',
            headers: { 'x-auth-token': ADMIN_TOKEN }
          });

          results.push({ path, preview: previewResp.status, live: liveResp.status });
        } catch (e) {
          results.push({ url, error: e.message });
        }
      }));
    }

    return res.status(200).json({
      total: pokemonUrls.length,
      processed: results.length,
      message: "Proceso de sincronización completado (sujeto a límites de ejecución de Vercel)",
      summary: results.slice(0, 50) // Solo devolvemos los primeros 50 para no inflar la respuesta
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
