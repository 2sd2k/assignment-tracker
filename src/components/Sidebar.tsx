import { useAssignmentStore } from "@/stores/assignmentStore";
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  BookOpen,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Theme } from "@/hooks/useTheme";

interface Props {
  theme: Theme;
  toggleTheme: () => void;
}

export default function Sidebar({ theme, toggleTheme }: Props) {
  const courses = useAssignmentStore((s) => s.courses);
  const selectedCourseId = useAssignmentStore((s) => s.selectedCourseId);
  const setSelectedCourse = useAssignmentStore((s) => s.setSelectedCourse);
  const currentPage = useAssignmentStore((s) => s.currentPage);
  const setCurrentPage = useAssignmentStore((s) => s.setCurrentPage);
  const assignments = useAssignmentStore((s) => s.assignments);

  const pendingCount = assignments.filter((a) => !a.is_completed).length;

  return (
    <aside className="w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full select-none">
      {/* App title */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          Assignment Tracker
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {pendingCount} pending
        </p>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-0.5 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setCurrentPage("dashboard")}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
            currentPage === "dashboard"
              ? "bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-slate-100"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          Dashboard
        </button>
        <button
          onClick={() => setCurrentPage("settings")}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
            currentPage === "settings"
              ? "bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-slate-100"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <SettingsIcon className="w-4 h-4 flex-shrink-0" />
          Settings
        </button>
      </nav>

      {/* Course filter */}
      <div className="px-3 pt-4 pb-1.5">
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
          Courses
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        <button
          onClick={() => setSelectedCourse(null)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
            selectedCourseId === null
              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-medium"
              : "text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
          All Courses
        </button>
        {courses.map((course) => {
          const count = assignments.filter(
            (a) => a.course_id === course.id && !a.is_completed
          ).length;
          return (
            <button
              key={course.id}
              onClick={() => setSelectedCourse(course.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
                selectedCourseId === course.id
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-medium"
                  : "text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <span className="truncate">{course.name}</span>
              {count > 0 && (
                <span className="ml-1.5 text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Theme toggle */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 flex-shrink-0" />
          ) : (
            <Moon className="w-4 h-4 flex-shrink-0" />
          )}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </aside>
  );
}
