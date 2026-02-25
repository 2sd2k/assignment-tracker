import { fetch } from "@tauri-apps/plugin-http";

export interface GradescopeCourse {
  id: string;
  shortName: string;
  name: string;
}

export interface GradescopeAssignment {
  courseId: string;
  courseName: string;
  assignmentId: string;
  title: string;
  dueAt: string | null;
  submitted: boolean;
  url: string;
}

const BASE = "https://www.gradescope.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function buildCookieHeader(cookiesJson: string): string {
  try {
    const cookies = JSON.parse(cookiesJson);
    if (Array.isArray(cookies)) {
      return cookies
        .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
        .join("; ");
    }
    return cookiesJson;
  } catch {
    return cookiesJson;
  }
}

function commonHeaders(cookieHeader: string, accept = "application/json") {
  return {
    Cookie: cookieHeader,
    Accept: accept,
    "User-Agent": UA,
    "X-Requested-With": "XMLHttpRequest",
  };
}

// ─── Check if session is still valid ────────────────────────────────────────

export async function checkSession(cookiesJson: string): Promise<boolean> {
  const cookie = buildCookieHeader(cookiesJson);
  try {
    const res = await fetch(`${BASE}/account`, {
      method: "GET",
      headers: commonHeaders(cookie, "text/html"),
    });
    // If we get redirected to /login or a non-200, session is dead
    if (!res.ok) return false;
    const text = await res.text();
    return !text.includes('action="/login"') && !text.includes('href="/login"');
  } catch {
    return false;
  }
}

// ─── Strategy 1: Extract embedded JSON from dashboard ───────────────────────
// Gradescope (Rails + React) embeds course data as JSON props in the HTML.
// Common patterns: `gon.courses`, `data-react-props`, or inline <script> JSON.

async function fetchCoursesFromDashboard(
  cookieHeader: string
): Promise<GradescopeCourse[]> {
  const res = await fetch(`${BASE}/`, {
    method: "GET",
    headers: commonHeaders(cookieHeader, "text/html"),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 302)
      throw new Error("SESSION_EXPIRED");
    throw new Error(`Gradescope error: ${res.status}`);
  }

  const html = await res.text();
  if (html.includes('action="/login"')) throw new Error("SESSION_EXPIRED");

  const courses: GradescopeCourse[] = [];

  // Strategy 1a: Look for embedded JSON in data-react-props or gon
  // Gradescope embeds course data as a JS object in script tags
  const gonMatch = html.match(/gon\.current_user_courses\s*=\s*(\[[\s\S]*?\]);/);
  if (gonMatch) {
    try {
      const parsed = JSON.parse(gonMatch[1]);
      for (const c of parsed) {
        courses.push({
          id: String(c.id),
          shortName: c.shortname || c.short_name || c.name || "",
          name: c.name || c.shortname || "",
        });
      }
      if (courses.length > 0) return courses;
    } catch { /* fall through */ }
  }

  // Strategy 1b: Look for React props JSON containing courses
  const propsMatches = html.matchAll(/data-react-props="([^"]+)"/g);
  for (const m of propsMatches) {
    try {
      const decoded = m[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      const props = JSON.parse(decoded);
      // Look for courses array in various shapes
      const coursesArr = props.courses || props.activeCourses || props.user?.courses;
      if (Array.isArray(coursesArr)) {
        for (const c of coursesArr) {
          courses.push({
            id: String(c.id),
            shortName: c.shortname || c.short_name || c.name || "",
            name: c.name || c.shortname || "",
          });
        }
        if (courses.length > 0) return courses;
      }
    } catch { /* continue */ }
  }

  // Strategy 1c: Parse course links from HTML as last resort
  // Gradescope dashboard has course cards linking to /courses/{id}
  const linkPattern = /href="\/courses\/(\d+)"[^>]*>/g;
  const seenIds = new Set<string>();
  let linkMatch;
  while ((linkMatch = linkPattern.exec(html)) !== null) {
    const id = linkMatch[1];
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    // Try to find the course name near this link
    const namePattern = new RegExp(
      `href="/courses/${id}"[^>]*>[\\s\\S]*?class="[^"]*courseBox--shortname[^"]*"[^>]*>([^<]+)`,
    );
    const nameMatch = html.match(namePattern);

    // Also try a simpler pattern: the text directly inside the link or nearby heading
    const simpleName = new RegExp(
      `href="/courses/${id}"[^>]*>\\s*([^<]+)<`
    );
    const simpleMatch = html.match(simpleName);

    const name = nameMatch?.[1]?.trim() || simpleMatch?.[1]?.trim() || `Course ${id}`;

    courses.push({ id, shortName: name, name });
  }

  return courses;
}

// ─── Strategy 2: Fetch assignments via JSON endpoint ────────────────────────
// Gradescope course pages serve JSON when requested with the right headers.
// The Rails backend responds to `.json` suffix or Accept: application/json.

async function fetchCourseAssignmentsJson(
  courseId: string,
  cookieHeader: string
): Promise<GradescopeAssignment[] | null> {
  // Try the .json suffix first — many Rails controllers support this
  for (const url of [
    `${BASE}/courses/${courseId}/assignments.json`,
    `${BASE}/courses/${courseId}/assignments`,
  ]) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: commonHeaders(cookieHeader),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("SESSION_EXPIRED");
        continue;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("json")) continue;

      const data = await res.json();
      const assignments: GradescopeAssignment[] = [];

      // Handle various JSON shapes Gradescope might return
      const items = Array.isArray(data)
        ? data
        : data.assignments || data.data || [];

      for (const item of items) {
        if (!item) continue;
        assignments.push({
          courseId,
          courseName: "",  // filled in by caller
          assignmentId: String(item.id),
          title: item.title || item.name || "Untitled",
          dueAt: item.due_date || item.due_at || item.hard_due_date || null,
          submitted:
            item.submission_status === "submitted" ||
            item.student_submission !== null ||
            !!item.submitted_at,
          url: `${BASE}/courses/${courseId}/assignments/${item.id}`,
        });
      }

      if (assignments.length > 0) return assignments;
    } catch (err) {
      if (err instanceof Error && err.message === "SESSION_EXPIRED") throw err;
      // Try next URL
    }
  }

  return null; // JSON not available, caller should fall back
}

// ─── Strategy 3: Parse course page HTML with DOMParser-style parsing ────────
// Proper structured parsing instead of fragile regex.

async function fetchCourseAssignmentsHtml(
  courseId: string,
  cookieHeader: string
): Promise<GradescopeAssignment[]> {
  const res = await fetch(`${BASE}/courses/${courseId}`, {
    method: "GET",
    headers: commonHeaders(cookieHeader, "text/html"),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("SESSION_EXPIRED");
    return [];
  }

  const html = await res.text();
  const assignments: GradescopeAssignment[] = [];

  // Look for embedded React props containing assignments
  const propsMatches = html.matchAll(/data-react-props="([^"]+)"/g);
  for (const m of propsMatches) {
    try {
      const decoded = m[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      const props = JSON.parse(decoded);
      const items = props.assignments || props.table?.assignments || [];
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          assignments.push({
            courseId,
            courseName: "",
            assignmentId: String(item.id),
            title: item.title || item.name || "Untitled",
            dueAt: item.due_date || item.due_at || item.hard_due_date || null,
            submitted: !!item.submitted_at || item.student_submission !== null,
            url: `${BASE}/courses/${courseId}/assignments/${item.id}`,
          });
        }
        return assignments;
      }
    } catch { /* continue */ }
  }

  // Look for inline JSON in script tags
  const scriptPattern = /assignments"?\s*:\s*(\[[\s\S]*?\])\s*[,}]/g;
  let scriptMatch;
  while ((scriptMatch = scriptPattern.exec(html)) !== null) {
    try {
      const items = JSON.parse(scriptMatch[1]);
      for (const item of items) {
        assignments.push({
          courseId,
          courseName: "",
          assignmentId: String(item.id),
          title: item.title || item.name || "Untitled",
          dueAt: item.due_date || item.due_at || item.hard_due_date || null,
          submitted: !!item.submitted_at,
          url: `${BASE}/courses/${courseId}/assignments/${item.id}`,
        });
      }
      if (assignments.length > 0) return assignments;
    } catch { /* continue */ }
  }

  // Last resort: parse assignment links and nearby <time> elements from HTML
  // Pattern: link to /courses/X/assignments/Y with title text, then a <time datetime="...">
  const rowPattern =
    /href="\/courses\/\d+\/assignments\/(\d+)"[^>]*>\s*([^<]+)<[\s\S]*?(?:<time[^>]*datetime="([^"]*)")?/g;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const title = rowMatch[2].trim();
    if (!title || title.length < 2) continue;
    assignments.push({
      courseId,
      courseName: "",
      assignmentId: rowMatch[1],
      title,
      dueAt: rowMatch[3] || null,
      submitted: false,
      url: `${BASE}/courses/${courseId}/assignments/${rowMatch[1]}`,
    });
  }

  return assignments;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch all courses the student is enrolled in on Gradescope.
 */
export async function fetchGradescopeCourses(
  cookiesJson: string
): Promise<GradescopeCourse[]> {
  const cookie = buildCookieHeader(cookiesJson);
  return fetchCoursesFromDashboard(cookie);
}

/**
 * Fetch assignments for a single course.
 * Tries JSON API first, then falls back to HTML parsing.
 */
export async function fetchGradescopeCourseAssignments(
  courseId: string,
  courseName: string,
  cookiesJson: string
): Promise<GradescopeAssignment[]> {
  const cookie = buildCookieHeader(cookiesJson);

  // Try JSON first
  const jsonResult = await fetchCourseAssignmentsJson(courseId, cookie);
  if (jsonResult && jsonResult.length > 0) {
    return jsonResult.map((a) => ({ ...a, courseName }));
  }

  // Fall back to HTML parsing
  const htmlResult = await fetchCourseAssignmentsHtml(courseId, cookie);
  return htmlResult.map((a) => ({ ...a, courseName }));
}

/**
 * Fetch all assignments across all courses.
 * This is the main sync entry point.
 */
export async function fetchAllGradescopeAssignments(
  cookiesJson: string
): Promise<{ courses: GradescopeCourse[]; assignments: GradescopeAssignment[] }> {
  const courses = await fetchGradescopeCourses(cookiesJson);
  const allAssignments: GradescopeAssignment[] = [];

  for (const course of courses) {
    const assignments = await fetchGradescopeCourseAssignments(
      course.id,
      course.name || course.shortName,
      cookiesJson
    );
    allAssignments.push(...assignments);
  }

  return { courses, assignments: allAssignments };
}
