<script setup lang="ts">
type TopUpStatus = "Pending" | "Succeeded" | "Failed" | "Canceled" | "Expired" | string;

type AdminTopUpDto = {
  id: string;
  driverId: string;
  amount: number;
  status: TopUpStatus;
  createdAt: string;
  paidAt?: string | null;
  expiresAt?: string | null;
  intentCode?: string | null;
  intentProvider?: string | null;
  culqiOrderId?: string | null;
};

type AdminTopUpProofDto = {
  proofId: string;
  topUpId: string;
  driverId: string;
  originalFileName?: string | null;
  filePath: string;
  sha256: string;
  extractedAmount?: number | null;
  extractedPaidAtLocal?: string | null;
  extractedOperationCode?: string | null;
  score: number;
  decision: string;
  reviewNotes?: string | null;
  rawOcrText?: string | null;
  normalizedOcrText?: string | null;
  createdAtUtc: string;
};

type AdminTopUpListResponse = {
  items: AdminTopUpDto[];
  error?: string;
  detail?: string;
};

type AdminTopUpProofListResponse = {
  items: AdminTopUpProofDto[];
  error?: string;
  detail?: string;
};

const STATUS_FILTERS = ["All", "Pending", "Succeeded", "Failed", "Canceled", "Expired"] as const;

const topups = ref<AdminTopUpDto[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedTopUp = ref<AdminTopUpDto | null>(null);
const selectedStatus = ref<(typeof STATUS_FILTERS)[number]>("All");
const proofs = ref<AdminTopUpProofDto[]>([]);
const proofsLoading = ref(false);
const proofsError = ref<string | null>(null);
const selectedProofImage = ref<string | null>(null);

async function safeReadJson(res: Response) {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const fetchTopUpsByStatus = async (status: string) => {
  const params = new URLSearchParams({ status, take: "500" });
  const res = await fetch(`/api/topups?${params.toString()}`, { cache: "no-store" });
  const data = (await safeReadJson(res)) as AdminTopUpListResponse;

  if (!res.ok || data.error) {
    throw new Error(data.error || data.detail || `Failed to load ${status} topups`);
  }

  return data.items || [];
};

const loadTopUps = async () => {
  try {
    loading.value = true;
    error.value = null;
    selectedTopUp.value = null;
    proofs.value = [];
    proofsError.value = null;
    selectedProofImage.value = null;

    if (selectedStatus.value === "All") {
      const statuses: TopUpStatus[] = ["Pending", "Succeeded", "Failed", "Canceled", "Expired"];
      const settled = await Promise.allSettled(statuses.map((status) => fetchTopUpsByStatus(status)));
      const merged = settled
        .filter((x): x is PromiseFulfilledResult<AdminTopUpDto[]> => x.status === "fulfilled")
        .flatMap((x) => x.value);
      const unique = new Map<string, AdminTopUpDto>();
      for (const t of merged) unique.set(t.id, t);
      topups.value = Array.from(unique.values()).sort((a, b) => {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return db - da;
      });
    } else {
      topups.value = await fetchTopUpsByStatus(selectedStatus.value);
    }
  } catch (err: unknown) {
    error.value = (err as Error).message || "Unexpected error";
    topups.value = [];
  } finally {
    loading.value = false;
  }
};

const approveTopUp = async (id: string) => {
  if (!window.confirm("Approve this top-up? This will credit the wallet.")) return;

  try {
    loading.value = true;
    error.value = null;

    const res = await fetch(`/api/topups/${id}/approve`, {
      method: "POST",
      cache: "no-store"
    });

    const data = (await safeReadJson(res)) as { error?: string; detail?: string };

    if (!res.ok) {
      error.value = data.error || data.detail || "Approve failed";
      return;
    }

    if (selectedTopUp.value?.id === id) {
      selectedTopUp.value.status = "Succeeded";
    }
    await loadTopUps();
  } catch (err: unknown) {
    error.value = (err as Error).message || "Approve failed";
  } finally {
    loading.value = false;
  }
};

const rejectTopUp = async (id: string) => {
  if (!window.confirm("Reject this top-up?")) return;

  try {
    loading.value = true;
    error.value = null;

    const res = await fetch(`/api/topups/${id}/reject`, {
      method: "POST",
      cache: "no-store"
    });

    const data = (await safeReadJson(res)) as { error?: string; detail?: string };

    if (!res.ok) {
      error.value = data.error || data.detail || "Reject failed";
      return;
    }

    if (selectedTopUp.value?.id === id) {
      selectedTopUp.value.status = "Failed";
    }
    await loadTopUps();
  } catch (err: unknown) {
    error.value = (err as Error).message || "Reject failed";
  } finally {
    loading.value = false;
  }
};

const fmt = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const statusBadgeClass = (status: string) => {
  if (status === "Pending") return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  if (status === "Succeeded") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  if (status === "Failed" || status === "Canceled") return "border-red-500/40 bg-red-500/10 text-red-200";
  if (status === "Expired") return "border-slate-500/40 bg-slate-500/10 text-slate-200";
  return "border-cyan-500/40 bg-cyan-500/10 text-cyan-200";
};

const openTopUp = async (topUp: AdminTopUpDto) => {
  selectedTopUp.value = topUp;
  proofs.value = [];
  proofsError.value = null;
  selectedProofImage.value = null;
  proofsLoading.value = true;

  try {
    const res = await fetch(`/api/topups/${encodeURIComponent(topUp.id)}/proofs`, { cache: "no-store" });
    const data = (await safeReadJson(res)) as AdminTopUpProofListResponse;

    if (!res.ok || data.error) {
      proofsError.value = data.error || data.detail || "Failed to load proof images";
      return;
    }

    proofs.value = data.items || [];
    if (proofs.value.length > 0) {
      selectedProofImage.value = proofs.value[0].filePath;
    }
  } catch (err: unknown) {
    proofsError.value = (err as Error).message || "Failed to load proof images";
  } finally {
    proofsLoading.value = false;
  }
};

const normalizeProofPath = (raw?: string | null) => {
  if (!raw) return null;
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  let fixed = withSlash.replace(/^\/secure\//i, "/SecureFiles/");

  // Some payloads return "topup-proofs/..." without the secure root prefix.
  if (!/^\/securefiles\//i.test(fixed) && /^\/?topup-proofs\//i.test(fixed)) {
    fixed = `/SecureFiles${fixed.startsWith("/") ? "" : "/"}${fixed}`;
  }

  return fixed;
};

const proofImageUrl = (filePath?: string | null) => {
  const normalized = normalizeProofPath(filePath);
  if (!normalized) return "";
  return `/api/files?path=${encodeURIComponent(normalized)}`;
};

onMounted(loadTopUps);
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <header class="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div class="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold">Moto Negocia - TopUps</h1>
          <p class="text-xs text-slate-400">Grid de topups con revisión de comprobantes y acciones de admin.</p>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-for="status in STATUS_FILTERS"
            :key="status"
            class="rounded px-3 py-1 text-xs font-medium border transition"
            :class="status === selectedStatus
              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'"
            :disabled="loading"
            @click="selectedStatus = status; loadTopUps()"
          >
            {{ status }}
          </button>
          <button
            class="rounded bg-emerald-500 hover:bg-emerald-400 px-3 py-1 text-xs font-medium text-slate-950"
            :disabled="loading"
            @click="loadTopUps"
          >
            {{ loading ? "Loading..." : "Refresh" }}
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 mx-auto max-w-6xl w-full px-4 py-4">
      <div v-if="error" class="mb-3 rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        {{ error }}
      </div>

      <div class="rounded border border-slate-800 bg-slate-900/70 overflow-hidden">
        <div class="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
          <div class="text-sm font-semibold">TopUps</div>
          <div class="text-[11px] text-slate-400">{{ loading ? "Loading..." : `${topups.length} items` }}</div>
        </div>

        <div class="max-h-[78vh] overflow-y-auto p-3">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div
              v-for="t in topups"
              :key="t.id"
              role="button"
              tabindex="0"
              class="rounded-lg border border-slate-800 bg-slate-950/70 hover:border-cyan-500/50 hover:bg-slate-900 text-left p-3 transition"
              @click="openTopUp(t)"
              @keydown.enter.prevent="openTopUp(t)"
              @keydown.space.prevent="openTopUp(t)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-[12px] text-slate-100 truncate">
                    <span class="font-mono text-emerald-300">{{ t.intentCode ?? "(no code)" }}</span>
                    <span class="text-slate-400"> • </span>
                    <span class="font-semibold">S/{{ t.amount?.toFixed?.(2) ?? t.amount }}</span>
                    <span v-if="t.intentProvider" class="text-slate-400"> • {{ t.intentProvider }}</span>
                  </div>
                  <div class="text-[11px] text-slate-400 mt-1">
                    Driver: <span class="font-mono">{{ t.driverId }}</span>
                  </div>
                  <div class="text-[11px] text-slate-400 mt-1">
                    Created: {{ fmt(t.createdAt) }}
                  </div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded border" :class="statusBadgeClass(t.status)">{{ t.status }}</span>
              </div>

              <div class="mt-3 flex gap-2">
                <button
                  v-if="t.status === 'Pending'"
                  class="flex-1 rounded bg-emerald-500 hover:bg-emerald-400 px-2 py-1.5 text-[11px] font-semibold text-slate-950 disabled:opacity-50"
                  :disabled="loading"
                  @click.stop="approveTopUp(t.id)"
                >
                  Approve
                </button>
                <button
                  v-if="t.status === 'Pending'"
                  class="flex-1 rounded bg-red-600 hover:bg-red-500 px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                  :disabled="loading"
                  @click.stop="rejectTopUp(t.id)"
                >
                  Reject
                </button>
                <button
                  class="rounded border border-cyan-600/40 bg-cyan-600/10 text-cyan-200 px-2 py-1.5 text-[11px] font-semibold"
                  @click.stop="openTopUp(t)"
                >
                  Ver detalle
                </button>
              </div>
            </div>
          </div>

          <div v-if="loading" class="px-1 py-2 text-xs text-slate-400">Loading topups...</div>
          <div v-if="!loading && topups.length === 0" class="px-1 py-6 text-xs text-slate-400">
            No top-ups for selected filter.
          </div>
        </div>
      </div>

      <div v-if="selectedTopUp" class="fixed inset-0 bg-black/60 flex items-start justify-center z-50">
        <div class="mt-10 w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-xl shadow-xl">
          <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold">TopUp {{ selectedTopUp.intentCode ?? selectedTopUp.id }}</div>
              <div class="text-[11px] text-slate-400 mt-1">Driver: <span class="font-mono">{{ selectedTopUp.driverId }}</span></div>
            </div>
            <button class="text-slate-400 hover:text-slate-100 text-sm" @click="selectedTopUp = null">✕</button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div class="px-4 py-4 text-xs space-y-2 border-b lg:border-b-0 lg:border-r border-slate-800">
              <div class="flex justify-between"><span class="text-slate-400">Amount</span><span class="font-semibold">S/{{ selectedTopUp.amount?.toFixed?.(2) ?? selectedTopUp.amount }}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Provider</span><span class="font-mono">{{ selectedTopUp.intentProvider ?? "-" }}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Created</span><span>{{ fmt(selectedTopUp.createdAt) }}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Expires</span><span>{{ fmt(selectedTopUp.expiresAt) }}</span></div>
              <div class="flex justify-between">
                <span class="text-slate-400">Status</span>
                <span class="font-mono px-2 py-0.5 rounded border text-[10px]" :class="statusBadgeClass(selectedTopUp.status)">
                  {{ selectedTopUp.status }}
                </span>
              </div>

              <div class="mt-4 flex gap-2">
                <button
                  v-if="selectedTopUp.status === 'Pending'"
                  class="flex-1 rounded bg-emerald-500 hover:bg-emerald-400 px-3 py-2 text-[12px] font-semibold text-slate-950 disabled:opacity-50"
                  :disabled="loading"
                  @click="approveTopUp(selectedTopUp.id)"
                >
                  Approve (credit wallet)
                </button>
                <button
                  v-if="selectedTopUp.status === 'Pending'"
                  class="flex-1 rounded bg-red-600 hover:bg-red-500 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                  :disabled="loading"
                  @click="rejectTopUp(selectedTopUp.id)"
                >
                  Reject
                </button>
              </div>
            </div>

            <div class="p-4">
              <div class="text-xs font-semibold text-slate-200 mb-2">Comprobante(s)</div>

              <div v-if="proofsLoading" class="text-xs text-slate-400">Loading proof images...</div>
              <div v-else-if="proofsError" class="text-xs text-red-300">{{ proofsError }}</div>
              <div v-else-if="proofs.length === 0" class="text-xs text-slate-400">No proof uploaded for this top-up.</div>
              <div v-else class="space-y-3">
                <div class="w-full h-72 rounded border border-slate-800 bg-slate-900 flex items-center justify-center overflow-hidden">
                  <img
                    v-if="selectedProofImage"
                    :src="proofImageUrl(selectedProofImage)"
                    alt="Topup proof"
                    class="max-h-full max-w-full object-contain"
                  />
                  <span v-else class="text-xs text-slate-500">Select a proof image</span>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="p in proofs"
                    :key="p.proofId"
                    type="button"
                    class="rounded border p-1 text-left transition"
                    :class="selectedProofImage === p.filePath
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-600'"
                    @click="selectedProofImage = p.filePath"
                  >
                    <img :src="proofImageUrl(p.filePath)" alt="proof thumbnail" class="w-full h-16 object-cover rounded" />
                    <div class="mt-1 text-[10px] text-slate-300 truncate">{{ p.decision }} • {{ p.score }}</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
