import { describe, expect, it } from "vitest";
import { parseDiscordUser } from "@/core/auth/discord-user";

// Forme de GET https://discord.com/api/users/@me (scope identify) ; valeurs inventées.
const discordUser = {
  id: "123456789012345678",
  username: "pseudo_discord",
  global_name: "Nom affiché",
  discriminator: "0",
  avatar: null,
};

describe("parseDiscordUser", () => {
  it("lit l'ID, le pseudo et le nom affiché", () => {
    expect(parseDiscordUser(discordUser)).toEqual({
      discordId: "123456789012345678",
      discordUsername: "pseudo_discord",
      discordDisplayName: "Nom affiché",
    });
  });

  it("prend le pseudo comme nom affiché si Discord n'en donne pas", () => {
    expect(parseDiscordUser({ ...discordUser, global_name: null })?.discordDisplayName).toBe(
      "pseudo_discord",
    );
  });

  it("refuse un ID qui n'a pas la forme d'un ID Discord (17 à 20 chiffres)", () => {
    expect(parseDiscordUser({ ...discordUser, id: "abc" })).toBeNull();
  });

  it("refuse une réponse sans pseudo", () => {
    expect(parseDiscordUser({ ...discordUser, username: "" })).toBeNull();
  });

  it("refuse une réponse qui n'est pas un objet", () => {
    expect(parseDiscordUser(null)).toBeNull();
    expect(parseDiscordUser("erreur")).toBeNull();
  });
});
