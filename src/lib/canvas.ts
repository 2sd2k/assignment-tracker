import { fetch } from "@tauri-apps/plugin-http";

export interface CanvasPlannerItem {
  plannable_id: number;
  plannable_type: string;
  plannable: {
    id: number;
    title: string;
    due_at: string | null;
    description?: string;
  };
  html_url: string;
  course_id: number;
  context_name: string;
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
}

function parseCookieHeader(cookiesJson: string): string {
  try {
    const cookies = JSON.parse(cookiesJson);
    if (Array.isArray(cookies)) {
      return cookies.map((c: { name: string; value: string }) => `${c.name}=${c.value}`).join("; ");
    }
    return cookiesJson;
  } catch {
    return cookiesJson;
  }
}

export async function fetchCanvasCourses(
  baseUrl: string,
  cookiesJson: string
): Promise<CanvasCourse[]> {
  const cookieHeader = parseCookieHeader(cookiesJson);
  const allCourses: CanvasCourse[] = [];
  let url = `${baseUrl}/api/v1/courses?enrollment_state=active&per_page=50`;

  while (url) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("SESSION_EXPIRED");
      }
      throw new Error(`Canvas API error: ${response.status}`);
    }

    const data = await response.json() as CanvasCourse[];
    allCourses.push(...data);

    // Handle pagination via Link header
    const linkHeader = response.headers.get("Link");
    url = parseLinkNext(linkHeader);
  }

  return allCourses;
}

export async function fetchPlannerItems(
  baseUrl: string,
  cookiesJson: string
): Promise<CanvasPlannerItem[]> {
  const cookieHeader = parseCookieHeader(cookiesJson);
  const allItems: CanvasPlannerItem[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // Include items from the last week
  let url = `${baseUrl}/api/v1/planner/items?start_date=${startDate.toISOString()}&per_page=50`;

  while (url) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("SESSION_EXPIRED");
      }
      throw new Error(`Canvas API error: ${response.status}`);
    }

    const data = await response.json() as CanvasPlannerItem[];
    allItems.push(...data);

    const linkHeader = response.headers.get("Link");
    url = parseLinkNext(linkHeader);
  }

  return allItems;
}

function parseLinkNext(linkHeader: string | null): string {
  if (!linkHeader) return "";
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : "";
}
