import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
vi.mock("@/core/supabase/auth-session", () => ({ getSessionUser: () => getSessionUser() }));

const { default: HomePage } = await import("@/app/page");

const discordUser = {
  identities: [
    {
      provider: "discord",
      identity_data: { provider_id: "123456789012345678", full_name: "pseudo_discord" },
    },
  ],
};

describe("HomePage", () => {
  beforeEach(() => getSessionUser.mockResolvedValue(discordUser));

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
