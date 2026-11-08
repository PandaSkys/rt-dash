import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

// La CSP (avec nonce par requête) est posée par src/proxy.ts.
// `serverActions.allowedOrigins` n'est volontairement pas défini (design § 18, L-04).
const nextConfig: NextConfig = {
  // CLAUDE.md est la seule source d'instructions pour les agents.
  agentRules: false,
  output: "standalone",
  headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
};

export default nextConfig;
