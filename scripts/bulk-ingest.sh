#!/bin/bash

# Configuración
OWNER="asisa-softtek"
REPO="asisa-poc"
BRANCH="main"
SITEMAP_URL="https://asisa-poc.vercel.app/pokemon/sitemap.xml"
ADOBE_BASE_URL="https://main--asisa-poc--asisa-softtek.aem.live"

# Verificar token
if [ -z "$1" ]; then
  echo "Uso: $0 <x-auth-token>"
  exit 1
fi
TOKEN=$1

echo "--- Iniciando Ingesta Masiva para Adobe Edge Delivery ---"
echo "Leyendo sitemap: $SITEMAP_URL"

# Obtener URLs del sitemap
URLS=$(curl -s $SITEMAP_URL | grep -oP '(?<=<loc>).*?(?=</loc>)')

if [ -z "$URLS" ]; then
  echo "Error: No se han encontrado URLs en el sitemap."
  exit 1
fi

COUNT=0
for url in $URLS; do
  # Extraer el path (ej: /pokemon/pikachu)
  path=$(echo $url | sed "s|$ADOBE_BASE_URL||")
  
  echo -n "Procesando $path... "
  
  # Trigger Preview
  curl -s -o /dev/null -X POST "https://admin.hlx.page/preview/$OWNER/$REPO/$BRANCH$path" -H "x-auth-token: $TOKEN"
  
  # Trigger Live
  curl -s -o /dev/null -X POST "https://admin.hlx.page/live/$OWNER/$REPO/$BRANCH$path" -H "x-auth-token: $TOKEN"
  
  echo "OK"
  COUNT=$((COUNT+1))
done

echo "--- Ingesta completada ---"
echo "Total de recursos procesados: $COUNT"
echo "Ya puedes ver los cambios en $ADOBE_BASE_URL/pokemon/mew"
