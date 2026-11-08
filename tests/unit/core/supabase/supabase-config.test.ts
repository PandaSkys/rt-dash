import { describe, expect, it } from "vitest";
import { readSupabaseConfig } from "@/core/supabase/supabase-config";

describe("readSupabaseConfig", () => {
  it("lit l'URL et la clé publique dans l'environnement", () => {
    const config = readSupabaseConfig({
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_ANON_KEY: "cle-publique",
    });

    expect(config).toEqual({ url: "http://127.0.0.1:54321", anonKey: "cle-publique" });
  });

  it("refuse une URL absente, en nommant la variable", () => {
    expect(() => readSupabaseConfig({ SUPABASE_ANON_KEY: "cle-publique" })).toThrow(/SUPABASE_URL/);
  });

  it("refuse une clé publique vide, en nommant la variable", () => {
    expect(() =>
      readSupabaseConfig({ SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_ANON_KEY: "  " }),
    ).toThrow(/SUPABASE_ANON_KEY/);
  });

  it("ne met jamais la valeur de la clé dans le message d'erreur", () => {
    expect(() => readSupabaseConfig({ SUPABASE_ANON_KEY: "cle-secrete-123" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("cle-secrete-123") }),
    );
  });
});
