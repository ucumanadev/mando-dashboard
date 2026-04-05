<script setup lang="ts">
type JsonRecord = Record<string, unknown>;
type RideRow = {
  id: string;
  status: string;
  serviceType?: string;
  paymentMethod?: string;
  finalPrice?: number | null;
  createdAtUtc?: string;
  startedAtUtc?: string | null;
  ageMinutes?: number;
  driverUserId?: string;
  passengerUserId?: string;
};
type RequestRow = {
  id: string;
  status: string;
  createdAtUtc?: string;
  expiresAtUtc?: string | null;
  ageMinutes?: number;
  passengerUserId?: string;
  serviceType?: string;
  paymentMethod?: string | null;
  offeredPrice?: number | null;
  linkedRideId?: string | null;
};

const loading = ref(false);
const error = ref<string | null>(null);

const health = ref<JsonRecord | null>(null);
const deploy = ref<JsonRecord | null>(null);
const incidents = ref<JsonRecord | null>(null);
const topErrors = ref<JsonRecord | null>(null);
const errorTimeline = ref<JsonRecord | null>(null);

const rideId = ref("");
const rideDetail = ref<JsonRecord | null>(null);
const activeRides = ref<JsonRecord | null>(null);
const stuckRides = ref<JsonRecord | null>(null);
const rideRequests = ref<JsonRecord | null>(null);
const reconcileResult = ref<JsonRecord | null>(null);

const driverId = ref("");
const driverConnection = ref<JsonRecord | null>(null);

const userId = ref("");
const userActivity = ref<JsonRecord | null>(null);
const walletDriverId = ref("");
const walletLedger = ref<JsonRecord | null>(null);

const topupId = ref("");
const topupAnomalies = ref<JsonRecord | null>(null);
const reprocessResult = ref<JsonRecord | null>(null);

const auth = useAdminAuth();
const availability = useServerAvailability();

const TABS = ["Overview", "Rides", "Users", "TopUps"] as const;
type DiagnosticsTab = (typeof TABS)[number];
const activeTab = ref<DiagnosticsTab>("Overview");
const RIDE_TABS = ["Active Rides", "Stuck Rides", "Requests", "Ride Details"] as const;
type RideDiagnosticsTab = (typeof RIDE_TABS)[number];
const activeRideTab = ref<RideDiagnosticsTab>("Active Rides");
const REQUEST_FILTERS = ["All", "Requested", "Selected"] as const;
type RequestFilter = (typeof REQUEST_FILTERS)[number];
const activeRequestFilter = ref<RequestFilter>("All");
const USER_TABS = ["Driver", "Passenger", "Wallet"] as const;
type UserDiagnosticsTab = (typeof USER_TABS)[number];
const activeUserTab = ref<UserDiagnosticsTab>("Driver");

const tabLoaded = reactive<Record<DiagnosticsTab, boolean>>({
  Overview: false,
  Rides: false,
  Users: false,
  TopUps: false
});

async function callDiagnostics(path: string, options?: { method?: "GET" | "POST"; query?: Record<string, string>; body?: JsonRecord }) {
  const method = options?.method ?? "GET";
  const query = new URLSearchParams(options?.query ?? {});
  const url = query.toString() ? `/api/diagnostics/${path}?${query.toString()}` : `/api/diagnostics/${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(options?.body ?? {}) : undefined,
      cache: "no-store"
    });
  } catch {
    availability.markUnavailable("server_unreachable");
    throw new Error("Server unavailable");
  }

  const data = await res.json();
  const detail = String(data?.detail ?? data?.error ?? "");
  const looksUnavailable =
    res.status >= 500 ||
    detail.toLowerCase().includes("upstream server unavailable") ||
    detail.toLowerCase().includes("fetch failed") ||
    detail.toLowerCase().includes("network");

  if (looksUnavailable) {
    availability.markUnavailable("server_error");
  }

  if (!res.ok || data?.error) {
    throw new Error(data?.detail || data?.error || `Request failed: ${path}`);
  }
  return data as JsonRecord;
}

function safeJsonString(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function asRows(source: JsonRecord | null): RideRow[] {
  if (!source) return [];
  const maybe = source["items"];
  if (!Array.isArray(maybe)) return [];
  return maybe as RideRow[];
}

const activeRideRows = computed(() => asRows(activeRides.value));
const stuckRideRows = computed(() => asRows(stuckRides.value));
const requestRows = computed(() => asRows(rideRequests.value) as RequestRow[]);
const filteredRequestRows = computed(() => {
  if (activeRequestFilter.value === "All") return requestRows.value;
  return requestRows.value.filter((r) => r.status === activeRequestFilter.value);
});

const rideCore = computed(() => {
  if (!rideDetail.value) return null;
  const maybe = rideDetail.value["ride"];
  if (!maybe || typeof maybe !== "object") return null;
  return maybe as JsonRecord;
});

const rideRequestData = computed(() => {
  if (!rideDetail.value) return null;
  const maybe = rideDetail.value["request"];
  if (!maybe || typeof maybe !== "object") return null;
  return maybe as JsonRecord;
});

function fmtUtc(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function shortId(value?: string) {
  if (!value) return "-";
  return value.length <= 10 ? value : `${value.slice(0, 8)}...`;
}

function keyValueRows(source: JsonRecord | null) {
  if (!source) return [] as Array<{ key: string; value: string }>;
  return Object.entries(source).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : safeJsonString(value)
  }));
}

function listRows(source: JsonRecord | null, key = "items") {
  if (!source) return [] as JsonRecord[];
  const maybe = source[key];
  if (!Array.isArray(maybe)) return [];
  return maybe.filter((x): x is JsonRecord => !!x && typeof x === "object");
}

const driverRows = computed(() => keyValueRows(driverConnection.value));
const passengerRideRows = computed(() => listRows(userActivity.value, "rides"));
const walletRows = computed(() => listRows(walletLedger.value));

async function loadOverview() {
  try {
    loading.value = true;
    error.value = null;
    health.value = null;
    deploy.value = null;
    incidents.value = null;
    topErrors.value = null;
    errorTimeline.value = null;
    const [h, d, i, e, t] = await Promise.all([
      callDiagnostics("health/overview"),
      callDiagnostics("deploy/latest"),
      callDiagnostics("incidents/open"),
      callDiagnostics("errors/top", { query: { windowMinutes: "120", take: "10" } }),
      callDiagnostics("errors/timeline", { query: { windowMinutes: "240" } })
    ]);

    health.value = h;
    deploy.value = d;
    incidents.value = i;
    topErrors.value = e;
    errorTimeline.value = t;
  } catch (err: unknown) {
    error.value = (err as Error).message || "Failed to load overview";
  } finally {
    loading.value = false;
  }
}

async function loadRides() {
  try {
    loading.value = true;
    error.value = null;
    const [active, stuck, requests] = await Promise.all([
      callDiagnostics("rides/active", { query: { take: "50" } }),
      callDiagnostics("rides/stuck", { query: { pendingStartMinutes: "20", inProgressMinutes: "180" } }),
      callDiagnostics("rides/requests/active", { query: { take: "100" } })
    ]);
    activeRides.value = active;
    stuckRides.value = stuck;
    rideRequests.value = requests;

    if (rideId.value.trim()) {
      rideDetail.value = await callDiagnostics(`rides/${rideId.value.trim()}`);
    }
  } catch (err: unknown) {
    error.value = (err as Error).message || "Failed to load ride diagnostics";
  } finally {
    loading.value = false;
  }
}

async function runReconcile() {
  if (!rideId.value.trim()) return;
  if (typeof window !== "undefined") {
    const ok = window.confirm(`Force reconcile for ride ${rideId.value.trim()}?`);
    if (!ok) return;
  }
  try {
    loading.value = true;
    error.value = null;
    reconcileResult.value = await callDiagnostics(`rides/${rideId.value.trim()}/force-reconcile`, { method: "POST" });
    rideDetail.value = await callDiagnostics(`rides/${rideId.value.trim()}`);
  } catch (err: unknown) {
    error.value = (err as Error).message || "Failed to reconcile ride";
  } finally {
    loading.value = false;
  }
}

async function openRideDetailFromLinkedRide(linkedRideId?: string | null) {
  const id = linkedRideId?.trim();
  if (!id) return;
  rideId.value = id;
  activeRideTab.value = "Ride Details";
  await loadRides();
}

async function openRideDetailFromRideRow(id?: string) {
  const ride = id?.trim();
  if (!ride) return;
  activeTab.value = "Rides";
  rideId.value = ride;
  activeRideTab.value = "Ride Details";
  await loadRides();
}

async function openDriverFromRideRow(id?: string) {
  const driver = id?.trim();
  if (!driver) return;
  activeTab.value = "Users";
  activeUserTab.value = "Driver";
  driverId.value = driver;
  await loadDriverAndUser();
}

async function openPassengerFromRideRow(id?: string) {
  const passenger = id?.trim();
  if (!passenger) return;
  activeTab.value = "Users";
  activeUserTab.value = "Passenger";
  userId.value = passenger;
  await loadDriverAndUser();
}

async function loadDriverAndUser() {
  try {
    loading.value = true;
    error.value = null;
    if (driverId.value.trim()) {
      driverConnection.value = await callDiagnostics(`drivers/${driverId.value.trim()}/connection-status`);
    }
    if (userId.value.trim()) {
      userActivity.value = await callDiagnostics(`users/${userId.value.trim()}/activity`, { query: { lookbackDays: "7" } });
    }
    if (walletDriverId.value.trim()) {
      walletLedger.value = await callDiagnostics(`wallets/${walletDriverId.value.trim()}/ledger`, { query: { take: "100", skip: "0" } });
    }
  } catch (err: unknown) {
    error.value = (err as Error).message || "Failed to load user/driver diagnostics";
  } finally {
    loading.value = false;
  }
}

async function loadTopups() {
  try {
    loading.value = true;
    error.value = null;
    topupAnomalies.value = await callDiagnostics("topups/anomalies", { query: { take: "100" } });
  } catch (err: unknown) {
    error.value = (err as Error).message || "Failed to load topup anomalies";
  } finally {
    loading.value = false;
  }
}

async function runReprocess() {
  if (!topupId.value.trim()) return;
  try {
    loading.value = true;
    error.value = null;
    reprocessResult.value = await callDiagnostics(`topups/${topupId.value.trim()}/reprocess-proof`, { method: "POST" });
  } catch (err: unknown) {
    error.value = (err as Error).message || "Failed to reprocess proof";
  } finally {
    loading.value = false;
  }
}

async function handleSignOut() {
  await auth.signOut();
  await navigateTo("/login");
}

async function ensureTabLoaded(tab: DiagnosticsTab) {
  if (tabLoaded[tab]) return;

  if (tab === "Overview") {
    await loadOverview();
  } else if (tab === "Rides") {
    await loadRides();
  } else if (tab === "Users") {
    await loadDriverAndUser();
  } else if (tab === "TopUps") {
    await loadTopups();
  }

  tabLoaded[tab] = true;
}

onMounted(async () => {
  await ensureTabLoaded("Overview");
});

watch(activeTab, async (tab) => {
  await ensureTabLoaded(tab);
});
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <header class="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div class="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div>
          <h1 class="text-lg font-semibold">Diagnostics</h1>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="rounded border border-slate-600 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-800"
            @click="handleSignOut"
          >
            SIGN OUT
          </button>
        </div>
      </div>
      <div class="mx-auto max-w-7xl px-4 pb-3 flex items-center justify-between gap-3">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tab in TABS"
            :key="tab"
            class="rounded px-3 py-1 text-xs font-medium border transition"
            :class="activeTab === tab
              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'"
            @click="activeTab = tab"
          >
            {{ tab }}
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-4 space-y-4">
      <div v-if="error && !availability.reason.value" class="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">{{ error }}</div>

      <section v-if="activeTab === 'Overview'" class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm">Overview</h2>
          <button class="rounded bg-emerald-500 hover:bg-emerald-400 px-3 py-1 text-xs font-medium text-slate-950" :disabled="loading" @click="loadOverview">
            {{ loading ? "Loading..." : "Refresh Overview" }}
          </button>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <h2 class="font-semibold text-sm mb-2">Health</h2>
          <pre class="text-[11px] text-slate-300 whitespace-pre-wrap">{{ safeJsonString(health) }}</pre>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <h2 class="font-semibold text-sm mb-2">Deploy</h2>
          <pre class="text-[11px] text-slate-300 whitespace-pre-wrap">{{ safeJsonString(deploy) }}</pre>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <h2 class="font-semibold text-sm mb-2">Open Incidents</h2>
          <pre class="text-[11px] text-slate-300 whitespace-pre-wrap">{{ safeJsonString(incidents) }}</pre>
        </div>
        </div>
      </section>

      <section v-if="activeTab === 'Overview'" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <h2 class="font-semibold text-sm mb-2">Top Errors</h2>
          <pre class="text-[11px] text-slate-300 whitespace-pre-wrap">{{ safeJsonString(topErrors) }}</pre>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <h2 class="font-semibold text-sm mb-2">Error Timeline</h2>
          <pre class="text-[11px] text-slate-300 whitespace-pre-wrap">{{ safeJsonString(errorTimeline) }}</pre>
        </div>
      </section>

      <section v-if="activeTab === 'Rides'" class="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm">Ride Diagnostics</h2>
          <button
            class="rounded border border-cyan-600 bg-cyan-600/15 px-3 py-1 text-xs disabled:opacity-60"
            :disabled="loading"
            @click="loadRides"
          >
            {{ loading ? "Loading..." : "Refresh Rides" }}
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tab in RIDE_TABS"
            :key="tab"
            class="rounded px-3 py-1 text-xs font-medium border transition"
            :class="activeRideTab === tab
              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'"
            @click="activeRideTab = tab"
          >
            {{ tab }}
          </button>
        </div>

        <div v-if="activeRideTab === 'Active Rides'" class="rounded border border-slate-800 bg-slate-950/60 p-2">
          <div v-if="activeRideRows.length === 0" class="text-[11px] text-slate-400">No active rides.</div>
          <div v-else class="overflow-x-auto max-h-[62vh] overflow-y-auto">
              <table class="min-w-full text-[11px]">
                <thead>
                  <tr class="text-slate-400 border-b border-slate-800">
                    <th class="text-left py-1 pr-2">Ride</th>
                    <th class="text-left py-1 pr-2">Status</th>
                    <th class="text-left py-1 pr-2">Age (m)</th>
                    <th class="text-left py-1 pr-2">Driver</th>
                    <th class="text-left py-1">Passenger</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in activeRideRows" :key="row.id" class="border-b border-slate-800/70">
                    <td class="py-1 pr-2 font-mono break-all">
                      <button
                        v-if="row.id"
                        class="text-cyan-200 hover:text-cyan-100 underline decoration-dotted"
                        title="Open Ride Details"
                        @click="openRideDetailFromRideRow(row.id)"
                      >
                        {{ row.id }}
                      </button>
                      <span v-else>-</span>
                    </td>
                    <td class="py-1 pr-2">{{ row.status }}</td>
                    <td class="py-1 pr-2">{{ row.ageMinutes ?? "-" }}</td>
                    <td class="py-1 pr-2 font-mono break-all">
                      <button
                        v-if="row.driverUserId"
                        class="text-cyan-200 hover:text-cyan-100 underline decoration-dotted"
                        title="Open Driver tab"
                        @click="openDriverFromRideRow(row.driverUserId)"
                      >
                        {{ row.driverUserId }}
                      </button>
                      <span v-else>-</span>
                    </td>
                    <td class="py-1 font-mono break-all">
                      <button
                        v-if="row.passengerUserId"
                        class="text-cyan-200 hover:text-cyan-100 underline decoration-dotted"
                        title="Open Passenger tab"
                        @click="openPassengerFromRideRow(row.passengerUserId)"
                      >
                        {{ row.passengerUserId }}
                      </button>
                      <span v-else>-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
          </div>
        </div>

        <div v-if="activeRideTab === 'Stuck Rides'" class="rounded border border-slate-800 bg-slate-950/60 p-2">
          <div v-if="stuckRideRows.length === 0" class="text-[11px] text-slate-400">No stuck rides with current thresholds.</div>
          <div v-else class="overflow-x-auto max-h-[62vh] overflow-y-auto">
              <table class="min-w-full text-[11px]">
                <thead>
                  <tr class="text-slate-400 border-b border-slate-800">
                    <th class="text-left py-1 pr-2">Ride</th>
                    <th class="text-left py-1 pr-2">Status</th>
                    <th class="text-left py-1 pr-2">Created</th>
                    <th class="text-left py-1">Started</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in stuckRideRows" :key="row.id" class="border-b border-slate-800/70">
                    <td class="py-1 pr-2 font-mono">{{ shortId(row.id) }}</td>
                    <td class="py-1 pr-2">{{ row.status }}</td>
                    <td class="py-1 pr-2">{{ fmtUtc(row.createdAtUtc) }}</td>
                    <td class="py-1">{{ fmtUtc(row.startedAtUtc ?? null) }}</td>
                  </tr>
                </tbody>
              </table>
          </div>
        </div>

        <div v-if="activeRideTab === 'Ride Details'" class="rounded border border-slate-800 bg-slate-950/60 p-2 space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <input v-model="rideId" class="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs w-80" placeholder="RideId (GUID)" />
            <button class="rounded border border-cyan-600 bg-cyan-600/15 px-3 py-1 text-xs" @click="loadRides">Load Ride Data</button>
            <button class="rounded border border-amber-500 bg-amber-500/15 px-3 py-1 text-xs" @click="runReconcile">Force Reconcile</button>
          </div>
          <div v-if="!rideCore" class="text-[11px] text-slate-400">Enter RideId and click Load Ride Data.</div>
          <div v-else class="space-y-1 text-[11px]">
              <div class="flex justify-between"><span class="text-slate-400">Ride</span><span class="font-mono">{{ String(rideCore.id ?? "-") }}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Status</span><span>{{ String(rideCore.status ?? "-") }}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Service</span><span>{{ String(rideCore.serviceType ?? "-") }}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Payment</span><span>{{ String(rideCore.paymentMethod ?? "-") }}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Created</span><span>{{ fmtUtc(String(rideCore.createdAtUtc ?? "")) }}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Started</span><span>{{ fmtUtc((rideCore.startedAtUtc as string | null | undefined) ?? null) }}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Completed</span><span>{{ fmtUtc((rideCore.completedAtUtc as string | null | undefined) ?? null) }}</span></div>
              <div class="pt-2 mt-2 border-t border-slate-800">
                <div class="text-slate-400 mb-1">Linked Request</div>
                <div class="font-mono text-[10px]">{{ rideRequestData ? String(rideRequestData.id ?? "-") : "-" }}</div>
              </div>
          </div>
        </div>

        <div v-if="activeRideTab === 'Requests'" class="rounded border border-slate-800 bg-slate-950/60 p-2">
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <button
              v-for="filter in REQUEST_FILTERS"
              :key="filter"
              class="rounded px-3 py-1 text-[11px] font-medium border transition"
              :class="activeRequestFilter === filter
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'"
              @click="activeRequestFilter = filter"
            >
              {{ filter }}
            </button>
          </div>
          <div v-if="filteredRequestRows.length === 0" class="text-[11px] text-slate-400">No active requests for this filter.</div>
          <div v-else class="overflow-x-auto max-h-[62vh] overflow-y-auto">
            <table class="min-w-full text-[11px]">
              <thead>
                <tr class="text-slate-400 border-b border-slate-800">
                  <th class="text-left py-1 pr-2">Request</th>
                  <th class="text-left py-1 pr-2">Status</th>
                  <th class="text-left py-1 pr-2">Age (m)</th>
                  <th class="text-left py-1 pr-2">Passenger</th>
                  <th class="text-left py-1 pr-2">Service</th>
                  <th class="text-left py-1 pr-2">Payment</th>
                  <th class="text-left py-1 pr-2">Offer</th>
                  <th class="text-left py-1 pr-2">Linked Ride</th>
                  <th class="text-left py-1">Created</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in filteredRequestRows" :key="row.id" class="border-b border-slate-800/70 align-top">
                  <td class="py-1 pr-2 font-mono break-all">{{ row.id || "-" }}</td>
                  <td class="py-1 pr-2">{{ row.status || "-" }}</td>
                  <td class="py-1 pr-2">{{ row.ageMinutes ?? "-" }}</td>
                  <td class="py-1 pr-2 font-mono break-all">{{ row.passengerUserId || "-" }}</td>
                  <td class="py-1 pr-2">{{ row.serviceType || "-" }}</td>
                  <td class="py-1 pr-2">{{ row.paymentMethod || "-" }}</td>
                  <td class="py-1 pr-2">{{ row.offeredPrice ?? "-" }}</td>
                  <td class="py-1 pr-2 font-mono break-all">
                    <button
                      v-if="row.linkedRideId"
                      class="text-cyan-200 hover:text-cyan-100 underline decoration-dotted"
                      title="Open Ride Details"
                      @click="openRideDetailFromLinkedRide(row.linkedRideId)"
                    >
                      {{ row.linkedRideId }}
                    </button>
                    <span v-else>-</span>
                  </td>
                  <td class="py-1">{{ fmtUtc(row.createdAtUtc) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <pre v-if="reconcileResult" class="text-[11px] text-emerald-300 whitespace-pre-wrap rounded border border-emerald-700/50 bg-emerald-900/10 p-2">{{ safeJsonString(reconcileResult) }}</pre>
      </section>

      <section v-if="activeTab === 'Users'" class="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm">Driver / User / Wallet</h2>
          <button class="rounded border border-cyan-600 bg-cyan-600/15 px-3 py-1 text-xs" :disabled="loading" @click="loadDriverAndUser">
            {{ loading ? "Loading..." : "Refresh Users" }}
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tab in USER_TABS"
            :key="tab"
            class="rounded px-3 py-1 text-xs font-medium border transition"
            :class="activeUserTab === tab
              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'"
            @click="activeUserTab = tab"
          >
            {{ tab }}
          </button>
        </div>

        <div v-if="activeUserTab === 'Driver'" class="rounded border border-slate-800 bg-slate-950/60 p-2 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <input v-model="driverId" class="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs w-80" placeholder="DriverId (GUID)" />
            <button class="rounded border border-cyan-600 bg-cyan-600/15 px-3 py-1 text-xs" :disabled="loading" @click="loadDriverAndUser">
              {{ loading ? "Loading..." : "Load Driver" }}
            </button>
          </div>
          <div v-if="driverRows.length === 0" class="text-[11px] text-slate-400">No driver data loaded.</div>
          <div v-else class="overflow-x-auto max-h-[62vh] overflow-y-auto">
            <table class="min-w-full text-[11px]">
              <thead>
                <tr class="text-slate-400 border-b border-slate-800">
                  <th class="text-left py-1 pr-2">Field</th>
                  <th class="text-left py-1">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in driverRows" :key="row.key" class="border-b border-slate-800/70 align-top">
                  <td class="py-1 pr-2 font-mono">{{ row.key }}</td>
                  <td class="py-1 font-mono whitespace-pre-wrap break-all">{{ row.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="activeUserTab === 'Passenger'" class="rounded border border-slate-800 bg-slate-950/60 p-2 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <input v-model="userId" class="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs w-80" placeholder="PassengerId (GUID)" />
            <button class="rounded border border-cyan-600 bg-cyan-600/15 px-3 py-1 text-xs" :disabled="loading" @click="loadDriverAndUser">
              {{ loading ? "Loading..." : "Load Passenger" }}
            </button>
          </div>
          <div v-if="passengerRideRows.length === 0" class="text-[11px] text-slate-400">No rides found for this passenger in the selected lookback period.</div>
          <div v-else class="overflow-x-auto max-h-[62vh] overflow-y-auto">
            <table class="min-w-full text-[11px]">
              <thead>
                <tr class="text-slate-400 border-b border-slate-800">
                  <th class="text-left py-1 pr-2">Ride</th>
                  <th class="text-left py-1 pr-2">Status</th>
                  <th class="text-left py-1 pr-2">Role</th>
                  <th class="text-left py-1">When</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in passengerRideRows"
                  :key="String(row.id ?? idx)"
                  class="border-b border-slate-800/70 align-top"
                >
                  <td class="py-1 pr-2 font-mono break-all">{{ String(row.id ?? "-") }}</td>
                  <td class="py-1 pr-2">{{ String(row.status ?? "-") }}</td>
                  <td class="py-1 pr-2">{{ String(row.role ?? "-") }}</td>
                  <td class="py-1">{{ fmtUtc((row.whenUtc as string | null | undefined) ?? null) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="activeUserTab === 'Wallet'" class="rounded border border-slate-800 bg-slate-950/60 p-2 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <input v-model="walletDriverId" class="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs w-80" placeholder="Wallet DriverId (GUID)" />
            <button class="rounded border border-cyan-600 bg-cyan-600/15 px-3 py-1 text-xs" :disabled="loading" @click="loadDriverAndUser">
              {{ loading ? "Loading..." : "Load Wallet" }}
            </button>
          </div>
          <div v-if="walletRows.length === 0" class="text-[11px] text-slate-400">No wallet ledger entries loaded.</div>
          <div v-else class="overflow-x-auto max-h-[62vh] overflow-y-auto">
            <table class="min-w-full text-[11px]">
              <thead>
                <tr class="text-slate-400 border-b border-slate-800">
                  <th class="text-left py-1 pr-2">#</th>
                  <th class="text-left py-1">Entry</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in walletRows" :key="idx" class="border-b border-slate-800/70 align-top">
                  <td class="py-1 pr-2 font-mono">{{ idx + 1 }}</td>
                  <td class="py-1 font-mono whitespace-pre-wrap break-all">{{ safeJsonString(row) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeTab === 'TopUps'" class="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-sm">TopUps Ops</h2>
          <button class="rounded border border-cyan-600 bg-cyan-600/15 px-3 py-1 text-xs" @click="loadTopups">Refresh TopUps</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <input v-model="topupId" class="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs w-80" placeholder="TopUpId (GUID) for reprocess" />
          <button class="rounded border border-cyan-600 bg-cyan-600/15 px-3 py-1 text-xs" @click="loadTopups">Load Anomalies</button>
          <button class="rounded border border-amber-500 bg-amber-500/15 px-3 py-1 text-xs" @click="runReprocess">Reprocess Latest Proof</button>
        </div>
        <div class="rounded border border-slate-800 bg-slate-950/60 p-2">
          <div class="text-[11px] font-semibold text-slate-200 mb-1">TopUp Anomalies</div>
          <pre class="text-[11px] text-slate-300 whitespace-pre-wrap">{{ safeJsonString(topupAnomalies) }}</pre>
        </div>
        <pre v-if="reprocessResult" class="text-[11px] text-emerald-300 whitespace-pre-wrap rounded border border-emerald-700/50 bg-emerald-900/10 p-2">{{ safeJsonString(reprocessResult) }}</pre>
      </section>

    </main>
  </div>
</template>
