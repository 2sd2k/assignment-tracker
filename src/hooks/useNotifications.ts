import { useEffect, useRef } from "react";
import { useAssignmentStore } from "@/stores/assignmentStore";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export function useNotifications() {
  const assignments = useAssignmentStore((s) => s.assignments);
  const notificationSettings = useAssignmentStore((s) => s.notificationSettings);
  const sentNotifications = useRef(new Set<string>());

  useEffect(() => {
    const checkAndNotify = async () => {
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === "granted";
      }
      if (!granted) return;

      const enabledSettings = notificationSettings.filter((s) => s.enabled);
      if (enabledSettings.length === 0) return;

      const now = new Date();

      for (const assignment of assignments) {
        if (assignment.is_completed || !assignment.due_at) continue;

        const dueDate = new Date(assignment.due_at);
        const hoursUntilDue =
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        for (const setting of enabledSettings) {
          // Check if we're within the notification window (setting.hours_before ± 5 minutes)
          const diff = Math.abs(hoursUntilDue - setting.hours_before);
          if (diff < 5 / 60) {
            const notifKey = `${assignment.id}-${setting.hours_before}`;
            if (!sentNotifications.current.has(notifKey)) {
              sentNotifications.current.add(notifKey);

              const timeLabel =
                setting.hours_before >= 24
                  ? `${Math.floor(setting.hours_before / 24)} day(s)`
                  : `${setting.hours_before} hour(s)`;

              sendNotification({
                title: `Assignment Due in ${timeLabel}`,
                body: `${assignment.title} (${assignment.course_name})`,
              });
            }
          }
        }
      }
    };

    // Check every minute
    checkAndNotify();
    const interval = setInterval(checkAndNotify, 60000);
    return () => clearInterval(interval);
  }, [assignments, notificationSettings]);
}
