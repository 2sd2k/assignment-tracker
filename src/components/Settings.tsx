import { useState } from "react";
import { useAssignmentStore } from "@/stores/assignmentStore";
import ConnectPlatform from "./ConnectPlatform";
import {
  Globe,
  Trash2,
  Bell,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";

export default function Settings() {
  const {
    platforms,
    notificationSettings,
    removePlatform,
    syncCanvas,
    syncGradescope,
    toggleNotification,
    addNotification,
    removeNotification,
    isSyncing,
    syncError,
  } = useAssignmentStore();

  const [showConnect, setShowConnect] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState("");
  const [customUnit, setCustomUnit] = useState<"hours" | "days">("hours");

  const handleAddNotification = async () => {
    const n = parseInt(customValue, 10);
    if (!n || n <= 0) return;
    const hours = customUnit === "days" ? n * 24 : n;
    await addNotification(hours);
    setCustomValue("");
  };

  const handleSync = async (platform: (typeof platforms)[0]) => {
    try {
      if (platform.type === "canvas") {
        await syncCanvas(platform.id);
      } else if (platform.type === "gradescope") {
        await syncGradescope(platform.id);
      }
    } catch {
      // Error handled in store
    }
  };

  const handleDelete = async (id: number) => {
    await removePlatform(id);
    setConfirmDelete(null);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
          Settings
        </h2>

        {/* Connected Platforms */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Connected Platforms
            </h3>
            <button
              onClick={() => setShowConnect(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Connect
            </button>
          </div>

          {syncError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {syncError === "SESSION_EXPIRED"
                ? "Session expired. Please reconnect."
                : syncError}
            </div>
          )}

          {platforms.filter((p) => p.type !== "manual").length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
              <Globe className="w-7 h-7 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p className="text-sm text-slate-500">No platforms connected</p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">
                Connect Canvas or Gradescope to sync assignments
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {platforms
                .filter((p) => p.type !== "manual")
                .map((platform) => (
                  <div
                    key={platform.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          platform.type === "canvas"
                            ? "bg-red-50 dark:bg-red-500/10"
                            : "bg-teal-50 dark:bg-teal-500/10"
                        }`}
                      >
                        <Globe
                          className={`w-5 h-5 ${
                            platform.type === "canvas"
                              ? "text-red-500 dark:text-red-400"
                              : "text-teal-500 dark:text-teal-400"
                          }`}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-200">
                          {platform.type === "canvas" ? "Canvas" : "Gradescope"}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {platform.base_url || "gradescope.com"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {platform.session_cookies ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                      )}
                      <button
                        onClick={() => handleSync(platform)}
                        disabled={isSyncing || !platform.session_cookies}
                        className="p-1.5 rounded text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Sync now"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
                        />
                      </button>
                      {confirmDelete === platform.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(platform.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-500 cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(platform.id)}
                          className="p-1.5 rounded text-slate-300 dark:text-slate-600 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                          title="Disconnect"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* Notifications */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" />
            Notifications
          </h3>
          <div className="space-y-2">
            {notificationSettings.map((setting) => (
              <div
                key={setting.id}
                className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl group"
              >
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {setting.hours_before >= 24
                    ? `${setting.hours_before / 24} day${setting.hours_before / 24 > 1 ? "s" : ""}`
                    : `${setting.hours_before} hour${setting.hours_before > 1 ? "s" : ""}`}{" "}
                  before deadline
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleNotification(setting.id)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                      setting.enabled
                        ? "bg-indigo-600"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        setting.enabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => removeNotification(setting.id)}
                    className="p-1 rounded text-slate-300 dark:text-slate-700 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add custom notification */}
            <div className="flex items-center gap-2 p-3.5 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <input
                type="number"
                min="1"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNotification()}
                placeholder="e.g. 2"
                className="w-20 px-2.5 py-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                <button
                  onClick={() => setCustomUnit("hours")}
                  className={`px-2.5 py-1 transition-colors cursor-pointer ${
                    customUnit === "hours"
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  hours
                </button>
                <button
                  onClick={() => setCustomUnit("days")}
                  className={`px-2.5 py-1 transition-colors cursor-pointer ${
                    customUnit === "days"
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  days
                </button>
              </div>
              <span className="text-sm text-slate-400 dark:text-slate-600 flex-1">
                before deadline
              </span>
              <button
                onClick={handleAddNotification}
                disabled={!customValue || parseInt(customValue) <= 0}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-600 mt-3">
            Receive desktop notifications before assignment deadlines
          </p>
        </section>

        {showConnect && (
          <ConnectPlatform onClose={() => setShowConnect(false)} />
        )}
      </div>
    </div>
  );
}
