// Pages accessibles sans session : connexion, retour de Discord, contrôle de santé.
const PUBLIC_PATHS = new Set(["/login", "/auth/login", "/auth/callback", "/api/health"]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}
