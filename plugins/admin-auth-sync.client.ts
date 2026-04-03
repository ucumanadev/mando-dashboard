export default defineNuxtPlugin(async () => {
  const auth = useAdminAuth();

  await auth.refreshSession();
});
