<script setup lang="ts">
type PaymentMethod = "cash" | "yape" | "plin";

type CreateRideRequestBody = {
  count: number;
  offeredPrice: number;
  paymentMethod: PaymentMethod;
  passengerNamePrefix: string;
  scatterKm: number;
  pickup: {
    lat: number;
    lng: number;
    address: string;
  };
  destination: {
    lat: number;
    lng: number;
    address: string;
  };
};

type CreateRideRequestsResponse = {
  ok?: boolean;
  createdCount?: number;
  createdIds?: string[];
  detail?: string;
  error?: string;
};

const form = reactive<CreateRideRequestBody>({
  count: 1,
  offeredPrice: 8,
  paymentMethod: "cash",
  passengerNamePrefix: "Test Passenger",
  scatterKm: 0.2,
  pickup: {
    lat: 29.517041,
    lng: -98.741741,
    address: "Pickup near user location"
  },
  destination: {
    lat: 29.522041,
    lng: -98.736741,
    address: "Destination near user location"
  }
});

const loading = ref(false);
const error = ref<string | null>(null);
const response = ref<CreateRideRequestsResponse | null>(null);

async function safeReadJson(res: Response) {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const submit = async () => {
  loading.value = true;
  error.value = null;
  response.value = null;

  try {
    const res = await fetch("/api/testing/ride-requests/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(form),
      cache: "no-store"
    });

    const data = (await safeReadJson(res)) as CreateRideRequestsResponse;

    if (!res.ok || data.error) {
      error.value = data.error || data.detail || "Failed to create ride requests";
      response.value = data;
      return;
    }

    response.value = data;
  } catch (err: unknown) {
    error.value = (err as Error).message || "Unexpected error";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <header class="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div class="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold">Testing - Ride Requests</h1>
          <p class="text-xs text-slate-400">
            Crear solicitudes de prueba y enviarlas al API ASP.NET Core.
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
          <h2 class="text-base font-semibold">Generador de Ride Requests</h2>
          <p class="mt-1 text-xs text-slate-400">
            Este formulario llama al endpoint de testing del backend usando la API interna de Nuxt.
            Cada click en "Crear Ride Requests" agrega nuevas solicitudes; no reemplaza las anteriores.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label class="text-sm">
            <div class="mb-1 text-slate-300">Cantidad</div>
            <input
              v-model.number="form.count"
              type="number"
              min="1"
              max="50"
              class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2"
            />
          </label>

          <label class="text-sm">
            <div class="mb-1 text-slate-300">Precio ofrecido (PEN)</div>
            <input
              v-model.number="form.offeredPrice"
              type="number"
              min="1"
              step="0.5"
              class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2"
            />
          </label>

          <label class="text-sm">
            <div class="mb-1 text-slate-300">Metodo de pago</div>
            <select
              v-model="form.paymentMethod"
              class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2"
            >
              <option value="cash">cash</option>
              <option value="yape">yape</option>
              <option value="plin">plin</option>
            </select>
          </label>

          <label class="text-sm">
            <div class="mb-1 text-slate-300">Nombre base pasajero</div>
            <input
              v-model="form.passengerNamePrefix"
              type="text"
              class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2"
            />
          </label>

          <label class="text-sm md:col-span-2">
            <div class="mb-1 text-slate-300">Dispersión alrededor del punto A (km)</div>
            <input
              v-model.number="form.scatterKm"
              type="number"
              min="0"
              step="0.1"
              class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2"
            />
          </label>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <div class="text-sm font-semibold">Pickup (A)</div>
            <label class="text-sm block">
              <div class="mb-1 text-slate-300">Latitud</div>
              <input v-model.number="form.pickup.lat" type="number" step="0.000001" class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2" />
            </label>
            <label class="text-sm block">
              <div class="mb-1 text-slate-300">Longitud</div>
              <input v-model.number="form.pickup.lng" type="number" step="0.000001" class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2" />
            </label>
            <label class="text-sm block">
              <div class="mb-1 text-slate-300">Direccion</div>
              <input v-model="form.pickup.address" type="text" class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2" />
            </label>
          </div>

          <div class="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <div class="text-sm font-semibold">Destino (B)</div>
            <label class="text-sm block">
              <div class="mb-1 text-slate-300">Latitud</div>
              <input v-model.number="form.destination.lat" type="number" step="0.000001" class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2" />
            </label>
            <label class="text-sm block">
              <div class="mb-1 text-slate-300">Longitud</div>
              <input v-model.number="form.destination.lng" type="number" step="0.000001" class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2" />
            </label>
            <label class="text-sm block">
              <div class="mb-1 text-slate-300">Direccion</div>
              <input v-model="form.destination.address" type="text" class="w-full rounded border border-slate-700 bg-slate-950/70 px-3 py-2" />
            </label>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            class="rounded bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            :disabled="loading"
            @click="submit"
          >
            {{ loading ? "Enviando..." : "Crear Ride Requests" }}
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
