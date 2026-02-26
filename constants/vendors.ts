export type VendorLink = {
  name: string;
  url: string;
  note?: string;
};

export const VENDORS: VendorLink[] = [
  {
    name: "Supabase",
    url: "https://supabase.com/dashboard/project/mtdlfnfygbhesbctmgub",
    note: "DB + Auth"
  },
  {
    name: "Sentry",
    url: "https://pear-basket.sentry.io/dashboards/",
    note: "Logs for the App (front end MANDO)"
  },
  {
    name: "Geoapify",
    url: "https://myprojects.geoapify.com/api/4MqMmQuoA8TRlmEBAJS8/settings",
    note: "Geo coding, reverse geocoding and routing"
  },
  {
    name: "MapBox",
    url: "https://console.mapbox.com/",
    note: "Maps - Not in use now we are using MapLibre"
  }
];
