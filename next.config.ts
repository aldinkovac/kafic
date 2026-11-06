import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotografije s Unsplasha (besplatna Unsplash licenca). Vercel ih optimizuje i servira
    // s našeg domena, pa posjetiočev browser ne šalje zahtjeve trećoj strani.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
