import { useState } from "react";
import { useAssignmentStore } from "@/stores/assignmentStore";
import { X } from "lucide-react";

const inputCls =
  "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors";

const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5";

export default function AddAssignment() {
  const {
    addManualAssignment,
    addAssignmentToCourse,
    setShowAddForm,
    setAddAssignmentCourseId,
    courses,
    addAssignmentCourseId,
  } = useAssignmentStore();

  const preselectedCourse = courses.find((c) => c.id === addAssignmentCourseId);

  const [title, setTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">(
    addAssignmentCourseId ?? ""
  );
  const [newCourseName, setNewCourseName] = useState("");
  const [useNewCourse, setUseNewCourse] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("23:59");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setShowAddForm(false);
    setAddAssignmentCourseId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const dueAt = dueDate
      ? new Date(`${dueDate}T${dueTime}`).toISOString()
      : null;

    if (useNewCourse) {
      if (!newCourseName.trim()) return;
      await addManualAssignment(
        newCourseName.trim(),
        title.trim(),
        dueAt,
        description.trim() || null
      );
    } else if (selectedCourseId) {
      await addAssignmentToCourse(
        selectedCourseId as number,
        title.trim(),
        dueAt,
        description.trim() || null
      );
    }

    setIsSubmitting(false);
  };

  const canSubmit =
    title.trim() &&
    (useNewCourse ? newCourseName.trim() : selectedCourseId !== "");

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Add Assignment
            {preselectedCourse && !useNewCourse && (
              <span className="text-sm font-normal text-slate-400 ml-2">
                to {preselectedCourse.name}
              </span>
            )}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Problem Set 3"
              className={inputCls}
              required
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>Class *</label>
            {!useNewCourse ? (
              <>
                <select
                  value={selectedCourseId}
                  onChange={(e) =>
                    setSelectedCourseId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className={inputCls}
                >
                  <option value="">Select a class…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {courses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUseNewCourse(true)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 mt-1.5 cursor-pointer"
                  >
                    + Create new class
                  </button>
                )}
                {courses.length === 0 && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={newCourseName}
                      onChange={(e) => {
                        setNewCourseName(e.target.value);
                        setUseNewCourse(true);
                      }}
                      placeholder="Type a class name…"
                      className={inputCls}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="e.g. CS 101"
                  className={inputCls}
                />
                {courses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUseNewCourse(false)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 mt-1.5 cursor-pointer"
                  >
                    Pick existing class
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelCls}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="w-28">
              <label className={labelCls}>Time</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes…"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isSubmitting ? "Adding…" : "Add Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
