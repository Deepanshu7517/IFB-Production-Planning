import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { API_HEALTH_URL, getErrorMessage, readJsonResponse } from "../../config/api";

type HealthResponse = {
  success?: boolean;
  message?: string;
};

type ApiState =
  | { status: "checking" }
  | { status: "online" }
  | { status: "offline"; message: string };

const CHECK_INTERVAL_MS = 30000;

export default function ApiStatusBanner() {
  const [state, setState] = useState<ApiState>({ status: "checking" });

  const checkServer = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(API_HEALTH_URL, { signal: controller.signal });
      const data = await readJsonResponse<HealthResponse>(response);

      if (!response.ok || data.success === false) {
        throw new Error(data.message || `Server responded with ${response.status}`);
      }

      setState({ status: "online" });
    } catch (error) {
      setState({
        status: "offline",
        message: getErrorMessage(error, "Cannot reach backend server on port 5001."),
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    checkServer();
    const intervalId = window.setInterval(checkServer, CHECK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [checkServer]);

  if (state.status === "online") return null;

  const isChecking = state.status === "checking";

  return (
    <div className="fixed left-1/2 top-3 z-[70] w-[min(92vw,680px)] -translate-x-1/2 rounded-lg border border-base-300 bg-base-100 px-4 py-3 text-sm shadow-lg">
      <div className="flex items-center gap-3">
        {isChecking ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {isChecking ? "Checking backend server" : "Backend server is not reachable"}
          </p>
          <p className="truncate text-xs text-base-content/65">
            {isChecking ? API_HEALTH_URL : state.message}
          </p>
        </div>
        {!isChecking && (
          <button type="button" className="btn btn-ghost btn-xs" onClick={checkServer}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        )}
        {isChecking && <CheckCircle2 className="h-4 w-4 text-base-content/25" aria-hidden="true" />}
      </div>
    </div>
  );
}
