import { expect, test } from "@playwright/test";

// La page de connexion est la seule page servie sans session.
const PAGES = ["/login", "/api/health"];

for (const path of PAGES) {
  test(`${path} envoie les en-têtes de sécurité`, async ({ request }) => {
    const headers = (await request.get(path)).headers();

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toBe(
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    );
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  });
}

test("la CSP change de nonce à chaque requête", async ({ request }) => {
  const nonceOf = async () => {
    const response = await request.get("/login");
    return /'nonce-([^']+)'/.exec(response.headers()["content-security-policy"] ?? "")?.[1];
  };

  const [first, second] = [await nonceOf(), await nonceOf()];

  expect(first).toBeTruthy();
  expect(first).not.toBe(second);
});

test("les scripts de la page portent le nonce de la CSP", async ({ request }) => {
  const response = await request.get("/login");
  const nonce = /'nonce-([^']+)'/.exec(response.headers()["content-security-policy"] ?? "")?.[1];
  const html = await response.text();

  expect(nonce).toBeTruthy();
  expect(html).toContain(`nonce="${nonce}"`);
});

test("la page s'affiche sans violation de la CSP", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Connexion" })).toBeVisible();
  await expect(page.getByRole("img", { name: "RT-Dash, Administration Dashboard" })).toBeVisible();

  expect(violations).toEqual([]);
});
