import { describe, expect, it } from "vitest";
import { readAppUrl } from "@/core/config/app-url";

describe("readAppUrl", () => {
  it("lit l'URL publique du site", () => {
    expect(readAppUrl({ APP_URL: "https://rt-dash.example.org" })).toBe(
      "https://rt-dash.example.org",
    );
  });

  it("retire le « / » final pour construire les liens sans doublon", () => {
    expect(readAppUrl({ APP_URL: "http://localhost:3000/" })).toBe("http://localhost:3000");
  });

  it("refuse une URL absente, en nommant la variable", () => {
    expect(() => readAppUrl({})).toThrow(/APP_URL/);
  });

  it("refuse une valeur qui n'est pas une URL http(s)", () => {
    expect(() => readAppUrl({ APP_URL: "rt-dash.example.org" })).toThrow(/APP_URL/);
  });
});
