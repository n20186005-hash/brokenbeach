// Cloudflare Pages Function — server-side weather endpoint.
// Acts as the "server component": it fetches the forecast from Open-Meteo on the
// server, transforms it into a clean payload, and caches the result so the browser
// only ever calls this same-origin endpoint (no keys, no third-party calls from the page).

const DEFAULT_LAT = -8.73234;
const DEFAULT_LON = 115.45182;
const PLACE = "Broken Beach, Nusa Penida";
const TZ = "Asia/Makassar";
const API = "https://api.open-meteo.com/v1/forecast";

// WMO weather interpretation codes -> [description, emoji]
const WMO = {
  0: ["Clear sky", "☀️"], 1: ["Mainly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Dense drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"], 57: ["Freezing drizzle", "🌧️"],
  61: ["Slight rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"],
  71: ["Slight snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "🌨️"], 77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌧️"], 82: ["Violent rain showers", "⛈️"],
  85: ["Snow showers", "🌨️"], 86: ["Snow showers", "🌨️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm with hail", "⛈️"], 99: ["Thunderstorm with hail", "⛈️"]
};

function describe(code) {
  const m = WMO[code] || ["Unknown", "🌡️"];
  return { code: code, text: m[0], icon: m[1] };
}

function transform(data) {
  const cur = data.current || {};
  const daily = data.daily || {};
  const out = {
    location: { name: PLACE, latitude: data.latitude, longitude: data.longitude },
    timezone: data.timezone || TZ,
    current: {
      time: cur.time,
      temperature: cur.temperature_2m,
      apparent: cur.apparent_temperature,
      humidity: cur.relative_humidity_2m,
      wind_speed: cur.wind_speed_10m,
      precip: cur.precipitation,
      uv: (cur.uv_index != null) ? cur.uv_index : null,
      weather: describe(cur.weather_code)
    },
    daily: [],
    generated_at: new Date().toISOString()
  };
  if (daily.time) {
    for (let i = 0; i < daily.time.length; i++) {
      const w = WMO[daily.weather_code[i]] || ["Unknown", "🌡️"];
      out.daily.push({
        date: daily.time[i],
        code: daily.weather_code[i],
        text: w[0],
        icon: w[1],
        tmax: daily.temperature_2m_max[i],
        tmin: daily.temperature_2m_min[i],
        precip_prob: daily.precipitation_probability_max[i],
        wind_max: (daily.wind_speed_10m_max != null) ? daily.wind_speed_10m_max[i] : null,
        uv_max: (daily.uv_index_max != null) ? daily.uv_index_max[i] : null,
        sunrise: daily.sunrise ? daily.sunrise[i] : null,
        sunset: daily.sunset ? daily.sunset[i] : null
      });
    }
  }
  return out;
}

export async function onRequest(context) {
  const req = context.request;
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat")) || DEFAULT_LAT;
  const lon = parseFloat(url.searchParams.get("lon")) || DEFAULT_LON;

  const apiUrl = API + "?" + new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation,uv_index",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset",
    timezone: TZ,
    forecast_days: "7",
    wind_speed_unit: "ms"
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
