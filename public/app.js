const $ = s => document.querySelector(s);
const CITIES = [
  ['القاهرة', 30.0444, 31.2357, 'Africa/Cairo'], ['الإسكندرية', 31.2001, 29.9187, 'Africa/Cairo'], ['أسوان', 24.0889, 32.8998, 'Africa/Cairo'],
  ['مكة المكرمة', 21.3891, 39.8579, 'Asia/Riyadh'], ['المدينة المنورة', 24.4672, 39.6111, 'Asia/Riyadh'], ['الرياض', 24.7136, 46.6753, 'Asia/Riyadh'],
  ['دبي', 25.2048, 55.2708, 'Asia/Dubai'], ['الكويت', 29.3759, 47.9774, 'Asia/Kuwait'], ['الدوحة', 25.2854, 51.531, 'Asia/Qatar'],
  ['عمّان', 31.9454, 35.9284, 'Asia/Amman'], ['القدس', 31.7683, 35.2137, 'Asia/Jerusalem'], ['بيروت', 33.8938, 35.5018, 'Asia/Beirut'],
  ['بغداد', 33.3152, 44.3661, 'Asia/Baghdad'], ['الخرطوم', 15.5007, 32.5599, 'Africa/Khartoum'], ['طرابلس', 32.8872, 13.1913, 'Africa/Tripoli'],
  ['تونس', 36.8065, 10.1815, 'Africa/Tunis'], ['الجزائر', 36.7538, 3.0588, 'Africa/Algiers'], ['الدار البيضاء', 33.5731, -7.5898, 'Africa/Casablanca']
];
const NAMES = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const AZKAR = [
  { title: 'أذكار الصباح والمساء', text: 'سبحان الله وبحمده (100 مرة)\nلا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير (10 مرات)\nأستغفر الله وأتوب إليه (100 مرة)' },
  { title: 'أذكار بعد الصلاة', text: 'أستغفر الله (3 مرات)\nسبحان الله (33) • الحمد لله (33) • الله أكبر (33)\nثم: لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير' },
  { title: 'الصلاة على النبي ﷺ', text: 'اللهم صلِّ وسلِّم على نبينا محمد' },
  { title: 'الاستغفار', text: 'أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه' }
];

let S = JSON.parse(localStorage.getItem('prayer_s') || 'null') ||
  { city: 0, lat: 30.0444, lng: 31.2357, tz: 'Africa/Cairo', label: 'القاهرة', method: 'egypt', asr: 1, h24: false, notif: false };
let CFG = JSON.parse(localStorage.getItem('prayer_cfg') || 'null') ||
  { appName: 'مواقيت الصلاة', jumaaMessage: '', adjustments: {}, announcements: [], extraAzkar: [] };
const save = () => localStorage.setItem('prayer_s', JSON.stringify(S));

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

// ===== التاريخ والأوقات =====
function ymd() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: S.tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date()).split('-').map(Number);
}
function dayTimes(off) {
  const [y, m, d] = ymd(), dt = new Date(Date.UTC(y, m - 1, d + off));
  return Prayer.times(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), S.lat, S.lng,
    { method: S.method, asr: +S.asr, adjust: CFG.adjustments });
}
const fmt = d => d.toLocaleTimeString('ar-EG', { timeZone: S.tz, hour: '2-digit', minute: '2-digit', hour12: !S.h24 });
function nextPrayer() {
  const now = Date.now();
  for (const off of [0, 1]) { const t = dayTimes(off); for (const k of PRAYERS) if (t[k].getTime() > now) return { k, at: t[k] }; }
}

function renderHeader() {
  $('#appName').textContent = CFG.appName || 'مواقيت الصلاة';
  document.title = CFG.appName || 'مواقيت الصلاة';
  const now = new Date();
  $('#hijri').textContent = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { timeZone: S.tz, day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  $('#greg').textContent = new Intl.DateTimeFormat('ar-EG', { timeZone: S.tz, weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  $('#place').textContent = '📍 ' + S.label;
}
function renderTimes() {
  const t = dayTimes(0), nx = nextPrayer(), box = $('#times'); box.replaceChildren();
  ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(k => {
    const r = el('div', 't' + (k === 'sunrise' ? ' sun' : '') + (nx && nx.k === k ? ' next' : ''));
    r.append(el('span', '', NAMES[k]), el('span', '', fmt(t[k]))); box.append(r);
  });
  const fri = new Intl.DateTimeFormat('en-US', { timeZone: S.tz, weekday: 'long' }).format(new Date()) === 'Friday';
  $('#jumaa').hidden = !(fri && CFG.jumaaMessage); $('#jumaa').textContent = CFG.jumaaMessage || '';
  const a = $('#anns'); a.replaceChildren();
  CFG.announcements.forEach(n => { const c = el('div', 'card ann'); c.append(el('div', '', n.text)); if (n.date) c.append(el('div', 'sub', n.date)); a.append(c); });
  const azk = $('#azkarList'); azk.replaceChildren();
  [...AZKAR, ...(CFG.extraAzkar || [])].forEach(z => { const c = el('div', 'card azk'); c.append(el('h4', '', z.title || 'ذكر'), el('p', '', z.text)); azk.append(c); });
}

let fired = '';
function tick() {
  const nx = nextPrayer(); if (!nx) return;
  const left = Math.max(0, nx.at.getTime() - Date.now()), p = n => String(n).padStart(2, '0');
  $('#nextName').textContent = NAMES[nx.k];
  $('#nextAt').textContent = 'الساعة ' + fmt(nx.at);
  $('#count').textContent = `${p(Math.floor(left / 3600000))}:${p(Math.floor(left / 60000) % 60)}:${p(Math.floor(left / 1000) % 60)}`;
  // تنبيه عند الدخول: بنفحص آخر صلاة عدّت من أقل من 5 ثواني
  const t = dayTimes(0), now = Date.now();
  for (const k of PRAYERS) {
    const diff = now - t[k].getTime(), key = k + t[k].toDateString();
    if (diff >= 0 && diff < 5000 && fired !== key) { fired = key; notify(k); }
  }
  if (new Date().getSeconds() === 0) renderTimes();
}
function beep() {
  try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(); o.connect(c.destination); o.frequency.value = 660; o.start(); o.stop(c.currentTime + 1.2); } catch (e) {}
}
function notify(k) {
  if (!S.notif) return;
  if ('Notification' in window && Notification.permission === 'granted') new Notification('حان الآن موعد صلاة ' + NAMES[k], { icon: 'icon.svg' });
  const a = new Audio('adhan.mp3'); a.onerror = beep; a.play().catch(beep); // ضع ملف الأذان باسم adhan.mp3 داخل public
  if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
}

// ===== القبلة =====
let heading = null;
function drawCompass() {
  const q = Prayer.qibla(S.lat, S.lng);
  $('#kaaba').style.transform = `rotate(${q}deg)`;
  $('#qiblaTxt').textContent = `القبلة: ${Math.round(q)}° من الشمال`;
  if (heading == null) { $('#dial').style.transform = 'rotate(0deg)'; $('#qiblaHint').textContent = 'اضغط "تشغيل البوصلة" ووجّه أعلى الجهاز للأمام'; return; }
  $('#dial').style.transform = `rotate(${-heading}deg)`;
  const diff = Math.abs(((q - heading + 540) % 360) - 180), ok = diff < 5;
  $('#compass').classList.toggle('ok', ok);
  $('#qiblaHint').textContent = ok ? '✅ أنت في اتجاه القبلة' : 'لفّ الجهاز حتى تصبح 🕋 أعلى الدائرة';
  if (ok && navigator.vibrate) navigator.vibrate(30);
}
function onOrient(e) {
  let h = null;
  if (e.webkitCompassHeading != null) h = e.webkitCompassHeading;
  else if (e.alpha != null && (e.absolute || e.type === 'deviceorientationabsolute')) h = 360 - e.alpha;
  if (h != null) { heading = h; drawCompass(); }
}
$('#startCompass').onclick = () => {
  const go = () => { addEventListener('deviceorientationabsolute', onOrient, true); addEventListener('deviceorientation', onOrient, true); };
  if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().then(r => r === 'granted' && go());
  else go();
};

// ===== المسبحة =====
let tas = +localStorage.getItem('prayer_tas') || 0;
const tasDraw = () => $('#tasCount').textContent = tas;
$('#tasPlus').onclick = () => {
  tas++; const tg = +$('#tasTarget').value;
  if (tg && tas > tg) tas = 1;
  if (navigator.vibrate) navigator.vibrate(tg && tas === tg ? [200, 100, 200] : 15);
  localStorage.setItem('prayer_tas', tas); tasDraw();
};
$('#tasReset').onclick = () => { tas = 0; localStorage.setItem('prayer_tas', 0); tasDraw(); };

// ===== الإعدادات =====
function initSettings() {
  const c = $('#city'); CITIES.forEach((x, i) => c.append(new Option(x[0], i))); c.append(new Option('موقعي الحالي (GPS)', 'gps'));
  c.value = S.city === 'gps' ? 'gps' : S.city;
  const m = $('#method'); Object.entries(Prayer.METHODS).forEach(([k, v]) => m.append(new Option(v.name, k)));
  m.value = S.method; $('#asr').value = S.asr; $('#h24').checked = S.h24; $('#notif').checked = S.notif;
  c.onchange = () => { if (c.value === 'gps') return useGps(); const x = CITIES[+c.value]; S = { ...S, city: +c.value, label: x[0], lat: x[1], lng: x[2], tz: x[3] }; refresh(); };
  m.onchange = () => { S.method = m.value; refresh(); };
  $('#asr').onchange = e => { S.asr = +e.target.value; refresh(); };
  $('#h24').onchange = e => { S.h24 = e.target.checked; refresh(); };
  $('#notif').onchange = async e => {
    S.notif = e.target.checked;
    if (S.notif && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    save();
  };
  $('#gps').onclick = useGps;
}
function useGps() {
  navigator.geolocation.getCurrentPosition(p => {
    S = { ...S, city: 'gps', label: 'موقعي الحالي', lat: p.coords.latitude, lng: p.coords.longitude, tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
    $('#city').value = 'gps'; refresh();
  }, () => alert('تعذّر تحديد الموقع، اختر مدينتك يدويًا'), { enableHighAccuracy: true, timeout: 15000 });
}
function refresh() { save(); renderHeader(); renderTimes(); drawCompass(); tick(); }

// ===== التبويبات =====
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + b.dataset.tab));
});

// ===== تحميل إعدادات الأدمن من السيرفر =====
async function loadCfg() {
  try { const r = await fetch('/api/config', { cache: 'no-store' }); CFG = await r.json(); localStorage.setItem('prayer_cfg', JSON.stringify(CFG)); } catch (e) {}
  renderHeader(); renderTimes(); tick();
}
initSettings(); tasDraw(); refresh(); loadCfg(); setInterval(tick, 1000); setInterval(loadCfg, 10 * 60000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
