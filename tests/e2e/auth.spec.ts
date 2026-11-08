import { expect, test } from "@playwright/test";

test("une page privée demandée sans session renvoie vers /login", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("link", { name: "Se connecter avec Discord" })).toBeVisible();
});

test("le bouton de connexion lance la connexion Discord via Supabase", async ({ request }) => {
  const response = await request.get("/auth/login", { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toContain("/auth/v1/authorize?provider=discord");
});

test("un retour de Discord sans code affiche un message d'erreur", async ({ page }) => {
  await page.goto("/auth/callback?error=access_denied");

  await expect(page).toHaveURL(/\/login\?erreur=connexion$/);
  await expect(page.getByText("La connexion avec Discord a échoué. Réessayez.")).toBeVisible();
});
