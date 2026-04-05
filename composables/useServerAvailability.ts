export type ServerAvailabilityReason = "offline" | "server_unreachable" | "server_error";

export function useServerAvailability() {
  const reason = useState<ServerAvailabilityReason | null>("server-availability-reason", () => null);

  function markUnavailable(next: ServerAvailabilityReason) {
    reason.value = next;
  }

  function clearUnavailable() {
    reason.value = null;
  }

  function mapMessage(value: ServerAvailabilityReason | null) {
    if (value === "offline") return "No internet connection. Please reconnect and try again.";
    if (value === "server_unreachable") return "Server is unreachable right now. Please try again shortly.";
    if (value === "server_error") return "Server is not available right now.";
    return "";
  }

  async function checkNow() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch("/api/public/health", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal
      });

      if (!res.ok) {
        markUnavailable("server_error");
        return false;
      }

      const data = await res.json();
      if (data?.ok === true) {
        clearUnavailable();
        return true;
      }

      markUnavailable("server_error");
      return false;
    } catch (err: any) {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        markUnavailable("offline");
      } else if (err?.name === "AbortError") {
        markUnavailable("server_unreachable");
      } else {
        markUnavailable("server_unreachable");
      }
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    reason,
    message: computed(() => mapMessage(reason.value)),
    markUnavailable,
    clearUnavailable,
    checkNow
  };
}
