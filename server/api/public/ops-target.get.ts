import { getOpsEnv } from "~~/server/utils/opsEnv";

export default defineEventHandler((event) => {
  const { baseUrl } = getOpsEnv(event);
  return {
    baseUrl
  };
});
