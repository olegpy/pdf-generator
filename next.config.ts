import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-lib", "@pdf-lib/fontkit"],
};

export default nextConfig;
