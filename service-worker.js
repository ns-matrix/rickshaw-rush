const CACHE_NAME = 'rickshaw-rush-offline-map-v1';
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const TILEJSON_URL = 'https://tiles.openfreemap.org/planet';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.add(new Request('./', {cache:'reload'})); } catch (_) {}
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => event.waitUntil((async()=>{await self.clients.claim()})()));

function isMapAsset(url) {
  return url.hostname === 'tiles.openfreemap.org' || url.hostname === 'fonts.openmaptiles.org' ||
    url.hostname === 'fonts.openfreemap.org' || url.hostname === 'assets.openfreemap.com';
}
self.addEventListener('fetch', event => {
  const request = event.request;
  let url;
  try { url = new URL(request.url); } catch (_) { return; }
  if (request.method !== 'GET' || !isMapAsset(url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const fallback = await cache.match(request);
      if (fallback) return fallback;
      throw error;
    }
  })());
});

function tileXY(lon, lat, z) {
  const n = 2 ** z;
  const x = Math.floor((lon + 180) / 360 * n);
  const latRad = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180;
  const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);
  return [Math.max(0, Math.min(n - 1, x)), Math.max(0, Math.min(n - 1, y))];
}
async function downloadArea(center, port) {
  const cache = await caches.open(CACHE_NAME);
  const styleResponse = await fetch(STYLE_URL);
  if (!styleResponse.ok) throw new Error('Could not fetch the map style (' + styleResponse.status + ')');
  const style = await styleResponse.clone().json();
  await cache.put(STYLE_URL, styleResponse.clone());
  const tilejsonResponse = await fetch(TILEJSON_URL);
  if (!tilejsonResponse.ok) throw new Error('Could not fetch map tile metadata (' + tilejsonResponse.status + ')');
  const tilejson = await tilejsonResponse.clone().json();
  await cache.put(TILEJSON_URL, tilejsonResponse.clone());
  const templates = tilejson.tiles || [];
  if (!templates.length) throw new Error('The map service did not provide tile URLs.');
  const jobs = new Set();
  const radii = {12:1,13:1,14:2,15:3,16:4};
  for (const [z, radius] of Object.entries(radii)) {
    const [cx, cy] = tileXY(center[0], center[1], Number(z));
    const n = 2 ** Number(z);
    for (let dx=-radius; dx<=radius; dx++) for (let dy=-radius; dy<=radius; dy++) {
      const x=cx+dx,y=cy+dy;
      if(x>=0&&x<n&&y>=0&&y<n) jobs.add(templates[0].replace('{z}',z).replace('{x}',String(x)).replace('{y}',String(y)));
    }
  }
  const urls = [...jobs];
  let done=0, failures=0, cursor=0;
  const worker = async () => {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      try {
        const req = new Request(url, {mode:'cors'});
        if (!await cache.match(req)) {
          const response = await fetch(req);
          if (!response.ok) throw new Error('HTTP '+response.status);
          await cache.put(req, response.clone());
        }
      } catch (_) { failures++; }
      done++;
      if (port) port.postMessage({type:'PROGRESS',done,total:urls.length});
    }
  };
  await Promise.all(Array.from({length:4},worker));
  // Save the style's external sprite resources and the core map resources.
  const extras = [STYLE_URL, TILEJSON_URL,
    'https://tiles.openfreemap.org/styles/liberty/sprite.json',
    'https://tiles.openfreemap.org/styles/liberty/sprite.png'];
  for (const url of extras) {
    try { const req=new Request(url,{mode:'cors'}); const res=await fetch(req); if(res.ok)await cache.put(req,res); } catch (_) {}
  }
  if (failures === urls.length) throw new Error('All map tile requests failed. Check your connection and retry.');
  if (port) port.postMessage({type:'DONE',area:'',done,total:urls.length,failures});
}
self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'DOWNLOAD_AREA') return;
  const port = event.ports && event.ports[0];
  event.waitUntil(downloadArea(event.data.center || [72.9052,19.1197],port).catch(error => {
    if(port)port.postMessage({type:'ERROR',message:error.message || 'Unknown download error'});
  }));
});
