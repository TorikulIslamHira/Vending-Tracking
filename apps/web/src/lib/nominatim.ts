/**
 * Eircode → address lookup via OpenStreetMap's free Nominatim search API.
 * No API key required, unlike the Google Maps equivalent this replaces.
 *
 * Nominatim's usage policy requires a request to self-identify via a
 * `User-Agent` or `Referer` header. We set the `User-Agent` below, but
 * browsers silently strip/ignore custom `User-Agent` values on fetch()
 * requests (a browser-enforced restriction, not something app code can
 * override) — in practice, identification happens via the `Referer` header
 * the browser sends automatically instead, which already satisfies the
 * policy for this low-volume, interactive use case.
 */
export async function geocodeEircodeOSM(eircode: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${eircode}, Ireland`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=1`,
      {
        headers: {
          "User-Agent": "BeeNoveltyVending/1.0",
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) return null;

    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) return null;

    return results[0]?.display_name || null;
  } catch {
    return null;
  }
}
