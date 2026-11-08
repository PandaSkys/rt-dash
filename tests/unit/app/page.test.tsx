import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("affiche le titre RT-Dash", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "RT-Dash" })).toBeInTheDocument();
  });
});
