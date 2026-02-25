import { useState } from "react";
import { useAssignmentStore } from "@/stores/assignmentStore";
import { X } from "lucide-react";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Add Assignment
            {preselectedCourse && !useNewCourse && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                to {preselectedCourse.name}
              </span>
            )}
          </h2>
          <button onClick={handleClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Problem Set 3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>

          {/* Course selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class *
            </label>
            {!useNewCourse ? (
              <>
                <select
                  value={selectedCourseId}
                  onChange={(e) =>
                    setSelectedCourseId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Select a class...</option>
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
                    className="text-xs text-blue-600 hover:text-blue-700 mt-1"
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
                      placeholder="Type a class name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {courses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUseNewCourse(false)}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                  >
                    Pick existing class
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Adding..." : "Add Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
