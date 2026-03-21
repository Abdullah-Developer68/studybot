import path from "node:path";
import { fileURLToPath } from "node:url";

// gets the paths where the next.config.mjs file is located, which is the root of the project
const currentDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Transpile local workspace package consumed from node_modules
  transpilePackages: ["@studybot/supabase", "@studybot/utils"],
  turbopack: {
    root: currentDir,
  },
  experimental: {
    // This allows importing from outside the 'web' directory
    externalDir: true,
  },
};

export default nextConfig;
