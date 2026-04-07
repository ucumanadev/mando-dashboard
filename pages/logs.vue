<script setup lang="ts">
type LogKind = "app" | "error";
type MinLevel = "Debug" | "Information" | "Warning" | "Error" | "Fatal";

type LogEvent = {
  timestamp: string;
  level: string;
  messageTemplate: string;
  exception?: string;
  properties: Record<string, unknown>;
  sourceFile?: string;
};

type ApiResponse = {
  events: LogEvent[];
  error?: string;
  detail?: string;
};

const LEVEL_ORDER: Record<string, number> = {
  Verbose: 0,
  Debug: 1,
  Information: 2,
  Warning: 3,
  Error: 4,
  Fatal: 5
};

const FILE_OPTIONS: Array<{ value: LogKind; label: string }> = [
  { value: "app", label: "App (info+)" },
  { value: "error", label: "Errors" }
];

const MIN_LEVEL_OPTIONS: MinLevel[] = ["Debug", "Information", "Warning", "Error", "Fatal"];

const formatDateForInput = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getProp = (log: LogEvent, key: string): string | undefined => {
  const value = log.properties?.[key];
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const file = ref<LogKind>("app");
const limit = ref(200);
const logs = ref<LogEvent[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const search = ref("");
const minLevel = ref<MinLevel>("Debug");
const selected = ref<LogEvent | null>(null);
const date = ref(formatDateForInput(new Date()));

const propertyFilter = ref<{ key: string; value: string } | null>(null);
const correlation = ref<{ property: string; value: string } | null>(null);

const loadLogs = async (selectedFile: LogKind, selectedLimit: number) => {
  try {
    loading.value = true;
    error.value = null;
    correlation.value = null;

    const params = new URLSearchParams({
      file: selectedFile,
      limit: String(selectedLimit),
      date: date.value
    });

    const data = await $fetch<ApiResponse>(`/api/logs?${params.toString()}`);
    logs.value = data.events || [];
  } catch (err: unknown) {
    const e = err as { data?: { error?: string; detail?: string }; message?: string };
    error.value = e?.data?.error || e?.data?.detail || e?.message || "Failed to load logs";
    logs.value = [];
  } finally {
    loading.value = false;
  }
};

const loadCorrelation = async (property: string, value: string) => {
  try {
    loading.value = true;
    error.value = null;
    selected.value = null;
    propertyFilter.value = null;
    correlation.value = { property, value };

    const params = new URLSearchParams({
      mode: "all",
      date: date.value,
      property,
      value,
      limit: String(limit.value)
    });

    const data = await $fetch<ApiResponse>(`/api/logs?${params.toString()}`);
    logs.value = data.events || [];
  } catch (err: unknown) {
    const e = err as { data?: { error?: string; detail?: string }; message?: string };
    error.value = e?.data?.error || e?.data?.detail || e?.message || "Failed to load correlation logs";
    logs.value = [];
  } finally {
    loading.value = false;
  }
};

const filteredLogs = computed(() => {
  const q = search.value.trim().toLowerCase();
  const minOrder = LEVEL_ORDER[minLevel.value] ?? 0;

  return logs.value.filter((log) => {
    const levelOrder = LEVEL_ORDER[log.level] ?? 99;
    if (levelOrder < minOrder) return false;

    if (propertyFilter.value) {
      const rawValue = log.properties?.[propertyFilter.value.key];
      if (rawValue === undefined) return false;
      const asString = typeof rawValue === "string" ? rawValue : JSON.stringify(rawValue);
      if (asString !== propertyFilter.value.value) return false;
    }

    if (!q) return true;

    const msg = (log.messageTemplate || "").toLowerCase();
    if (msg.includes(q)) return true;

    for (const [key, value] of Object.entries(log.properties || {})) {
      if (key.startsWith("@")) continue;
      const asString = typeof value === "string" ? value.toLowerCase() : JSON.stringify(value).toLowerCase();
      if (asString.includes(q)) return true;
    }

    return false;
  });
});

const formatTimestamp = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

watch([file, limit, date], () => {
  if (correlation.value) return;
  loadLogs(file.value, limit.value);
}, { immediate: true });
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <header class="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div class="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-lg font-semibold">Moto Negocia - Logs</h1>
          <p class="text-xs text-slate-400">Serilog compact JSON logs from your ASP.NET backend.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <select v-model="file" class="bg-slate-800 border border-slate-700 rounded px-2 py-1">
            <option v-for="opt in FILE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>

          <select v-model.number="limit" class="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-24">
            <option :value="100">Last 100</option>
            <option :value="200">Last 200</option>
            <option :value="500">Last 500</option>
          </select>

          <button
            class="rounded bg-emerald-500 hover:bg-emerald-400 px-3 py-1 font-medium"
            :disabled="loading"
            @click="correlation ? loadCorrelation(correlation.property, correlation.value) : loadLogs(file, limit)"
          >
            {{ loading ? "Loading..." : "Refresh" }}
          </button>
        </div>
      </div>
    </header>

    <section class="border-b border-slate-800 bg-slate-900/60">
      <div class="mx-auto max-w-6xl px-4 py-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs">
        <div class="flex items-center gap-2 flex-1">
          <input
            v-model="search"
            class="w-full bg-slate-950/70 border border-slate-700 rounded px-2 py-1 text-[11px] placeholder:text-slate-500"
            placeholder="Search message, rideId, connectionId, userId, etc."
          />
        </div>

        <div class="flex items-center gap-2">
          <label class="text-slate-400 text-[11px]">
            Date:
            <input v-model="date" type="date" class="ml-1 bg-slate-950/70 border border-slate-700 rounded px-2 py-1 text-[11px]" />
          </label>

          <label class="text-slate-400 text-[11px]">
            Min level:
            <select v-model="minLevel" class="ml-1 bg-slate-950/70 border border-slate-700 rounded px-2 py-1 text-[11px]">
              <option v-for="lvl in MIN_LEVEL_OPTIONS" :key="lvl" :value="lvl">{{ lvl }}</option>
            </select>
          </label>
        </div>
      </div>
    </section>
    <main class="flex-1 mx-auto max-w-6xl w-full px-4 py-4 relative">
      <div v-if="error" class="mb-3 rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">{{ error }}</div>

      <div v-if="!error && !loading && filteredLogs.length === 0" class="mt-10 text-center text-slate-400 text-sm">
        No log events match your filters for today's <b>{{ file }}</b> log.
      </div>

      <div v-if="propertyFilter" class="mb-2 flex items-center gap-2 text-xs">
        <span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2 py-1 text-emerald-200">
          <span class="font-semibold">{{ propertyFilter.key }}</span>
          <span class="text-emerald-300/80">=</span>
          <span class="font-mono">{{ propertyFilter.value }}</span>
        </span>
        <button class="text-slate-400 hover:text-slate-100" @click="propertyFilter = null">Clear filter</button>
      </div>

      <div class="mt-2 space-y-2 max-h-[80vh] overflow-y-auto rounded border border-slate-800 bg-slate-900/70">
        <button
          v-for="(log, idx) in filteredLogs"
          :key="`${log.timestamp}-${idx}`"
          type="button"
          class="w-full text-left border-b border-slate-800/80 last:border-b-0 px-3 py-2 text-xs hover:bg-slate-800/80 transition"
          @click="selected = log"
        >
          <div class="flex items-start gap-2">
            <div class="w-40 text-[11px] text-slate-400 shrink-0">{{ formatTimestamp(log.timestamp) }}</div>
            <div class="flex-1 space-y-1">
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  :class="log.level === 'Error' || log.level === 'Fatal'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : log.level === 'Warning'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-700/70 text-slate-100 border border-slate-600/60'"
                >
                  {{ log.level }}
                </span>

                <span v-if="log.sourceFile" class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] border border-slate-600/60 text-slate-300">
                  {{ log.sourceFile }}
                </span>

                <span class="text-[11px] text-slate-200 line-clamp-1">{{ log.messageTemplate || "(no message template)" }}</span>
              </div>

              <div v-if="Object.keys(log.properties || {}).length > 0" class="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-300">
                <span
                  v-for="entry in Object.entries(log.properties || {}).filter(([k]) => !k.startsWith('@')).slice(0, 6)"
                  :key="entry[0]"
                >
                  <span class="text-slate-500">{{ entry[0] }}</span>
                  <span class="mx-0.5 text-slate-500">=</span>
                  <span class="font-mono">{{ typeof entry[1] === 'string' ? entry[1] : JSON.stringify(entry[1]) }}</span>
                </span>
              </div>
            </div>
          </div>
        </button>

        <div v-if="loading" class="px-3 py-2 text-xs text-slate-400">Loading logs...</div>
      </div>

      <div v-if="selected" class="fixed inset-0 bg-black/60 flex items-start justify-center z-50">
        <div class="mt-16 w-full max-w-3xl max-h-[80vh] bg-slate-950 border border-slate-800 rounded-xl shadow-xl flex flex-col">
          <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div class="text-xs text-slate-400">{{ formatTimestamp(selected.timestamp) }}</div>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  :class="selected.level === 'Error' || selected.level === 'Fatal'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : selected.level === 'Warning'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-700/70 text-slate-100 border border-slate-600/60'"
                >
                  {{ selected.level }}
                </span>

                <span v-if="selected.sourceFile" class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] border border-slate-600/60 text-slate-300">{{ selected.sourceFile }}</span>
                <span class="text-sm text-slate-100">{{ selected.messageTemplate || "(no message template)" }}</span>
              </div>

              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-if="typeof selected.properties?.RequestId === 'string'"
                  type="button"
                  class="inline-flex items-center rounded-full bg-blue-600 hover:bg-blue-500 px-3 py-1 text-[11px] font-semibold text-white"
                  @click="loadCorrelation('RequestId', String(selected.properties.RequestId))"
                >
                  Show full correlation (all files) - RequestId
                </button>

                <button
                  v-if="typeof selected.properties?.SessionId === 'string' || typeof selected.properties?.session_id === 'string'"
                  type="button"
                  class="inline-flex items-center rounded-full bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white"
                  @click="loadCorrelation('SessionId', String(selected.properties.SessionId ?? selected.properties.session_id))"
                >
                  Show full correlation (all files) - SessionId
                </button>
              </div>
            </div>

            <button class="text-slate-400 hover:text-slate-100 text-sm" @click="selected = null">✕</button>
          </div>

          <div class="flex-1 overflow-y-auto px-4 py-3 text-xs space-y-4">
            <div v-if="Object.keys(selected.properties || {}).length > 0">
              <h2 class="text-[11px] font-semibold text-slate-300 mb-2">Properties</h2>
              <div class="space-y-1">
                <div
                  v-for="entry in Object.entries(selected.properties || {})"
                  :key="entry[0]"
                  class="flex gap-2 items-start border-b border-slate-800/60 pb-1 last:border-b-0"
                >
                  <div class="w-32 text-slate-400 break-words">{{ entry[0] }}</div>
                  <div class="flex-1 flex flex-col gap-1">
                    <div class="font-mono text-slate-100 break-all">{{ typeof entry[1] === 'string' ? entry[1] : JSON.stringify(entry[1]) }}</div>
                    <button
                      type="button"
                      class="w-fit inline-flex items-center rounded-full border border-emerald-500/50 px-2 py-0.5 text-emerald-200 hover:bg-emerald-500/10 text-[10px]"
                      @click="() => {
                        propertyFilter = { key: entry[0], value: typeof entry[1] === 'string' ? entry[1] : JSON.stringify(entry[1]) };
                        selected = null;
                      }"
                    >
                      Filter by this
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="selected.exception">
              <h2 class="text-[11px] font-semibold text-red-300 mb-2">Exception</h2>
              <pre class="max-h-64 overflow-y-auto rounded bg-red-950/50 px-2 py-2 text-[11px] text-red-200 border border-red-500/40 whitespace-pre-wrap">{{ selected.exception }}</pre>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
