<script setup lang="ts">
import { WIKI_LINKS } from "~/constants/wiki";

const q = ref("");

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase();
  if (!s) return WIKI_LINKS;
  return WIKI_LINKS.filter((w) => `${w.name} ${w.note ?? ""} ${w.url}`.toLowerCase().includes(s));
});

const openAll = () => {
  for (const link of filtered.value) {
    window.open(link.url, "_blank", "noopener,noreferrer");
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <header class="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div class="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold">Moto Negocia - Wiki</h1>
          <p class="text-xs text-slate-400">Links to notes, diagrams, docs and knowledge bases.</p>
        </div>
        <button
          class="rounded bg-emerald-500 hover:bg-emerald-400 px-3 py-1 text-xs font-medium text-slate-950 disabled:opacity-60"
          :disabled="filtered.length === 0"
          @click="openAll"
        >
          Open all
        </button>
      </div>
    </header>

    <main class="flex-1 mx-auto max-w-6xl w-full px-4 py-4">
      <div class="rounded border border-slate-800 bg-slate-900/70 overflow-hidden">
        <div class="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-3">
          <div class="text-sm font-semibold">Knowledge Links</div>
          <div class="text-[11px] text-slate-400">{{ filtered.length }} items</div>
        </div>

        <div class="px-3 py-3 border-b border-slate-800">
          <div class="text-[11px] text-slate-400 mb-1">Search (name, note, or URL)</div>
          <input
            v-model="q"
            placeholder="e.g. excalidraw, notion, docs..."
            class="w-full rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/60"
          />
        </div>

        <div class="max-h-[78vh] overflow-y-auto">
          <a
            v-for="w in filtered"
            :key="w.name"
            :href="w.url"
            target="_blank"
            rel="noopener noreferrer"
            class="block px-3 py-2 border-b border-slate-800/80 hover:bg-slate-800/60"
          >
            <div class="text-[14px] text-slate-100">
              <span class="font-semibold">{{ w.name }}</span>
              <span class="text-slate-500"> ↗</span>
            </div>
            <div v-if="w.note" class="text-[11px] text-slate-400 mt-0.5">{{ w.note }}</div>
            <div class="text-[11px] text-slate-500 mt-1 break-all">{{ w.url }}</div>
          </a>

          <div v-if="filtered.length === 0" class="px-3 py-6 text-xs text-slate-400">No links match your search.</div>
        </div>
      </div>
    </main>
  </div>
</template>
