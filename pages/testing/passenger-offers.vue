<script setup lang="ts">
type CreateDriverOffersBody = {
  count: number;
  basePrice?: number;
  priceStep: number;
  driverNamePrefix: string;
  rating: string;
  avatar: string;
};

type ApiResponse = {
  ok?: boolean;
  count?: number;
  requestId?: string;
  offers?: Array<{
    driverId: string;
    name: string;
    finalPrice: number;
    passengerOfferedPrice: number;
  }>;
  detail?: string;
  error?: string;
};

const requestId = ref("");

const createForm = reactive<CreateDriverOffersBody>({
  count: 4,
  basePrice: undefined,
  priceStep: 0.5,
  driverNamePrefix: "Test Driver",
  rating: "5.0",
  avatar: ""
});

const loadingCreate = ref(false);
const error = ref<string | null>(null);
const response = ref<ApiResponse | null>(null);

async function safeReadJson(res: Response) {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const submitCreate = async () => {
  const rid = requestId.value.trim();
  if (!rid) {
    error.value = "requestId es requerido";
    return;
  }

  loadingCreate.value = true;
  error.value = null;
  response.value = null;

  try {
    const res = await fetch(`/api/testing/ride-requests/${encodeURIComponent(rid)}/driver-offers/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(createForm),
      cache: "no-store"
    });

    const data = (await safeReadJson(res)) as ApiResponse;

    if (!res.ok || data.error) {
      error.value = data.error || data.detail || "Failed to create driver offers";
      response.value = data;
      return;
    }

    response.value = data;
  } catch (err: unknown) {
    error.value = (err as Error).message || "Unexpected error";
  } finally {
    loadingCreate.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <header class="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div class="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold">Testing - Passenger Driver Offers</h1>
          <p class="text-xs text-slate-400">
            Simula ofertas de conductores para el flujo SearchingForDrivers usando requestId.
          </p>
        </div>
        <NuxtLink
          to="/testing"
          class="rounded border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs font-medium hover:bg-slate-700/70"
        >
          Volver
        </NuxtLink>
      </div>
    </header>

    <main class="flex-1 mx-auto max-w-6xl w-full px-4 py-6 space-y-4">
      <div v-if="error" class="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        {{ error }}
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-6 space-y-5">
        <div>
          <h2 class="text-base font-semibold">requestId</h2>
          <p class="mt-1 text-xs text-slate-400">
            Pega el requestId de RideRequests (DB) que está en estado Requested.
          </p>
        </div>

        <label class="text-sm block">
          <div class="mb-1 text-slate-300">Request ID</div>
          <input
            v-model="requestId"
            type="text"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2"
          />
        </label>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label class="text-sm">
            <div class="mb-1 text-slate-300">Cantidad de ofertas</div>
            <input
              v-model.number="createForm.count"
              type="number"
              min="1"
              max="25"
              class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2"
            />
          </label>

          <label class="text-sm">
            <div class="mb-1 text-slate-300">Precio base (opcional)</div>
            <input
              v-model.number="createForm.basePrice"
              type="number"
              min="1"
              step="0.5"
              class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2"
            />
          </label>

          <label class="text-sm">
            <div class="mb-1 text-slate-300">Incremento de precio</div>
            <input
              v-model.number="createForm.priceStep"
              type="number"
              min="0"
              step="0.1"
              class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2"
            />
          </label>

          <label class="text-sm">
            <div class="mb-1 text-slate-300">Nombre base del conductor</div>
            <input
              v-model="createForm.driverNamePrefix"
              type="text"
              class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2"
            />
          </label>

          <label class="text-sm">
            <div class="mb-1 text-slate-300">Rating</div>
            <input
              v-model="createForm.rating"
              type="text"
              class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2"
            />
          </label>

          <label class="text-sm">
            <div class="mb-1 text-slate-300">Avatar URL (opcional)</div>
            <input
              v-model="createForm.avatar"
              type="text"
              class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2"
            />
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            class="rounded bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            :disabled="loadingCreate"
            @click="submitCreate"
          >
            {{ loadingCreate ? "Enviando..." : "Crear Driver Offers" }}
          </button>
        </div>
      </div>

      <div v-if="response" class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-6">
        <h3 class="text-sm font-semibold mb-2">Respuesta</h3>
        <pre class="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">{{ JSON.stringify(response, null, 2) }}</pre>
      </div>
    </main>
  </div>
</template>
