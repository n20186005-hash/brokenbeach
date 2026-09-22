// Cloudflare Pages Function — server-side tide endpoint.
// Uses Open-Meteo's Marine Weather API (sea_level_height_msl from the MeteoFrance
// SMOC model). This is free, requires no API key, is global, and is cached here so
// the browser only ever calls this same-origin endpoint.

const DEFAULT_LAT = -8.73234;
const DEFAULT_LON = 115.45182;
const PLACE = "Broken Beach, Nusa Penida";
const TZ = "Asia/Makassar";
const API = "https://marine-api.open-meteo.com/v1/marine";

export async function onRequest(context) {
  const req = context.request;
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat")) || DEFAULT_LAT;
  const lon = parseFloat(url.searchParams.get("lon")) || DEFAULT_LON;

  const apiUrl = API + "?" + new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: "sea_level_height_msl",
    timezone: TZ,
    past_days: "1",
    forecast_days: "3"
  }).toString();

  const cache = caches.default;
  const cacheKey = new Request(apiUrl, { method: "GET" });
  try {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  } catch (e) { /* ignore cache read errors */ }

  let upstream;
  try {
    upstream = await fetch(apiUrl, { cf: { cacheTtl: 1800, cacheEverything: true } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "upstream_unreachable" }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: "upstream_error", status: upstream.status }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  const data = await upstream.json();
  const payload = transform(data);
  const res = new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=1800, s-maxage=1800",
      "access-control-allow-origin": "*"
    }
  });
  context.waitUntil(cache.put(cacheKey, res.clone()).catch(function () {}));
  return res;
}

function transform(data) {
  const times = (data.hourly && data.hourly.time) || [];
  const vals = (data.hourly && data.hourly.sea_level_height_msl) || [];
  const series = times.map((t, i) => ({ t: t, v: vals[i] }));

  const now = Date.now();
  let ci = 0;
  for (let i = 0; i < series.length; i++) {
    if (new Date(series[i].t).getTime() <= now) ci = i;
    else break;
  }
  const cur = series[ci] || series[0];
  const prev = series[ci - 1] || cur;
  const trend = cur.v > prev.v ? "rising" : (cur.v < prev.v ? "falling" : "steady");

  const extremes = [];
  for (let i = 1; i < series.length - 1; i++) {
    const a = series[i - 1].v, b = series[i].v, c = series[i + 1].v;
    if (b >= a && b >= c) extremes.push({ time: series[i].t, type: "HIGH", height_m: b });
    else if (b <= a && b <= c) extremes.push({ time: series[i].t, type: "LOW", height_m: b });
  }

  const upcoming = extremes
    .filter(e => new Date(e.time).getTime() >= now)
    .slice(0, 4);

  return {
    location: { name: PLACE, latitude: data.latitude, longitude: data.longitude },
    timezone: data.timezone || TZ,
    current: { time: cur.t, level_m: cur.v, trend: trend },
    series: series,
    extremes: upcoming,
    generated_at: new Date().toISOString()
  };
}
