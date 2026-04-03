export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  modules: ["@nuxtjs/tailwindcss"],
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    motoApiBaseUrl:
      process.env.MOTO_API_BASE_URL ?? process.env.OPS_API_BASE_URL ?? "",
    logRoot:
      process.env.LOG_ROOT ??
      "/Users/armandoabon/Library/Application Support/MotoNegocia/logs",
    imgRoot:
      process.env.IMG_ROOT ??
      "/Users/armandoabon/Library/Application Support/MotoNegocia",
    public: {
      supabaseUrl: process.env.SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? ""
    }
  },
  typescript: {
    strict: true,
    typeCheck: false
  }
});
