import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @napi-rs/canvas has native .node bindings that can't be bundled by Turbopack.
  // Marking it as server-external means Next treats it as a regular Node.js
  // module at runtime instead of trying to include it in the build.
  serverExternalPackages: ["@napi-rs/canvas"],
  // Force Inter TTFs into the serverless bundle. Without this, src/lib/fonts/*.ttf
  // won't be traced into the function and carousel rendering falls back to no font.
  outputFileTracingIncludes: {
    "/api/carousel/generate": ["./src/lib/fonts/**/*"],
  },
};

export default nextConfig;
