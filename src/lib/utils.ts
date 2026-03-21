import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type UrgencyLevel = "overdue" | "urgent" | "soon" | "later" | "none";

export function getUrgencyLevel(dueAt: string | null): UrgencyLevel {
  if (!dueAt) return "none";

  const now = new Date();
  const due = new Date(dueAt);
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDue < 0) return "overdue";
  if (hoursUntilDue <= 24) return "urgent";
  if (hoursUntilDue <= 72) return "soon";
  return "later";
}

export function getUrgencyColor(level: UrgencyLevel): string {
  switch (level) {
    case "overdue":
      return "bg-red-500/10 border-red-500/30 text-red-400";
    case "urgent":
      return "bg-orange-500/10 border-orange-500/30 text-orange-400";
    case "soon":
      return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
    case "later":
      return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    case "none":
      return "bg-slate-700/50 border-slate-600/50 text-slate-400";
  }
}

export function getUrgencyDot(level: UrgencyLevel): string {
  switch (level) {
    case "overdue":
      return "bg-red-400";
    case "urgent":
      return "bg-orange-400";
    case "soon":
      return "bg-yellow-400";
    case "later":
      return "bg-emerald-400";
    case "none":
      return "bg-slate-500";
  }
}

export function formatDueDate(dueAt: string | null): string {
  if (!dueAt) return "No due date";

  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < -24) {
    return `Overdue by ${Math.floor(Math.abs(diffDays))}d`;
  }
  if (diffHours < 0) {
    return `Overdue by ${Math.floor(Math.abs(diffHours))}h`;
  }
  if (diffHours < 1) {
    return `Due in ${Math.max(1, Math.floor(diffMs / 60000))}m`;
  }
  if (diffHours < 24) {
    return `Due in ${Math.floor(diffHours)}h`;
  }
  if (diffDays < 7) {
    return `Due in ${Math.floor(diffDays)}d`;
  }

  return due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatFullDate(dueAt: string | null): string {
  if (!dueAt) return "No due date";
  const due = new Date(dueAt);
  return due.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
