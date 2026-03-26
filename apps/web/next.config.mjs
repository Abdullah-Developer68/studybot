import { fileURLToPath } from "node:url";

const nextConfig = {
  reactCompiler: true,
  transpilePackages: [
    "@studybot/supabase",
    "@studybot/api-client",
    "@studybot/types",
    "@studybot/utils",
  ],
  turbopack: {
    // Resolves to: C:\Users\Thunder Flash\Desktop\Projects\StudyBot\
    // Required so Turbopack can resolve and transpile workspace packages outside the web folder.
    root: fileURLToPath(new URL("../..", import.meta.url)),
  },
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
