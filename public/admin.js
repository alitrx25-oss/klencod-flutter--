const $ = s => document.querySelector(s);
const NAMES = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
let token = sessionStorage.getItem('adm_t'), cfg = null;
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
async function api(url, method, data) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: data ? JSON.stringify(data) : undefined });
  const j = await r.json().catch(() => ({})); if (r.status === 401 && token) { logout(); } if (!r.ok) throw new Error(j.error || 'خطأ'); return j;
}
function logout() { sessionStorage.removeItem('adm_t'); token = null; $('#panel').hidden = true; $('#login').hidden = false; }
$('#loginBtn').onclick = async () => {
  $('#lerr').textContent = '';
  try { const j = await api('/api/admin/login', 'POST', { id: $('#id').value, password: $('#pw').value }); token = j.token; sessionStorage.setItem('adm_t', token); $('#pw').value = ''; start(); }
  catch (e) { $('#lerr').textContent = e.message; }
};
$('#pw').onkeydown = e => e.key === 'Enter' && $('#loginBtn').click();
$('#out').onclick = logout;

async function start() {
  if (!token) return;
  cfg = await (await fetch('/api/config', { cache: 'no-store' })).json();
  $('#login').hidden = true; $('#panel').hidden = false;
  $('#appName').value = cfg.appName; $('#jumaa').value = cfg.jumaaMessage;
  const g = $('#adj'); g.replaceChildren();
  Object.keys(NAMES).forEach(k => { const w = el('div'); w.append(el('label', '', NAMES[k])); const i = el('input'); i.type = 'number'; i.min = -30; i.max = 30; i.id = 'adj_' + k; i.value = (cfg.adjustments || {})[k] || 0; w.append(i); g.append(w); });
  drawLists();
}
function drawLists() {
  const a = $('#anns'); a.replaceChildren();
  cfg.announcements.forEach((n, i) => { const r = el('div', 'item'); r.append(el('div', '', n.text)); const b = el('button', '', 'حذف'); b.onclick = () => { cfg.announcements.splice(i, 1); drawLists(); }; r.append(b); a.append(r); });
  const z = $('#azk'); z.replaceChildren();
  cfg.extraAzkar.forEach((n, i) => { const r = el('div', 'item'); r.append(el('div', '', (n.title ? n.title + ': ' : '') + n.text)); const b = el('button', '', 'حذف'); b.onclick = () => { cfg.extraAzkar.splice(i, 1); drawLists(); }; r.append(b); z.append(r); });
}
$('#addAnn').onclick = () => { const t = $('#newAnn').value.trim(); if (!t) return; cfg.announcements.unshift({ id: String(Date.now()), text: t, date: new Date().toLocaleDateString('ar-EG') }); $('#newAnn').value = ''; drawLists(); };
$('#addZ').onclick = () => { const t = $('#newZ').value.trim(); if (!t) return; cfg.extraAzkar.push({ title: $('#newZT').value.trim(), text: t }); $('#newZ').value = $('#newZT').value = ''; drawLists(); };
$('#save').onclick = async () => {
  cfg.appName = $('#appName').value; cfg.jumaaMessage = $('#jumaa').value; cfg.adjustments = {};
  Object.keys(NAMES).forEach(k => cfg.adjustments[k] = parseInt($('#adj_' + k).value) || 0);
  try { cfg = await api('/api/admin/config', 'PUT', cfg); $('#msg').className = 'msg'; $('#msg').textContent = '✅ تم الحفظ والنشر'; drawLists(); }
  catch (e) { $('#msg').className = 'msg err'; $('#msg').textContent = e.message; }
};
$('#chg').onclick = async () => {
  try { await api('/api/admin/password', 'POST', { oldPassword: $('#op').value, newPassword: $('#np').value, newId: $('#nid').value }); alert('تم التغيير، سجّل دخول من جديد'); logout(); }
  catch (e) { $('#pmsg').className = 'msg err'; $('#pmsg').textContent = e.message; }
};
start();
