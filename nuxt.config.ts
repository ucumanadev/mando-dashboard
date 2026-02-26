export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  modules: ["@nuxtjs/tailwindcss"],
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    motoApiBaseUrl:
      process.env.MOTO_API_BASE_URL ?? process.env.OPS_API_BASE_URL ?? "",
    motoAdminKey: process.env.MOTO_ADMIN_KEY ?? process.env.OPS_ADMIN_KEY ?? "",
    logRoot:
      process.env.LOG_ROOT ??
      "/Users/armandoabon/Library/Application Support/MotoNegocia/logs",
    imgRoot:
      process.env.IMG_ROOT ??
      "/Users/armandoabon/Library/Application Support/MotoNegocia"
  },
  typescript: {
    strict: true,
    typeCheck: false
  }
});
