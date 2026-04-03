import { ADMIN_ACCESS_TOKEN_COOKIE } from "~/constants/auth";

type SupabaseUser = {
  id: string;
  email?: string;
};

type AdminSession = {
  accessToken: string;
  user: SupabaseUser;
};

export function useAdminAuth() {
  const session = useState<AdminSession | null>("admin-session", () => null);
  const ready = useState<boolean>("admin-auth-ready", () => false);
  const loading = useState<boolean>("admin-auth-loading", () => false);
  const errorMessage = useState<string | null>("admin-auth-error", () => null);

  const config = useRuntimeConfig();
  const supabaseUrl = computed(() => config.public.supabaseUrl);
  const supabaseAnonKey = computed(() => config.public.supabaseAnonKey);

  const user = computed(() => session.value?.user ?? null);
  const isAuthenticated = computed(() => Boolean(session.value?.accessToken));

  function authApiUrl(path: string) {
    return `${supabaseUrl.value.replace(/\/$/, "")}${path}`;
  }

  function authHeaders(extra?: Record<string, string>) {
    return {
      apikey: supabaseAnonKey.value,
      ...extra
    };
  }

  function syncAccessTokenCookie(token: string | null) {
    const accessTokenCookie = useCookie<string | null>(ADMIN_ACCESS_TOKEN_COOKIE, {
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production"
    });

    accessTokenCookie.value = token;
  }

  function setSession(nextSession: AdminSession | null) {
    session.value = nextSession;
    syncAccessTokenCookie(nextSession?.accessToken ?? null);
  }

  async function fetchCurrentUser(accessToken: string): Promise<SupabaseUser | null> {
    try {
      const user = await $fetch<SupabaseUser>(authApiUrl("/auth/v1/user"), {
        method: "GET",
        headers: authHeaders({
          Authorization: `Bearer ${accessToken}`
        })
      });
      return user;
    } catch {
      return null;
    }
  }

  async function refreshSession() {
    if (!supabaseUrl.value || !supabaseAnonKey.value) {
      errorMessage.value = "Missing SUPABASE_URL or SUPABASE_ANON_KEY";
      setSession(null);
      ready.value = true;
      return null;
    }

    const accessTokenCookie = useCookie<string | null>(ADMIN_ACCESS_TOKEN_COOKIE);
    const token = accessTokenCookie.value?.trim();
    if (!token) {
      setSession(null);
      ready.value = true;
      return null;
    }

    const currentUser = await fetchCurrentUser(token);
    if (!currentUser) {
      setSession(null);
      ready.value = true;
      return null;
    }

    errorMessage.value = null;
    setSession({ accessToken: token, user: currentUser });
    ready.value = true;
    return session.value;
  }

  async function signIn(email: string, password: string) {
    loading.value = true;
    errorMessage.value = null;

    try {
      if (!supabaseUrl.value || !supabaseAnonKey.value) {
        const message = "Missing SUPABASE_URL or SUPABASE_ANON_KEY";
        errorMessage.value = message;
        return { ok: false as const, message };
      }

      const data = await $fetch<{
        access_token: string;
        user: SupabaseUser;
      }>(authApiUrl("/auth/v1/token?grant_type=password"), {
        method: "POST",
        headers: authHeaders({
          "Content-Type": "application/json"
        }),
        body: {
          email,
          password
        }
      });

      setSession({
        accessToken: data.access_token,
        user: data.user
      });
      return { ok: true as const };
    } catch (err: any) {
      const message =
        err?.data?.msg ||
        err?.data?.error_description ||
        err?.data?.error ||
        err?.message ||
        "Unable to sign in";
      errorMessage.value = message;
      return { ok: false as const, message };
    } finally {
      loading.value = false;
    }
  }

  async function signOut() {
    setSession(null);
  }

  return {
    session,
    ready,
    loading,
    errorMessage,
    user,
    isAuthenticated,
    setSession,
    refreshSession,
    signIn,
    signOut
  };
}
