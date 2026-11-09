import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import pg from "pg";
import { readTestEnv } from "../support/local-env";

const SESSION_COOKIE = "__Host-rtdash_session";

// Playwright refuse un cookie Secure posé par « url » sur http://localhost ; « domain » + « path »
// donne le même cookie que celui posé par le serveur (vérifié le 2026-11-09).
function sessionCookieFor(baseURL: string | undefined) {
  const domain = new URL(baseURL ?? "").hostname;
  return { name: SESSION_COOKIE, domain, path: "/", httpOnly: true, secure: true };
}

/**
 * Connexion de test (design § 15) : la session est créée directement dans la base de test,
 * avec le rôle propriétaire ; l'application ne contient aucune route de connexion de test.
 */
async function openTestSession(): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const client = new pg.Client({ connectionString: readTestEnv().DATABASE_OWNER_URL });
  await client.connect();
  await client.query("select open_session($1, $2, $3, $4)", [
    token,
    "123456789012345678",
    "pseudo_e2e",
    "Nom e2e",
  ]);
  await client.end();
  return token;
}

test("une page privée demandée sans session renvoie vers /login", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("link", { name: "Se connecter avec Discord" })).toBeVisible();
});

test("le bouton de connexion envoie vers Discord avec state, PKCE et le seul scope identify", async ({
  request,
}) => {
  const response = await request.get("/auth/login", { maxRedirects: 0 });
  const location = new URL(response.headers()["location"] ?? "");

  expect(response.status()).toBe(307);
  expect(location.origin).toBe("https://discord.com");
  expect(location.searchParams.get("scope")).toBe("identify");
  expect(location.searchParams.get("state")).toBeTruthy();
  expect(location.searchParams.get("code_challenge_method")).toBe("S256");
  expect(response.headers()["set-cookie"]).toContain("HttpOnly");
});

test("un retour de Discord sans tentative de connexion affiche un message d'erreur", async ({
  page,
}) => {
  await page.goto("/auth/callback?code=forge&state=forge");

  await expect(page).toHaveURL(/\/login\?erreur=connexion$/);
  await expect(page.getByText("La connexion avec Discord a échoué. Réessayez.")).toBeVisible();
});

test("avec une session : l'accueil affiche le pseudo, puis la déconnexion la ferme", async ({
  page,
  context,
  baseURL,
}) => {
  const token = await openTestSession();
  await context.addCookies([{ ...sessionCookieFor(baseURL), value: token }]);

  await page.goto("/");
  await expect(page.getByText("pseudo_e2e")).toBeVisible();

  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await context.cookies()).some((cookie) => cookie.name === SESSION_COOKIE)).toBe(false);

  // La session est fermée en base : remettre l'ancien cookie ne donne plus rien.
  await context.addCookies([{ ...sessionCookieFor(baseURL), value: token }]);
  await page.goto("/");
  await expect(page.getByText("pseudo_e2e")).toHaveCount(0);
});
