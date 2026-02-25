import { useAssignmentStore } from "@/stores/assignmentStore";
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  BookOpen,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const courses = useAssignmentStore((s) => s.courses);
  const selectedCourseId = useAssignmentStore((s) => s.selectedCourseId);
  const setSelectedCourse = useAssignmentStore((s) => s.setSelectedCourse);
  const currentPage = useAssignmentStore((s) => s.currentPage);
  const setCurrentPage = useAssignmentStore((s) => s.setCurrentPage);
  const assignments = useAssignmentStore((s) => s.assignments);

  const pendingCount = assignments.filter((a) => !a.is_completed).length;

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* App title */}
      <div className="p-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">Assignment Tracker</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {pendingCount} pending assignment{pendingCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-0.5">
        <button
          onClick={() => setCurrentPage("dashboard")}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            currentPage === "dashboard"
              ? "bg-blue-50 text-blue-700"
              : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => setCurrentPage("settings")}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            currentPage === "settings"
              ? "bg-blue-50 text-blue-700"
              : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <SettingsIcon className="w-4 h-4" />
          Settings
        </button>
      </nav>

      {/* Course filter */}
      <div className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <Filter className="w-3 h-3" />
          Courses
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        <button
          onClick={() => setSelectedCourse(null)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
            selectedCourseId === null
              ? "bg-gray-100 text-gray-900 font-medium"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <BookOpen className="w-3.5 h-3.5" />
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
                "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors",
                selectedCourseId === course.id
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <span className="truncate">{course.name}</span>
              {count > 0 && (
                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
