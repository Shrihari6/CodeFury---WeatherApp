
import express from "express";
import morgan from "morgan";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
/*const PORT = process.env.PORT || 3000;*/
const OWM_API_KEY = process.env.OWM_API_KEY;

if (!OWM_API_KEY) {
  console.warn("⚠️  Missing OWM_API_KEY. Set it in your .env file.");
}

// Middleware
app.use(morgan("dev"));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// Simple in-memory cache with TTL
const cache = new Map();
function setCache(key, data, ttlMs = 2 * 60 * 1000) { // 2 minutes default
  cache.set(key, { data, expires: Date.now() + ttlMs });
}
function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

// Helper to call OpenWeatherMap
async function owm(path, params = {}) {
  const url = new URL(`https://api.openweathermap.org${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  url.searchParams.set("appid", OWM_API_KEY);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OWM error ${res.status}: ${txt}`);
  }
  return res.json();
}

// GET /api/weather?query=London&units=metric
// OR  /api/weather?lat=12.97&lon=77.59&units=metric
app.get("/api/weather", async (req, res) => {
  try {
    const { query, lat, lon, units = "metric" } = req.query;

    if (!query && !(lat && lon)) {
      return res.status(400).json({ error: "Provide ?query=city or ?lat=..&lon=.." });
    }
    if (!OWM_API_KEY) {
      return res.status(500).json({ error: "Server missing OWM_API_KEY" });
    }

    const cacheKey = JSON.stringify({ query, lat, lon, units });
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ fromCache: true, ...cached });
    }

    // 1) Resolve by city name or coords
    let current;
    if (query) {
      current = await owm("/data/2.5/weather", { q: query, units });
    } else {
      current = await owm("/data/2.5/weather", { lat, lon, units });
    }

    const { coord, name, sys } = current;
    const forecast = await owm("/data/2.5/forecast", {
      lat: coord.lat,
      lon: coord.lon,
      units
    });

    const payload = {
      city: name,
      country: sys?.country,
      coords: coord,
      units,
      current,
      forecast
    };

    setCache(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "LOL! bad luck man... Somethin went wrong" });
  }
});

/*
app.listen(PORT, () => {
  console.log(`Go visit my server which is  running at http://localhost:${PORT}`);
});
*/

export default app;
