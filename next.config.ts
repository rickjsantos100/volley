import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { avatarCacheSeconds, avatarRemotePatterns } from "./lib/avatars";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: avatarRemotePatterns(process.env.NEXT_PUBLIC_SUPABASE_URL),
    qualities: [75],
    // Other Image consumers are bundled static artwork, not mutable remote URLs.
    minimumCacheTTL: avatarCacheSeconds,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
