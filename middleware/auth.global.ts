import { LOGIN_ROUTE } from "~/constants/auth";

export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return;

  const auth = useAdminAuth();

  if (!auth.ready.value) {
    await auth.refreshSession();
  }

  if (to.path === LOGIN_ROUTE) {
    if (auth.isAuthenticated.value) {
      return navigateTo("/");
    }
    return;
  }

  if (!auth.isAuthenticated.value) {
    return navigateTo(LOGIN_ROUTE);
  }
});
