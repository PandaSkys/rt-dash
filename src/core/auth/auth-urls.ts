import { readAppUrl } from "@/core/config/app-url";

export function homeUrl(): string {
  return `${readAppUrl()}/`;
}

export function loginUrl(): string {
  return `${readAppUrl()}/login`;
}

export function loginFailedUrl(): string {
  return `${loginUrl()}?erreur=connexion`;
}
