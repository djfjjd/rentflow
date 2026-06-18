export async function geocodeAddress(address) {
  const query = String(address || "").trim();
  if (!query) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "RentFlow/2.0 (repair-shop-import)",
    },
  });

  if (!response.ok) return null;
  const results = await response.json();
  const first = Array.isArray(results) ? results[0] : null;
  if (!first?.lat || !first?.lon) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}
