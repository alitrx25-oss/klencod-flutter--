// خادم بدون أي مكتبات خارجية - Node.js فقط
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data'), PUB = path.join(__dirname, 'public');
const AF = path.join(DATA, 'admin.json'), CF = path.join(DATA, 'settings.json');

// ===== بيانات الدخول الافتراضية للأدمن (غيّرها من لوحة الادمن أو من المتغيرات) =====
const DEFAULT_ID = process.env.ADMIN_ID || '100200';          // رقم التسجيل
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026'; // كلمة السر
// ==================================================================================

const DEFAULT_CFG = {
  appName: 'مواقيت الصلاة',
  jumaaMessage: 'جمعة مباركة 🌙 لا تنسَ قراءة سورة الكهف والإكثار من الصلاة على النبي ﷺ',
  adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  announcements: [],
  extraAzkar: []
};

fs.mkdirSync(DATA, { recursive: true });
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString('hex');
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const mkAdmin = (id, pw) => { const salt = crypto.randomBytes(16).toString('hex'); return { id: String(id), salt, hash: hashPw(pw, salt) }; };
if (!fs.existsSync(AF)) fs.writeFileSync(AF, JSON.stringify(mkAdmin(DEFAULT_ID, DEFAULT_PASSWORD)));
if (!fs.existsSync(CF)) fs.writeFileSync(CF, JSON.stringify(DEFAULT_CFG, null, 2));

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const tokens = new Map();            // token -> expiry
const fails = new Map();             // ip -> {n, until}
const TOKEN_MS = 12 * 3600 * 1000;

function checkLogin(id, pw) {
  const a = readJson(AF);
  const okId = crypto.timingSafeEqual(sha(id), sha(a.id));
  const okPw = crypto.timingSafeEqual(Buffer.from(hashPw(pw, a.salt), 'hex'), Buffer.from(a.hash, 'hex'));
  return okId && okPw;
}
function authed(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  const exp = tokens.get(t);
  if (!exp || exp < Date.now()) { tokens.delete(t); return false; }
  return true;
}
const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
function clean(c) {
  const adj = {}; ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(k => {
    adj[k] = Math.max(-30, Math.min(30, parseInt(c.adjustments && c.adjustments[k]) || 0));
  });
  return {
    appName: str(c.appName, 40) || DEFAULT_CFG.appName,
    jumaaMessage: str(c.jumaaMessage, 400),
    adjustments: adj,
    announcements: (Array.isArray(c.announcements) ? c.announcements : []).slice(0, 30)
      .map(a => ({ id: str(a.id, 30) || String(Date.now()), text: str(a.text, 500), date: str(a.date, 30) })).filter(a => a.text),
    extraAzkar: (Array.isArray(c.extraAzkar) ? c.extraAzkar : []).slice(0, 50)
      .map(z => ({ title: str(z.title, 80), text: str(z.text, 1500) })).filter(z => z.text)
  };
}

function body(req) {
  return new Promise((res, rej) => {
    let d = ''; req.on('data', c => { d += c; if (d.length > 200000) { rej(new Error('big')); req.destroy(); } });
    req.on('end', () => { try { res(JSON.parse(d || '{}')); } catch (e) { rej(e); } });
  });
}
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };

http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/api/config' && req.method === 'GET') return send(res, 200, readJson(CF));

    if (url.pathname === '/api/admin/login' && req.method === 'POST') {
      const ip = req.socket.remoteAddress, f = fails.get(ip) || { n: 0, until: 0 };
      if (f.until > Date.now()) return send(res, 429, { error: 'محاولات كثيرة، حاول بعد قليل' });
      const b = await body(req);
      if (checkLogin(str(b.id, 60), str(b.password, 100))) {
        fails.delete(ip);
        const t = crypto.randomBytes(32).toString('hex'); tokens.set(t, Date.now() + TOKEN_MS);
        return send(res, 200, { token: t });
      }
      f.n++; if (f.n >= 5) { f.until = Date.now() + 10 * 60000; f.n = 0; } fails.set(ip, f);
      return send(res, 401, { error: 'رقم التسجيل أو كلمة السر غير صحيحة' });
    }

    if (url.pathname === '/api/admin/config' && req.method === 'PUT') {
      if (!authed(req)) return send(res, 401, { error: 'غير مصرح' });
      const c = clean(await body(req)); fs.writeFileSync(CF, JSON.stringify(c, null, 2)); return send(res, 200, c);
    }

    if (url.pathname === '/api/admin/password' && req.method === 'POST') {
      if (!authed(req)) return send(res, 401, { error: 'غير مصرح' });
      const b = await body(req), a = readJson(AF);
      if (!checkLogin(a.id, str(b.oldPassword, 100))) return send(res, 400, { error: 'كلمة السر الحالية غير صحيحة' });
      const np = str(b.newPassword, 100); if (np.length < 8) return send(res, 400, { error: 'كلمة السر لازم تكون 8 أحرف على الأقل' });
      fs.writeFileSync(AF, JSON.stringify(mkAdmin(str(b.newId, 60) || a.id, np)));
      tokens.clear(); return send(res, 200, { ok: true });
    }

    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' });

    let p = url.pathname === '/' ? '/index.html' : url.pathname === '/admin' ? '/admin.html' : decodeURIComponent(url.pathname);
    const file = path.normalize(path.join(PUB, p));
    if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) { send(res, 400, { error: 'طلب غير صالح' }); }
}).listen(PORT, () => console.log(`✅ التطبيق شغال على http://localhost:${PORT}  |  لوحة الادمن: http://localhost:${PORT}/admin`));
