import { useEffect, useRef } from "react";
import { useAssignmentStore } from "@/stores/assignmentStore";

const SYNC_INTERVAL_MS = 15 * 60 * 1000; // Auto-sync every 15 minutes

export function useDatabase() {
  const loadAll = useAssignmentStore((s) => s.loadAll);
  const syncAll = useAssignmentStore((s) => s.syncAll);
  const platforms = useAssignmentStore((s) => s.platforms);
  const isLoading = useAssignmentStore((s) => s.isLoading);
  const hasAutoSynced = useRef(false);

  // Initial DB load
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Auto-sync connected platforms on launch + periodic interval
  useEffect(() => {
    if (isLoading) return;

    const hasConnected = platforms.some(
      (p) => p.type !== "manual" && p.session_cookies
    );
    if (!hasConnected) return;

    // Sync once on launch
    if (!hasAutoSynced.current) {
      hasAutoSynced.current = true;
      syncAll().catch(() => {});
    }

    // Periodic sync
    const interval = setInterval(() => {
      syncAll().catch(() => {});
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isLoading, platforms, syncAll]);
}
