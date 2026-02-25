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
} from "lucide-react";

export default function Settings() {
  const {
    platforms,
    notificationSettings,
    removePlatform,
    syncCanvas,
    syncGradescope,
    toggleNotification,
    isSyncing,
    syncError,
  } = useAssignmentStore();

  const [showConnect, setShowConnect] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

        {/* Connected Platforms */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Connected Platforms
            </h3>
            <button
              onClick={() => setShowConnect(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Connect
            </button>
          </div>

          {syncError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {syncError === "SESSION_EXPIRED"
                ? "Session expired. Please reconnect."
                : syncError}
            </div>
          )}

          {platforms.filter((p) => p.type !== "manual").length === 0 ? (
            <div className="p-6 border-2 border-dashed border-gray-200 rounded-lg text-center text-gray-400">
              <Globe className="w-8 h-8 mx-auto mb-2" />
              <p>No platforms connected</p>
              <p className="text-sm mt-1">
                Connect Canvas or Gradescope to sync assignments
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {platforms
                .filter((p) => p.type !== "manual")
                .map((platform) => (
                  <div
                    key={platform.id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          platform.type === "canvas"
                            ? "bg-red-100"
                            : "bg-teal-100"
                        }`}
                      >
                        <Globe
                          className={`w-5 h-5 ${
                            platform.type === "canvas"
                              ? "text-red-600"
                              : "text-teal-600"
                          }`}
                        />
                      </div>
                      <div>
                        <div className="font-medium">
                          {platform.type === "canvas"
                            ? "Canvas"
                            : "Gradescope"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {platform.base_url || "gradescope.com"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {platform.session_cookies ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <button
                        onClick={() => handleSync(platform)}
                        disabled={isSyncing || !platform.session_cookies}
                        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
                        title="Sync now"
                      >
                        <RefreshCw
                          className={`w-4 h-4 text-gray-600 ${isSyncing ? "animate-spin" : ""}`}
                        />
                      </button>
                      {confirmDelete === platform.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(platform.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 bg-gray-200 text-xs rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(platform.id)}
                          className="p-2 rounded hover:bg-red-50 transition-colors"
                          title="Disconnect"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* Notification Settings */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            <Bell className="w-5 h-5 inline mr-2" />
            Notification Reminders
          </h3>
          <div className="space-y-2">
            {notificationSettings.map((setting) => (
              <div
                key={setting.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
              >
                <span className="text-sm text-gray-700">
                  {setting.hours_before >= 24
                    ? `${setting.hours_before / 24} day${setting.hours_before / 24 > 1 ? "s" : ""}`
                    : `${setting.hours_before} hour${setting.hours_before > 1 ? "s" : ""}`}{" "}
                  before deadline
                </span>
                <button
                  onClick={() => toggleNotification(setting.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    setting.enabled ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      setting.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
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
