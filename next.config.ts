import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @napi-rs/canvas has native .node bindings that can't be bundled by Turbopack.
  // Marking it as server-external means Next treats it as a regular Node.js
  // module at runtime instead of trying to include it in the build.
  serverExternalPackages: ["@napi-rs/canvas"],
};

export default nextConfig;
