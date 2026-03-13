export default async function handler(req, res) {
  const { secret, limit = 50, offset = 0 } = req.query;

  // Una capa simple de seguridad
  const SYNC_SECRET = process.env.SYNC_SECRET;
  if (SYNC_SECRET && secret !== SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ADMIN_TOKEN = process.env.HLX_ADMIN_API_TOKEN;
  if (!ADMIN_TOKEN) {
    return res.status(500).json({ error: 'HLX_ADMIN_API_TOKEN not configured' });
  }

  const OWNER = "asisa-softtek";
  const REPO = "asisa-poc";
  const BRANCH = "main";

  try {
    const { path: specificPath } = req.query;
    let urlsToProcess = [];
    let totalUrls = 0;

    if (specificPath) {
      // Caso 1: Sincronizar solo una ruta específica
      urlsToProcess = [specificPath.startsWith('/') ? specificPath : `/${specificPath}`];
      totalUrls = 1;
    } else {
      // Caso 2: Sincronizar desde el sitemap (comportamiento por defecto)
      const sitemapResp = await fetch(`https://asisa-poc.vercel.app/sitemap.xml`);
      if (!sitemapResp.ok) throw new Error(`Error al leer sitemap: ${sitemapResp.status}`);
      const xml = await sitemapResp.text();

      const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
      const pokemonUrls = urls.filter(u => u.includes('/pokemon/'));
      totalUrls = pokemonUrls.length;

      const start = parseInt(offset);
      const end = start + parseInt(limit);
      urlsToProcess = pokemonUrls.slice(start, end).map(url => new URL(url).pathname);
    }

    if (urlsToProcess.length === 0) {
      return res.status(200).json({ 
        message: "No hay URLs para procesar", 
        total: totalUrls
      });
    }

    console.log(`Sincronizando ${urlsToProcess.length} URLs...`);

    const results = [];
    const CONCURRENCY = 5; 
    
    for (let i = 0; i < batchToProcess.length; i += CONCURRENCY) {
      const subBatch = batchToProcess.slice(i, i + CONCURRENCY);
      
      await Promise.all(subBatch.map(async (url) => {
        try {
          const path = new URL(url).pathname;
          
          // Preview
          await fetch(`https://admin.hlx.page/preview/${OWNER}/${REPO}/${BRANCH}${path}`, {
            method: 'POST',
            headers: { 'x-auth-token': ADMIN_TOKEN }
          });

          // Live
          await fetch(`https://admin.hlx.page/live/${OWNER}/${REPO}/${BRANCH}${path}`, {
            method: 'POST',
            headers: { 'x-auth-token': ADMIN_TOKEN }
          });

          results.push({ path, status: 'synced' });
        } catch (e) {
          results.push({ url, error: e.message });
        }
      }));
    }

    return res.status(200).json({
      total: pokemonUrls.length,
      processedInThisBatch: results.length,
      currentOffset: start,
      nextOffset: end < pokemonUrls.length ? end : null,
      message: "Lote completado con éxito. Por favor, usa el 'nextOffset' para continuar.",
      results: results
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
