use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

#[derive(Debug, Clone, Serialize)]
pub struct PlatformSyncedPayload {
    pub platform_id: i64,
    pub platform: String,
    pub data: String, // base64-encoded JSON
}

#[tauri::command]
pub async fn open_login_window(
    app: AppHandle,
    url: String,
    label: String,
    platform: String, // "canvas" | "gradescope"
    platform_id: i64,
    base_url: String,
) -> Result<(), String> {
    let injected = Arc::new(AtomicBool::new(false));
    let scraper = build_scraper_script(&platform, &base_url);

    // Captures for on_page_load
    let injected_pl = injected.clone();
    let scraper_pl = scraper.clone();
    let base_url_pl = base_url.clone();

    // Captures for on_navigation
    let app_nav = app.clone();
    let label_nav = label.clone();
    let platform_nav = platform.clone();

    let _window = WebviewWindowBuilder::new(
        &app,
        &label,
        WebviewUrl::External(url.parse().map_err(|e| format!("Invalid URL: {e}"))?),
    )
    .title("Login")
    .inner_size(900.0, 700.0)
    .resizable(true)
    .on_page_load(move |window, payload| {
        if !matches!(
            payload.event(),
            tauri::webview::PageLoadEvent::Finished
        ) {
            return;
        }
        let url_str = payload.url().as_str();
        // Only inject on the target platform's domain, and only after the login page.
        // This prevents wasting the AtomicBool on SSO intermediate pages
        // (e.g. login.microsoftonline.com, accounts.google.com) which don't
        // have "/login" in their path but aren't the Canvas/Gradescope dashboard.
        if !url_str.starts_with(&base_url_pl) || url_str.contains("/login") {
            return;
        }
        // Guard against double injection across multiple Finished events
        if injected_pl
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return;
        }
        let _ = window.eval(&scraper_pl);
    })
    .on_navigation(move |url| {
        let url_str = url.as_str();
        if !url_str.starts_with("https://assignment-tracker.internal/scraped") {
            return true;
        }

        // Extract the base64 data query parameter via raw string parsing
        let data = url_str
            .split('?')
            .nth(1)
            .and_then(|q| q.split('&').find_map(|p| p.strip_prefix("data=")))
            .unwrap_or("")
            .to_owned();

        let _ = app_nav.emit(
            "platform-synced",
            PlatformSyncedPayload {
                platform_id,
                platform: platform_nav.clone(),
                data,
            },
        );

        if let Some(win) = app_nav.get_webview_window(&label_nav) {
            let _ = win.close();
        }

        false // cancel navigation — no real network request
    })
    .build()
    .map_err(|e| format!("Failed to create window: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    let result = if cfg!(target_os = "windows") {
        std::process::Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", &url])
            .spawn()
    } else if cfg!(target_os = "macos") {
        std::process::Command::new("open").arg(&url).spawn()
    } else {
        std::process::Command::new("xdg-open").arg(&url).spawn()
    };
    result.map(|_| ()).map_err(|e| format!("Failed to open URL: {e}"))
}

#[tauri::command]
pub async fn close_login_window(app: AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| format!("Failed to close window: {e}"))?;
    }
    Ok(())
}

fn canvas_scraper_script(_base_url: &str) -> String {
    // Uses relative URLs so the fetch runs with the webview's live session cookies.
    // Navigates to the sentinel URL with base64-encoded JSON on success.
    r#"(async function() {
  if (window.location.pathname.includes('login')) return;
  const start = new Date(Date.now() - 7*86400000).toISOString();
  const [coursesRes, itemsRes] = await Promise.all([
    fetch('/api/v1/courses?enrollment_state=active&per_page=100'),
    fetch('/api/v1/planner/items?per_page=100&start_date=' + start),
  ]);
  if (!coursesRes.ok || !itemsRes.ok) return;
  const courses = await coursesRes.json();
  const items   = await itemsRes.json();
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({ courses, items }))));
  window.location.href = 'https://assignment-tracker.internal/scraped?platform=canvas&data=' + encoded;
})();"#
        .to_string()
}

fn gradescope_scraper_script() -> String {
    // Reads the dashboard DOM for course links, fetches assignments per course,
    // then navigates to the sentinel URL with base64-encoded JSON.
    r#"(async function() {
  const links = document.querySelectorAll('a[href^="/courses/"]');
  const seen = new Set(); const courses = []; const assignments = [];
  for (const a of links) {
    const m = a.href.match(/\/courses\/(\d+)/);
    if (!m || seen.has(m[1])) continue;
    seen.add(m[1]);
    const box = a.closest('[class*="courseBox"]');
    const name = (box?.querySelector('[class*="shortname"]') || a).textContent.trim();
    courses.push({ id: m[1], name: name || 'Course ' + m[1] });
  }
  for (const course of courses) {
    try {
      const r = await fetch('/courses/' + course.id + '/assignments.json');
      if (r.ok && (r.headers.get('content-type')||'').includes('json')) {
        const d = await r.json();
        const items = Array.isArray(d) ? d : (d.assignments || []);
        for (const a of items) {
          assignments.push({
            courseId: course.id, courseName: course.name,
            assignmentId: String(a.id), title: a.title||a.name||'Untitled',
            dueAt: a.due_date||a.due_at||a.hard_due_date||null,
            url: 'https://www.gradescope.com/courses/'+course.id+'/assignments/'+a.id,
          });
        }
        continue;
      }
      // HTML fallback: parse data-react-props for assignments
      const html = await (await fetch('/courses/'+course.id)).text();
      for (const m of html.matchAll(/data-react-props="([^"]+)"/g)) {
        try {
          const p = JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
          const items = p.assignments||p.table?.assignments||[];
          if (items.length) {
            for (const a of items) assignments.push({
              courseId:course.id, courseName:course.name, assignmentId:String(a.id),
              title:a.title||'Untitled', dueAt:a.due_date||a.due_at||null,
              url:'https://www.gradescope.com/courses/'+course.id+'/assignments/'+a.id,
            });
            break;
          }
        } catch(_) {}
      }
    } catch(_) {}
  }
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({ courses, assignments }))));
  window.location.href = 'https://assignment-tracker.internal/scraped?platform=gradescope&data=' + encoded;
})();"#
        .to_string()
}

fn build_scraper_script(platform: &str, base_url: &str) -> String {
    match platform {
        "canvas" => canvas_scraper_script(base_url),
        "gradescope" => gradescope_scraper_script(),
        _ => String::new(),
    }
}
