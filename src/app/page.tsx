import { readCurrentSessionProfile } from "@/core/auth/current-session";

// Accueil provisoire : remplacé par la coque du dashboard en phase 4.
export default async function HomePage() {
  const profile = await readCurrentSessionProfile();

  return (
    <main>
      <h1>RT-Dash</h1>
      {profile && (
        <p>
          Connecté avec Discord en tant que <strong>{profile.discordUsername}</strong>.
        </p>
      )}
      <form action="/auth/logout" method="post">
        <button type="submit">Se déconnecter</button>
      </form>
    </main>
  );
}
