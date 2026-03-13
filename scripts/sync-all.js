const fetch = require('node-fetch');

const BASE_URL = 'https://asisa-poc.vercel.app/api/sync-aem';
const LIMIT = 50; // Ajusta según la estabilidad de Vercel/Adobe
const SECRET = process.env.SYNC_SECRET || '';

async function syncAll() {
  let offset = 0;
  let totalProcessed = 0;
  let hasMore = true;

  console.log('🚀 Iniciando sincronización masiva...');

  while (hasMore) {
    const url = `${BASE_URL}?offset=${offset}&limit=${LIMIT}${SECRET ? `&secret=${SECRET}` : ''}`;
    
    try {
      console.log(`\n[${new Date().toLocaleTimeString()}] Procesando lote: offset ${offset}...`);
      const resp = await fetch(url);
      
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error(`❌ Error en el lote (offset ${offset}): ${resp.status}`, errorText);
        // Reintentamos después de un breve descanso si es un timeout del servidor
        if (resp.status === 504 || resp.status === 502) {
            console.log('⏳ Reintentando lote en 5 segundos...');
            await new Promise(r => setTimeout(r, 5000));
            continue;
        }
        break;
      }

      const data = await resp.json();
      const processed = data.processedInThisBatch || 0;
      totalProcessed += processed;
      
      console.log(`✅ Lote completado. Procesados en total: ${totalProcessed} / ${data.total}`);

      if (data.nextOffset && data.nextOffset > offset) {
        offset = data.nextOffset;
      } else {
        hasMore = false;
      }

      // Pequeño retardo para no estresar las APIs de Adobe
      await new Promise(r => setTimeout(r, 500));

    } catch (e) {
      console.error('❌ Error fatal durante la sincronización:', e.message);
      hasMore = false;
    }
  }

  console.log(`\n🎉 Sincronización terminada. Total pokemons procesados: ${totalProcessed}`);
}

syncAll();
