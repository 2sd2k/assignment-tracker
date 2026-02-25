import { useMemo } from "react";
import { useAssignmentStore } from "@/stores/assignmentStore";
import AssignmentCard from "./AssignmentCard";
import { ClipboardList } from "lucide-react";

export default function AssignmentList() {
  const assignments = useAssignmentStore((s) => s.assignments);
  const selectedCourseId = useAssignmentStore((s) => s.selectedCourseId);
  const isLoading = useAssignmentStore((s) => s.isLoading);
  const viewFilter = useAssignmentStore((s) => s.viewFilter);
  const setViewFilter = useAssignmentStore((s) => s.setViewFilter);

  const filteredAssignments = useMemo(() => {
    let filtered = assignments;

    if (selectedCourseId !== null) {
      filtered = filtered.filter((a) => a.course_id === selectedCourseId);
    }

    if (viewFilter === "pending") {
      filtered = filtered.filter((a) => !a.is_completed);
    } else if (viewFilter === "completed") {
      filtered = filtered.filter((a) => a.is_completed);
    }

    return filtered;
  }, [assignments, selectedCourseId, viewFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full" />
        <span className="ml-3">Loading assignments...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {(["all", "pending", "completed"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setViewFilter(filter)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewFilter === filter
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Assignment list */}
      {filteredAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <ClipboardList className="w-12 h-12 mb-3" />
          <p className="text-lg font-medium">No assignments</p>
          <p className="text-sm mt-1">
            {viewFilter === "completed"
              ? "No completed assignments yet"
              : viewFilter === "pending"
                ? "All caught up!"
                : "Add assignments manually or connect a platform"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredAssignments.map((a) => (
            <AssignmentCard key={a.id} assignment={a} />
          ))}
        </div>
      )}
    </div>
  );
}
