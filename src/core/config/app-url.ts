import { type Environment, readRequiredEnv } from "@/core/config/read-required-env";

/** URL publique du site (APP_URL), sans « / » final. */
export function readAppUrl(env: Environment = process.env): string {
  const value = readRequiredEnv(env, "APP_URL").replace(/\/+$/, "");
  if (!/^https?:\/\/[^/]+/.test(value)) {
    throw new Error("Variable d'environnement invalide : APP_URL doit commencer par http(s)://.");
  }
  return value;
}
