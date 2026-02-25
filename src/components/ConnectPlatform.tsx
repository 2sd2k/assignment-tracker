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

      // Register listener BEFORE opening the window so no event is missed
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

      // Fallback: detect manual window close (user cancelled without logging in)
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Connect Platform</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
            disabled={isConnecting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {step === "choose" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Choose a platform to connect. You'll log in through an embedded browser window.
            </p>
            <button
              onClick={() => setStep("canvas-url")}
              className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="font-medium">Canvas LMS</div>
                <div className="text-sm text-gray-500">
                  Sync assignments via Canvas API
                </div>
              </div>
            </button>
            <button
              onClick={handleGradescopeConnect}
              className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <div className="font-medium">Gradescope</div>
                <div className="text-sm text-gray-500">
                  Scrape assignments from dashboard
                </div>
              </div>
            </button>
          </div>
        )}

        {step === "canvas-url" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your university's Canvas URL, then log in through the browser window.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Canvas URL
              </label>
              <input
                type="text"
                value={canvasUrl}
                onChange={(e) => setCanvasUrl(e.target.value)}
                placeholder="e.g. canvas.university.edu"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep("choose")}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleCanvasConnect}
                disabled={!canvasUrl.trim() || isConnecting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isConnecting ? "Opening..." : "Connect"}
              </button>
            </div>
          </div>
        )}

        {step === "waiting" && (
          <div className="text-center py-6">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto mb-4" />
            <p className="text-gray-600">
              Log in to {platformType === "canvas" ? "Canvas" : "Gradescope"} in the browser window.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Your assignments will sync automatically after you log in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
