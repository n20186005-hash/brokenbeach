import site from './source/site.json' with {type:'json'};
const pages=new Set(['/','/id/','/privacy-policy/','/terms-of-service/','/cookie-settings/','/id/privacy-policy/','/id/terms-of-service/','/id/cookie-settings/']);
export default {async fetch(request,env,ctx){
 const url=new URL(request.url);
 if(['brokenbeach.org','www.brokenbeach.org'].includes(url.hostname)&&(url.protocol!=='https:'||url.hostname!=='brokenbeach.org')){url.protocol='https:';url.hostname='brokenbeach.org';url.port='';return Response.redirect(url.toString(),301);}
 if(url.pathname!=='/'&&pages.has(url.pathname+'/')){url.pathname+='/';return Response.redirect(url.toString(),301);}
 if(url.pathname==='/api/weather'||url.pathname==='/api/tide'){
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
  const response=await model(url.pathname==='/api/tide',ctx);return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
 }
 const notFoundPage=['/404','/404/','/404.html'].includes(url.pathname);
 const assetRequest=notFoundPage?new Request(new URL('/__not_found__',url),request):request;
 const response=await env.ASSETS.fetch(assetRequest);if(response.status===404||notFoundPage){const headers=new Headers(response.headers);headers.set('X-Robots-Tag','noindex, follow');return new Response(request.method==='HEAD'?null:response.body,{status:404,headers});}return response;
}};
const iso=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value);
function sanitize(data,tide){
 if(tide){const time=data?.hourly?.time,values=data?.hourly?.sea_level_height_msl;if(!Array.isArray(time)||!time.length||time.length>192||!time.every(iso)||!Array.isArray(values)||values.length!==time.length||!values.every(Number.isFinite))throw Error('invalid');return {timezone:'Asia/Makassar',series:time.map((time,i)=>({time,level:values[i]}))};}
 const cur=data?.current,keys=['temperature_2m','apparent_temperature','relative_humidity_2m','precipitation','wind_speed_10m','weather_code'];if(!cur||!iso(cur.time)||!keys.every(k=>Number.isFinite(cur[k])))throw Error('invalid');return {timezone:'Asia/Makassar',current:{time:cur.time,...Object.fromEntries(keys.map(k=>[k,cur[k]]))}};
}
async function model(tide,ctx){
 const url=new URL(tide?'https://marine-api.open-meteo.com/v1/marine':'https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:String(site.latitude),longitude:String(site.longitude),timezone:'Asia/Makassar',forecast_days:tide?'3':'1',...(tide?{hourly:'sea_level_height_msl'}:{current:'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',wind_speed_unit:'kmh'})}).toString();
 try{
  const cache=globalThis.caches?.default,key=new Request(url);const cached=await cache?.match(key);if(cached)return cached;
  const upstream=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(6000),cf:{cacheTtl:600}});if(!upstream.ok)throw Error('upstream');const raw=await upstream.text();if(raw.length>100000)throw Error('oversize');const data=sanitize(JSON.parse(raw),tide);const response=Response.json(data,{headers:{'Cache-Control':'public, max-age=600, s-maxage=600'}});if(cache&&ctx?.waitUntil)ctx.waitUntil(cache.put(key,response.clone()).catch(()=>{}));return response;
 }catch{return Response.json({error:'Model data unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
