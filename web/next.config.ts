import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Native module — must be loaded at runtime via require(), not bundled.
  serverExternalPackages: ["@duckdb/node-api", "@duckdb/node-bindings"],
};

export default nextConfig;
