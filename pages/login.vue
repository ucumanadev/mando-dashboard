<script setup lang="ts">
import { LOGIN_ROUTE } from "~/constants/auth";

const email = ref("dataease@pearbasket.com");
const password = ref("");
const auth = useAdminAuth();

const canSubmit = computed(() => {
  return email.value.trim().length > 0 && password.value.length > 0 && !auth.loading.value;
});

async function submit() {
  if (!canSubmit.value) return;

  const result = await auth.signIn(email.value.trim(), password.value);
  if (!result.ok) return;

  await navigateTo("/");
}

definePageMeta({
  path: LOGIN_ROUTE
});
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 px-4">
    <div class="mx-auto w-full max-w-5xl">
      <header class="pt-8 pb-2 text-center">
        <h1 class="text-3xl font-bold tracking-[0.2em]">MANDO</h1>
        <p class="text-sm text-slate-400 mt-1 tracking-[0.08em]">administracion</p>
      </header>

      <main class="min-h-[calc(100vh-120px)] flex items-center justify-center pb-8">
        <div
          class="w-[min(34vw,420px)] h-[min(46vh,420px)] min-w-[280px] rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl px-6 py-8 flex items-center"
        >
          <form class="w-full space-y-4" @submit.prevent="submit">
            <label class="block">
              <span class="text-sm text-slate-300">Email</span>
              <input
                v-model="email"
                type="email"
                autocomplete="email"
                class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-slate-500"
                placeholder="dataease@pearbasket.com"
                required
              />
            </label>

            <label class="block">
              <span class="text-sm text-slate-300">Password</span>
              <input
                v-model="password"
                type="password"
                autocomplete="current-password"
                class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-slate-500"
                placeholder="********"
                required
              />
            </label>

            <p v-if="auth.errorMessage.value" class="text-sm text-rose-400">
              {{ auth.errorMessage.value }}
            </p>

            <button
              type="submit"
              :disabled="!canSubmit"
              class="w-full rounded-lg bg-slate-100 text-slate-900 font-medium py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ auth.loading.value ? "Ingresando..." : "Ingresar" }}
            </button>
          </form>
        </div>
      </main>
    </div>
  </div>
</template>
