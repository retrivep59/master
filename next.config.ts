import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly expose server-side env vars so they're always available
  // in API routes regardless of how the server is started
  env: {
    HUGGINGFACE_API_TOKEN: process.env.HUGGINGFACE_API_TOKEN ?? "",
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN ?? "",
  },
};

export default nextConfig;
