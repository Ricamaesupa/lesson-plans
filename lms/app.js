/* LMS Phase 1 — shared helpers.
   Plain JavaScript, no dependencies. Loaded by every page under /lms/.
   Exposes window.LMS = { api, logout, esc, requireAuth }.
*/
(function () {
  'use strict';

  /* HTML-escape a value before inserting it into markup.
     All user-entered text must go through esc() (or textContent). */
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* Fetch JSON from the LMS API.
     - Sends JSON and parses a JSON response.
     - Returns null for 204 No Content.
     - On 401 (session expired / not logged in) redirects to the login page.
     - On other error statuses throws an Error with .status and .data
       (data is the parsed {"error": "..."} body when present). */
  async function api(path, options) {
    options = options || {};
    var res = await fetch(path, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin'
    });
    if (res.status === 401) {
      window.location.href = '/lms/login.html';
      throw new Error('unauthorized');
    }
    if (res.status === 204) return null;
    var data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      var err = new Error((data && data.error) || ('Request failed: ' + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /* Log out, then go to the login page. */
  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* already logged out */ }
    window.location.href = '/lms/login.html';
  }

  /* Check the current session. Returns true when authenticated,
     otherwise redirects to the login page and returns false. */
  async function requireAuth() {
    var res;
    try {
      res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    } catch (e) {
      return false; /* network error — let the page's own API call surface it */
    }
    if (!res.ok) {
      window.location.href = '/lms/login.html';
      return false;
    }
    return true;
  }

  /* ---------- Teacher Hub sidebar (navigation spec 2026-11-21) ----------
     One sidebar on every LMS page after login, rendered from this single
     list so the nav cannot drift between pages. Labels and subtitles are
     Rica's exact words. Each page sets data-nav="..." on <body> to mark
     its item active; the login page has no data-nav and stays clean.
     Works on plain static hosting (no server-side includes). */
  var NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', sub: 'Overview and analytics', href: 'index.html' },
    { key: 'curriculum', label: 'Curriculum Library', sub: 'Master curriculum and modules', href: 'curriculum.html' },
    { key: 'students', label: 'Students', sub: 'Profiles and enrollment', href: 'students.html' },
    { key: 'lesson-plans', label: 'Lesson Planning', sub: 'Individual lesson plans', href: 'lesson-plans.html' },
    { key: 'sessions', label: 'Session Management', sub: 'Conduct and record classes', href: 'sessions.html' },
    { key: 'reports', label: 'End-Session Reports', sub: 'Performance and teacher remarks', href: 'reports.html' },
    { key: 'roadmap', label: '25-Session Roadmap', sub: 'Future learning plans', href: 'roadmap.html' },
    { key: 'portfolio', label: 'Achievements & Portfolio', sub: 'Projects and progress reports', href: 'portfolio.html' },
    { key: 'analytics', label: 'Analytics', sub: 'Learning statistics', href: 'analytics.html' }
  ];

  function renderNav(activeKey) {
    var key = activeKey || (document.body && document.body.getAttribute('data-nav'));
    if (!key || document.getElementById('teacher-hub')) return;
    var aside = document.createElement('aside');
    aside.className = 'teacher-hub';
    aside.id = 'teacher-hub';
    aside.setAttribute('aria-label', 'Teacher Hub');
    var html = '<div class="hub-brand">TEACHER HUB</div>';
    NAV_ITEMS.forEach(function (item) {
      var active = item.key === key;
      html += '<a class="hub-item' + (active ? ' active' : '') + '" href="' + item.href + '"' +
        (active ? ' aria-current="page"' : '') + '>' +
        '<span class="hub-item-label">' + esc(item.label) + '</span>' +
        '<span class="hub-item-sub">' + esc(item.sub) + '</span>' +
        '<span class="hub-item-arrow" aria-hidden="true">&rsaquo;</span></a>';
    });
    html += '<button class="hub-logout" data-logout type="button">Logout</button>';
    aside.innerHTML = html;
    document.body.insertBefore(aside, document.body.firstChild);
    document.body.classList.add('has-hub');
  }

  window.LMS = { api: api, logout: logout, esc: esc, requireAuth: requireAuth, renderNav: renderNav, NAV_ITEMS: NAV_ITEMS };

  /* Render the sidebar as soon as the DOM is ready (app.js loads at the
     end of <body>, so this is normally still before DOMContentLoaded). */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { renderNav(); });
  } else {
    renderNav();
  }

  /* Any button/link with [data-logout] logs the teacher out. */
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-logout]') : null;
    if (t) {
      e.preventDefault();
      logout();
    }
  });
})();
