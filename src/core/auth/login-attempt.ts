/**
 * Tentative de connexion : state (contre les requêtes forgées) et code PKCE, gardés dans un
 * cookie httpOnly entre le départ vers Discord et le retour (design § 5.2).
 */
export interface LoginAttempt {
  state: string;
  codeVerifier: string;
}

export const LOGIN_ATTEMPT_COOKIE = "rtdash_login_attempt";
export const LOGIN_ATTEMPT_MAX_AGE_SECONDS = 600;

export function serializeLoginAttempt(attempt: LoginAttempt): string {
  return JSON.stringify(attempt);
}

/** Tentative enregistrée, seulement si le state renvoyé par Discord est le même. */
export function readLoginAttempt(
  cookieValue: string | undefined,
  returnedState: string | null,
): LoginAttempt | null {
  if (!cookieValue || !returnedState) return null;
  try {
    const attempt = JSON.parse(cookieValue) as Partial<LoginAttempt>;
    const isComplete =
      typeof attempt.state === "string" && typeof attempt.codeVerifier === "string";
    return isComplete && attempt.state === returnedState ? (attempt as LoginAttempt) : null;
  } catch {
    return null;
  }
}
