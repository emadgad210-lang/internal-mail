// سيرفر بسيط لتشغيل "بريد الشركة الداخلي" على جهاز في مكتبك، بحيث كل الموظفين
// على نفس الشبكة يقدروا يدخلوا عليه ويشاركوا نفس البيانات (الحسابات والرسائل).
// لا يحتاج تثبيت أي مكتبات إضافية (npm install) — يعتمد بس على Node.js نفسه.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000; // الاستضافات السحابية بتحدد المنفذ تلقائي عن طريق PORT
// لو معرّف متغير بيئة DATA_DIR (بيتحدد من إعدادات الاستضافة عند ربط قرص دائم)
// هيتخزن فيه data.json، وإلا هيتخزن جنب السيرفر نفسه (للتشغيل المحلي)
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
const PUBLIC_DIR = path.join(__dirname, 'public');

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // --- API لتخزين/قراءة البيانات (حسابات + رسائل) ---
  if (url.pathname.startsWith('/api/storage/')) {
    const key = decodeURIComponent(url.pathname.replace('/api/storage/', ''));

    if (req.method === 'GET') {
      const data = loadData();
      if (!(key in data)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ key, value: data[key] }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const data = loadData();
          data[key] = parsed.value;
          saveData(data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ key, value: parsed.value }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'bad request' }));
        }
      });
      return;
    }
  }

  // --- تقديم ملفات الموقع (صفحة البريد نفسها) ---
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(PUBLIC_DIR, filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('الصفحة غير موجودة');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log('===================================================');
  console.log(`سيرفر بريد الشركة شغال على المنفذ ${PORT}`);
  console.log(`افتحه من نفس الجهاز عن طريق: http://localhost:${PORT}`);
  console.log('لباقي الموظفين على نفس الشبكة: استخدم عنوان IP بتاع هذا الجهاز بدل localhost');
  console.log('===================================================');
});
