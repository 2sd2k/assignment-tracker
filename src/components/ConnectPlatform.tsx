import { useState } from "react";
import { useAssignmentStore } from "@/stores/assignmentStore";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { X, Globe } from "lucide-react";

interface Props {
  onClose: () => void;
}

interface PlatformSyncedPayload {
  platform_id: number;
  platform: string;
  data: string;
}

const inputCls =
  "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";

export default function ConnectPlatform({ onClose }: Props) {
  const { connectPlatform, processScrapedData } = useAssignmentStore();
  const [step, setStep] = useState<"choose" | "canvas-url" | "waiting">("choose");
  const [canvasUrl, setCanvasUrl] = useState("");
  const [platformType, setPlatformType] = useState<"canvas" | "gradescope">("canvas");
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleCanvasConnect = async () => {
    if (!canvasUrl.trim()) return;
    setIsConnecting(true);
    setError(null);

    try {
      let baseUrl = canvasUrl.trim();
      if (!baseUrl.startsWith("http")) baseUrl = "https://" + baseUrl;
      baseUrl = baseUrl.replace(/\/+$/, "");

      const platformId = await connectPlatform("canvas", baseUrl, baseUrl);
      const label = `canvas-login-${platformId}`;

      let checkInterval: ReturnType<typeof setInterval> | undefined;
      let unlisten: (() => void) | undefined;
      unlisten = await listen<PlatformSyncedPayload>(
        "platform-synced",
        async (event) => {
          if (checkInterval !== undefined) clearInterval(checkInterval);
          unlisten?.();
          try {
            await processScrapedData(
              event.payload.platform_id,
              event.payload.platform,
              event.payload.data
            );
          } catch {
            // sync error is captured in store's syncError
          }
          setIsConnecting(false);
          onClose();
        }
      );

      await invoke("open_login_window", {
        url: `${baseUrl}/login`,
        label,
        platform: "canvas",
        platformId,
        baseUrl,
      });

      setPlatformType("canvas");
      setStep("waiting");

      checkInterval = setInterval(async () => {
        try {
          const { getAllWebviewWindows } = await import("@tauri-apps/api/webviewWindow");
          const allWindows = await getAllWebviewWindows();
          const loginWindow = allWindows.find((w) => w.label === label);
          if (!loginWindow) {
            clearInterval(checkInterval);
            unlisten?.();
            setIsConnecting(false);
            onClose();
          }
        } catch {
          // continue waiting
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open login window");
      setIsConnecting(false);
    }
  };

  const handleGradescopeConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const platformId = await connectPlatform(
        "gradescope",
        "Gradescope",
        "https://www.gradescope.com"
      );
      const label = `gradescope-login-${platformId}`;

      let checkInterval: ReturnType<typeof setInterval> | undefined;
      let unlisten: (() => void) | undefined;
      unlisten = await listen<PlatformSyncedPayload>(
        "platform-synced",
        async (event) => {
          if (checkInterval !== undefined) clearInterval(checkInterval);
          unlisten?.();
          try {
            await processScrapedData(
              event.payload.platform_id,
              event.payload.platform,
              event.payload.data
            );
          } catch {
            // sync error is captured in store's syncError
          }
          setIsConnecting(false);
          onClose();
        }
      );

      await invoke("open_login_window", {
        url: "https://www.gradescope.com/login",
        label,
        platform: "gradescope",
        platformId,
        baseUrl: "https://www.gradescope.com",
      });

      setPlatformType("gradescope");
      setStep("waiting");

      checkInterval = setInterval(async () => {
        try {
          const { getAllWebviewWindows } = await import("@tauri-apps/api/webviewWindow");
          const allWindows = await getAllWebviewWindows();
          const loginWindow = allWindows.find((w) => w.label === label);
          if (!loginWindow) {
            clearInterval(checkInterval);
            unlisten?.();
            setIsConnecting(false);
            onClose();
          }
        } catch {
          // continue waiting
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open login window");
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Connect Platform
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            disabled={isConnecting}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {step === "choose" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-4">
              Choose a platform to connect. You'll log in through an embedded browser window.
            </p>
            <button
              onClick={() => setStep("canvas-url")}
              className="w-full flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-left cursor-pointer"
            >
              <div className="w-9 h-9 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-200">
                  Canvas LMS
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Sync assignments via Canvas API
                </div>
              </div>
            </button>
            <button
              onClick={handleGradescopeConnect}
              className="w-full flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-left cursor-pointer"
            >
              <div className="w-9 h-9 bg-teal-50 dark:bg-teal-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-teal-500 dark:text-teal-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-200">
                  Gradescope
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Scrape assignments from dashboard
                </div>
              </div>
            </button>
          </div>
        )}

        {step === "canvas-url" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Enter your university's Canvas URL, then log in through the browser window.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Canvas URL
              </label>
              <input
                type="text"
                value={canvasUrl}
                onChange={(e) => setCanvasUrl(e.target.value)}
                placeholder="e.g. canvas.university.edu"
                className={inputCls}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("choose")}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleCanvasConnect}
                disabled={!canvasUrl.trim() || isConnecting}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-40 transition-colors cursor-pointer"
              >
                {isConnecting ? "Opening…" : "Connect"}
              </button>
            </div>
          </div>
        )}

        {step === "waiting" && (
          <div className="text-center py-8">
            <div className="animate-spin w-7 h-7 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full mx-auto mb-4" />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Log in to {platformType === "canvas" ? "Canvas" : "Gradescope"} in the browser window
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-2">
              Assignments will sync automatically after login
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
