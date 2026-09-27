// Temirchi CRM — Qo'ng'iroq AI serveri v2 (Gemini)
// Bo'limlar + Ha/Yo'q holati + sabab + mahsulot + yozuvni saqlash + oltin shablon + mijozlar bazasi.
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleAuth } from "google-auth-library";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } });

const API_KEY = process.env.GEMINI_API_KEY;
const PROJECT = process.env.GCP_PROJECT;
const LOCATION = process.env.GCP_LOCATION || "us-central1";
const TOKEN = process.env.DEVICE_TOKEN || "temirchi123";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const DB = path.join(__dirname, "data.json");
const AUDIO_DIR = path.join(__dirname, "audio");
try { if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR); } catch (e) {}

let _authClient = null;
async function vertexToken() {
  if (!_authClient) {
    const opts = { scopes: "https://www.googleapis.com/auth/cloud-platform" };
    if (process.env.GOOGLE_CREDENTIALS) opts.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    _authClient = await new GoogleAuth(opts).getClient();
  }
  return (await _authClient.getAccessToken()).token;
}

const SEED_ORDERS = [{"n": 1, "place": "Жиззах (Зомин)", "phone": "70-482-66-66", "caps": "Ø2.60 × 10", "qty": 10, "sum": 42000000, "paid": 42000000, "rest": 0, "install": "Да", "done": 10, "left": 0, "status": "Закрыто"}, {"n": 2, "place": "Бухоро", "phone": "90-710-33-33", "caps": "Ø2.60 × 4", "qty": 4, "sum": 14800000, "paid": 1500000, "rest": 13300000, "install": "Нет", "done": 0, "left": 4, "status": "В очереди"}, {"n": 3, "place": "Ташвилоят", "phone": "Telegram ID: 88 900?", "caps": "Ø2.60 × 2 / Ø2.20 × 2", "qty": 4, "sum": 16353000, "paid": 16353000, "rest": 0, "install": "Да", "done": 4, "left": 0, "status": "Закрыто"}, {"n": 4, "place": "Нукус — Айдос", "phone": "97-220-30-20", "caps": "Ø2.60 × 6", "qty": 6, "sum": 22200000, "paid": 5000000, "rest": 17200000, "install": "Нет", "done": 0, "left": 6, "status": "В очереди"}, {"n": 5, "place": "Навои", "phone": "93-888-10-00", "caps": "Ø2.60 × 4", "qty": 4, "sum": 14800000, "paid": 1200000, "rest": 13600000, "install": "Нет", "done": 0, "left": 4, "status": "В очереди"}, {"n": 6, "place": "Хоразм", "phone": "99-732-75-75", "caps": "Ø3.00 × 17", "qty": 17, "sum": 74536500, "paid": 10000000, "rest": 64536500, "install": "Нет", "done": 0, "left": 17, "status": "В очереди"}, {"n": 7, "place": "Андижан", "phone": "90-071-38-88", "caps": "Ø2.40 × 2", "qty": 2, "sum": 7600000, "paid": 1000000, "rest": 6600000, "install": "Нет", "done": 0, "left": 2, "status": "В очереди"}, {"n": 8, "place": "Бухара", "phone": "Добавить позже", "caps": "Ø2.60 × 9", "qty": 9, "sum": 33300000, "paid": 23195000, "rest": 10105000, "install": "", "done": 0, "left": 9, "status": "В очереди"}, {"n": 9, "place": "Навои", "phone": "Добавить позже", "caps": "Ø2.20 × 10", "qty": 10, "sum": 28000000, "paid": 0, "rest": 28000000, "install": "Нет (вывоз)", "done": 0, "left": 10, "status": "В очереди"}, {"n": 10, "place": "Кашкадарья — Карши", "phone": "Добавить позже", "caps": "Ø2.60 × 5", "qty": 5, "sum": 19000000, "paid": 1500000, "rest": 17500000, "install": "Нет (отправка)", "done": 0, "left": 5, "status": "В очереди"}, {"n": 11, "place": "Ташкент — Benefit Coffee", "phone": "Добавить позже", "caps": "Ø2.40 × 6 / Ø2.80 × 5", "qty": 11, "sum": 48822000, "paid": 4740000, "rest": 44082000, "install": "Да", "done": 0, "left": 11, "status": "В очереди"}, {"n": 12, "place": "Ташкент — Максим Горький", "phone": "Добавить позже", "caps": "Ø2.60 × 4", "qty": 4, "sum": 18400000, "paid": 0, "rest": 18400000, "install": "Да + доставка", "done": 0, "left": 4, "status": "В очереди"}, {"n": 13, "place": "Джизак", "phone": "Добавить позже", "caps": "Ø2.20 × 5", "qty": 5, "sum": 16000000, "paid": 3000000, "rest": 13000000, "install": "Нет (самовывоз)", "done": 0, "left": 5, "status": "В очереди"}, {"n": 14, "place": "Назарбек", "phone": "Добавить позже", "caps": "Ø2.60 × 2 / Ø2.20 × 2", "qty": 4, "sum": 17000000, "paid": 2000000, "rest": 15000000, "install": "Да + доставка", "done": 0, "left": 4, "status": "В очереди"}];
function load() { try { const d = JSON.parse(fs.readFileSync(DB, "utf8")); if (!d.orders) d.orders = []; return d; } catch (e) { return { calls: [], reminders: [], golden: null, orders: [] }; } }
function save(d) { try { fs.writeFileSync(DB, JSON.stringify(d, null, 2)); } catch (e) { console.error("save xato", e); } }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function clamp(v) { return v == null ? null : Math.max(0, Math.min(100, Math.round(+v || 0))); }
const CATS = ["mijoz", "uy", "shofir", "usta", "boshqa"];
const STATS = ["sotildi", "ikkilandi", "qayta", "yoq", "gaplashildi"];
function extFor(name) { const m = (name || "").toLowerCase().match(/\.[a-z0-9]+$/); return m ? m[0] : ".aac"; }
function mimeFor(name) {
  const n = (name || "").toLowerCase();
  if (n.endsWith(".mp3")) return "audio/mp3";
  if (n.endsWith(".wav")) return "audio/wav";
  if (n.endsWith(".ogg") || n.endsWith(".opus")) return "audio/ogg";
  if (n.endsWith(".m4a") || n.endsWith(".mp4")) return "audio/mp4";
  if (n.endsWith(".aac")) return "audio/aac";
  if (n.endsWith(".flac")) return "audio/flac";
  if (n.endsWith(".amr") || n.endsWith(".3gp")) return "audio/amr";
  return "audio/aac";
}

app.use(express.json());
app.use("/audio", express.static(AUDIO_DIR));

const DASH = "<!doctype html><html lang=\"uz\"><head>\n<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<title>Temirchi Qo'ng'iroq AI</title>\n<style>\n  :root{--bg:#eef1f6;--surface:#fff;--surface-2:#f6f8fb;--line:#e2e7f0;--ink:#141821;--muted:#5b6473;--faint:#8a93a4;--brand:#2757d6;--brand-2:#1c3aa0;--brand-soft:#e7edfd;--good:#15a24a;--good-soft:#e2f6e9;--amber:#e08600;--amber-soft:#fdf0d8;--bad:#dc3546;--bad-soft:#fde5e7;--violet:#7c3aed;--violet-soft:#efe7fd;--shadow:0 1px 2px rgba(20,24,33,.04),0 6px 20px rgba(20,24,33,.06)}\n  @media (prefers-color-scheme:dark){:root{--bg:#0d1017;--surface:#161b24;--surface-2:#1d232e;--line:#2a3240;--ink:#eef2f8;--muted:#9aa4b4;--faint:#6b7688;--brand:#5c86f5;--brand-2:#7b9dff;--brand-soft:#1b2740;--good:#3ad07a;--good-soft:#12301f;--amber:#f6ad3c;--amber-soft:#352a10;--bad:#ff6b78;--bad-soft:#3a1a1e;--violet:#a582f5;--violet-soft:#241a3d;--shadow:0 1px 2px rgba(0,0,0,.3),0 6px 20px rgba(0,0,0,.35)}}\n  *{box-sizing:border-box}\n  body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,system-ui,sans-serif;font-size:14px;line-height:1.45}\n  .wrap{max-width:560px;margin:0 auto;padding:16px 16px 40px}\n  header{display:flex;align-items:center;gap:12px;margin-bottom:14px}\n  .badge{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,var(--brand),var(--brand-2));display:grid;place-items:center;color:#fff;font-weight:800;flex:0 0 auto}\n  h1{font-size:18px;margin:0}.sub{font-size:12px;color:var(--faint)}\n  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}\n  .kpi{background:var(--surface);border:1px solid var(--line);border-radius:13px;padding:10px 8px;box-shadow:var(--shadow);text-align:center}\n  .kpi .v{font-size:20px;font-weight:800;font-family:Georgia,serif}.kpi .l{font-size:10px;color:var(--muted);font-weight:600;margin-top:2px}\n  .toolbtns{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}\n  .datehead{font-size:12px;font-weight:800;color:var(--faint);margin:10px 2px 6px;text-transform:uppercase;letter-spacing:.04em}\n  table.reestr{width:100%;border-collapse:collapse;font-size:12px}\n  table.reestr th{text-align:left;color:var(--muted);font-weight:700;font-size:10.5px;padding:6px 8px;border-bottom:2px solid var(--line);white-space:nowrap}\n  table.reestr td{padding:7px 8px;border-bottom:1px solid var(--line);white-space:nowrap}\n  table.reestr tr:active{background:var(--surface-2)}\n  .oscroll{overflow-x:auto;-webkit-overflow-scrolling:touch}\n  .obadge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px}\n  .o-ochiq{background:var(--amber-soft);color:var(--amber)}.o-yopiq{background:var(--good-soft);color:var(--good)}\n  .toolbtn{display:flex;flex-direction:column;align-items:center;gap:4px;background:var(--surface);border:1px solid var(--line);border-radius:13px;padding:11px 6px;box-shadow:var(--shadow);cursor:pointer;text-align:center;width:100%}\n  .toolbtn .ic{font-size:18px}.toolbtn .t{font-weight:700;font-size:11.5px}\n  .chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:10px;scrollbar-width:none}.chips::-webkit-scrollbar{display:none}\n  .chip{flex:0 0 auto;padding:8px 14px;border-radius:99px;background:var(--surface);border:1px solid var(--line);font-size:13px;font-weight:600;color:var(--muted);cursor:pointer}\n  .chip.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}\n  .callc{display:flex;gap:12px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:12px;margin-bottom:10px;cursor:pointer;width:100%;text-align:left}\n  .sbox{width:52px;height:52px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:0 0 auto;font-weight:800}\n  .sbox .sv{font-size:19px;line-height:1}.sbox .sl{font-size:8px;font-weight:700;letter-spacing:.03em;margin-top:2px}\n  .catbox{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;flex:0 0 auto;font-size:22px;background:var(--surface-2)}\n  .nm{font-weight:700;font-size:14.5px}.meta{font-size:11.5px;color:var(--muted);margin-top:3px}\n  .st{display:inline-flex;align-items:center;padding:3px 9px;border-radius:99px;font-size:10.5px;font-weight:700;white-space:nowrap}\n  .st-sotildi{background:var(--good-soft);color:var(--good)}.st-ikkilandi{background:var(--amber-soft);color:var(--amber)}\n  .st-qayta{background:var(--brand-soft);color:var(--brand)}.st-yoq{background:var(--bad-soft);color:var(--bad)}.st-gaplashildi{background:var(--surface-2);color:var(--faint)}\n  .modal{position:fixed;inset:0;background:rgba(10,14,22,.5);display:none;align-items:flex-end;justify-content:center;z-index:50}\n  .modal.on{display:flex}\n  .sheet{background:var(--surface);width:100%;max-width:560px;max-height:92vh;overflow-y:auto;border-radius:20px 20px 0 0;padding:18px 18px 30px}\n  .grip{width:40px;height:4px;border-radius:9px;background:var(--line);margin:0 auto 14px}\n  .card{background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:14px;margin-bottom:12px}\n  label{display:block;font-size:12px;font-weight:700;color:var(--muted);margin:0 0 6px}\n  input,select{width:100%;padding:11px 12px;border-radius:11px;border:1.5px solid var(--line);background:var(--surface-2);color:var(--ink);font-size:15px;margin-bottom:12px}\n  .btn{width:100%;padding:12px;border:none;border-radius:12px;background:var(--brand);color:#fff;font-weight:700;font-size:15px;cursor:pointer}\n  .row{display:flex;gap:12px;align-items:center}\n  .dim{display:grid;grid-template-columns:74px 1fr 30px;gap:9px;align-items:center;margin-bottom:8px}\n  .dim .dl{font-size:12px;color:var(--muted);font-weight:600}.dim .dt{height:8px;border-radius:9px;background:var(--surface-2);overflow:hidden}.dim .df{height:100%;border-radius:9px}.dim .dv{font-size:12px;font-weight:700;text-align:right}\n  .bubble{padding:9px 12px;border-radius:13px;font-size:13px;margin-bottom:7px;max-width:86%;line-height:1.4}\n  .b-op{background:var(--brand-soft)}.b-cl{background:var(--surface-2);margin-left:auto}\n  .kv{background:var(--surface-2);border-radius:11px;padding:10px 12px}.kv .k{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700}.kv .v{font-weight:700;margin-top:2px;font-size:13.5px}\n  .dlabel{font-size:12px;font-weight:700;color:var(--muted);margin:16px 2px 8px}\n  .reason{background:var(--bad-soft);border:1px solid var(--bad);border-radius:12px;padding:12px;font-size:13px;line-height:1.5}.reason b{color:var(--bad)}\n  .noteinput{width:100%;padding:11px 12px;border-radius:11px;border:1.5px solid var(--line);background:var(--surface-2);color:var(--ink);font-size:14px;font-family:inherit;min-height:60px;resize:vertical}\n  .goldstep{display:flex;gap:10px;margin-bottom:12px}.goldstep .n{width:22px;height:22px;border-radius:50%;background:var(--amber);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800;flex:0 0 auto}\n  .goldstep .tt{font-weight:700;font-size:13.5px}.goldstep .dd{font-size:12.5px;color:var(--muted);margin-top:2px;line-height:1.45}\n  .clientrow{display:flex;gap:11px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line)}.clientrow:last-child{border-bottom:none}\n  .ava{width:40px;height:40px;border-radius:11px;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:700;flex:0 0 auto}\n  .resell{background:var(--violet-soft);color:var(--violet);font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;margin-top:3px;display:inline-block}\n  .note{font-size:11.5px;color:var(--muted);background:var(--surface-2);border-radius:10px;padding:9px 11px;margin-top:12px;line-height:1.45}\n  .spin{width:16px;height:16px;border:2px solid var(--amber-soft);border-top-color:var(--amber);border-radius:50%;animation:sp .8s linear infinite;display:inline-block;vertical-align:middle}\n  @keyframes sp{to{transform:rotate(360deg)}}\n  .empty{text-align:center;color:var(--faint);padding:24px;font-size:13px}\n</style></head><body>\n<div class=\"wrap\">\n  <header><div class=\"badge\">T</div><div><h1>Temirchi Qo'ng'iroq AI</h1><div class=\"sub\">Har suhbatni AI eshitib baholaydi</div></div></header>\n  <div class=\"kpis\" id=\"kpis\"></div>\n  <div class=\"toolbtns\">\n    <button class=\"toolbtn\" id=\"btnUpload\"><div class=\"ic\">⬆️</div><div class=\"t\">Yuklash</div></button>\n    <button class=\"toolbtn\" id=\"btnOrders\"><div class=\"ic\">📋</div><div class=\"t\">Buyurtma</div></button>\n    <button class=\"toolbtn\" id=\"btnClients\"><div class=\"ic\">🗂</div><div class=\"t\">Mijozlar</div></button>\n    <button class=\"toolbtn\" id=\"btnGold\"><div class=\"ic\">⭐</div><div class=\"t\">Shablon</div></button>\n  </div>\n  <div class=\"chips\" id=\"chips\"></div>\n  <div id=\"list\"><div class=\"empty\">Yuklanmoqda...</div></div>\n</div>\n<div class=\"modal\" id=\"modal\"><div class=\"sheet\" id=\"sheet\"></div></div>\n<script>\nvar DIMS=[[\"salom\",\"Salom\"],[\"tinglash\",\"Tinglash\"],[\"ehtiyoj\",\"Ehtiyoj\"],[\"taqdimot\",\"Taqdimot\"],[\"ishonch\",\"Ishonch\"],[\"narx\",\"Narx\"],[\"yakun\",\"Yakun\"]];\nvar CATS=[[\"mijoz\",\"Mijoz\",\"🤝\"],[\"uy\",\"Uy\",\"🏠\"],[\"shofir\",\"Shofir\",\"🚚\"],[\"usta\",\"Usta\",\"🔧\"],[\"boshqa\",\"Boshqa\",\"💬\"]];\nvar STLAB={sotildi:\"Sotildi ✓\",ikkilandi:\"Ikkilandi\",qayta:\"Qayta qo'ng'iroq\",yoq:\"Yo'q\",gaplashildi:\"Gaplashildi\"};\nfunction sColor(s){return s>=70?\"var(--good)\":s>=45?\"var(--amber)\":\"var(--bad)\";}\nfunction sSoft(s){return s>=70?\"var(--good-soft)\":s>=45?\"var(--amber-soft)\":\"var(--bad-soft)\";}\nfunction sLab(s){return s>=70?\"YAXSHI\":s>=45?\"O'RTA\":\"PAST\";}\nfunction catIcon(c){for(var i=0;i<CATS.length;i++)if(CATS[i][0]===c)return CATS[i][2];return \"💬\";}\nfunction catName(c){for(var i=0;i<CATS.length;i++)if(CATS[i][0]===c)return CATS[i][1];return \"Boshqa\";}\nfunction esc(s){return String(s==null?\"\":s).replace(/[&<>\"]/g,function(c){return{\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",\"\\\"\":\"&quot;\"}[c];});}\nvar MON=[\"Yan\",\"Fev\",\"Mar\",\"Apr\",\"May\",\"Iyn\",\"Iyl\",\"Avg\",\"Sen\",\"Okt\",\"Noy\",\"Dek\"];\nfunction fmtShort(n){n=+n||0;if(n>=1e6)return (n/1e6).toFixed(n%1e6?1:0).replace(\".\",\",\")+\" mln\";if(n>=1e3)return Math.round(n/1e3)+\" ming\";return String(n);}\nfunction norm(p){return String(p||\"\").replace(/\\D/g,\"\");}\nvar calls=[],curCat=\"mijoz\";\n\nfunction api(u,opt){return fetch(u,opt).then(function(r){return r.json();});}\nfunction load(){\n  api(\"/api/calls\").then(function(d){calls=Array.isArray(d)?d:[];renderKpis();renderChips();renderList();\n    if(calls.some(function(c){return c.procStatus===\"processing\";}))setTimeout(load,3000);\n  }).catch(function(){document.getElementById(\"list\").innerHTML='<div class=\"empty\">Ulanish xatosi</div>';});\n}\nfunction analysisDone(c){return c.analysis&&c.procStatus!==\"processing\";}\n\nfunction renderKpis(){\n  var mij=calls.filter(function(c){return (c.category||\"mijoz\")===\"mijoz\";});\n  function cnt(s){return mij.filter(function(c){return (c.status||\"\")===s;}).length;}\n  document.getElementById(\"kpis\").innerHTML=tile(mij.length,\"Mijoz\",\"var(--ink)\")+tile(cnt(\"sotildi\"),\"Sotildi\",\"var(--good)\")+tile(cnt(\"ikkilandi\")+cnt(\"qayta\"),\"Jarayonда\",\"var(--amber)\")+tile(cnt(\"yoq\"),\"Yo'q\",\"var(--bad)\");\n}\nfunction tile(v,l,c){return '<div class=\"kpi\"><div class=\"v\" style=\"color:'+c+'\">'+v+'</div><div class=\"l\">'+l+'</div></div>';}\nfunction renderChips(){\n  document.getElementById(\"chips\").innerHTML=CATS.map(function(x){\n    var n=calls.filter(function(c){return (c.category||\"mijoz\")===x[0];}).length;\n    return '<button class=\"chip'+(curCat===x[0]?\" on\":\"\")+'\" onclick=\"setCat(\\''+x[0]+'\\')\">'+x[2]+' '+x[1]+' '+n+'</button>';\n  }).join(\"\");\n}\nfunction setCat(c){curCat=c;renderChips();renderList();}\nfunction callCard(c){\n  var d=new Date(c.started_at);var when=(\"0\"+d.getHours()).slice(-2)+\":\"+(\"0\"+d.getMinutes()).slice(-2);\n  if(c.procStatus===\"processing\")return '<div class=\"callc\"><div class=\"catbox\"><span class=\"spin\"></span></div><div><div class=\"nm\">'+esc(c.name||c.phone||\"Qo\\'ng\\'iroq\")+'</div><div class=\"meta\">AI tahlil qilyapti...</div></div></div>';\n  if(c.procStatus===\"error\")return '<div class=\"callc\"><div class=\"catbox\" style=\"color:var(--bad)\">!</div><div><div class=\"nm\">'+esc(c.phone||\"\")+'</div><div class=\"meta\" style=\"color:var(--bad)\">Xato: '+esc((c.error||\"\").slice(0,50))+'</div></div></div>';\n  var a=c.analysis||{},cat=c.category||\"mijoz\",left;\n  if(cat===\"mijoz\"&&a.overall!=null){var s=a.overall;left='<div class=\"sbox\" style=\"background:'+sSoft(s)+';color:'+sColor(s)+'\"><div class=\"sv\">'+s+'</div><div class=\"sl\">'+sLab(s)+'</div></div>';}\n  else left='<div class=\"catbox\">'+catIcon(cat)+'</div>';\n  var stbadge=(cat===\"mijoz\"&&c.status)?'<span class=\"st st-'+c.status+'\">'+(STLAB[c.status]||c.status)+'</span>':'';\n  return '<button class=\"callc\" onclick=\"openCall(\\''+c.id+'\\')\">'+left+\n    '<div style=\"flex:1;min-width:0\"><div style=\"display:flex;justify-content:space-between;gap:8px;align-items:center\"><div class=\"nm\" style=\"white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">'+esc(c.name||c.phone||\"Qo\\'ng\\'iroq\")+'</div>'+stbadge+'</div>'+\n    '<div class=\"meta\">'+esc(c.phone||\"\")+' · '+when+'</div>'+\n    (c.lostReason?'<div class=\"meta\" style=\"color:var(--bad)\">✕ '+esc(c.lostReason)+'</div>':'')+'</div></button>';\n}\nfunction dayLabel(d){var t=new Date();var y=new Date(t.getTime()-86400000);if(d.toDateString()===t.toDateString())return \"Bugun\";if(d.toDateString()===y.toDateString())return \"Kecha\";return d.getDate()+\" \"+MON[d.getMonth()]+\" \"+d.getFullYear();}\nfunction renderList(){\n  var arr=calls.filter(function(c){return (c.category||\"mijoz\")===curCat;});\n  arr.sort(function(a,b){return new Date(b.started_at)-new Date(a.started_at);});\n  if(!arr.length){document.getElementById(\"list\").innerHTML='<div class=\"empty\">Bu bo\\'limда qo\\'ng\\'iroq yo\\'q</div>';return;}\n  var html=\"\",lastDay=\"\";\n  arr.forEach(function(c){\n    var d=new Date(c.started_at),dl=dayLabel(d);\n    if(dl!==lastDay){html+='<div class=\"datehead\">📅 '+dl+'</div>';lastDay=dl;}\n    html+=callCard(c);\n  });\n  document.getElementById(\"list\").innerHTML=html;\n}\nfunction openSheet(html){document.getElementById(\"sheet\").innerHTML='<div class=\"grip\"></div>'+html;document.getElementById(\"modal\").classList.add(\"on\");}\ndocument.getElementById(\"modal\").onclick=function(e){if(e.target===this)this.classList.remove(\"on\");};\nfunction radar(scores){\n  var n=scores.length,cx=130,cy=112,R=72,rings=\"\",axes=\"\",labels=\"\",pts=[];\n  [0.34,0.67,1].forEach(function(k){var rp=\"\";for(var i=0;i<n;i++){var a=(-90+i*360/n)*Math.PI/180;rp+=(i?\" \":\"\")+(cx+R*k*Math.cos(a)).toFixed(1)+\",\"+(cy+R*k*Math.sin(a)).toFixed(1);}rings+='<polygon points=\"'+rp+'\" fill=\"none\" stroke=\"var(--line)\"/>';});\n  for(var i=0;i<n;i++){var a=(-90+i*360/n)*Math.PI/180;axes+='<line x1=\"'+cx+'\" y1=\"'+cy+'\" x2=\"'+(cx+R*Math.cos(a)).toFixed(1)+'\" y2=\"'+(cy+R*Math.sin(a)).toFixed(1)+'\" stroke=\"var(--line)\"/>';var v=Math.max(0,Math.min(100,scores[i].val))/100;pts.push((cx+R*v*Math.cos(a)).toFixed(1)+\",\"+(cy+R*v*Math.sin(a)).toFixed(1));var lr=R+15,lx=cx+lr*Math.cos(a),ly=cy+lr*Math.sin(a),an=Math.abs(Math.cos(a))<0.34?\"middle\":(Math.cos(a)>0?\"start\":\"end\");labels+='<text x=\"'+lx.toFixed(1)+'\" y=\"'+(ly+3).toFixed(1)+'\" text-anchor=\"'+an+'\" font-size=\"10\" font-weight=\"700\" fill=\"var(--muted)\">'+esc(scores[i].label)+'</text>';}\n  var dots=\"\";pts.forEach(function(p){var xy=p.split(\",\");dots+='<circle cx=\"'+xy[0]+'\" cy=\"'+xy[1]+'\" r=\"2.8\" fill=\"var(--brand)\"/>';});\n  return '<svg viewBox=\"0 0 260 224\" width=\"100%\" style=\"max-width:300px;display:block;margin:0 auto\">'+rings+axes+'<polygon points=\"'+pts.join(\" \")+'\" fill=\"var(--brand)\" fill-opacity=\"0.2\" stroke=\"var(--brand)\" stroke-width=\"2\"/>'+dots+labels+'</svg>';\n}\nfunction openCall(id){\n  var c=calls.find(function(x){return x.id===id;});if(!c||!c.analysis)return;var a=c.analysis,cat=c.category||\"mijoz\";var d=new Date(c.started_at);\n  var h='<div style=\"display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px\"><div><div class=\"nm\" style=\"font-size:18px\">'+esc(c.name||c.phone||\"Qo\\'ng\\'iroq\")+'</div><div class=\"sub\">'+esc(c.phone||\"\")+' · '+d.getDate()+\" \"+MON[d.getMonth()]+' · '+catIcon(cat)+' '+catName(cat)+'</div></div>';\n  if(cat===\"mijoz\"&&a.overall!=null){var s=a.overall;h+='<div class=\"sbox\" style=\"width:60px;height:60px;background:'+sSoft(s)+';color:'+sColor(s)+'\"><div class=\"sv\" style=\"font-size:23px\">'+s+'</div><div class=\"sl\">'+sLab(s)+'</div></div>';}\n  h+='</div>';\n  if(cat===\"mijoz\"&&c.status)h+='<div style=\"margin-bottom:12px\"><span class=\"st st-'+c.status+'\" style=\"font-size:12px;padding:5px 12px\">'+(STLAB[c.status]||c.status)+'</span></div>';\n  if(c.product)h+='<div class=\"kv\" style=\"margin-bottom:12px\"><div class=\"k\">Mahsulot · AI ovozdan aniqladi</div><div class=\"v\">📦 '+esc(c.product)+'</div></div>';\n  if(cat===\"mijoz\"&&a.scores){\n    h+='<div class=\"dlabel\">Baholash (7 mezon)</div><div class=\"card\">'+radar(DIMS.map(function(dd){return {label:dd[1],val:a.scores[dd[0]]||0};}))+'</div>';\n    h+='<div class=\"card\">'+DIMS.map(function(dd){var v=a.scores[dd[0]]||0;return '<div class=\"dim\"><div class=\"dl\">'+dd[1]+'</div><div class=\"dt\"><div class=\"df\" style=\"width:'+v+'%;background:'+sColor(v)+'\"></div></div><div class=\"dv\" style=\"color:'+sColor(v)+'\">'+v+'</div></div>';}).join(\"\")+'</div>';\n  }\n  h+='<div class=\"dlabel\">AI xulosa</div><div class=\"card\" style=\"line-height:1.55\">'+esc(a.summary||\"\")+'</div>';\n  if(c.lostReason)h+='<div class=\"dlabel\">Nega sotilmadi (AI aniqladi)</div><div class=\"reason\"><b>✕ '+esc(c.lostReason)+'</b></div>';\n  if(a.nextDate){var nd=new Date(a.nextDate);h+='<div class=\"dlabel\">Keyingi qadam</div><div class=\"card\" style=\"background:var(--amber-soft);border-color:var(--amber)\"><b>'+esc(a.nextAction||\"\")+'</b> — '+nd.getDate()+\" \"+MON[nd.getMonth()]+\", \"+(\"0\"+nd.getHours()).slice(-2)+\":\"+(\"0\"+nd.getMinutes()).slice(-2)+'<br><span class=\"sub\">✓ Avtomatik eslatmaga qo\\'shildi</span></div>';}\n  if(c.audioFile)h+='<div class=\"dlabel\">Qo\\'ng\\'iroq yozuvi</div><div class=\"card\"><audio controls style=\"width:100%\" src=\"/audio/'+encodeURIComponent(c.audioFile)+'\"></audio></div>';\n  h+='<div class=\"dlabel\">Transkript</div><div>'+((a.dialog||[]).map(function(t){var op=(t.who===\"op\");return '<div class=\"bubble '+(op?\"b-op\":\"b-cl\")+'\">'+esc(t.text)+'</div>';}).join(\"\")||'<div class=\"card\">'+esc(c.transcript||\"—\")+'</div>')+'</div>';\n  h+='<div class=\"dlabel\">Sizning izohingiz</div><textarea class=\"noteinput\" id=\"noteInput\">'+esc(c.note||\"\")+'</textarea><button class=\"btn\" style=\"margin-top:8px\" onclick=\"saveNote(\\''+c.id+'\\')\">Izohni saqlash</button>';\n  openSheet(h);\n}\nfunction saveNote(id){var el=document.getElementById(\"noteInput\");var v=el?el.value:\"\";api(\"/api/calls/\"+id,{method:\"POST\",headers:{\"Content-Type\":\"application/json\"},body:JSON.stringify({note:v})}).then(function(){var c=calls.find(function(x){return x.id===id;});if(c)c.note=v;alert(\"Saqlandi ✓\");});}\n\ndocument.getElementById(\"btnUpload\").onclick=function(){\n  openSheet('<div style=\"font-size:17px;font-weight:800;margin-bottom:4px\">Qo\\'ng\\'iroq yuklash</div><div class=\"sub\" style=\"margin-bottom:12px\">Bir nechта fayl tanlash mumkin (100 tagacha eski yozuvni ham).</div>'+\n    '<label>Audio fayl(lar)</label><input type=\"file\" id=\"uAudio\" accept=\"audio/*\" multiple>'+\n    '<label>Telefon raqami (bitta fayl uchun)</label><input id=\"uPhone\" placeholder=\"+998 __ ___ __ __\">'+\n    '<label>Yo\\'nalish</label><select id=\"uDir\"><option value=\"out\">Chiquvchi</option><option value=\"in\">Kiruvchi</option></select>'+\n    '<button class=\"btn\" id=\"uSend\">Yuklash va tahlil</button><div id=\"uMsg\" style=\"font-size:12.5px;margin-top:10px\"></div>');\n  document.getElementById(\"uSend\").onclick=async function(){\n    var files=document.getElementById(\"uAudio\").files,msg=document.getElementById(\"uMsg\");\n    if(!files.length){msg.style.color=\"var(--bad)\";msg.textContent=\"Audio tanlang\";return;}\n    var phone=document.getElementById(\"uPhone\").value,dir=document.getElementById(\"uDir\").value;\n    this.disabled=true;var ok=0,fail=0;\n    for(var i=0;i<files.length;i++){\n      msg.style.color=\"var(--muted)\";msg.textContent=\"Yuborilyapti \"+(i+1)+\"/\"+files.length+\"...\";\n      var fd=new FormData();fd.append(\"audio\",files[i]);if(files.length===1&&phone)fd.append(\"phone\",phone);fd.append(\"direction\",dir);fd.append(\"token\",\"temirchi123\");\n      try{var r=await fetch(\"/api/upload\",{method:\"POST\",body:fd});var d=await r.json();if(d.error)fail++;else ok++;}catch(e){fail++;}\n    }\n    msg.style.color=\"var(--good)\";msg.textContent=\"Yuborildi: \"+ok+\" ta\"+(fail?(\", xato: \"+fail):\"\")+\". AI navbat bilan tahlil qilyapti — pastda chiqadi.\";\n    load();setTimeout(function(){document.getElementById(\"modal\").classList.remove(\"on\");},1800);\n  };\n};\ndocument.getElementById(\"btnClients\").onclick=function(){\n  openSheet('<div style=\"font-size:17px;font-weight:800;margin-bottom:4px\">🗂 Mijozlar (raqam papkasi)</div><div class=\"sub\" style=\"margin-bottom:14px\">Bir raqamdan barcha suhbatlar bitta papkada. Bosib ochasan.</div><div id=\"clBody\"><div class=\"empty\">Yuklanmoqda...</div></div>');\n  api(\"/api/clients\").then(function(cl){\n    if(!cl.length){document.getElementById(\"clBody\").innerHTML='<div class=\"empty\">Hali mijoz yo\\'q</div>';return;}\n    document.getElementById(\"clBody\").innerHTML='<div class=\"card\">'+cl.map(function(c){\n      var cnt=calls.filter(function(x){return norm(x.phone)===norm(c.phone);}).length;\n      return '<div class=\"clientrow\" style=\"cursor:pointer\" onclick=\"openClientFolder(\\''+norm(c.phone)+'\\')\"><div class=\"ava\">📁</div><div style=\"flex:1\"><div class=\"nm\">'+esc(c.name||c.phone)+'</div><div class=\"meta\">'+esc(c.phone)+' · '+cnt+' suhbat</div>'+(c.product?'<div class=\"meta\" style=\"margin-top:2px\">📦 '+esc(c.product)+(c.year?\" (\"+c.year+\")\":\"\")+'</div><span class=\"resell\">🔄 Keyingi yil plyonka almashtirish</span>':'')+'</div></div>';\n    }).join(\"\")+'</div>';\n  });\n};\nfunction openClientFolder(phoneNorm){\n  var arr=calls.filter(function(x){return norm(x.phone)===phoneNorm;}).sort(function(a,b){return new Date(b.started_at)-new Date(a.started_at);});\n  var ph=(arr[0]&&arr[0].phone)||phoneNorm;\n  var h='<div style=\"font-size:17px;font-weight:800;margin-bottom:2px\">📁 '+esc(ph)+'</div><div class=\"sub\" style=\"margin-bottom:12px\">'+arr.length+' ta suhbat</div>';\n  h+=(arr.map(callCard).join(\"\")||'<div class=\"empty\">Suhbat yo\\'q</div>');\n  openSheet(h);\n}\ndocument.getElementById(\"btnOrders\").onclick=function(){\n  openSheet('<div style=\"font-size:17px;font-weight:800;margin-bottom:4px\">📋 Buyurtmalar reestri</div><div class=\"sub\" style=\"margin-bottom:12px\">Kapsula buyurtmalari.</div><div id=\"ordBody\"><div class=\"empty\">Yuklanmoqda...</div></div>');\n  api(\"/api/orders\").then(renderOrders);\n};\nfunction renderOrders(o){\n  var b=document.getElementById(\"ordBody\");if(!b)return;o=o||[];\n  var sum=o.reduce(function(a,x){return a+(+x.sum||0);},0),paid=o.reduce(function(a,x){return a+(+x.paid||0);},0),rest=sum-paid,caps=o.reduce(function(a,x){return a+(+x.qty||0);},0);\n  var h='<div class=\"kpis\" style=\"margin-bottom:12px\"><div class=\"kpi\"><div class=\"v\" style=\"font-size:16px\">'+o.length+'</div><div class=\"l\">Buyurtma</div></div><div class=\"kpi\"><div class=\"v\" style=\"font-size:16px\">'+caps+'</div><div class=\"l\">Kapsula</div></div><div class=\"kpi\"><div class=\"v\" style=\"font-size:12px;color:var(--good)\">'+fmtShort(paid)+'</div><div class=\"l\">Olingan</div></div><div class=\"kpi\"><div class=\"v\" style=\"font-size:12px;color:var(--bad)\">'+fmtShort(rest)+'</div><div class=\"l\">Qoldiq</div></div></div>';\n  h+='<div class=\"oscroll\"><table class=\"reestr\"><tr><th>№</th><th>Joy / mijoz</th><th>Kapsula</th><th>Soni</th><th>Summa</th><th>Qoldiq</th><th>Holat</th></tr>'+\n    o.map(function(x){var closed=/Закрыто|yopiq|topshir/i.test(x.status||\"\");return '<tr><td>'+esc(x.n)+'</td><td>'+esc(x.place||\"\")+'</td><td>'+esc(x.caps||\"\")+'</td><td>'+esc(x.qty||\"\")+'</td><td>'+fmtShort(x.sum)+'</td><td style=\"color:var(--bad)\">'+fmtShort(x.rest)+'</td><td><span class=\"obadge '+(closed?\"o-yopiq\":\"o-ochiq\")+'\">'+esc(x.status||\"\")+'</span></td></tr>';}).join(\"\")+\n    '</table></div>';\n  h+='<div class=\"note\" style=\"margin-top:12px\">Mijoz qo\\'ng\\'irog\\'ida <b>Sotildi</b> bo\\'lsa AI yangi buyurtмани shu yerга o\\'zi qo\\'shadi.</div>';\n  b.innerHTML=h;\n}\ndocument.getElementById(\"btnGold\").onclick=function(){\n  openSheet('<div style=\"font-size:17px;font-weight:800;margin-bottom:4px\">⭐ Oltin shablon</div><div class=\"sub\" style=\"margin-bottom:14px\">AI eng yaxshi sotuvlarни tahlil qilib ideal skript tuzadi.</div><div id=\"gBody\"><div class=\"empty\">Yuklanmoqda...</div></div>');\n  api(\"/api/golden\").then(function(g){renderGold(g);});\n};\nfunction renderGold(g){\n  var b=document.getElementById(\"gBody\");if(!b)return;\n  if(g&&g.steps&&g.steps.length){\n    b.innerHTML='<div class=\"sub\" style=\"margin-bottom:10px\">'+ (g.basedOn||0) +' ta suhbat asosida</div>'+g.steps.map(function(s,i){return '<div class=\"goldstep\"><div class=\"n\">'+(i+1)+'</div><div><div class=\"tt\">'+esc(s[0])+'</div><div class=\"dd\">'+esc(s[1])+'</div></div></div>';}).join(\"\")+'<button class=\"btn\" style=\"margin-top:8px\" onclick=\"genGold(this)\">Qayta tuzish</button>';\n  }else{\n    b.innerHTML='<div class=\"empty\" style=\"padding:14px\">Hali shablon yo\\'q. Mijoz qo\\'ng\\'iroqлари yig\\'ilganда AI tuzadi.</div><button class=\"btn\" onclick=\"genGold(this)\">Hozir tuzish</button>';\n  }\n}\nfunction genGold(btn){btn.disabled=true;btn.textContent=\"AI tuzyapti...\";api(\"/api/golden\",{method:\"POST\"}).then(function(g){renderGold(g);}).catch(function(){btn.disabled=false;btn.textContent=\"Qayta urinish\";});}\nload();\n</script></body></html>\n";
app.get("/", (req, res) => res.type("html").send(DASH));

app.get("/api/calls", (req, res) => res.json(load().calls));
app.get("/api/calls/:id", (req, res) => { const c = load().calls.find((x) => x.id === req.params.id); if (c) res.json(c); else res.status(404).json({ error: "topilmadi" }); });
app.post("/api/calls/:id", (req, res) => {
  const db = load(); const c = db.calls.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: "topilmadi" });
  const b = req.body || {};
  if (typeof b.note === "string") c.note = b.note;
  if (b.status && STATS.indexOf(b.status) >= 0) c.status = b.status;
  if (b.category && CATS.indexOf(b.category) >= 0) c.category = b.category;
  if (typeof b.product === "string") c.product = b.product;
  if (typeof b.name === "string") c.name = b.name;
  save(db); res.json(c);
});

// Mijozlar bazasi (mijoz qo'ng'iroqlaridan, raqam bo'yicha, mahsulot bilan)
app.get("/api/clients", (req, res) => {
  const db = load(); const map = {};
  db.calls.filter((c) => (c.category || "mijoz") === "mijoz").forEach((c) => {
    const key = (c.phone || "").replace(/\s/g, "");
    if (!key) return;
    const yr = new Date(c.started_at).getFullYear();
    if (!map[key] || new Date(c.started_at) > new Date(map[key]._t)) {
      map[key] = { phone: c.phone, name: c.name || c.phone, product: c.product || null, year: yr, _t: c.started_at };
    } else if (!map[key].product && c.product) { map[key].product = c.product; }
  });
  res.json(Object.values(map).map((x) => { delete x._t; return x; }));
});

// Buyurtmalar reestri
app.get("/api/orders", (req, res) => res.json(load().orders || []));
app.post("/api/orders", (req, res) => {
  const db = load(); db.orders = db.orders || [];
  const o = req.body || {}; o.n = db.orders.reduce((m, x) => Math.max(m, +x.n || 0), 0) + 1;
  db.orders.push(o); save(db); res.json(o);
});
app.post("/api/orders/:n", (req, res) => {
  const db = load(); const o = (db.orders || []).find((x) => String(x.n) === String(req.params.n));
  if (!o) return res.status(404).json({ error: "topilmadi" });
  Object.assign(o, req.body || {}); save(db); res.json(o);
});

app.get("/api/golden", (req, res) => res.json(load().golden || null));
app.post("/api/golden", async (req, res) => {
  try {
    if (!API_KEY && !PROJECT) return res.status(500).json({ error: "Gemini sozlanmagan" });
    const db = load();
    const mij = db.calls.filter((c) => (c.category || "mijoz") === "mijoz" && c.analysis && c.analysis.dialog);
    if (!mij.length) return res.json(null);
    const g = await generateGolden(mij);
    db.golden = { generatedAt: new Date().toISOString(), basedOn: mij.length, steps: g.steps || [] };
    save(db); res.json(db.golden);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// --- Yuklash (multipart) ---
app.post("/api/upload", upload.single("audio"), async (req, res) => {
  try {
    const token = req.body.token || (req.headers.authorization || "").replace("Bearer ", "");
    if (token !== TOKEN) return res.status(401).json({ error: "noto'g'ri token" });
    if (!API_KEY && !PROJECT) return res.status(500).json({ error: "Gemini sozlanmagan" });
    if (!req.file) return res.status(400).json({ error: "audio fayl yo'q" });
    const id = ingest(req.file.buffer, req.file.originalname, req.body);
    res.json({ id, status: "processing" });
    processCall(id, req.file.buffer, mimeFor(req.file.originalname)).catch((e) => markError(id, e.message));
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});
// --- Yuklash (raw, Automate uchun) ---
app.post("/api/upload-raw", express.raw({ type: "*/*", limit: "60mb" }), async (req, res) => {
  try {
    const token = req.query.token || (req.headers.authorization || "").replace("Bearer ", "");
    if (token !== TOKEN) return res.status(401).json({ error: "noto'g'ri token" });
    if (!API_KEY && !PROJECT) return res.status(500).json({ error: "Gemini sozlanmagan" });
    if (!req.body || !req.body.length) return res.status(400).json({ error: "audio yo'q" });
    const name = req.query.name || ("yozuv_" + Date.now() + ".aac");
    const id = ingest(req.body, name, req.query);
    res.json({ id, status: "processing" });
    processCall(id, req.body, mimeFor(name)).catch((e) => markError(id, e.message));
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

function ingest(buffer, origName, meta) {
  const id = uid();
  const ext = extFor(origName);
  const audioFile = id + ext;
  try { fs.writeFileSync(path.join(AUDIO_DIR, audioFile), buffer); } catch (e) { console.error("audio saqlanmadi", e); }
  const db = load();
  db.calls.unshift({
    id, phone: (meta && meta.phone) || "", name: "", direction: (meta && meta.direction) || "out",
    started_at: new Date().toISOString(), audioName: origName || audioFile, audioFile,
    category: "mijoz", status: "gaplashildi", product: null, lostReason: null, note: "",
    procStatus: "processing", transcript: "", analysis: null
  });
  save(db);
  return id;
}

function analysisPrompt() {
  const today = new Date().toISOString().slice(0, 16);
  return (
    "Bu audio — O'zbekistondagi metall konstruksiya biznesi (tapchan-kapsula, yarim-kapsula karkas, geleviy plyonkali soyabon yasab sotish) telefon suhbati. Bugungi sana-vaqt: " + today + ".\n" +
    "Audioni o'zbekcha tushunib, FAQAT JSON qaytar. Qoidalar:\n" +
    "1) category — suhbat kim bilan: \"mijoz\" (xaridor/potentsial xaridor), \"uy\" (oila a'zosi), \"shofir\" (haydovchi/yetkazuvchi), \"usta\" (ishchi/payvandchi), \"boshqa\".\n" +
    "2) FAQAT category=mijoz bo'lsa 7 mezon 0-100: salom, tinglash, ehtiyoj, taqdimot, ishonch, narx, yakun; hamda overall va leadQuality. Boshqa category'да bularni null qil.\n" +
    "3) status: \"sotildi\" | \"ikkilandi\" | \"qayta\" | \"yoq\" | \"gaplashildi\" (mijoz bo'lmasa gaplashildi).\n" +
    "4) sotilmagan bo'lsa lostReason — qisqa sabab (masalan: 'puli yo'q, arzon qidiryapti' yoki 'yasash muddati uzoq' yoki 'dushanba qayta qil dedi'); aks holda null.\n" +
    "5) product — sotilган yoki muhokama qilingan mahsulot (tur + o'lcham), aniqlanmasa null.\n" +
    "6) name — suhbatdosh ismi aytilsa, aks holda null.\n" +
    "7) summary — 2-3 gap o'zbekcha chuqur xulosa (yuzaki emas): kuchli/zaif tomon, tavsiya.\n" +
    "8) nextDate — kelishilgan keyingi aloqa sanasi 'YYYY-MM-DDTHH:mm' yoki null; nextAction — qisqa.\n" +
    "9) dialog — [{\"who\":\"op\" (operator) yoki \"cl\" (mijoz), \"text\":\"...\"}].\n\n" +
    "JSON: {\"category\":\"...\",\"name\":null,\"product\":null,\"status\":\"...\",\"lostReason\":null," +
    "\"overall\":null,\"leadQuality\":null,\"scores\":{\"salom\":null,\"tinglash\":null,\"ehtiyoj\":null,\"taqdimot\":null,\"ishonch\":null,\"narx\":null,\"yakun\":null}," +
    "\"summary\":\"...\",\"nextDate\":null,\"nextAction\":null,\"dialog\":[]}"
  );
}

let workingModel = null;
function modelCandidates() {
  const list = [];
  if (process.env.GEMINI_MODEL) list.push(process.env.GEMINI_MODEL);
  ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-2.0-flash-001", "gemini-1.5-flash"].forEach((m) => { if (list.indexOf(m) < 0) list.push(m); });
  return list;
}
async function geminiCall(parts, jsonMode) {
  const body = { contents: [{ parts }], generationConfig: { temperature: 0.2 } };
  if (jsonMode) body.generationConfig.responseMimeType = "application/json";
  const models = workingModel ? [workingModel] : modelCandidates();
  let lastErr = "model topilmadi";
  for (let k = 0; k < models.length; k++) {
    const m = models[k];
    let url, headers = { "Content-Type": "application/json" };
    if (API_KEY) { url = "https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + API_KEY; }
    else { const t = await vertexToken(); headers.Authorization = "Bearer " + t; url = "https://" + LOCATION + "-aiplatform.googleapis.com/v1/projects/" + PROJECT + "/locations/" + LOCATION + "/publishers/google/models/" + m + ":generateContent"; }
    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (r.ok) {
      const j = await r.json();
      const text = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts && j.candidates[0].content.parts[0] && j.candidates[0].content.parts[0].text;
      if (!text) throw new Error("Gemini bo'sh javob");
      workingModel = m; return text;
    }
    lastErr = await r.text();
    if (r.status !== 404 && !/not found|not supported|is not found/i.test(lastErr)) throw new Error("Gemini: " + lastErr);
  }
  throw new Error("Ishlaydigan model topilmadi: " + String(lastErr).slice(0, 200));
}

async function processCall(id, buffer, mime) {
  const text = await geminiCall([{ text: analysisPrompt() }, { inline_data: { mime_type: mime, data: buffer.toString("base64") } }], true);
  const a = JSON.parse(text);
  const db = load(); const c = db.calls.find((x) => x.id === id); if (!c) return;
  const cat = CATS.indexOf(a.category) >= 0 ? a.category : "mijoz";
  const dialog = Array.isArray(a.dialog) ? a.dialog.map((t) => ({ who: t.who === "cl" || t.who === "mijoz" ? "cl" : "op", text: String(t.text || "") })) : [];
  const sc = a.scores || {};
  c.category = cat;
  c.name = a.name || c.name || "";
  c.product = a.product && a.product !== "null" ? a.product : null;
  c.status = STATS.indexOf(a.status) >= 0 ? a.status : "gaplashildi";
  c.lostReason = a.lostReason && a.lostReason !== "null" ? a.lostReason : null;
  c.transcript = dialog.map((t) => (t.who === "cl" ? "Mijoz: " : "Operator: ") + t.text).join("\n");
  c.procStatus = "done";
  c.analysis = {
    overall: cat === "mijoz" ? clamp(a.overall) : null,
    leadQuality: cat === "mijoz" ? clamp(a.leadQuality) : null,
    scores: cat === "mijoz" ? { salom: clamp(sc.salom), tinglash: clamp(sc.tinglash), ehtiyoj: clamp(sc.ehtiyoj), taqdimot: clamp(sc.taqdimot), ishonch: clamp(sc.ishonch), narx: clamp(sc.narx), yakun: clamp(sc.yakun) } : null,
    summary: a.summary || "",
    nextDate: a.nextDate && a.nextDate !== "null" && String(a.nextDate).length >= 10 ? a.nextDate : null,
    nextAction: a.nextAction || null,
    dialog
  };
  if (c.analysis.nextDate) {
    db.reminders = db.reminders || [];
    db.reminders.push({ id: uid(), callId: id, phone: c.phone, type: c.analysis.nextAction || "Qayta qo'ng'iroq", datetime: c.analysis.nextDate, note: "AI tahlil asosida", done: false });
  }
  // Sotildi bo'lsa -> reestrga avtomatik buyurtma
  if (cat === "mijoz" && c.status === "sotildi") {
    db.orders = db.orders || [];
    if (!db.orders.some((o) => o.fromCall === id)) {
      db.orders.unshift({ n: db.orders.reduce((m, x) => Math.max(m, +x.n || 0), 0) + 1, place: c.name || c.phone || "Mijoz", phone: c.phone || "", caps: c.product || "", qty: 0, sum: 0, paid: 0, rest: 0, install: "", done: 0, left: 0, status: "Yangi (AI)", fromCall: id });
    }
  }
  save(db);
  console.log("Tahlil tayyor:", id, cat, c.status);
}

async function generateGolden(mij) {
  let txt = "";
  mij.slice(0, 20).forEach((c, i) => {
    txt += "\n--- Suhbat " + (i + 1) + " (natija: " + (c.status || "?") + ") ---\n";
    (c.analysis.dialog || []).forEach((t) => { txt += (t.who === "cl" ? "Mijoz: " : "Operator: ") + t.text + "\n"; });
  });
  const prompt = "Quyida O'zbekistondagi metall konstruksiya (tapchan-kapsula, soyabon) biznesining sotuv qo'ng'iroqlari. Ba'zilari sotilган, ba'zilari yo'q. Eng yaxshi ishlaган yondashuvni tahlil qilib, IDEAL sotuv skripti (\"oltin shablon\") tuz — 7 bosqich. Har bosqich uchun qisqa sarlavha va amaliy tavsif (o'zbekcha). FAQAT JSON qaytar: {\"steps\":[[\"Sarlavha\",\"Tavsif\"], ...]}\n" + txt;
  const text = await geminiCall([{ text: prompt }], true);
  return JSON.parse(text);
}

function markError(id, msg) { const db = load(); const c = db.calls.find((x) => x.id === id); if (c) { c.procStatus = "error"; c.error = msg; save(db); } console.error("Tahlil xato:", id, msg); }

function seedOrders() {
  const db = load();
  if (db.orders && db.orders.length) return;
  db.orders = SEED_ORDERS;
  save(db);
  console.log("Buyurtmalar reestri qo'shildi:", SEED_ORDERS.length);
}
seedOrders();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Temirchi Qo'ng'iroq AI v3 ishga tushdi, port: " + PORT));
