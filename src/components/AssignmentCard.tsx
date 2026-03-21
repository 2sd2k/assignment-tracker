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
  Pin,
} from "lucide-react";

interface Props {
  assignment: AssignmentWithCourse;
  compact?: boolean;
}

export default function AssignmentCard({ assignment, compact }: Props) {
  const toggleComplete = useAssignmentStore((s) => s.toggleComplete);
  const togglePin = useAssignmentStore((s) => s.togglePin);
  const removeAssignment = useAssignmentStore((s) => s.removeAssignment);
  const [isDeleting, setIsDeleting] = useState(false);

  const urgency = getUrgencyLevel(assignment.due_at);
  const dotColor = assignment.is_completed
    ? "bg-slate-300 dark:bg-slate-600"
    : getUrgencyDot(urgency);
  const isPinned = assignment.is_pinned === 1;

  const handleDelete = async () => {
    setIsDeleting(true);
    await removeAssignment(assignment.id);
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group cursor-default",
          assignment.is_completed && "opacity-50"
        )}
      >
        {/* Complete toggle */}
        <button
          onClick={() => toggleComplete(assignment.id)}
          className="flex-shrink-0 text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors cursor-pointer"
        >
          {assignment.is_completed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>

        {/* Urgency dot */}
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColor)} />

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm truncate text-slate-700 dark:text-slate-300",
              assignment.is_completed && "line-through text-slate-400 dark:text-slate-600"
            )}
          >
            {assignment.title}
          </p>
        </div>

        {/* Right side: due date + actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {assignment.due_at && (
            <span
              className="text-xs text-slate-400 dark:text-slate-600 tabular-nums"
              title={formatFullDate(assignment.due_at)}
            >
              {formatDueDate(assignment.due_at)}
            </span>
          )}

          {/* Pin — always visible when pinned; hover-only when not */}
          <button
            onClick={() => togglePin(assignment.id)}
            className={cn(
              "p-1 rounded transition-colors cursor-pointer",
              isPinned
                ? "text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                : "hidden group-hover:block text-slate-400 dark:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
            )}
            title={isPinned ? "Unpin" : "Pin"}
          >
            <Pin className="w-3 h-3" />
          </button>

          <div className="hidden group-hover:flex items-center gap-0.5">
            {assignment.platform_url && (
              <button
                onClick={() => invoke("open_url", { url: assignment.platform_url })}
                className="p-1 rounded text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                title="Open in browser"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1 rounded text-slate-300 dark:text-slate-600 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full card
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border bg-white dark:bg-slate-900 transition-all",
        isPinned
          ? "border-indigo-200 dark:border-indigo-500/30"
          : "border-slate-200 dark:border-slate-800",
        assignment.is_completed && "opacity-50"
      )}
    >
      <button
        onClick={() => toggleComplete(assignment.id)}
        className="mt-0.5 flex-shrink-0 text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors cursor-pointer"
        title={assignment.is_completed ? "Mark incomplete" : "Mark complete"}
      >
        {assignment.is_completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dotColor)} />
          <h3
            className={cn(
              "font-medium text-slate-800 dark:text-slate-200 truncate",
              assignment.is_completed && "line-through text-slate-400 dark:text-slate-600"
            )}
          >
            {assignment.title}
          </h3>
        </div>
        <p className="text-sm text-slate-500">{assignment.course_name}</p>
        {assignment.description && (
          <p className="text-sm mt-1 text-slate-400 dark:text-slate-600 truncate">
            {assignment.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400 dark:text-slate-600">
          <Clock className="w-3 h-3" />
          <span title={formatFullDate(assignment.due_at)}>
            {formatDueDate(assignment.due_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => togglePin(assignment.id)}
          className={cn(
            "p-1.5 rounded transition-colors cursor-pointer",
            isPinned
              ? "text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
              : "text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-500 dark:hover:text-slate-400"
          )}
          title={isPinned ? "Unpin" : "Pin"}
        >
          <Pin className="w-4 h-4" />
        </button>
        {assignment.platform_url && (
          <button
            onClick={() => invoke("open_url", { url: assignment.platform_url })}
            className="p-1.5 rounded text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            title="Open in browser"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
        {assignment.is_manual === 1 && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 rounded text-slate-300 dark:text-slate-600 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
