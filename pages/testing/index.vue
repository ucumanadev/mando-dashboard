<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <header class="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div class="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 class="text-lg font-semibold">Moto Negocia - Testing</h1>
          <p class="text-xs text-slate-400">
            Escenarios manuales para poblar y validar flujos de prueba.
          </p>
        </div>
        <NuxtLink
          to="/"
          class="rounded border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs font-medium hover:bg-slate-700/70"
        >
          Volver
        </NuxtLink>
      </div>
    </header>

    <main class="flex-1 mx-auto max-w-6xl w-full px-4 py-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NuxtLink
          to="/testing/ride-requests"
          class="rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800/70 transition shadow-lg px-6 py-6"
        >
          <div class="flex items-start gap-4">
            <div class="text-3xl">🛵</div>
            <div class="flex-1">
              <div class="text-lg font-semibold text-slate-100">Ride Requests</div>
              <div class="mt-1 text-sm text-slate-400">
                Crear solicitudes de viaje de prueba para validar la lista del driver.
              </div>
            </div>
            <div class="text-slate-500">→</div>
          </div>
        </NuxtLink>
      </div>
    </main>
  </div>
</template>
