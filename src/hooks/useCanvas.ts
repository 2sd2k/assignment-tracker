import { useCallback } from "react";
import { useAssignmentStore } from "@/stores/assignmentStore";

export function useCanvas() {
  const syncCanvas = useAssignmentStore((s) => s.syncCanvas);
  const platforms = useAssignmentStore((s) => s.platforms);

  const syncAllCanvas = useCallback(async () => {
    const canvasPlatforms = platforms.filter(
      (p) => p.type === "canvas" && p.session_cookies
    );
    for (const p of canvasPlatforms) {
      await syncCanvas(p.id);
    }
  }, [platforms, syncCanvas]);

  return { syncAllCanvas };
}
