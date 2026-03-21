import { useMemo, useState } from "react";
import { useAssignmentStore } from "@/stores/assignmentStore";
import AssignmentCard from "./AssignmentCard";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Trash2,
  Clock,
  Pin,
  GripVertical,
} from "lucide-react";
import { Circle } from "lucide-react";
import type { AssignmentWithCourse, CourseRow } from "@/lib/db";
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
  const [courseOrder, setCourseOrder] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem("courseCardOrder");
      if (stored) return JSON.parse(stored) as number[];
    } catch {}
    return [];
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const hasConnectedPlatforms = platforms.some(
    (p) => p.type !== "manual" && p.session_cookies
  );

  const visibleCourses = useMemo(() => {
    if (selectedCourseId === null) return courses;
    return courses.filter((c) => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  const openCourses = useMemo(
    () => visibleCourses.filter((c) => !collapsedCourses.has(c.id)),
    [visibleCourses, collapsedCourses]
  );

  const hiddenCourses = useMemo(
    () => visibleCourses.filter((c) => collapsedCourses.has(c.id)),
    [visibleCourses, collapsedCourses]
  );

  const sortedOpenCourses = useMemo(() => {
    if (courseOrder.length === 0) return openCourses;
    return [...openCourses].sort((a, b) => {
      const ai = courseOrder.indexOf(a.id);
      const bi = courseOrder.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [openCourses, courseOrder]);

  const pinned = useMemo(() => {
    return assignments.filter(
      (a) =>
        a.is_pinned === 1 &&
        !a.is_completed &&
        (selectedCourseId === null || a.course_id === selectedCourseId)
    );
  }, [assignments, selectedCourseId]);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedOpenCourses.findIndex((c) => c.id === active.id);
    const newIndex = sortedOpenCourses.findIndex((c) => c.id === over.id);
    const newSorted = arrayMove(sortedOpenCourses, oldIndex, newIndex);
    const newOrder = newSorted.map((c) => c.id);
    setCourseOrder(newOrder);
    localStorage.setItem("courseCardOrder", JSON.stringify(newOrder));
  };

  const pendingCount = assignments.filter(
    (a) =>
      !a.is_completed &&
      (selectedCourseId === null || a.course_id === selectedCourseId)
  ).length;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-600">
        <div className="animate-spin w-5 h-5 border-2 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full" />
        <span className="ml-3 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Dashboard
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {pendingCount} pending assignment{pendingCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasConnectedPlatforms && (
              <button
                onClick={() => syncAll()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
                />
                {isSyncing ? "Syncing…" : "Sync"}
              </button>
            )}
            <button
              onClick={() => setShowAddClassForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Add Class
            </button>
            <button
              onClick={() => {
                setAddAssignmentCourseId(null);
                setShowAddForm(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Assignment
            </button>
          </div>
        </div>

        {/* Sync error */}
        {syncError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {syncError === "SESSION_EXPIRED"
              ? "Session expired — reconnect your platform in Settings."
              : `Sync error: ${syncError}`}
          </div>
        )}

        {/* Pinned */}
        {pinned.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-1.5 mb-3">
              <Pin className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <h3 className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
                Pinned
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-500/20 rounded-xl overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pinned.map((a) => (
                  <PinnedRow key={a.id} assignment={a} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section className="mb-7">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
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

        {/* Classes */}
        {visibleCourses.length === 0 && courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <BookOpen className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-500">
              No classes yet
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">
              Add a class to start tracking assignments
            </p>
          </div>
        ) : (
          <>
            {sortedOpenCourses.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedOpenCourses.map((c) => c.id)}
                  strategy={rectSortingStrategy}
                >
                  <div
                    className={cn(
                      "grid gap-3",
                      sortedOpenCourses.length === 1
                        ? "grid-cols-1 max-w-2xl"
                        : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                    )}
                  >
                    {sortedOpenCourses.map((course) => (
                      <SortableCourseCard
                        key={course.id}
                        course={course}
                        courseAssignments={
                          assignmentsByCourse.get(course.id) || []
                        }
                        confirmDeleteCourse={confirmDeleteCourse}
                        setConfirmDeleteCourse={setConfirmDeleteCourse}
                        handleDeleteCourse={handleDeleteCourse}
                        handleAddAssignmentToCourse={
                          handleAddAssignmentToCourse
                        }
                        toggleCollapse={toggleCollapse}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Hidden classes chips */}
            {hiddenCourses.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {hiddenCourses.map((course) => {
                  const count = (
                    assignmentsByCourse.get(course.id) || []
                  ).filter((a) => !a.is_completed).length;
                  return (
                    <button
                      key={course.id}
                      onClick={() => toggleCollapse(course.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3" />
                      {course.name}
                      {count > 0 && (
                        <span className="bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full tabular-nums">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface SortableCourseCardProps {
  course: CourseRow;
  courseAssignments: AssignmentWithCourse[];
  confirmDeleteCourse: number | null;
  setConfirmDeleteCourse: (id: number | null) => void;
  handleDeleteCourse: (id: number) => Promise<void>;
  handleAddAssignmentToCourse: (id: number) => void;
  toggleCollapse: (id: number) => void;
}

function SortableCourseCard({
  course,
  courseAssignments,
  confirmDeleteCourse,
  setConfirmDeleteCourse,
  handleDeleteCourse,
  handleAddAssignmentToCourse,
  toggleCollapse,
}: SortableCourseCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const pendingCount = courseAssignments.filter((a) => !a.is_completed).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden",
        isDragging && "opacity-50 shadow-xl"
      )}
    >
      {/* Course header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 group">
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-0.5 mr-0.5 text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </span>

        <button
          onClick={() => toggleCollapse(course.id)}
          className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-800 dark:text-slate-300 truncate">
            {course.name}
          </span>
          {pendingCount > 0 && (
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums">
              {pendingCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => handleAddAssignmentToCourse(course.id)}
            className="p-1 rounded text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            title="Add assignment"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          {confirmDeleteCourse === course.id ? (
            <div className="flex gap-1 ml-1">
              <button
                onClick={() => handleDeleteCourse(course.id)}
                className="px-2 py-0.5 bg-red-600 text-white text-[10px] rounded hover:bg-red-500 cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDeleteCourse(null)}
                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteCourse(course.id)}
              className="p-1 rounded text-slate-300 dark:text-slate-700 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
              title="Delete class"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Assignments */}
      <div className="p-1.5">
        {courseAssignments.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-700 text-center py-4">
            No assignments yet
          </p>
        ) : (
          <div className="space-y-0.5">
            {courseAssignments.map((a) => (
              <AssignmentCard key={a.id} assignment={a} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UpcomingCard({
  assignment,
  dotColor,
}: {
  assignment: AssignmentWithCourse;
  dotColor: string;
}) {
  const toggleComplete = useAssignmentStore((s) => s.toggleComplete);

  return (
    <div className="flex items-start gap-2.5 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-default">
      <button
        onClick={() => toggleComplete(assignment.id)}
        className="mt-0.5 flex-shrink-0 cursor-pointer"
      >
        <span className={cn("block w-2.5 h-2.5 rounded-full", dotColor)} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-300 truncate leading-tight">
          {assignment.title}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-600 truncate mt-0.5">
          {assignment.course_name}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-600 mt-1 tabular-nums">
          {formatDueDate(assignment.due_at)}
        </p>
      </div>
    </div>
  );
}

function PinnedRow({ assignment }: { assignment: AssignmentWithCourse }) {
  const toggleComplete = useAssignmentStore((s) => s.toggleComplete);
  const togglePin = useAssignmentStore((s) => s.togglePin);
  const urgency = getUrgencyLevel(assignment.due_at);
  const dotColor = getUrgencyDot(urgency);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-default">
      <button
        onClick={() => toggleComplete(assignment.id)}
        className="flex-shrink-0 text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors cursor-pointer"
      >
        <Circle className="w-4 h-4" />
      </button>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 dark:text-slate-200 truncate font-medium">
          {assignment.title}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
          {assignment.course_name}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {assignment.due_at && (
          <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
            {formatDueDate(assignment.due_at)}
          </span>
        )}
        <button
          onClick={() => togglePin(assignment.id)}
          className="p-1 rounded text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
          title="Unpin"
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
