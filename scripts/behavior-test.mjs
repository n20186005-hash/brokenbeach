import assert from 'node:assert/strict';
import worker from '../worker.mjs';
let assetCalls=0;const env={ASSETS:{fetch:async()=>{assetCalls++;return new Response('missing',{status:404});}}};
for(const u of ['http://brokenbeach.org/privacy-policy/?q=1','https://www.brokenbeach.org/privacy-policy/?q=1']){const r=await worker.fetch(new Request(u),env);assert.equal(r.status,301);assert.equal(r.headers.get('location'),'https://brokenbeach.org/privacy-policy/?q=1');}
let r=await worker.fetch(new Request('https://brokenbeach.org/cookie-settings?q=1'),env);assert.equal(r.headers.get('location'),'https://brokenbeach.org/cookie-settings/?q=1');r=await worker.fetch(new Request('https://brokenbeach.org/missing/'),env);assert.equal(r.status,404);assert.equal(await r.text(),'missing');assert.match(r.headers.get('X-Robots-Tag'),/noindex/);assert.equal(assetCalls,1);
await import('./consent-test.mjs');
let upstreamCalls=0,cacheWrites=0;
globalThis.caches={default:{match:async()=>undefined,put:async()=>{cacheWrites++}}};
globalThis.fetch=async()=>{upstreamCalls++;return new Response('unavailable',{status:503})};
r=await worker.fetch(new Request('https://brokenbeach.org/api/weather'),env,{});assert.equal(r.status,503);assert.equal(upstreamCalls,1);assert.equal(cacheWrites,0);
r=await worker.fetch(new Request('https://brokenbeach.org/api/weather',{method:'POST'}),env,{});assert.equal(r.status,405);assert.equal(upstreamCalls,1);
const forecast={current:{time:'2026-10-20T10:00',temperature_2m:29,relative_humidity_2m:70,apparent_temperature:31,precipitation:0,weather_code:2,wind_speed_10m:4},unexpected:'must not be forwarded'};
globalThis.fetch=async url=>{upstreamCalls++;assert.equal(url.hostname,'api.open-meteo.com');assert.equal(url.searchParams.get('latitude'),'-8.7327938');assert.equal(url.searchParams.get('longitude'),'115.4508319');return Response.json(forecast)};
r=await worker.fetch(new Request('https://brokenbeach.org/api/weather?lat=90&lon=180'),env,{});assert.equal(r.status,200);const data=await r.json();assert.equal(data.current.temperature_2m,29);assert.equal(data.unexpected,undefined);
forecast.current.temperature_2m='<script>';r=await worker.fetch(new Request('https://brokenbeach.org/api/weather'),env,{});assert.equal(r.status,503);
console.log('PASS weather read-only endpoint: upstream error/no retry/no error cache, method restriction, numeric whitelist and malformed response rejection.');

const marine={hourly:{time:['2026-10-20T10:00'],sea_level_height_msl:[0.15]},unexpected:'do not forward'};globalThis.fetch=async url=>{assert.equal(url.hostname,'marine-api.open-meteo.com');return Response.json(marine)};r=await worker.fetch(new Request('https://brokenbeach.org/api/tide'),env,{});assert.equal(r.status,200);const sea=await r.json();assert.equal(sea.series[0].level,0.15);assert.equal(sea.unexpected,undefined);marine.hourly.sea_level_height_msl=[null];r=await worker.fetch(new Request('https://brokenbeach.org/api/tide'),env,{});assert.equal(r.status,503);console.log('PASS marine model whitelist and missing data rejection; fixed place coordinates.');
// Unavailable model data must retain its real status and empty HEAD response.
globalThis.fetch=async()=>new Response('unavailable',{status:503});
for(const route of['/api/weather','/api/tide'])for(const method of['GET','HEAD']){
 const response=await worker.fetch(new Request('https://brokenbeach.org'+route,{method}),env,{});
 assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');
 if(method==='HEAD')assert.equal(await response.text(),'');else assert.deepEqual(await response.json(),{error:'Model data unavailable'});
}
console.log('PASS weather/tide unavailable GET/HEAD: actual503, no-store, generic JSON and empty HEAD body.');
