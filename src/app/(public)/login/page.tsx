import styles from "./login.module.css";

interface LoginPageProps {
  searchParams: Promise<{ erreur?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { erreur } = await searchParams;

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {/* next/image ajoute un attribut style en ligne, bloqué par la CSP stricte. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/rt-dash-logo-white.png"
          alt="RT-Dash, Administration Dashboard"
          width={1300}
          height={300}
          className={styles.logo}
        />
        <div>
          <h1 className={styles.title}>Connexion</h1>
          <p className={styles.text}>Connectez-vous avec votre compte Discord.</p>
        </div>
        {erreur === "connexion" && (
          <p role="alert" className={styles.error}>
            La connexion avec Discord a échoué. Réessayez.
          </p>
        )}
        {/* Lien et non bouton de formulaire : voir src/app/auth/login/route.ts. */}
        <a href="/auth/login" className={styles.button}>
          Se connecter avec Discord
        </a>
      </div>
    </main>
  );
}
