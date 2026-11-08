import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CLAUDE.md est la seule source d'instructions pour les agents.
  agentRules: false,
};

export default nextConfig;
