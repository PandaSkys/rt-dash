import { describe, expect, it } from "vitest";
import { readDatabaseUrl } from "@/core/db/database-url";

describe("readDatabaseUrl", () => {
  it("lit la connexion de l'application", () => {
    expect(readDatabaseUrl({ DATABASE_URL: "postgres://rtdash_app@db:5432/rtdash" })).toBe(
      "postgres://rtdash_app@db:5432/rtdash",
    );
  });

  it("refuse une connexion absente, en nommant la variable", () => {
    expect(() => readDatabaseUrl({})).toThrow(/DATABASE_URL/);
  });

  it("refuse la connexion du propriétaire : l'application n'utilise que rtdash_app", () => {
    expect(() =>
      readDatabaseUrl({ DATABASE_URL: "postgres://rtdash_owner:secret@db:5432/rtdash" }),
    ).toThrow(/rtdash_app/);
  });

  it("ne met jamais le mot de passe dans le message d'erreur", () => {
    expect(() =>
      readDatabaseUrl({ DATABASE_URL: "postgres://rtdash_owner:mot-de-passe-123@db/rtdash" }),
    ).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("mot-de-passe-123") }),
    );
  });
});
