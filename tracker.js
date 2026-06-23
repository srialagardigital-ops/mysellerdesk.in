/**
 * Landing Page Visitor Tracker
 * Add this script to your landing page <head> or before </body>
 * Replace ADMIN_PANEL_URL with your actual admin panel endpoint
 */

(function () {
  const CONFIG = {
    endpoint: "https://YOUR_ADMIN_PANEL_URL/api/track",
    siteId: "landing-page",
  };

  function getSessionId() {
    let sid = sessionStorage.getItem("_sid");
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("_sid", sid);
    }
    return sid;
  }

  function getVisitorId() {
    let vid = localStorage.getItem("_vid");
    if (!vid) {
      vid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("_vid", vid);
    }
    return vid;
  }

  function getDevice() {
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) return "Tablet";
    if (/mobile|android|iphone/i.test(ua)) return "Mobile";
    return "Desktop";
  }

  function getSource() {
    const ref = document.referrer;
    if (!ref) return "Direct";
    const url = new URL(ref);
    const host = url.hostname.replace("www.", "");
    if (/google|bing|yahoo|duckduckgo/i.test(host)) return "Search";
    if (/facebook|instagram|twitter|linkedin|youtube/i.test(host)) return "Social";
    return host;
  }

  function getCountry() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
  }

  async function sendEvent(type, extra = {}) {
    const payload = {
      type,
      siteId: CONFIG.siteId,
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      device: getDevice(),
      source: getSource(),
      country: getCountry(),
      url: location.href,
      referrer: document.referrer || "Direct",
      timestamp: new Date().toISOString(),
      ...extra,
    };
    try {
      navigator.sendBeacon
        ? navigator.sendBeacon(CONFIG.endpoint, JSON.stringify(payload))
        : await fetch(CONFIG.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
          });
    } catch (e) {}
  }

  // Track page view
  sendEvent("pageview");

  // Track conversion (call this manually: window.trackConversion())
  window.trackConversion = function (label = "default") {
    sendEvent("conversion", { conversionLabel: label });
  };

  // Track clicks on CTA buttons (add class="track-cta" to your buttons)
  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".track-cta, [data-track]");
    if (btn) {
      sendEvent("conversion", {
        conversionLabel: btn.dataset.track || btn.innerText || "cta-click",
      });
    }
  });
})();
