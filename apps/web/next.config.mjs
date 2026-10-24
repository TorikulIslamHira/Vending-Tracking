/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vending/shared-types"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    cpus: 1,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false,
      },
    ];
  },
  // sw.js is a plain public/ file, so without this it'd get whatever
  // default caching the browser/CDN applies to a static asset — a stale
  // cached service-worker script would then keep re-registering itself and
  // never pick up a new version. no-cache forces a revalidation check on
  // every load. Service-Worker-Allowed widens its default control scope
  // from /sw.js's own directory (/) to the whole origin, which it already
  // would be at the root, but this makes it explicit rather than implicit.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
