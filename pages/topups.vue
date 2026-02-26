<script setup lang="ts">
type TopUpStatus = "Pending" | "Completed" | "Rejected" | string;

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

type AdminTopUpListResponse = {
  items: AdminTopUpDto[];
  error?: string;
  detail?: string;
};

const topups = ref<AdminTopUpDto[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedTopUp = ref<AdminTopUpDto | null>(null);

async function safeReadJson(res: Response) {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const loadTopUps = async () => {
  try {
    loading.value = true;
    error.value = null;
    selectedTopUp.value = null;

    const params = new URLSearchParams({ status: "Pending", take: "300" });
    const res = await fetch(`/api/topups?${params.toString()}`, { cache: "no-store" });
    const data = (await safeReadJson(res)) as AdminTopUpListResponse;

    if (!res.ok || data.error) {
      error.value = data.error || data.detail || "Failed to load topups";
      topups.value = [];
      return;
    }

    topups.value = data.items || [];
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

onMounted(loadTopUps);
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <header class="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div class="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold">Moto Negocia - TopUps</h1>
          <p class="text-xs text-slate-400">Pending top-ups approval (Yape/Plin + WhatsApp proof).</p>
        </div>

        <button
          class="rounded bg-emerald-500 hover:bg-emerald-400 px-3 py-1 text-xs font-medium text-slate-950"
          :disabled="loading"
          @click="loadTopUps"
        >
          {{ loading ? "Loading..." : "Refresh" }}
        </button>
      </div>
    </header>

    <main class="flex-1 mx-auto max-w-6xl w-full px-4 py-4">
      <div v-if="error" class="mb-3 rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        {{ error }}
      </div>

      <div class="rounded border border-slate-800 bg-slate-900/70 overflow-hidden">
        <div class="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
          <div class="text-sm font-semibold">Pending TopUps</div>
          <div class="text-[11px] text-slate-400">{{ loading ? "Loading..." : `${topups.length} items` }}</div>
        </div>

        <div class="max-h-[78vh] overflow-y-auto">
          <button
            v-for="t in topups"
            :key="t.id"
            type="button"
            class="w-full text-left px-3 py-2 border-b border-slate-800/80 hover:bg-slate-800/60"
            @click="selectedTopUp = t"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex-1">
                <div class="text-[12px] text-slate-100">
                  <span class="font-mono text-emerald-300">{{ t.intentCode ?? "(no code)" }}</span>
                  <span class="text-slate-400"> • </span>
                  <span class="font-semibold">S/{{ t.amount?.toFixed?.(2) ?? t.amount }}</span>
                  <span v-if="t.intentProvider" class="text-slate-400"> • {{ t.intentProvider }}</span>
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">
                  driverId: <span class="font-mono">{{ t.driverId }}</span>
                </div>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200">{{ t.status }}</span>
            </div>
          </button>

          <div v-if="loading" class="px-3 py-2 text-xs text-slate-400">Loading topups...</div>
          <div v-if="!loading && topups.length === 0" class="px-3 py-6 text-xs text-slate-400">No pending top-ups.</div>
        </div>
      </div>

      <div v-if="selectedTopUp" class="fixed inset-0 bg-black/60 flex items-start justify-center z-50">
        <div class="mt-16 w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-xl shadow-xl">
          <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div class="text-sm font-semibold">TopUp {{ selectedTopUp.intentCode ?? selectedTopUp.id }}</div>
              <div class="text-[11px] text-slate-400 mt-1">Driver: <span class="font-mono">{{ selectedTopUp.driverId }}</span></div>
            </div>
            <button class="text-slate-400 hover:text-slate-100 text-sm" @click="selectedTopUp = null">✕</button>
          </div>

          <div class="px-4 py-4 text-xs space-y-2">
            <div class="flex justify-between"><span class="text-slate-400">Amount</span><span class="font-semibold">S/{{ selectedTopUp.amount?.toFixed?.(2) ?? selectedTopUp.amount }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Provider</span><span class="font-mono">{{ selectedTopUp.intentProvider ?? "-" }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Created</span><span>{{ fmt(selectedTopUp.createdAt) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Expires</span><span>{{ fmt(selectedTopUp.expiresAt) }}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Status</span><span class="font-mono">{{ selectedTopUp.status }}</span></div>

            <div class="mt-4 flex gap-2">
              <button
                class="flex-1 rounded bg-emerald-500 hover:bg-emerald-400 px-3 py-2 text-[12px] font-semibold text-slate-950"
                :disabled="loading"
                @click="approveTopUp(selectedTopUp.id)"
              >
                Approve (credit wallet)
              </button>
              <button
                class="flex-1 rounded bg-red-600 hover:bg-red-500 px-3 py-2 text-[12px] font-semibold text-white"
                :disabled="loading"
                @click="rejectTopUp(selectedTopUp.id)"
              >
                Reject
              </button>
            </div>

            <div class="mt-3 text-[11px] text-slate-400">
              Verify WhatsApp proof first (amount + destination number), then approve here.
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
