import { discordIdentityOf } from "@/core/auth/discord-identity";
import { getSessionUser } from "@/core/supabase/auth-session";

// Accueil provisoire : remplacé par la coque du dashboard en phase 4.
export default async function HomePage() {
  const user = await getSessionUser();
  const identity = user ? discordIdentityOf(user) : null;

  return (
    <main>
      <h1>RT-Dash</h1>
      {identity && (
        <p>
          Connecté avec Discord en tant que <strong>{identity.username}</strong>.
        </p>
      )}
      <form action="/auth/logout" method="post">
        <button type="submit">Se déconnecter</button>
      </form>
    </main>
  );
}
