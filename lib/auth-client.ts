// Simple auth client placeholder
// Can be replaced with better-auth when properly configured

export const authClient = {
  signIn: {
    social: async ({ provider, callbackURL }: { provider: string; callbackURL: string }) => {
      // For now, redirect to sign-in page
      window.location.href = `/sign-in?provider=${provider}&redirect=${encodeURIComponent(callbackURL)}`;
    },
  },
  signOut: async () => {
    localStorage.removeItem("zendor_user");
    window.location.href = "/";
  },
};
