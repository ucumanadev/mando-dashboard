<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
    <div class="w-full max-w-5xl">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold">Moto Negocia - Admin</h1>
        <p class="mt-2 text-sm text-slate-400">
          Operaciones: logs, recargas y revision de documentos
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="flex flex-col items-center gap-4">
          <NuxtLink to="/logs" class="w-full rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800/70 transition shadow-lg px-6 py-6">
            <div class="flex items-start gap-4">
              <div class="text-3xl">🧾</div>
              <div class="flex-1">
                <div class="text-lg font-semibold text-slate-100">Logs</div>
                <div class="mt-1 text-sm text-slate-400">Ver errores, SignalR, auditoria y correlacion por RequestId</div>
              </div>
              <div class="text-slate-500">→</div>
            </div>
          </NuxtLink>

          <NuxtLink to="/topups" class="w-full rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800/70 transition shadow-lg px-6 py-6">
            <div class="flex items-start gap-4">
              <div class="text-3xl">💳</div>
              <div class="flex-1">
                <div class="text-lg font-semibold text-slate-100">TopUps</div>
                <div class="mt-1 text-sm text-slate-400">Aprobar o rechazar recargas (Yape/Plin + WhatsApp)</div>
              </div>
              <div class="text-slate-500">→</div>
            </div>
          </NuxtLink>

          <NuxtLink to="/documents" class="w-full rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800/70 transition shadow-lg px-6 py-6">
            <div class="flex items-start gap-4">
              <div class="text-3xl">🪪</div>
              <div class="flex-1">
                <div class="text-lg font-semibold text-slate-100">Fotos / Documentos</div>
                <div class="mt-1 text-sm text-slate-400">Ver licencias, SOAT, tarjeta, etc. por conductor</div>
              </div>
              <div class="text-slate-500">→</div>
            </div>
          </NuxtLink>
        </div>

        <div class="flex flex-col items-center gap-4">
          <NuxtLink to="/vendors" class="w-full rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800/70 transition shadow-lg px-6 py-6">
            <div class="flex items-start gap-4">
              <div class="text-3xl">🔗</div>
              <div class="flex-1">
                <div class="text-lg font-semibold text-slate-100">Vendors</div>
                <div class="mt-1 text-sm text-slate-400">Abrir dashboards y vigilar costos</div>
              </div>
              <div class="text-slate-500">→</div>
            </div>
          </NuxtLink>

          <NuxtLink to="/wiki" class="w-full rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800/70 transition shadow-lg px-6 py-6">
            <div class="flex items-start gap-4">
              <div class="text-3xl">📚</div>
              <div class="flex-1">
                <div class="text-lg font-semibold text-slate-100">Wiki</div>
                <div class="mt-1 text-sm text-slate-400">Links a notas, Excalidraw, docs y knowledge bases</div>
              </div>
              <div class="text-slate-500">→</div>
            </div>
          </NuxtLink>

          <NuxtLink to="/testing" class="w-full rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800/70 transition shadow-lg px-6 py-6">
            <div class="flex items-start gap-4">
              <div class="text-3xl">🧪</div>
              <div class="flex-1">
                <div class="text-lg font-semibold text-slate-100">Testing</div>
                <div class="mt-1 text-sm text-slate-400">Herramientas para generar y validar escenarios de prueba</div>
              </div>
              <div class="text-slate-500">→</div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
