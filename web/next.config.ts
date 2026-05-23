import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Make sure Next includes the bank JSON when bundling the API routes.
  // (`outputFileTracingIncludes` is the supported way to drag files into
  //  the serverless function output.)
  outputFileTracingIncludes: {
    "/api/bank/categories": ["./.bank/bank.json"],
    "/api/wildcard/topic": ["./.bank/bank.json"],
  },
};

export default nextConfig;
