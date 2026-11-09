import { describe, expect, it } from "vitest";
import { readLoginAttempt, serializeLoginAttempt } from "@/core/auth/login-attempt";

const attempt = { state: "etat-aleatoire", codeVerifier: "verificateur-aleatoire" };

describe("tentative de connexion (cookie de 10 minutes)", () => {
  it("relit ce qui a été enregistré au départ vers Discord", () => {
    expect(readLoginAttempt(serializeLoginAttempt(attempt), "etat-aleatoire")).toEqual(attempt);
  });

  it("refuse un retour dont le state ne correspond pas (requête forgée)", () => {
    expect(readLoginAttempt(serializeLoginAttempt(attempt), "autre-etat")).toBeNull();
  });

  it("refuse un retour sans cookie ou sans state", () => {
    expect(readLoginAttempt(undefined, "etat-aleatoire")).toBeNull();
    expect(readLoginAttempt(serializeLoginAttempt(attempt), null)).toBeNull();
  });

  it("refuse un cookie illisible", () => {
    expect(readLoginAttempt("n'importe quoi", "etat-aleatoire")).toBeNull();
  });
});
