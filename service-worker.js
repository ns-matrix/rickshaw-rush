const CACHE_NAME='rickshaw-rush-offline-map-v2';
self.addEventListener('install',event=>event.waitUntil((async()=>{await caches.open(CACHE_NAME);await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('rickshaw-rush-offline-map-')&&k!==CACHE_NAME)await caches.delete(k);await self.clients.claim()})()));
function isMapAsset(url){return url.hostname==='tile.openstreetmap.org'}
self.addEventListener('fetch',event=>{
 const req=event.request;let url;try{url=new URL(req.url)}catch(_){return}
 if(req.method!=='GET'||!isMapAsset(url))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE_NAME);const cached=await cache.match(req);if(cached)return cached;try{const response=await fetch(req);if(response.ok&&response.type!=='opaque')await cache.put(req,response.clone());return response}catch(e){const saved=await cache.match(req);if(saved)return saved;throw e}})())
});
function tileXY(lon,lat,z){const n=2**z;const x=Math.floor((lon+180)/360*n);const r=Math.max(-85.0511,Math.min(85.0511,lat))*Math.PI/180;const y=Math.floor((1-Math.asinh(Math.tan(r))/Math.PI)/2*n);return[Math.max(0,Math.min(n-1,x)),Math.max(0,Math.min(n-1,y))]}
async function downloadArea(center,port){
 const cache=await caches.open(CACHE_NAME),jobs=new Set();
 // A deliberately limited local cache: zooms 12–16, centered on the selected area.
 const radii={12:1,13:1,14:2,15:3,16:4};
 for(const [z0,radius] of Object.entries(radii)){const z=Number(z0),[cx,cy]=tileXY(center[0],center[1],z),n=2**z;for(let dx=-radius;dx<=radius;dx++)for(let dy=-radius;dy<=radius;dy++){const x=cx+dx,y=cy+dy;if(x>=0&&x<n&&y>=0&&y<n)jobs.add('https://tile.openstreetmap.org/'+z+'/'+x+'/'+y+'.png')}}
 const urls=[...jobs];let done=0,failures=0,cursor=0;
 async function worker(){while(cursor<urls.length){const url=urls[cursor++];try{const req=new Request(url,{mode:'cors'});if(!await cache.match(req)){const response=await fetch(req);if(!response.ok)throw Error('HTTP '+response.status);await cache.put(req,response.clone())}}catch(_){failures++}done++;if(port)port.postMessage({type:'PROGRESS',done,total:urls.length})}}
 await Promise.all(Array.from({length:2},worker));
 if(failures===urls.length)throw Error('No map tiles downloaded. Check internet and try again later.');
 if(port)port.postMessage({type:'DONE',done,total:urls.length,failures});
}
self.addEventListener('message',event=>{if(!event.data||event.data.type!=='DOWNLOAD_AREA')return;const port=event.ports&&event.ports[0];event.waitUntil(downloadArea(event.data.center||[72.9052,19.1197],port).catch(error=>{if(port)port.postMessage({type:'ERROR',message:error.message||'Map download failed'})}))});
