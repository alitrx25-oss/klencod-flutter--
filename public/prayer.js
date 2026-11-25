// حساب مواقيت الصلاة والقبلة (بدون إنترنت وبدون مكتبات)
(function (root) {
  const R = d => d * Math.PI / 180, D = r => r * 180 / Math.PI;
  const fix = (a, b) => a - b * Math.floor(a / b);
  const METHODS = {
    egypt:   { name: 'الهيئة المصرية العامة للمساحة', fajr: 19.5, isha: 17.5 },
    makkah:  { name: 'أم القرى (مكة المكرمة)', fajr: 18.5, ishaMin: 90 },
    mwl:     { name: 'رابطة العالم الإسلامي', fajr: 18, isha: 17 },
    isna:    { name: 'أمريكا الشمالية (ISNA)', fajr: 15, isha: 15 },
    karachi: { name: 'جامعة العلوم الإسلامية - كراتشي', fajr: 18, isha: 18 }
  };
  function sun(jd) {
    const d = jd - 2451545.0;
    const g = fix(357.529 + 0.98560028 * d, 360), q = fix(280.459 + 0.98564736 * d, 360);
    const L = fix(q + 1.915 * Math.sin(R(g)) + 0.020 * Math.sin(R(2 * g)), 360);
    const e = 23.439 - 0.00000036 * d;
    const ra = fix(D(Math.atan2(Math.cos(R(e)) * Math.sin(R(L)), Math.cos(R(L)))) / 15, 24);
    const decl = D(Math.asin(Math.sin(R(e)) * Math.sin(R(L))));
    const eqt = fix(q / 15 - ra + 12, 24) - 12;
    return { decl, eqt };
  }
  // y, m (1-12), d => { fajr, sunrise, dhuhr, asr, maghrib, isha } كـ Date
  function times(y, m, d, lat, lng, opt) {
    opt = opt || {};
    const M = METHODS[opt.method] || METHODS.egypt;
    const jd = Date.UTC(y, m - 1, d, 12) / 86400000 + 2440587.5;
    const { decl, eqt } = sun(jd);
    const noon = 12 - lng / 15 - eqt; // بتوقيت UTC
    const ang = (a, ccw) => {
      const c = (-Math.sin(R(a)) - Math.sin(R(decl)) * Math.sin(R(lat))) / (Math.cos(R(decl)) * Math.cos(R(lat)));
      const t = D(Math.acos(Math.max(-1, Math.min(1, c)))) / 15;
      return noon + (ccw ? -t : t);
    };
    const f = opt.asr === 2 ? 2 : 1; // 1 = شافعي/مالكي/حنبلي ، 2 = حنفي
    const asrA = -D(Math.atan(1 / (f + Math.tan(R(Math.abs(lat - decl))))));
    const T = { fajr: ang(M.fajr, true), sunrise: ang(0.833, true), dhuhr: noon, asr: ang(asrA, false), maghrib: ang(0.833, false) };
    T.isha = M.ishaMin ? T.maghrib + M.ishaMin / 60 : ang(M.isha, false);
    const adj = opt.adjust || {}, base = Date.UTC(y, m - 1, d), out = {};
    for (const k in T) out[k] = new Date(base + T[k] * 3600000 + (adj[k] || 0) * 60000);
    return out;
  }
  // اتجاه القبلة بالدرجات من الشمال
  function qibla(lat, lng) {
    const k = R(21.4225), l = R(39.8262 - lng), p = R(lat);
    return fix(D(Math.atan2(Math.sin(l), Math.cos(p) * Math.tan(k) - Math.sin(p) * Math.cos(l))), 360);
  }
  const api = { times, qibla, METHODS };
  if (typeof module !== 'undefined') module.exports = api; else root.Prayer = api;
})(this);
