(()=>{
 const id=document.documentElement.lang==='id';
 const weather=document.getElementById('weather-model'),tide=document.getElementById('tide-model');
 const element=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
 const unavailable=node=>node.replaceChildren(element('p',id?'Data model tidak tersedia saat ini; ini tidak menunjukkan tempat buka atau aman.':'Model data are unavailable; this does not indicate that the site is open or safe.'));
 async function load(node,kind){if(!node)return;try{const response=await fetch('/api/'+kind,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('unavailable');const data=await response.json();
 if(kind==='weather'){
  const c=data.current;const keys=['temperature_2m','apparent_temperature','relative_humidity_2m','precipitation','wind_speed_10m'];if(!c||!keys.every(k=>Number.isFinite(c[k]))||typeof c.time!=='string')throw Error('invalid');
  const list=document.createElement('dl');for(const [label,value] of [[id?'Suhu':'Temperature',c.temperature_2m+' °C'],[id?'Terasa':'Feels like',c.apparent_temperature+' °C'],[id?'Kelembapan':'Humidity',c.relative_humidity_2m+'%'],[id?'Angin model':'Model wind',c.wind_speed_10m+' km/h'],[id?'Presipitasi':'Precipitation',c.precipitation+' mm']])list.append(element('dt',label),element('dd',value));node.replaceChildren(element('p',c.time+' WITA'),list);
 }else{
  if(!Array.isArray(data.series)||data.series.length>192||!data.series.length)throw Error('invalid');const now=Date.now(),future=data.series.filter(row=>Number.isFinite(row.level)&&typeof row.time==='string'&&new Date(row.time+'+08:00').getTime()>=now).slice(0,6);if(!future.length)throw Error('stale');
  const table=document.createElement('table'),head=document.createElement('tr');head.append(element('th',id?'WITA':'WITA'),element('th',id?'Model MSL (m)':'Model MSL (m)'));table.append(head);for(const row of future){const tr=document.createElement('tr');tr.append(element('td',row.time.replace('T',' ')),element('td',row.level.toFixed(2)));table.append(tr);}node.replaceChildren(table,element('p',id?'Model muka laut, bukan waktu yang diizinkan untuk masuk air.':'Model sea level, not permitted water-entry times.'));
 }
 }catch{unavailable(node);}}
 load(weather,'weather');load(tide,'tide');
})();
