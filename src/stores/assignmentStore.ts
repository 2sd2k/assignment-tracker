import { create } from "zustand";
import {
  getAssignments,
  getCourses,
  getPlatforms,
  toggleAssignmentComplete,
  togglePinAssignment,
  deleteAssignment,
  addAssignment,
  addManualCourse,
  addPlatform,
  upsertCourse,
  upsertAssignment,
  updatePlatformCookies,
  deletePlatform,
  deleteCourse,
  getNotificationSettings,
  toggleNotificationSetting,
  addNotificationSetting,
  deleteNotificationSetting,
  type AssignmentWithCourse,
  type CourseRow,
  type PlatformRow,
  type NotificationSettingRow,
} from "@/lib/db";
import { fetchCanvasCourses, fetchPlannerItems } from "@/lib/canvas";
import { fetchAllGradescopeAssignments } from "@/lib/gradescope";

export type ViewFilter = "all" | "pending" | "completed";
export type Page = "dashboard" | "settings";

interface AssignmentStore {
  // Data
  assignments: AssignmentWithCourse[];
  courses: CourseRow[];
  platforms: PlatformRow[];
  notificationSettings: NotificationSettingRow[];

  // UI State
  selectedCourseId: number | null;
  viewFilter: ViewFilter;
  currentPage: Page;
  isLoading: boolean;
  isSyncing: boolean;
  syncError: string | null;
  showAddForm: boolean;
  showAddClassForm: boolean;
  addAssignmentCourseId: number | null; // pre-select course when adding assignment

  // Actions
  loadAll: () => Promise<void>;
  toggleComplete: (id: number) => Promise<void>;
  togglePin: (id: number) => Promise<void>;
  removeAssignment: (id: number) => Promise<void>;
  addClass: (name: string) => Promise<void>;
  removeCourse: (id: number) => Promise<void>;
  addManualAssignment: (
    courseName: string,
    title: string,
    dueAt: string | null,
    description: string | null
  ) => Promise<void>;
  addAssignmentToCourse: (
    courseId: number,
    title: string,
    dueAt: string | null,
    description: string | null
  ) => Promise<void>;
  setSelectedCourse: (id: number | null) => void;
  setViewFilter: (filter: ViewFilter) => void;
  setCurrentPage: (page: Page) => void;
  setShowAddForm: (show: boolean) => void;
  setShowAddClassForm: (show: boolean) => void;
  setAddAssignmentCourseId: (id: number | null) => void;

  // Platform actions
  connectPlatform: (
    type: string,
    name: string,
    baseUrl: string | null
  ) => Promise<number>;
  savePlatformCookies: (id: number, cookies: string) => Promise<void>;
  removePlatform: (id: number) => Promise<void>;
  syncCanvas: (platformId: number) => Promise<void>;
  syncGradescope: (platformId: number) => Promise<void>;
  syncAll: () => Promise<void>;
  processScrapedData: (platformId: number, platform: string, data: string) => Promise<void>;

  // Notification actions
  loadNotificationSettings: () => Promise<void>;
  toggleNotification: (id: number) => Promise<void>;
  addNotification: (hoursBefore: number) => Promise<void>;
  removeNotification: (id: number) => Promise<void>;
}

async function ensureManualPlatform(
  platforms: PlatformRow[]
): Promise<number> {
  const manual = platforms.find((p) => p.type === "manual");
  if (manual) return manual.id;
  return addPlatform("manual", "Manual", null);
}

export const useAssignmentStore = create<AssignmentStore>((set, get) => ({
  assignments: [],
  courses: [],
  platforms: [],
  notificationSettings: [],
  selectedCourseId: null,
  viewFilter: "all",
  currentPage: "dashboard",
  isLoading: true,
  isSyncing: false,
  syncError: null,
  showAddForm: false,
  showAddClassForm: false,
  addAssignmentCourseId: null,

  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [assignments, courses, platforms, notificationSettings] =
        await Promise.all([
          getAssignments(),
          getCourses(),
          getPlatforms(),
          getNotificationSettings(),
        ]);
      set({
        assignments,
        courses,
        platforms,
        notificationSettings,
        isLoading: false,
      });
    } catch (err) {
      console.error("Failed to load data:", err);
      set({ isLoading: false });
    }
  },

  toggleComplete: async (id: number) => {
    await toggleAssignmentComplete(id);
    const assignments = await getAssignments();
    set({ assignments });
  },

  togglePin: async (id: number) => {
    await togglePinAssignment(id);
    const assignments = await getAssignments();
    set({ assignments });
  },

  removeAssignment: async (id: number) => {
    await deleteAssignment(id);
    const assignments = await getAssignments();
    set({ assignments });
  },

  addClass: async (name: string) => {
    const platformId = await ensureManualPlatform(get().platforms);
    await addManualCourse(platformId, name);
    const [courses, platforms] = await Promise.all([
      getCourses(),
      getPlatforms(),
    ]);
    set({ courses, platforms, showAddClassForm: false });
  },

  removeCourse: async (id: number) => {
    await deleteCourse(id);
    const [assignments, courses] = await Promise.all([
      getAssignments(),
      getCourses(),
    ]);
    set({ assignments, courses });
  },

  addManualAssignment: async (courseName, title, dueAt, description) => {
    const platformId = await ensureManualPlatform(get().platforms);
    const courseId = await addManualCourse(platformId, courseName);
    await addAssignment(courseId, title, dueAt, description, true);

    const [assignments, courses, platforms] = await Promise.all([
      getAssignments(),
      getCourses(),
      getPlatforms(),
    ]);
    set({ assignments, courses, platforms, showAddForm: false });
  },

  addAssignmentToCourse: async (courseId, title, dueAt, description) => {
    await addAssignment(courseId, title, dueAt, description, true);
    const assignments = await getAssignments();
    set({ assignments, showAddForm: false, addAssignmentCourseId: null });
  },

  setSelectedCourse: (id) => set({ selectedCourseId: id }),
  setViewFilter: (filter) => set({ viewFilter: filter }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setShowAddForm: (show) => set({ showAddForm: show }),
  setShowAddClassForm: (show) => set({ showAddClassForm: show }),
  setAddAssignmentCourseId: (id) => set({ addAssignmentCourseId: id }),

  connectPlatform: async (type, name, baseUrl) => {
    const id = await addPlatform(type, name, baseUrl);
    const platforms = await getPlatforms();
    set({ platforms });
    return id;
  },

  savePlatformCookies: async (id, cookies) => {
    await updatePlatformCookies(id, cookies);
    const platforms = await getPlatforms();
    set({ platforms });
  },

  removePlatform: async (id) => {
    await deletePlatform(id);
    const [assignments, courses, platforms] = await Promise.all([
      getAssignments(),
      getCourses(),
      getPlatforms(),
    ]);
    set({ assignments, courses, platforms });
  },

  syncCanvas: async (platformId: number) => {
    set({ isSyncing: true, syncError: null });
    try {
      const platform = get().platforms.find((p) => p.id === platformId);
      if (!platform?.base_url || !platform?.session_cookies) {
        throw new Error("Platform not configured");
      }

      const canvasCourses = await fetchCanvasCourses(
        platform.base_url,
        platform.session_cookies
      );
      for (const course of canvasCourses) {
        await upsertCourse(platformId, String(course.id), course.name);
      }

      const items = await fetchPlannerItems(
        platform.base_url,
        platform.session_cookies
      );
      const courses = await getCourses();

      for (const item of items) {
        if (!item.plannable) continue;
        const course = courses.find(
          (c) =>
            c.platform_id === platformId &&
            c.external_id === String(item.course_id)
        );
        if (!course) continue;

        await upsertAssignment(
          course.id,
          String(item.plannable_id),
          item.plannable.title,
          item.plannable.due_at || null,
          item.plannable.description || null,
          item.html_url || null
        );
      }

      const [assignments, updatedCourses] = await Promise.all([
        getAssignments(),
        getCourses(),
      ]);
      set({ assignments, courses: updatedCourses, isSyncing: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Canvas sync failed";
      set({ syncError: message, isSyncing: false });
      throw err;
    }
  },

  syncGradescope: async (platformId: number) => {
    set({ isSyncing: true, syncError: null });
    try {
      const platform = get().platforms.find((p) => p.id === platformId);
      if (!platform?.session_cookies) {
        throw new Error("Platform not configured");
      }

      const { courses: gsCourses, assignments: gsAssignments } =
        await fetchAllGradescopeAssignments(platform.session_cookies);

      for (const course of gsCourses) {
        await upsertCourse(
          platformId,
          course.id,
          course.name || course.shortName
        );
      }

      const dbCourses = await getCourses();
      for (const a of gsAssignments) {
        const dbCourse = dbCourses.find(
          (c) =>
            c.platform_id === platformId && c.external_id === a.courseId
        );
        if (!dbCourse) continue;

        await upsertAssignment(
          dbCourse.id,
          a.assignmentId,
          a.title,
          a.dueAt,
          null,
          a.url
        );
      }

      const [assignments, courses] = await Promise.all([
        getAssignments(),
        getCourses(),
      ]);
      set({ assignments, courses, isSyncing: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gradescope sync failed";
      set({ syncError: message, isSyncing: false });
      throw err;
    }
  },

  syncAll: async () => {
    const platforms = get().platforms;
    for (const p of platforms) {
      try {
        if (p.type === "canvas" && p.session_cookies) {
          await get().syncCanvas(p.id);
        } else if (p.type === "gradescope" && p.session_cookies) {
          await get().syncGradescope(p.id);
        }
      } catch {
        // Individual sync errors are already captured in syncError
      }
    }
  },

  processScrapedData: async (platformId, platform, data) => {
    set({ isSyncing: true, syncError: null });
    try {
      // Decode base64 → UTF-8 (reverse of btoa(unescape(encodeURIComponent(...))))
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const decoded = new TextDecoder().decode(bytes);
      const parsed = JSON.parse(decoded);

      if (platform === "canvas") {
        const { courses, items } = parsed as {
          courses: Array<{ id: number; name: string }>;
          items: Array<{
            course_id: number;
            plannable_id: number;
            plannable: { title: string; due_at?: string; description?: string };
            html_url?: string;
          }>;
        };
        for (const course of courses) {
          await upsertCourse(platformId, String(course.id), course.name);
        }
        const dbCourses = await getCourses();
        for (const item of items) {
          if (!item.plannable) continue;
          const course = dbCourses.find(
            (c) =>
              c.platform_id === platformId &&
              c.external_id === String(item.course_id)
          );
          if (!course) continue;
          await upsertAssignment(
            course.id,
            String(item.plannable_id),
            item.plannable.title,
            item.plannable.due_at || null,
            item.plannable.description || null,
            item.html_url || null
          );
        }
      } else if (platform === "gradescope") {
        const { courses, assignments } = parsed as {
          courses: Array<{ id: string; name: string }>;
          assignments: Array<{
            courseId: string;
            assignmentId: string;
            title: string;
            dueAt: string | null;
            url: string;
          }>;
        };
        for (const course of courses) {
          await upsertCourse(platformId, course.id, course.name);
        }
        const dbCourses = await getCourses();
        for (const a of assignments) {
          const dbCourse = dbCourses.find(
            (c) => c.platform_id === platformId && c.external_id === a.courseId
          );
          if (!dbCourse) continue;
          await upsertAssignment(
            dbCourse.id,
            a.assignmentId,
            a.title,
            a.dueAt,
            null,
            a.url
          );
        }
      }

      const [assignments, courses] = await Promise.all([
        getAssignments(),
        getCourses(),
      ]);
      set({ assignments, courses, isSyncing: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed";
      set({ syncError: message, isSyncing: false });
      throw err;
    }
  },

  loadNotificationSettings: async () => {
    const notificationSettings = await getNotificationSettings();
    set({ notificationSettings });
  },

  toggleNotification: async (id: number) => {
    await toggleNotificationSetting(id);
    const notificationSettings = await getNotificationSettings();
    set({ notificationSettings });
  },

  addNotification: async (hoursBefore: number) => {
    await addNotificationSetting(hoursBefore);
    const notificationSettings = await getNotificationSettings();
    set({ notificationSettings });
  },

  removeNotification: async (id: number) => {
    await deleteNotificationSetting(id);
    const notificationSettings = await getNotificationSettings();
    set({ notificationSettings });
  },
}));
