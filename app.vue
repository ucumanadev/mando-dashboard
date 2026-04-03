<script setup lang="ts">
import { LOGIN_ROUTE } from "~/constants/auth";

const route = useRoute();
const auth = useAdminAuth();

const showSessionPill = computed(() => {
  return auth.isAuthenticated.value && route.path !== LOGIN_ROUTE;
});

async function handleSignOut() {
  await auth.signOut();
  await navigateTo(LOGIN_ROUTE);
}
</script>

<template>
  <div>
    <NuxtPage />

    <ClientOnly>
      <div
        v-if="showSessionPill"
        class="fixed right-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur"
      >
        <div class="font-medium leading-tight">{{ auth.user.value?.email }}</div>
        <button
          class="mt-1 text-slate-300 hover:text-slate-100 underline underline-offset-2"
          @click="handleSignOut"
        >
          Cerrar sesion
        </button>
      </div>
    </ClientOnly>
  </div>
</template>
