export type Environment = Record<string, string | undefined>;

/** Lit une variable obligatoire ; le message nomme la variable, jamais sa valeur. */
export function readRequiredEnv(env: Environment, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name} (voir .env.example).`);
  }
  return value;
}
