import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @napi-rs/canvas and sharp both have native .node bindings that can't be
  // bundled by Turbopack. Marking them server-external means Next treats them
  // as regular Node.js modules at runtime instead of trying to include them
  // in the build. sharp is used in the carousel renderer to re-encode
  // gpt-image-1 PNGs — napi-rs/canvas chokes on the raw output otherwise.
  serverExternalPackages: ["@napi-rs/canvas", "sharp"],
  // Force Inter TTFs into the serverless bundle. Without this, src/lib/fonts/*.ttf
  // won't be traced into the function and carousel rendering falls back to no font.
  outputFileTracingIncludes: {
    "/api/carousel/generate": ["./src/lib/fonts/**/*"],
  },
};

export default nextConfig;
