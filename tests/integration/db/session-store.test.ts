import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getDatabase } = await import("@/core/db/client");
const { closeSession, openSession, readSessionProfile } = await import("@/core/db/session-store");
const { generateSessionToken } = await import("@/core/auth/session-token");

afterAll(() => getDatabase().destroy());

// Données de test inventées ; la base locale est jetable (pnpm db:reset).
const profile = {
  discordId: "123456789012345678",
  discordUsername: "pseudo_test",
  discordDisplayName: "Nom de test",
};

describe("sessions (base réelle, rôle rtdash_app)", () => {
  it("une session ouverte donne le profil Discord", async () => {
    const token = generateSessionToken();
    await openSession(token, profile);

    expect(await readSessionProfile(token)).toEqual(profile);
  });

  it("un jeton inventé ne donne rien", async () => {
    expect(await readSessionProfile(generateSessionToken())).toBeNull();
  });

  it("sans jeton : rien", async () => {
    expect(await readSessionProfile(null)).toBeNull();
  });

  it("une session fermée ne donne plus rien", async () => {
    const token = generateSessionToken();
    await openSession(token, profile);
    await closeSession(token);

    expect(await readSessionProfile(token)).toBeNull();
  });
});
