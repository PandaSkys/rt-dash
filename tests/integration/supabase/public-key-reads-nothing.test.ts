import { describe, expect, it } from "vitest";
import { readLocalSupabase } from "../../support/local-supabase";

// Design § 6.6 : la clé publique, sans session, interroge l'API Supabase et n'obtient rien.
// Le test vaut pour les tables et fonctions des phases suivantes : l'API REST ne décrit
// que les objets sur lesquels le rôle `anon` a un droit.
const supabase = readLocalSupabase();
const publicKeys = [
  ["ancienne clé anon", supabase.anonKey],
  ["clé publishable", supabase.publishableKey],
] as const;

interface OpenApiDescription {
  paths: Record<string, unknown>;
}

async function describeRestApi(apiKey: string): Promise<OpenApiDescription> {
  const response = await fetch(`${supabase.apiUrl}/rest/v1/`, { headers: { apikey: apiKey } });
  expect(response.status).toBe(200);
  return (await response.json()) as OpenApiDescription;
}

describe.each(publicKeys)("clé publique sans session (%s)", (_label, apiKey) => {
  it("ne voit aucune table, vue ni fonction dans l'API REST", async () => {
    const description = await describeRestApi(apiKey);

    expect(Object.keys(description.paths)).toEqual(["/"]);
  });

  it("ne voit aucun bucket de fichiers", async () => {
    const response = await fetch(`${supabase.apiUrl}/storage/v1/bucket`, {
      headers: { apikey: apiKey },
    });

    expect(await response.json()).toEqual([]);
  });

  it("ne peut ni lire ni lister les images de trajet", async () => {
    const headers = { apikey: apiKey, "content-type": "application/json" };
    const list = await fetch(`${supabase.apiUrl}/storage/v1/object/list/route-images`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prefix: "" }),
    });
    const download = await fetch(`${supabase.apiUrl}/storage/v1/object/route-images/essai.png`, {
      headers,
    });

    expect(list.ok ? await list.json() : []).toEqual([]);
    expect(download.ok).toBe(false);
  });
});
