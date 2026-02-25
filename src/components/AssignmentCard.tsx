import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  cn,
  getUrgencyLevel,
  getUrgencyDot,
  formatDueDate,
  formatFullDate,
} from "@/lib/utils";
import { useAssignmentStore } from "@/stores/assignmentStore";
import type { AssignmentWithCourse } from "@/lib/db";
import {
  CheckCircle2,
  Circle,
  Trash2,
  ExternalLink,
  Clock,
} from "lucide-react";

interface Props {
  assignment: AssignmentWithCourse;
  compact?: boolean;
}

export default function AssignmentCard({ assignment, compact }: Props) {
  const toggleComplete = useAssignmentStore((s) => s.toggleComplete);
  const removeAssignment = useAssignmentStore((s) => s.removeAssignment);
  const [isDeleting, setIsDeleting] = useState(false);

  const urgency = getUrgencyLevel(assignment.due_at);
  const dotColor = assignment.is_completed ? "bg-gray-400" : getUrgencyDot(urgency);

  const handleDelete = async () => {
    setIsDeleting(true);
    await removeAssignment(assignment.id);
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group",
          assignment.is_completed && "opacity-50"
        )}
      >
        <button
          onClick={() => toggleComplete(assignment.id)}
          className="flex-shrink-0 hover:scale-110 transition-transform"
        >
          {assignment.is_completed ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <Circle className="w-4 h-4 text-gray-400" />
          )}
        </button>

        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm truncate",
              assignment.is_completed && "line-through text-gray-400"
            )}
          >
            {assignment.title}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {assignment.due_at && (
            <span
              className="text-xs text-gray-400"
              title={formatFullDate(assignment.due_at)}
            >
              {formatDueDate(assignment.due_at)}
            </span>
          )}

          <div className="hidden group-hover:flex items-center gap-0.5">
            {assignment.platform_url && (
              <button
                onClick={() => invoke("open_url", { url: assignment.platform_url })}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                title="Open in browser"
              >
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1 rounded hover:bg-red-100 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full card (used in non-compact contexts)
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border bg-white border-gray-200 transition-all",
        assignment.is_completed && "opacity-60"
      )}
    >
      <button
        onClick={() => toggleComplete(assignment.id)}
        className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
        title={assignment.is_completed ? "Mark incomplete" : "Mark complete"}
      >
        {assignment.is_completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <Circle className="w-5 h-5 text-gray-400" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />
          <h3
            className={cn(
              "font-medium truncate",
              assignment.is_completed && "line-through text-gray-400"
            )}
          >
            {assignment.title}
          </h3>
        </div>

        <p className="text-sm text-gray-500">{assignment.course_name}</p>

        {assignment.description && (
          <p className="text-sm mt-1 text-gray-400 truncate">
            {assignment.description}
          </p>
        )}

        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span title={formatFullDate(assignment.due_at)}>
            {formatDueDate(assignment.due_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {assignment.platform_url && (
          <button
            onClick={() => invoke("open_url", { url: assignment.platform_url })}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            title="Open in browser"
          >
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </button>
        )}
        {assignment.is_manual === 1 && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 rounded hover:bg-red-100 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
}
