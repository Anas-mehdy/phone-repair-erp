export function getPostHogBrowserSnippet() {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim().replace(/\/$/, "");
  if (!token || !host) return null;

  const safeToken = JSON.stringify(token);
  const safeHost = JSON.stringify(host);
  const safeEnvironment = JSON.stringify(process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown");

  return `
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

function masarAnalyticsSanitizePath(pathname) {
  var parts = String(pathname || "/").split("/").filter(Boolean);
  if (!parts.length) return "/";
  var first = parts[0];
  if (first === "register" && parts[1] === "partner" && parts.length > 2) {
    return "/register/partner/:token" + (parts.length > 3 ? "/" + parts.slice(3).join("/") : "");
  }
  var publicToken = {"track":1,"installment-track":1,"partner-invite":1};
  var dynamic = {"repair-orders":1,"sales":1,"inventory":1,"customers":1,"invoices":1,"debts":1,"suppliers":1,"electronic-services":1,"software-services":1};
  var statics = {"new":1,"templates":1,"reconcile":1,"reports":1,"print":1,"edit":1};
  var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var ticket = /^(?:RO|SALE|INV)-[A-Z0-9-]+$/i;
  if (publicToken[first] && parts.length > 1) {
    return "/" + first + "/:token" + (parts.length > 2 ? "/" + parts.slice(2).join("/") : "");
  }
  for (var i = 0; i < parts.length; i++) {
    if (uuid.test(parts[i]) || ticket.test(parts[i])) parts[i] = ":id";
    else if (i === 1 && dynamic[first] && !statics[parts[i]]) parts[i] = ":id";
  }
  return "/" + parts.join("/");
}

function masarAnalyticsSafeUrl(value) {
  if (typeof value !== "string" || !value) return value;
  try {
    if (/^https?:\\/\\//i.test(value)) {
      var parsed = new URL(value);
      if (parsed.origin === window.location.origin) return parsed.origin + masarAnalyticsSanitizePath(parsed.pathname);
      return parsed.origin;
    }
    if (value.slice(0, 2) === "//") return new URL(window.location.protocol + value).origin;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value.split(":", 1)[0].toLowerCase() + ":";
    if (value.charAt(0) === "/") return masarAnalyticsSanitizePath(value.split("?")[0].split("#")[0]);
  } catch (_) {}
  return value;
}

function masarAnalyticsRedactReplayUrls(value, depth) {
  if (depth > 12 || value == null) return value;
  if (typeof value === "string") return masarAnalyticsSafeUrl(value);
  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) value[i] = masarAnalyticsRedactReplayUrls(value[i], depth + 1);
    return value;
  }
  if (typeof value === "object") {
    for (var key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) value[key] = masarAnalyticsRedactReplayUrls(value[key], depth + 1);
    }
  }
  return value;
}

posthog.init(${safeToken}, {
  api_host: ${safeHost},
  loaded: function(ph) { ph.register({ app_environment: ${safeEnvironment} }); ph.stopSessionRecording(); },
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  capture_performance: false,
  disable_session_recording: false,
  save_referrer: false,
  save_campaign_params: false,
  disable_capture_url_hashes: true,
  person_profiles: "identified_only",
  get_current_url: function() {
    return window.location.origin + masarAnalyticsSanitizePath(window.location.pathname);
  },
  before_send: function(event) {
    if (!event || !event.properties) return event;
    var props = event.properties;
    props.$current_url = window.location.origin + masarAnalyticsSanitizePath(window.location.pathname);
    props.$pathname = masarAnalyticsSanitizePath(window.location.pathname);
    if (typeof props.$session_entry_url === "string") props.$session_entry_url = masarAnalyticsSafeUrl(props.$session_entry_url);
    delete props.$referrer;
    delete props.$initial_referrer;
    delete props.$initial_current_url;
    if (props.$snapshot_data) props.$snapshot_data = masarAnalyticsRedactReplayUrls(props.$snapshot_data, 0);
    return event;
  },
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "*",
    recordHeaders: false,
    recordBody: false,
    maskCapturedNetworkRequestFn: function(request) {
      if (request && request.name) request.name = masarAnalyticsSafeUrl(request.name);
      return request;
    }
  }
});
posthog.stopSessionRecording();
`;
}
