import { useDatabase } from "@/hooks/useDatabase";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { useAssignmentStore } from "@/stores/assignmentStore";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import Settings from "@/components/Settings";
import AddAssignment from "@/components/AddAssignment";
import AddClass from "@/components/AddClass";

export default function App() {
  useDatabase();
  useNotifications();

  const { theme, toggleTheme } = useTheme();
  const currentPage = useAssignmentStore((s) => s.currentPage);
  const showAddForm = useAssignmentStore((s) => s.showAddForm);
  const showAddClassForm = useAssignmentStore((s) => s.showAddClassForm);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar theme={theme} toggleTheme={toggleTheme} />
      {currentPage === "dashboard" ? <Dashboard /> : <Settings />}
      {showAddForm && <AddAssignment />}
      {showAddClassForm && <AddClass />}
    </div>
  );
}
