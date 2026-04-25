/* MySellerDesk landing page helpers */
(function(){
  const cfg = window.SELLERDESK_CONFIG || {};
  function trimSlash(v){ return (v || '').replace(/\/$/, ''); }
  window.getSiteUrl = function(){ return trimSlash(cfg.SITE_URL || window.location.origin); };
  window.getAppUrl = function(){ return trimSlash(cfg.APP_URL || window.location.origin); };
  window.getDashboardUrl = function(){ return getAppUrl() + (cfg.DASHBOARD_PATH || '/index.html'); };
  window.redirectToDashboard = function(){ window.location.href = getDashboardUrl(); };
})();
