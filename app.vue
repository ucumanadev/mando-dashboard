<script setup lang="ts">
import { LOGIN_ROUTE } from "~/constants/auth";

const route = useRoute();
const auth = useAdminAuth();
const availability = useServerAvailability();
const checkingAvailability = ref(false);

const showSessionPill = computed(() => {
  return auth.isAuthenticated.value && route.path !== LOGIN_ROUTE && route.path !== "/diagnostics";
});
const showServerUnavailableBanner = computed(() => {
  return route.path !== LOGIN_ROUTE && availability.reason.value !== null;
});

async function handleSignOut() {
  await auth.signOut();
  await navigateTo(LOGIN_ROUTE);
}

function dismissServerBanner() {
  availability.clearUnavailable();
}

async function retryServerCheck() {
  if (checkingAvailability.value) return;
  checkingAvailability.value = true;
  try {
    await availability.checkNow();
  } finally {
    checkingAvailability.value = false;
  }
}
</script>

<template>
  <div>
    <div
      v-if="showServerUnavailableBanner"
      class="fixed top-0 inset-x-0 z-[80] border-b border-red-500/70 bg-red-950 px-4 py-2 text-sm text-red-200"
    >
      <div class="mx-auto max-w-6xl flex items-center justify-between gap-3">
        <span>{{ availability.message.value }}</span>
        <div class="flex items-center gap-2">
          <button
            class="rounded border border-red-400/60 px-2 py-0.5 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-60"
            :disabled="checkingAvailability"
            @click="retryServerCheck"
          >
            {{ checkingAvailability ? "Checking..." : "Retry" }}
          </button>
          <button
            class="rounded border border-red-400/60 px-2 py-0.5 text-xs text-red-200 hover:bg-red-500/20"
            @click="dismissServerBanner"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>

    <div :class="showServerUnavailableBanner ? 'pt-11' : ''">
      <NuxtPage />
    </div>

    <ClientOnly>
      <div
        v-if="showSessionPill"
        class="fixed right-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-lg backdrop-blur"
      >
        <button
          class="font-semibold text-slate-200 hover:text-white tracking-wide"
          @click="handleSignOut"
        >
          SIGN OUT
        </button>
      </div>
    </ClientOnly>
  </div>
</template>
