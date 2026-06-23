/* ═══════════════════════════════════════════════
   MySellerDesk — Landing Page Tracker
   Sends visitor events → Supabase visitor_events
═══════════════════════════════════════════════ */
(function () {
  const SUPA_URL = "https://zkafglojonspzlsfxcdh.supabase.co";
  const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprYWZnbG9qb25zcHpsc2Z4Y2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MDc5NDAsImV4cCI6MjA5MTk4Mzk0MH0._fjfrv1G_n6jAUxqnCYRTNN-ferzfbydmy-bxOzWLIQ";
  const HEADERS = {
    "Content-Type": "application/json",
    "apikey": SUPA_KEY,
    "Authorization": "Bearer " + SUPA_KEY
  };

  /* ── Visitor ID (persistent per browser) ── */
  function getVisitorId() {
    let vid = localStorage.getItem("msd_vid");
    if (!vid) {
      vid = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("msd_vid", vid);
    }
    return vid;
  }

  /* ── Session ID (per tab session) ── */
  function getSessionId() {
    let sid = sessionStorage.getItem("msd_sid");
    if (!sid) {
      sid = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("msd_sid", sid);
    }
    return sid;
  }

  /* ── Device type ── */
  function getDevice() {
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) return "tablet";
    if (/mobile|android|iphone/i.test(ua)) return "mobile";
    return "desktop";
  }

  /* ── Traffic source ── */
  function getSource() {
    const ref = document.referrer;
    if (!ref) return "direct";
    if (/instagram/i.test(ref)) return "instagram";
    if (/facebook|fb\./i.test(ref)) return "facebook";
    if (/google/i.test(ref)) return "google";
    if (/twitter|t\.co/i.test(ref)) return "twitter";
    if (/whatsapp/i.test(ref)) return "whatsapp";
    return new URL(ref).hostname;
  }

  /* ── Country (via timezone fallback) ── */
  function getCountry() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
    } catch (e) {
      return "Unknown";
    }
  }

  /* ── Send event to Supabase ── */
  async function track(eventType, extra) {
    const payload = {
      event_type: eventType,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      device: getDevice(),
      source: getSource(),
      country: getCountry(),
      page_url: window.location.href,
      ...extra
    };

    try {
      await fetch(`${SUPA_URL}/rest/v1/visitor_events`, {
        method: "POST",
        headers: { ...HEADERS, "Prefer": "return=minimal" },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      // Silent fail — don't break the page
    }
  }

  /* ── 1. Page View ── */
  track("pageview");

  /* ── 2. Conversion — CTA button clicks ── */
  document.addEventListener("click", function (e) {
    const el = e.target.closest("a, button");
    if (!el) return;

    const href = el.getAttribute("href") || "";
    const text = (el.textContent || "").trim().slice(0, 80);

    // Any link to app.mysellerdesk.in = conversion
    if (href.includes("app.mysellerdesk.in")) {
      track("conversion", { label: text });
    }
  });

  /* ── 3. Scroll depth (25%, 50%, 75%, 100%) ── */
  const scrollMarks = new Set();
  window.addEventListener("scroll", function () {
    const pct = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    );
    [25, 50, 75, 100].forEach(function (mark) {
      if (pct >= mark && !scrollMarks.has(mark)) {
        scrollMarks.add(mark);
        track("scroll_depth", { label: mark + "%" });
      }
    });
  }, { passive: true });

})();
