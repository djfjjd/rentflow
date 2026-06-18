const CACHE_KEY = "rentflow_geocode_cache_v1";

export function getCachedGeocode(address) {
  const cache = readCache();
  const value = cache[String(address || "").trim()];
  if (!value) return null;
  const lat = Number(value.lat);
  const lng = Number(value.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function setCachedGeocode(address, coordinates) {
  const key = String(address || "").trim();
  if (!key || !coordinates) return;
  const lat = Number(coordinates.lat);
  const lng = Number(coordinates.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const cache = readCache();
  cache[key] = { lat, lng };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore quota/private mode failures. Geocoding still works without cache.
  }
}

export async function geocodeAddressWithCache(address) {
  const key = String(address || "").trim();
  if (!key) return { coordinates: null, cacheHit: false };

  const cached = getCachedGeocode(key);
  if (cached) return { coordinates: cached, cacheHit: true };

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=1&accept-language=ko&q=${encodeURIComponent(key)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return { coordinates: null, cacheHit: false };

  const results = await response.json();
  const first = Array.isArray(results) ? results[0] : null;
  if (!first?.lat || !first?.lon) return { coordinates: null, cacheHit: false };

  const coordinates = { lat: Number(first.lat), lng: Number(first.lon) };
  if (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) return { coordinates: null, cacheHit: false };

  setCachedGeocode(key, coordinates);
  return { coordinates, cacheHit: false };
}

function readCache() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
