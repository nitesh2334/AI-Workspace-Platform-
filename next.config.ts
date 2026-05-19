import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger body for file uploads (handled via FormData/multipart in /api/upload)
  serverExternalPackages: ["pdf-parse"],
  // Explicit root prevents Turbopack from picking the wrong workspace root
  // when extraneous lockfiles exist in parent directories.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
