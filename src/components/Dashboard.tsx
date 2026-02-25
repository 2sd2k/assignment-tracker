import { useMemo, useState } from "react";
import { useAssignmentStore } from "@/stores/assignmentStore";
import AssignmentCard from "./AssignmentCard";
import {
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Trash2,
  Clock,
  ClipboardList,
} from "lucide-react";
import type { AssignmentWithCourse } from "@/lib/db";
import {
  cn,
  getUrgencyLevel,
  getUrgencyDot,
  formatDueDate,
} from "@/lib/utils";

export default function Dashboard() {
  const assignments = useAssignmentStore((s) => s.assignments);
  const courses = useAssignmentStore((s) => s.courses);
  const selectedCourseId = useAssignmentStore((s) => s.selectedCourseId);
  const isLoading = useAssignmentStore((s) => s.isLoading);
  const isSyncing = useAssignmentStore((s) => s.isSyncing);
  const syncError = useAssignmentStore((s) => s.syncError);
  const platforms = useAssignmentStore((s) => s.platforms);
  const syncAll = useAssignmentStore((s) => s.syncAll);
  const setShowAddForm = useAssignmentStore((s) => s.setShowAddForm);
  const setShowAddClassForm = useAssignmentStore((s) => s.setShowAddClassForm);
  const setAddAssignmentCourseId = useAssignmentStore(
    (s) => s.setAddAssignmentCourseId
  );
  const removeCourse = useAssignmentStore((s) => s.removeCourse);

  const [collapsedCourses, setCollapsedCourses] = useState<Set<number>>(
    new Set()
  );
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState<number | null>(
    null
  );

  const hasConnectedPlatforms = platforms.some(
    (p) => p.type !== "manual" && p.session_cookies
  );

  // Filter courses by sidebar selection
  const visibleCourses = useMemo(() => {
    if (selectedCourseId === null) return courses;
    return courses.filter((c) => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  // Upcoming: uncompleted assignments sorted by soonest due date
  const upcoming = useMemo(() => {
    return assignments
      .filter(
        (a) =>
          !a.is_completed &&
          a.due_at &&
          (selectedCourseId === null || a.course_id === selectedCourseId)
      )
      .sort(
        (a, b) =>
          new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()
      )
      .slice(0, 8);
  }, [assignments, selectedCourseId]);

  // Group assignments by course
  const assignmentsByCourse = useMemo(() => {
    const map = new Map<number, AssignmentWithCourse[]>();
    for (const course of visibleCourses) {
      map.set(course.id, []);
    }
    for (const a of assignments) {
      if (selectedCourseId !== null && a.course_id !== selectedCourseId)
        continue;
      const list = map.get(a.course_id);
      if (list) list.push(a);
    }
    return map;
  }, [assignments, visibleCourses, selectedCourseId]);

  const toggleCollapse = (courseId: number) => {
    setCollapsedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const handleAddAssignmentToCourse = (courseId: number) => {
    setAddAssignmentCourseId(courseId);
    setShowAddForm(true);
  };

  const handleDeleteCourse = async (courseId: number) => {
    await removeCourse(courseId);
    setConfirmDeleteCourse(null);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full" />
        <span className="ml-3">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {assignments.filter(
                (a) =>
                  !a.is_completed &&
                  (selectedCourseId === null || a.course_id === selectedCourseId)
              ).length}{" "}
              pending assignment
              {assignments.filter(
                (a) =>
                  !a.is_completed &&
                  (selectedCourseId === null || a.course_id === selectedCourseId)
              ).length !== 1
                ? "s"
                : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {hasConnectedPlatforms && (
              <button
                onClick={() => syncAll()}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
                />
                {isSyncing ? "Syncing..." : "Sync"}
              </button>
            )}
            <button
              onClick={() => setShowAddClassForm(true)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Add Class
            </button>
            <button
              onClick={() => {
                setAddAssignmentCourseId(null);
                setShowAddForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Assignment
            </button>
          </div>
        </div>

        {/* Sync error */}
        {syncError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {syncError === "SESSION_EXPIRED"
              ? "Session expired. Please reconnect your platform in Settings."
              : `Sync error: ${syncError}`}
          </div>
        )}

        {/* Upcoming assignments */}
        {upcoming.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                Upcoming
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {upcoming.map((a) => {
                const urgency = getUrgencyLevel(a.due_at);
                const dotColor = getUrgencyDot(urgency);
                return (
                  <UpcomingCard key={a.id} assignment={a} dotColor={dotColor} />
                );
              })}
            </div>
          </section>
        )}

        {/* Classes with assignments */}
        {visibleCourses.length === 0 && courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BookOpen className="w-12 h-12 mb-3" />
            <p className="text-lg font-medium">No classes yet</p>
            <p className="text-sm mt-1">
              Add a class to start tracking assignments
            </p>
          </div>
        ) : (
          <div className={cn(
            "grid gap-4",
            visibleCourses.length === 1
              ? "grid-cols-1 max-w-2xl"
              : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
          )}>
            {visibleCourses.map((course) => {
              const courseAssignments = assignmentsByCourse.get(course.id) || [];
              const pendingCount = courseAssignments.filter(
                (a) => !a.is_completed
              ).length;
              const isCollapsed = collapsedCourses.has(course.id);

              return (
                <div
                  key={course.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                >
                  {/* Course header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <button
                      onClick={() => toggleCollapse(course.id)}
                      className="flex items-center gap-2 flex-1 min-w-0"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="font-semibold text-gray-800 truncate">
                        {course.name}
                      </span>
                      {pendingCount > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {pendingCount}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleAddAssignmentToCourse(course.id)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        title="Add assignment to this class"
                      >
                        <Plus className="w-4 h-4 text-gray-500" />
                      </button>
                      {confirmDeleteCourse === course.id ? (
                        <div className="flex gap-1 ml-1">
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="px-2 py-0.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteCourse(null)}
                            className="px-2 py-0.5 bg-gray-200 text-xs rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteCourse(course.id)}
                          className="p-1 rounded hover:bg-red-100 transition-colors"
                          title="Delete class"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Assignments */}
                  {!isCollapsed && (
                    <div className="p-2">
                      {courseAssignments.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">
                          No assignments yet
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {courseAssignments.map((a) => (
                            <AssignmentCard
                              key={a.id}
                              assignment={a}
                              compact
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Small card for the "Upcoming" section at the top
function UpcomingCard({
  assignment,
  dotColor,
}: {
  assignment: AssignmentWithCourse;
  dotColor: string;
}) {
  const toggleComplete = useAssignmentStore((s) => s.toggleComplete);

  return (
    <div
      className="flex items-start gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-default"
    >
      <button
        onClick={() => toggleComplete(assignment.id)}
        className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
      >
        <div
          className={cn("w-3 h-3 rounded-full border-2", dotColor)}
          style={{ borderColor: "currentColor" }}
        />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          {assignment.title}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {assignment.course_name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDueDate(assignment.due_at)}
        </p>
      </div>
    </div>
  );
}
