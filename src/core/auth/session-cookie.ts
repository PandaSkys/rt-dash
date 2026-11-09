import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

// Préfixe __Host- : le navigateur impose Secure, Path=/ et l'absence de domaine.
export const SESSION_COOKIE = "__Host-rtdash_session";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // comme la session en base (design § 5.2)

type CookieOptions = Omit<ResponseCookie, "name" | "value">;

/** Options communes aux cookies de connexion : jamais lisibles par le JavaScript de la page. */
export const PRIVATE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
};

export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  ...PRIVATE_COOKIE_OPTIONS,
  maxAge: SESSION_MAX_AGE_SECONDS,
};

/**
 * Pour effacer un cookie, le navigateur exige les mêmes Path et Secure qu'à sa création
 * (surtout avec __Host-) : cookies.delete() ne les pose pas.
 */
export const EXPIRED_COOKIE_OPTIONS: CookieOptions = { ...PRIVATE_COOKIE_OPTIONS, maxAge: 0 };
