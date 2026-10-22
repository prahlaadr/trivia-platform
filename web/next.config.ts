import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Make sure Next includes the bank JSON when bundling the API routes.
  // (`outputFileTracingIncludes` is the supported way to drag files into
  //  the serverless function output.) rhyme-seeds.json is needed wherever a
  // rhyme pattern is resolved; without it, rhyme silently returns 0 in prod.
  outputFileTracingIncludes: {
    "/api/bank/categories": ["./.bank/bank.json"],
    "/api/wildcard/topic": ["./.bank/bank.json", "./.bank/rhyme-seeds.json"],
    "/api/bank/pattern-count": ["./.bank/bank.json", "./.bank/rhyme-seeds.json"],
  },
};

export default nextConfig;
