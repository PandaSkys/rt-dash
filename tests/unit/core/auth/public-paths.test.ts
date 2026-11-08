import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/core/auth/public-paths";

describe("isPublicPath", () => {
  it.each(["/login", "/auth/login", "/auth/callback", "/api/health"])(
    "%s est accessible sans session",
    (path) => {
      expect(isPublicPath(path)).toBe(true);
    },
  );

  it.each(["/", "/convois", "/acces-refuse", "/auth/logout", "/login-bis", "/api/healthz"])(
    "%s exige une session",
    (path) => {
      expect(isPublicPath(path)).toBe(false);
    },
  );
});
