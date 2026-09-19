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
interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  county?: string;
  [key: string]: string | undefined;
}

// Most-specific-first. `display_name` buries the useful bit under
// administrative noise (postcode, county electoral ward, state, country) —
// this instead picks out just the practical, human-recognizable parts.
const ADDRESS_FIELD_PRIORITY: (keyof NominatimAddress)[] = [
  "house_number",
  "road",
  "neighbourhood",
  "suburb",
  "village",
  "town",
  "city",
  "county",
];

/**
 * Builds a concise address from Nominatim's structured `address` object,
 * deliberately excluding `country`, `state`, and `postcode` (the Eircode
 * already has its own field), plus any electoral-ward-style value (e.g.
 * "Pembroke West C Ward 1986") that slips into one of the included fields.
 */
function buildCleanAddress(address: NominatimAddress | undefined): string | null {
  if (!address) return null;

  const parts = ADDRESS_FIELD_PRIORITY.map((key) => address[key]).filter(
    (value): value is string => Boolean(value && !/ward/i.test(value))
  );

  return parts.length > 0 ? parts.join(", ") : null;
}

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

    return buildCleanAddress(results[0]?.address);
  } catch {
    return null;
  }
}
