/* ═══════════════════════════════════════════════
   MySellerDesk — Landing Page Tracker
   - Sends pageview/conversion to visitor_events
   - Heartbeat every 30s to active_sessions
   - On unload: removes session (live count drops)
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

  /* ── Country (via timezone) ── */
  function getCountry() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
    } catch (e) {
      return "Unknown";
    }
  }

  const SESSION_ID  = getSessionId();
  const VISITOR_ID  = getVisitorId();
  const DEVICE      = getDevice();
  const SOURCE      = getSource();
  const COUNTRY     = getCountry();

  /* ── Send event to visitor_events ── */
  async function track(eventType, extra) {
    const payload = {
      event_type: eventType,
      visitor_id: VISITOR_ID,
      session_id: SESSION_ID,
      device: DEVICE,
      source: SOURCE,
      country: COUNTRY,
      page_url: window.location.href,
      ...extra
    };
    try {
      await fetch(`${SUPA_URL}/rest/v1/visitor_events`, {
        method: "POST",
        headers: { ...HEADERS, "Prefer": "return=minimal" },
        body: JSON.stringify(payload)
      });
    } catch (e) {}
  }

  /* ── Upsert to active_sessions (heartbeat) ── */
  async function heartbeat() {
    const payload = {
      session_id: SESSION_ID,
      visitor_id: VISITOR_ID,
      device: DEVICE,
      source: SOURCE,
      country: COUNTRY,
      page_url: window.location.href,
      last_seen: new Date().toISOString()
    };
    try {
      await fetch(`${SUPA_URL}/rest/v1/active_sessions`, {
        method: "POST",
        headers: { ...HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(payload)
      });
    } catch (e) {}
  }

  /* ── Remove session on tab close ── */
  function removeSession() {
    const url = `${SUPA_URL}/rest/v1/active_sessions?session_id=eq.${SESSION_ID}`;
    // Use sendBeacon for reliability on unload
    const blob = new Blob([], { type: "application/json" });
    navigator.sendBeacon(
      url + "&_method=DELETE",
      blob
    );
    // Fallback fetch (sync-ish)
    try {
      fetch(url, { method: "DELETE", headers: HEADERS, keepalive: true });
    } catch (e) {}
  }

  /* ── 1. Page View + first heartbeat ── */
  track("pageview");
  heartbeat();

  /* ── 2. Heartbeat every 30 seconds ── */
  setInterval(heartbeat, 30000);

  /* ── 3. Remove on close/navigate away ── */
  window.addEventListener("beforeunload", removeSession);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      removeSession();
    }
  });

  /* ── 4. Conversion — CTA button clicks ── */
  document.addEventListener("click", function (e) {
    const el = e.target.closest("a, button");
    if (!el) return;
    const href = el.getAttribute("href") || "";
    const text = (el.textContent || "").trim().slice(0, 80);
    if (href.includes("app.mysellerdesk.in")) {
      track("conversion", { conversion_label: text });
    }
  });

  /* ── 5. Scroll depth ── */
  const scrollMarks = new Set();
  window.addEventListener("scroll", function () {
    const pct = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    );
    [25, 50, 75, 100].forEach(function (mark) {
      if (pct >= mark && !scrollMarks.has(mark)) {
        scrollMarks.add(mark);
        track("scroll_depth", { conversion_label: mark + "%" });
      }
    });
  }, { passive: true });

})();
