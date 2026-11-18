/* BarStreet API client. Same-origin; the <base href> points at /octogame/barstreet/. */
(function () {
  "use strict";

  const API_BASE = "api";
  const STORAGE_KEY = "barstreet.passport.v1";

  let passport = null;
  try {
    passport = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (_err) {
    passport = null;
  }

  function savePassport(value) {
    passport = value || null;
    try {
      if (passport) localStorage.setItem(STORAGE_KEY, JSON.stringify(passport));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_err) {
      /* private mode: keep in memory only */
    }
  }

  async function request(path, options) {
    const opts = options || {};
    const headers = {};
    if (opts.body !== undefined && opts.body !== null) headers["Content-Type"] = "application/json";
    if (passport && passport.passport_id) headers["X-Passport"] = passport.passport_id;

    let response;
    try {
      response = await fetch(API_BASE + path, {
        method: opts.method || "GET",
        headers,
        body: opts.body === undefined || opts.body === null ? undefined : JSON.stringify(opts.body),
        cache: "no-store",
      });
    } catch (_err) {
      const err = new Error("网络连接失败，请确认店里 Wi-Fi 或稍后再试");
      err.status = 0;
      throw err;
    }

    let data = null;
    const text = await response.text();
    if (text) {
      try { data = JSON.parse(text); } catch (_err) { data = { detail: text }; }
    }
    if (!response.ok) {
      const detail = data && (data.detail || data.message);
      const err = new Error(typeof detail === "string" ? detail : "请求失败 (" + response.status + ")");
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  window.BarStreetAPI = {
    request,
    getPassport: function () { return passport; },
    setPassport: savePassport,
    clearPassport: function () { savePassport(null); },
  };
})();
