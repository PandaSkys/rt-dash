import { randomBytes } from "node:crypto";

const SESSION_TOKEN_BYTES = 32;

/** Jeton de session aléatoire (cookie) ; la base n'en garde que l'empreinte (design § 5.2). */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}
