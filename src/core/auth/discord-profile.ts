/** Profil Discord d'une personne connectée, lu par le serveur auprès de Discord (L-01). */
export interface DiscordProfile {
  discordId: string;
  /** Pseudo Discord (nom d'utilisateur). */
  discordUsername: string;
  /** Nom affiché Discord, ou le pseudo s'il n'y en a pas. */
  discordDisplayName: string;
}
