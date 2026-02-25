import { useCallback } from "react";
import { useAssignmentStore } from "@/stores/assignmentStore";

export function useGradescope() {
  const syncGradescope = useAssignmentStore((s) => s.syncGradescope);
  const platforms = useAssignmentStore((s) => s.platforms);

  const syncAllGradescope = useCallback(async () => {
    const gradescopePlatforms = platforms.filter(
      (p) => p.type === "gradescope" && p.session_cookies
    );
    for (const p of gradescopePlatforms) {
      await syncGradescope(p.id);
    }
  }, [platforms, syncGradescope]);

  return { syncAllGradescope };
}
