import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import worker from '../worker.mjs';
let assetCalls=0;const env={ASSETS:{fetch:async()=>{assetCalls++;return new Response('missing',{status:404});}}};
for(const u of ['http://brokenbeach.org/privacy-policy/?q=1','https://www.brokenbeach.org/privacy-policy/?q=1']){const r=await worker.fetch(new Request(u),env);assert.equal(r.status,301);assert.equal(r.headers.get('location'),'https://brokenbeach.org/privacy-policy/?q=1');}
let r=await worker.fetch(new Request('https://brokenbeach.org/cookie-settings?q=1'),env);assert.equal(r.headers.get('location'),'https://brokenbeach.org/cookie-settings/?q=1');r=await worker.fetch(new Request('https://brokenbeach.org/missing'),env);assert.equal(r.status,404);assert.equal(await r.text(),'missing');assert.match(r.headers.get('X-Robots-Tag'),/noindex/);assert.equal(assetCalls,1);
const code=readFileSync('source/consent.js','utf8');
let raw=JSON.stringify({analytics:true}), writable=true, session={};
const storage={getItem:()=>raw,setItem:(k,v)=>{if(!writable)throw Error('blocked');if(k==='brokenbeach-cookie-preferences')raw=v;},removeItem:()=>{if(!writable)throw Error('blocked');}};
const sessionStorage={getItem:k=>session[k]||null,setItem:(k,v)=>{session[k]=v},removeItem:k=>{delete session[k]}};
function page(name=''){const scripts=[],handlers={},status={textContent:''};const window={name};const document={documentElement:{lang:"en"},getElementById:id=>id==='cookie-status'?status:['accept-analytics','decline-analytics'].includes(id)?{addEventListener:(_event,fn)=>handlers[id]=fn}:scripts.find(s=>s.id===id),createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}};vm.runInNewContext(code,{window,document,localStorage:storage,sessionStorage});return {window,scripts,handlers,status};}

let p=page();assert.equal(p.scripts.length,1);writable=false;assert.equal(p.window.brokenbeachConsent.save(false),false);assert.equal(p.window['ga-disable-G-HXM22WWPKP'],true);
let next=page(p.window.name);assert.equal(next.scripts.length,0);assert.equal(next.window['ga-disable-G-HXM22WWPKP'],true);assert.equal(JSON.parse(raw).analytics,true);
// Even if session/name cannot carry the tombstone, blocked writes refuse a stale grant.
session={};next=page();assert.equal(next.scripts.length,0);assert.equal(next.window.brokenbeachConsent.save(true),false);assert.equal(next.scripts.length,1);assert.equal(page().scripts.length,0);
writable=true;const chosen=page();chosen.window.brokenbeachConsent.save(false);assert.equal(page(chosen.window.name).scripts.length,0);chosen.window.brokenbeachConsent.save(true);assert.equal(page(chosen.window.name).scripts.length,1);
storage.getItem=()=>{throw Error('blocked read')};assert.equal(page().scripts.length,0);
console.log('PASS Worker 301/query/ASSETS404; consent immediate refusal, failed writes and stale grants across pages.');
// Refusal must survive same-tab navigation even when session storage is unavailable.
raw=JSON.stringify({analytics:true});writable=true;storage.getItem=()=>raw;
sessionStorage.getItem=()=>{throw Error('session blocked')};sessionStorage.setItem=()=>{throw Error('session blocked')};sessionStorage.removeItem=()=>{throw Error('session blocked')};
p=page();assert.equal(p.scripts.length,1);writable=false;p.window.brokenbeachConsent.save(false);writable=true;next=page(p.window.name);assert.equal(next.scripts.length,0);assert.equal(next.window['ga-disable-G-HXM22WWPKP'],true);
console.log('PASS session-storage failure: window-name veto prevents stale-grant recovery in same tab.');
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

writable=false;p=page();p.handlers['decline-analytics']();assert.match(p.status.textContent,/refused now/);assert.match(p.status.textContent,/could not be saved/);assert.equal(p.window['ga-disable-G-HXM22WWPKP'],true);console.log('PASS refusal storage error explains failure and does not claim persistence.');

const marine={hourly:{time:['2026-10-20T10:00'],sea_level_height_msl:[0.15]},unexpected:'do not forward'};globalThis.fetch=async url=>{assert.equal(url.hostname,'marine-api.open-meteo.com');return Response.json(marine)};r=await worker.fetch(new Request('https://brokenbeach.org/api/tide'),env,{});assert.equal(r.status,200);const sea=await r.json();assert.equal(sea.series[0].level,0.15);assert.equal(sea.unexpected,undefined);marine.hourly.sea_level_height_msl=[null];r=await worker.fetch(new Request('https://brokenbeach.org/api/tide'),env,{});assert.equal(r.status,503);console.log('PASS marine model whitelist and missing data rejection; fixed place coordinates.');
