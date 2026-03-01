import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id?: string;
      discordId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth" {
  interface JWT {
    accessToken?: string;
    discordId?: string;
  }
}

// Allowlist of Discord user IDs who can log in
// Set via ALLOWED_USER_IDS env var (comma-separated), or empty = allow all
function getAllowedUserIds(): string[] {
  return (process.env.ALLOWED_USER_IDS ?? "").split(",").filter(Boolean);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: { scope: "identify guilds" },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const allowed = getAllowedUserIds();
      // If no allowlist configured, let anyone in (protected by ManageRoles check later)
      if (allowed.length === 0) return true;
      const discordId = (profile as { id?: string })?.id;
      if (!discordId || !allowed.includes(discordId)) {
        return false; // Block login
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token ?? undefined;
        token.discordId = (profile as { id?: string }).id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.discordId = token.discordId as string;
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
});
