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
      return "bg-red-100 border-red-400 text-red-800";
    case "urgent":
      return "bg-orange-100 border-orange-400 text-orange-800";
    case "soon":
      return "bg-yellow-100 border-yellow-400 text-yellow-800";
    case "later":
      return "bg-green-100 border-green-400 text-green-800";
    case "none":
      return "bg-gray-100 border-gray-300 text-gray-700";
  }
}

export function getUrgencyDot(level: UrgencyLevel): string {
  switch (level) {
    case "overdue":
      return "bg-red-500";
    case "urgent":
      return "bg-orange-500";
    case "soon":
      return "bg-yellow-500";
    case "later":
      return "bg-green-500";
    case "none":
      return "bg-gray-400";
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
