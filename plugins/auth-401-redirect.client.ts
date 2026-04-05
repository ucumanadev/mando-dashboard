import { LOGIN_ROUTE } from "~/constants/auth";

export default defineNuxtPlugin(() => {
  const originalFetch = window.fetch.bind(window);
  let redirectInProgress = false;
  const availability = useServerAvailability();

  function readRequestUrl(input: RequestInfo | URL) {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    return input.url;
  }

  function isSameOriginApiUrl(rawUrl: string) {
    return rawUrl.startsWith("/api/") || rawUrl.startsWith(`${window.location.origin}/api/`);
  }

  async function redirectToLogin() {
    if (redirectInProgress) return;
    redirectInProgress = true;

    const auth = useAdminAuth();
    await auth.signOut();

    window.location.assign(LOGIN_ROUTE);

    setTimeout(() => {
      redirectInProgress = false;
    }, 300);
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const rawUrl = readRequestUrl(input);
      const isSameOriginApi = isSameOriginApiUrl(rawUrl);
      const response = await originalFetch(input, init);
      const alreadyOnLogin = window.location.pathname === LOGIN_ROUTE;

      if (isSameOriginApi && response.status === 401 && !alreadyOnLogin) {
        availability.clearUnavailable();
        await redirectToLogin();
      } else if (isSameOriginApi) {
        if (response.status >= 500) {
          availability.markUnavailable("server_error");
        }
      }

      return response;
    } catch (error) {
      const rawUrl = readRequestUrl(input);
      const isSameOriginApi = isSameOriginApiUrl(rawUrl);

      if (isSameOriginApi) {
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          availability.markUnavailable("offline");
        } else {
          availability.markUnavailable("server_unreachable");
        }
      }

      throw error;
    }
  };
});
