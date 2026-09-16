/**
 * Minimal on-demand loader for the Google Maps JS API (Places library).
 * Loaded via a plain <script> tag rather than an npm package, since it's
 * only used for one optional autocomplete input. Returns a cached promise
 * so concurrent callers don't inject the script twice.
 */
let loadPromise: Promise<void> | null = null;

export function loadGooglePlacesScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if ((window as any).google?.maps?.places) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("google-places-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script")));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-places-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Pulls the Irish postal code (Eircode) out of a Places result's
 * address_components. Google's coverage for Eircode isn't complete for
 * every address, so callers should always leave the field manually
 * editable rather than relying on this alone.
 */
export function extractPostalCodeFromPlace(place: any): string | null {
  const components = place?.address_components as any[] | undefined;
  if (!components) return null;
  const postal = components.find((c) => c.types?.includes("postal_code"));
  return postal?.long_name || null;
}
