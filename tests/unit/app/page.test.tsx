import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const readCurrentSessionProfile = vi.fn();
vi.mock("@/core/auth/current-session", () => ({
  readCurrentSessionProfile: () => readCurrentSessionProfile(),
}));

const { default: HomePage } = await import("@/app/page");

describe("HomePage (accueil provisoire)", () => {
  beforeEach(() =>
    readCurrentSessionProfile.mockResolvedValue({
      discordId: "123456789012345678",
      discordUsername: "pseudo_discord",
      discordDisplayName: "Nom",
    }),
  );

  it("affiche le titre RT-Dash", async () => {
    render(await HomePage());

    expect(screen.getByRole("heading", { name: "RT-Dash" })).toBeInTheDocument();
  });

  it("affiche le pseudo Discord de la session", async () => {
    render(await HomePage());

    expect(screen.getByText("pseudo_discord")).toBeInTheDocument();
  });

  it("propose de se déconnecter par un formulaire POST vers /auth/logout", async () => {
    render(await HomePage());
    const form = screen.getByRole("button", { name: "Se déconnecter" }).closest("form");

    expect(form).toHaveAttribute("action", "/auth/logout");
    expect(form).toHaveAttribute("method", "post");
  });
});
