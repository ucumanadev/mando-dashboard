<script setup lang="ts">
type SearchItem = {
  id: string;
  fullName?: string | null;
  phone?: string | null;
  role?: string | null;
};

type VehicleDto = {
  id: string;
  plateNumber?: string | null;
  vehiclePhotoUrl?: string | null;
};

type DriverDocDto = {
  id: string;
  documentType?: string | null;
  url: string;
  uploadedAt?: string | null;
  status?: string | null;
};

type DriverDocsResponse = {
  user: {
    id: string;
    fullName?: string | null;
    phone?: string | null;
    profilePhotoUrl?: string | null;
  };
  vehicles: VehicleDto[];
  documents: DriverDocDto[];
};

const q = ref("");
const searchLoading = ref(false);
const searchErr = ref<string | null>(null);
const results = ref<SearchItem[]>([]);

const selected = ref<SearchItem | null>(null);
const docsLoading = ref(false);
const docsErr = ref<string | null>(null);
const docs = ref<DriverDocsResponse | null>(null);
const docStatusDraft = ref<Record<string, string>>({});
const statusSavingId = ref<string | null>(null);
const docStatusErr = ref<Record<string, string>>({});

const STATUS_OPTIONS = ["pending", "approved", "rejected", "resend"] as const;

function normalizeStatus(raw?: string | null) {
  const value = (raw ?? "").trim().toLowerCase();
  return STATUS_OPTIONS.includes(value as (typeof STATUS_OPTIONS)[number]) ? value : "pending";
}

const canSearch = computed(() => q.value.trim().length >= 2);

function normalizeSecurePath(raw?: string | null) {
  if (!raw) return null;
  const fixed = raw.startsWith("/") ? raw : `/${raw}`;
  return fixed.replace(/^\/secure\//i, "/SecureFiles/");
}

function extOf(pathValue: string) {
  const clean = pathValue.split("?")[0].split("#")[0];
  const dot = clean.lastIndexOf(".");
  if (dot < 0) return "";
  return clean.slice(dot + 1).toLowerCase();
}

function isImageExt(ext: string) {
  return ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
}

function fileSrc(rawPath?: string | null) {
  const fixed = normalizeSecurePath(rawPath);
  return fixed ? `/api/files?path=${encodeURIComponent(fixed)}` : null;
}

const doSearch = async () => {
  if (!canSearch.value || searchLoading.value) return;

  try {
    searchLoading.value = true;
    searchErr.value = null;
    selected.value = null;
    docs.value = null;
    docsErr.value = null;

    const res = await fetch(`/api/drivers/search?q=${encodeURIComponent(q.value.trim())}`, {
      cache: "no-store"
    });

    const text = await res.text();
    const data = text.trim() ? JSON.parse(text) : {};

    if (!res.ok) {
      searchErr.value = data?.error || data?.detail || "Search failed";
      results.value = [];
      return;
    }

    results.value = Array.isArray(data?.items) ? data.items : [];
  } catch (err: unknown) {
    searchErr.value = (err as Error).message || "Search failed";
    results.value = [];
  } finally {
    searchLoading.value = false;
  }
};

const loadDocs = async (item: SearchItem) => {
  try {
    selected.value = item;
    docs.value = null;
    docsErr.value = null;
    docStatusDraft.value = {};
    docStatusErr.value = {};
    docsLoading.value = true;

    const res = await fetch(`/api/drivers/${item.id}/documents`, { cache: "no-store" });
    const text = await res.text();
    const data = text.trim() ? JSON.parse(text) : {};

    if (!res.ok) {
      docsErr.value = data?.error || data?.detail || "Failed to load documents";
      return;
    }

    docs.value = data as DriverDocsResponse;
    const nextDraft: Record<string, string> = {};
    for (const d of docs.value.documents ?? []) {
      nextDraft[d.id] = normalizeStatus(d.status);
    }
    docStatusDraft.value = nextDraft;
  } catch (err: unknown) {
    docsErr.value = (err as Error).message || "Failed to load documents";
  } finally {
    docsLoading.value = false;
  }
};

const updateDocumentStatus = async (doc: DriverDocDto) => {
  if (!selected.value || statusSavingId.value) return;

  const status = normalizeStatus(docStatusDraft.value[doc.id]);
  try {
    statusSavingId.value = doc.id;
    docStatusErr.value[doc.id] = "";

    const res = await fetch(
      `/api/drivers/${encodeURIComponent(selected.value.id)}/documents/${encodeURIComponent(doc.id)}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      }
    );

    const text = await res.text();
    const data = text.trim() ? JSON.parse(text) : {};
    if (!res.ok) {
      docStatusErr.value[doc.id] = data?.detail || data?.error || "Failed to update status";
      return;
    }

    docStatusDraft.value[doc.id] = status;
    if (docs.value?.documents) {
      const found = docs.value.documents.find((d) => d.id === doc.id);
      if (found) found.status = status;
    }
  } catch (err: unknown) {
    docStatusErr.value[doc.id] = (err as Error).message || "Failed to update status";
  } finally {
    statusSavingId.value = null;
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <header class="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div class="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-lg font-semibold">Moto Negocia - Documents</h1>
          <p class="text-xs text-slate-400">Search drivers by name or phone, then review selfies, vehicle pics, and documents.</p>
        </div>

        <button
          class="rounded bg-emerald-500 hover:bg-emerald-400 px-3 py-1 text-xs font-medium text-slate-950 disabled:opacity-50"
          :disabled="!canSearch || searchLoading"
          @click="doSearch"
        >
          {{ searchLoading ? "Searching..." : "Search" }}
        </button>
      </div>
    </header>

    <main class="flex-1 mx-auto max-w-6xl w-full px-4 py-4">
      <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <div class="text-[11px] text-slate-400 mb-2">Enter a <b>name</b> (can match multiple) or <b>phone</b> (unique).</div>
        <div class="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            v-model="q"
            class="flex-1 bg-slate-950/70 border border-slate-700 rounded px-3 py-2 text-[12px] placeholder:text-slate-500"
            placeholder="e.g. Juan Perez or 999888777"
            @keydown.enter="doSearch"
          />
          <button
            class="rounded bg-emerald-500 hover:bg-emerald-400 px-3 py-2 text-[12px] font-semibold text-slate-950 disabled:opacity-50"
            :disabled="!canSearch || searchLoading"
            @click="doSearch"
          >
            {{ searchLoading ? "Searching..." : "Search" }}
          </button>
        </div>

        <div v-if="searchErr" class="mt-3 rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">{{ searchErr }}</div>
      </div>

      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
          <div class="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
            <div class="text-sm font-semibold">Matches</div>
            <div class="text-[11px] text-slate-400">{{ results.length }} items</div>
          </div>

          <div class="max-h-[70vh] overflow-y-auto">
            <button
              v-for="r in results"
              :key="r.id"
              type="button"
              class="w-full text-left px-3 py-2 border-b border-slate-800/80 hover:bg-slate-800/60 transition"
              :class="selected?.id === r.id ? 'bg-slate-800/60' : ''"
              @click="loadDocs(r)"
            >
              <div class="text-[12px] text-slate-100">
                <span class="font-semibold">{{ r.fullName ?? "(no name)" }}</span>
                <span class="text-slate-400"> • </span>
                <span class="font-mono text-slate-300">{{ r.phone ?? "-" }}</span>
                <template v-if="r.role">
                  <span class="text-slate-400"> • </span>
                  <span class="text-slate-300">{{ r.role }}</span>
                </template>
              </div>
              <div class="mt-0.5 text-[10px] text-slate-500 font-mono break-all">{{ r.id }}</div>
            </button>

            <div v-if="!searchLoading && results.length === 0" class="px-3 py-6 text-xs text-slate-400">No results yet. Search by name or phone.</div>
          </div>
        </div>

        <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold">Driver Files</div>
            <div v-if="docsLoading" class="text-[11px] text-slate-400">Loading...</div>
          </div>

          <div v-if="docsErr" class="mt-3 rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">{{ docsErr }}</div>

          <div v-if="!docs && !docsLoading" class="mt-3 text-[12px] text-slate-400">Select a person on the left to load selfies / vehicle / documents.</div>

          <div v-if="docs" class="mt-3 space-y-4">
            <div class="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div class="text-[11px] text-slate-400">User</div>
              <div class="mt-1 text-[13px] font-semibold">{{ docs.user.fullName ?? "(no name)" }}</div>
              <div class="mt-1 text-[11px] text-slate-300 font-mono">{{ docs.user.phone ?? "-" }}</div>
              <div class="mt-1 text-[10px] text-slate-500 font-mono break-all">{{ docs.user.id }}</div>
            </div>

            <div class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div class="text-[11px] text-slate-400">Selfie (Users.ProfilePhotoUrl)</div>
              <template v-if="fileSrc(docs.user.profilePhotoUrl) && docs.user.profilePhotoUrl">
                <div class="mt-1 font-mono text-[10px] text-slate-300 break-all">{{ normalizeSecurePath(docs.user.profilePhotoUrl) }}</div>
                <div class="mt-3">
                  <img
                    v-if="isImageExt(extOf(normalizeSecurePath(docs.user.profilePhotoUrl) || ''))"
                    :src="fileSrc(docs.user.profilePhotoUrl) || ''"
                    alt="Selfie"
                    class="w-full max-h-[320px] object-contain rounded-lg border border-slate-800 bg-black/20"
                    loading="lazy"
                  />
                  <a v-else class="text-xs text-emerald-300 underline" :href="fileSrc(docs.user.profilePhotoUrl) || ''" target="_blank" rel="noreferrer">Open file</a>
                </div>
              </template>
              <div v-else class="mt-1 text-[12px] text-slate-500">No file</div>
            </div>

            <div class="space-y-3">
              <div class="text-[12px] font-semibold text-slate-200">Vehicles ({{ docs.vehicles?.length ?? 0 }})</div>

              <div v-if="(docs.vehicles ?? []).length === 0" class="text-[12px] text-slate-400">No vehicles found.</div>

              <div v-for="v in docs.vehicles ?? []" :key="v.id" class="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                <div class="text-[12px] text-slate-200">
                  <span class="font-semibold">{{ v.plateNumber ?? "Vehicle" }}</span>
                  <span class="text-slate-400"> • </span>
                  <span class="font-mono text-[10px] text-slate-500">{{ v.id }}</span>
                </div>

                <div class="mt-3 grid grid-cols-1 gap-3">
                  <div v-if="!v.vehiclePhotoUrl" class="text-[12px] text-slate-400">No vehicle photo.</div>

                  <div v-else class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <div class="text-[11px] text-slate-400">Vehicle photo</div>
                    <div class="mt-1 font-mono text-[10px] text-slate-300 break-all">{{ normalizeSecurePath(v.vehiclePhotoUrl) }}</div>
                    <div class="mt-3">
                      <img
                        v-if="isImageExt(extOf(normalizeSecurePath(v.vehiclePhotoUrl) || ''))"
                        :src="fileSrc(v.vehiclePhotoUrl) || ''"
                        alt="Vehicle"
                        class="w-full max-h-[320px] object-contain rounded-lg border border-slate-800 bg-black/20"
                        loading="lazy"
                      />
                      <a v-else class="text-xs text-emerald-300 underline" :href="fileSrc(v.vehiclePhotoUrl) || ''" target="_blank" rel="noreferrer">Open file</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <div class="text-[12px] font-semibold text-slate-200">DriverDocuments ({{ docs.documents?.length ?? 0 }})</div>

              <div v-if="(docs.documents ?? []).length === 0" class="text-[12px] text-slate-400">No driver documents found.</div>

              <div class="grid grid-cols-1 gap-3">
                <div v-for="d in docs.documents ?? []" :key="d.id" class="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div class="text-[11px] text-slate-400">
                      Doc: {{ d.documentType ?? "document" }}
                      {{ d.uploadedAt ? ` - ${new Date(d.uploadedAt).toLocaleString()}` : "" }}
                    </div>
                    <div class="flex items-center gap-2">
                      <select
                        v-model="docStatusDraft[d.id]"
                        class="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[12px] text-slate-100"
                      >
                        <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
                      </select>
                      <button
                        type="button"
                        class="rounded bg-emerald-500 hover:bg-emerald-400 px-2 py-1 text-[11px] font-semibold text-slate-950 disabled:opacity-50"
                        :disabled="statusSavingId === d.id"
                        @click="updateDocumentStatus(d)"
                      >
                        {{ statusSavingId === d.id ? "Saving..." : "Save" }}
                      </button>
                    </div>
                  </div>
                  <div class="mt-1 font-mono text-[10px] text-slate-300 break-all">{{ normalizeSecurePath(d.url) }}</div>
                  <div class="mt-1 text-[11px] text-slate-300">
                    Current status: <span class="font-semibold">{{ normalizeStatus(d.status) }}</span>
                  </div>
                  <div v-if="docStatusErr[d.id]" class="mt-2 rounded border border-red-500/60 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
                    {{ docStatusErr[d.id] }}
                  </div>
                  <div class="mt-3">
                    <img
                      v-if="isImageExt(extOf(normalizeSecurePath(d.url) || ''))"
                      :src="fileSrc(d.url) || ''"
                      alt="Document"
                      class="w-full max-h-[320px] object-contain rounded-lg border border-slate-800 bg-black/20"
                      loading="lazy"
                    />
                    <a v-else class="text-xs text-emerald-300 underline" :href="fileSrc(d.url) || ''" target="_blank" rel="noreferrer">Open file</a>
                  </div>
                </div>
              </div>
            </div>

            <div class="text-[11px] text-slate-500">
              Note: file paths are normalized by replacing <span class="font-mono">/secure/</span> with <span class="font-mono">/SecureFiles/</span>.
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
