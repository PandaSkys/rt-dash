import { readAppUrl } from "@/core/config/app-url";

export function loginUrl(): string {
  return `${readAppUrl()}/login`;
}

export function loginFailedUrl(): string {
  return `${loginUrl()}?erreur=connexion`;
}
