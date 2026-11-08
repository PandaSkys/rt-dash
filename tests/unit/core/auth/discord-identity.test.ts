import { describe, expect, it } from "vitest";
import { discordIdentityOf } from "@/core/auth/discord-identity";

// Forme relevée sur une vraie connexion Discord en local (2026-11-08), valeurs inventées.
const discordIdentity = {
  provider: "discord",
  identity_data: {
    provider_id: "123456789012345678",
    sub: "123456789012345678",
    full_name: "pseudo_discord",
    name: "pseudo_discord#0",
    custom_claims: { global_name: "Nathan" },
  },
};

describe("discordIdentityOf", () => {
  it("lit l'ID, le pseudo et le nom affiché dans l'identité Discord", () => {
    expect(discordIdentityOf({ identities: [discordIdentity] })).toEqual({
      discordId: "123456789012345678", // gitleaks:allow (ID inventé pour le test, pas un secret)
      username: "pseudo_discord",
      displayName: "Nathan",
    });
  });

  it("ignore user_metadata, que l'utilisateur peut modifier lui-même (L-01)", () => {
    const user = {
      identities: [discordIdentity],
      user_metadata: { provider_id: "111111111111111111", full_name: "imposteur" },
    };

    expect(discordIdentityOf(user)?.discordId).toBe("123456789012345678");
  });

  it("prend le pseudo comme nom affiché si Discord n'en donne pas", () => {
    const withoutGlobalName = {
      ...discordIdentity,
      identity_data: { ...discordIdentity.identity_data, custom_claims: {} },
    };

    expect(discordIdentityOf({ identities: [withoutGlobalName] })?.displayName).toBe(
      "pseudo_discord",
    );
  });

  it("renvoie null sans identité Discord", () => {
    const otherProvider = { provider: "email", identity_data: { sub: "x" } };

    expect(discordIdentityOf({ identities: [otherProvider] })).toBeNull();
    expect(discordIdentityOf({ identities: [] })).toBeNull();
    expect(discordIdentityOf({})).toBeNull();
  });

  it("renvoie null si l'ID Discord n'a pas la forme attendue (17 à 20 chiffres)", () => {
    const invalid = {
      ...discordIdentity,
      identity_data: { ...discordIdentity.identity_data, provider_id: "abc" },
    };

    expect(discordIdentityOf({ identities: [invalid] })).toBeNull();
  });
});
