/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Transpile local workspace package consumed from node_modules
  transpilePackages: ["@studybot/supabase", "@studybot/utils"],
  experimental: {
    // This allows importing from outside the 'web' directory
    externalDir: true,
  },
};

export default nextConfig;
