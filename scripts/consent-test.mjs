import assert from'node:assert/strict';import fs from'node:fs';import vm from'node:vm';
const KEY='brokenbeach-cookie-preferences',DENY='brokenbeach-analytics-denied',MARK='|brokenbeach-analytics-denied|',GA='ga-disable-G-HXM22WWPKP';
function storage(initial={},data=new Map(Object.entries(initial))){return{data,writes:[],readFail:false,writeFail:false,removeFail:false,ignoreWrite:false,ignoreRemove:false,getItem(k){if(this.readFail)throw Error('read');return data.get(k)??null},setItem(k,v){this.writes.push([k,v]);if(this.writeFail)throw Error('write');if(!this.ignoreWrite)data.set(k,v)},removeItem(k){if(this.removeFail)throw Error('remove');if(!this.ignoreRemove)data.delete(k)}}}
function tab(){return{session:storage(),name:'unrelated-window-name',nameReadFail:false,nameWriteFail:false,nameIgnoreWrite:false}}
function page(code,lang,local=storage(),t=tab(),controls=true){const scripts=[],events={},handlers={},status={textContent:''};const window={addEventListener:(k,v)=>events[k]=v};Object.defineProperty(window,'name',{get(){if(t.nameReadFail)throw Error('name read');return t.name},set(v){if(t.nameWriteFail)throw Error('name write');if(!t.nameIgnoreWrite)t.name=v}});const document={documentElement:{lang},getElementById:id=>id==='cookie-status'?(controls?status:null):['accept-analytics','decline-analytics'].includes(id)?(controls?{addEventListener:(k,v)=>handlers[id]=v}:null):scripts.find(s=>s.id===id)||null,createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}};vm.runInNewContext(code,{window,document,localStorage:local,sessionStorage:t.session});return{window,scripts,events,handlers,status,local,t,save:value=>window.brokenbeachConsent.save(value),read:()=>window.brokenbeachConsent.read(),effective:()=>window.dataLayer?.map(x=>Array.from(x)).filter(x=>x[0]==='consent'&&x[1]==='update').at(-1)?.[2].analytics_storage,configCount:()=>window.dataLayer?.map(x=>Array.from(x)).filter(x=>x[0]==='config').length||0};}
function off(p){assert.equal(p.window[GA],true);if(p.window.gtag)assert.equal(p.effective(),'denied')}
function on(p){assert.equal(p.window[GA],false);assert.equal(p.effective(),'granted');assert.equal(p.scripts.length,1);assert.equal(p.configCount(),1)}

const code=fs.readFileSync('source/consent.js','utf8');

for(const lang of['en','id']){
 const tabMessage=p=>assert.match(p.status.textContent,lang==='en'?/this tab/:/tab ini/),pageMessage=p=>assert.match(p.status.textContent,lang==='en'?/on this page/:/halaman ini/);
 let local=storage(),t=tab(),p=page(code,lang,local,t);off(p);assert.equal(p.scripts.length,0);p.handlers['accept-analytics']();on(p);assert.match(p.status.textContent,lang==='en'?/allowed/:/diizinkan/);p.handlers['decline-analytics']();off(p);assert.match(p.status.textContent,lang==='en'?/refused/:/ditolak/);p.handlers['accept-analytics']();on(p);for(let i=0;i<3;i++){assert.equal(p.save(true),true);on(p)}
 const config=Array.from(p.window.dataLayer.find(x=>x[0]==='config'));assert.equal(config[2].allow_google_signals,false);assert.equal(config[2].allow_ad_personalization_signals,false);const defaults=Array.from(p.window.dataLayer.find(x=>x[0]==='consent'&&x[1]==='default'))[2];for(const k of['ad_storage','ad_user_data','ad_personalization'])assert.equal(defaults[k],'denied');assert.equal(p.window.dataLayer.filter(x=>x[0]==='consent'&&x[1]==='default').length,1);
 p=page(code,lang);assert.equal(p.save('true'),true);off(p);assert.equal(p.scripts.length,0);
 // A loaded grant is refused immediately. Recovered permanent writes must not revive it on navigation.
 for(const unavailable of['session','name']){local=storage({[KEY]:'{"analytics":true}'});t=tab();p=page(code,lang,local,t);local.writeFail=true;if(unavailable==='session')t.session.writeFail=true;else t.nameWriteFail=true;assert.equal(p.save(false),false);off(p);tabMessage(p);assert.equal(JSON.parse(local.data.get(KEY)).analytics,true);local.writeFail=false;const next=page(code,lang,local,t);off(next);assert.equal(next.scripts.length,0)}
 // No refusal store can claim retention after throwing or ignored writes.
 for(const fault of['writeFail','ignoreWrite']){local=storage({[KEY]:'{"analytics":true}'});t=tab();p=page(code,lang,local,t);local.writeFail=true;t.session[fault]=true;t[fault==='writeFail'?'nameWriteFail':'nameIgnoreWrite']=true;assert.equal(p.save(false),false);off(p);pageMessage(p)}
 // Failed local/session/name reads fail closed, including readable old grants.
 for(const failed of['session','local','name']){local=storage({[KEY]:'{"analytics":true}'});t=tab();if(failed==='session')t.session.readFail=true;else if(failed==='local')local.readFail=true;else t.nameReadFail=true;p=page(code,lang,local,t);off(p);assert.equal(p.scripts.length,0);local.writes=[];assert.equal(p.save(true),false);off(p);assert(!local.writes.some(([k,v])=>k===KEY&&JSON.parse(v).analytics===true));}
 // Both vetoes must be verifiably cleared before any true shared write, loaded or unloaded.
 for(const loaded of[false,true])for(const fault of['removeFail','ignoreRemove','readFail','nameWriteFail','nameIgnoreWrite','nameReadFail']){
  local=storage();t=tab();if(loaded){p=page(code,lang,local,t);p.save(true);p.save(false)}else{local.data.set(KEY,'{"analytics":false}');t.session.data.set(DENY,'1');t.name+=MARK;p=page(code,lang,local,t)}
  const healthy=storage({},local.data),other=page(code,lang,healthy,tab());if(fault.startsWith('name'))t[fault]=true;else t.session[fault]=true;local.writes=[];assert.equal(p.save(true),false);off(p);assert(!local.writes.some(([k,v])=>k===KEY&&JSON.parse(v).analytics===true));other.events.storage({key:KEY});off(other);assert.equal(other.scripts.length,0);
 }
 // A shared grant/denial changes an already loaded runtime and visible status, retaining a tab's own refusal.
 local=storage();const a=page(code,lang,local,tab()),b=page(code,lang,storage({},local.data),tab());a.save(true);b.events.storage({key:KEY});on(b);assert.match(b.status.textContent,lang==='en'?/allowed/:/diizinkan/);a.save(false);b.events.storage({key:KEY});off(b);assert.match(b.status.textContent,lang==='en'?/refused/:/ditolak/);a.save(true);b.events.storage({key:KEY});on(b);b.save(false);a.save(true);b.events.storage({key:KEY});off(b);assert.match(b.status.textContent,lang==='en'?/shared browser choice/:/Pilihan bersama/);
 local=storage({[KEY]:'{"analytics":true}'});p=page(code,lang,local);local.data.delete(KEY);p.events.storage({key:null});off(p);assert.equal(p.status.textContent,'');
 // Each preference-read and session-read boundary around grant publication is checked with a healthy second tab.
 for(const kind of['local','session'])for(const loaded of[false,true])for(let failAt=1;failAt<=(kind==='local'?4:5);failAt++){
  local=storage(loaded?{[KEY]:'{"analytics":true}'}:{});t=tab();p=page(code,lang,local,t);const healthy=storage({},local.data),other=page(code,lang,healthy,tab()),store=kind==='local'?local:t.session,target=kind==='local'?KEY:DENY,get=store.getItem.bind(store);let reads=0;store.getItem=k=>{if(k===target&&++reads>=failAt)throw Error('late read');return get(k)};
  assert.equal(p.save(true),false);off(p);assert.notEqual(JSON.parse(local.data.get(KEY)||'null')?.analytics,true);other.events.storage({key:KEY});off(other);assert.equal(page(code,lang,healthy,tab()).scripts.length,0);store.getItem=get;assert.equal(p.save(true),true);on(p);other.events.storage({key:KEY});on(other);
 }
 // Local probes must verify both setting/removal, including ignored writes.
 for(const fault of['writeFail','ignoreWrite','removeFail','ignoreRemove']){local=storage({[KEY]:'{"analytics":true}'});local[fault]=true;p=page(code,lang,local);off(p);assert.equal(p.scripts.length,0);assert.equal(p.save(true),false);off(p)}
 // Late failure with failed denial write removes the shared grant and retains refusal.
 local=storage();t=tab();p=page(code,lang,local,t);const get=local.getItem.bind(local),set=local.setItem.bind(local);let reads=0;local.getItem=k=>{if(k===KEY&&++reads>=4)throw Error('late');return get(k)};local.setItem=(k,v)=>{if(k===KEY&&JSON.parse(v).analytics===false)throw Error('rollback');return set(k,v)};assert.equal(p.save(true),false);off(p);tabMessage(p);assert.equal(local.data.get(KEY),undefined);local.getItem=get;off(page(code,lang,storage({},local.data),tab()));off(page(code,lang,local,t));
 for(const raw of['null','{}','{"analytics":"true"}','{"analytics":1}','invalid']){p=page(code,lang,storage({[KEY]:raw}));off(p);assert.equal(p.scripts.length,0)}
 console.log('PASS '+lang+': actual button handlers, boolean API, loaded/unloaded/repeated grants, independent read/write/ignored veto failures, local write probes, all late-read boundaries with healthy second tab, runtime/status synchronization, full new document refusal, rollback/recovery, single loader/config and ad defaults.');
}

// Unconfirmed grants must be removed or described truthfully when cleanup is unavailable.
for(const lang of ['en','id'])for(const loaded of [false,true])for(const reads of ['once','persistent'])for(const mode of ['remove-works','remove-blocked','all-unavailable']){
 const local=storage(loaded?{[KEY]:'{"analytics":true}'}:{}),t=tab(),p=page(code,lang,local,t),healthy=storage({},local.data),other=page(code,lang,healthy,tab());
 const get=local.getItem.bind(local),set=local.setItem.bind(local),remove=local.removeItem.bind(local);let count=0,wroteGrant=false,removals=0;
 local.getItem=k=>{if(k===KEY){count++;if(reads==='once'?count===4:count>=4)throw Error('final read');}return get(k)};
 local.setItem=(k,v)=>{if(k===KEY&&wroteGrant&&!JSON.parse(v).analytics)throw Error('rollback denial');set(k,v);if(k===KEY&&JSON.parse(v).analytics){wroteGrant=true;if(mode==='all-unavailable'){t.session.writeFail=true;t.nameWriteFail=true;}}};
 local.removeItem=k=>{if(k===KEY){removals++;if(mode!=='remove-works')throw Error('rollback removal');}return remove(k)};
 const saved=p.save(true);off(p);assert.equal(saved,false);const raw=local.data.get(KEY);other.events.storage({key:KEY});const fresh=page(code,lang,healthy,tab());assert(wroteGrant);
 assert(removals>0);
 if(mode==='remove-works'){
  assert.equal(raw,undefined);off(other);off(fresh);assert.equal(fresh.scripts.length,0);
  local.getItem=get;local.setItem=set;local.removeItem=remove;assert.equal(p.save(true),true);on(p);assert.equal(p.save(true),true);on(p);other.events.storage({key:KEY});on(other);
 }else{
  assert.equal(JSON.parse(raw).analytics,true);on(fresh);
  assert.match(p.status.textContent,lang==='en'?/stored permission may remain in other tabs/:/izin yang tersimpan mungkin masih ada di tab lain/i);
  assert.doesNotMatch(p.status.textContent,lang==='en'?/old grant|previous grant/:/izin lama/);
  assert.match(p.status.textContent,mode==='all-unavailable'?(lang==='en'?/on this page/:/halaman ini/):(lang==='en'?/this tab/:/tab ini/));
 }
}
console.log('PASS24 bilingual fresh-context rollback/removal and truthful unavailable-storage boundaries.');
