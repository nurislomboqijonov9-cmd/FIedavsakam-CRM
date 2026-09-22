// Temirchi CRM — avtomatik qo'ng'iroq tahlili serveri (Google Gemini)
// Oqim: telefon audio yuboradi -> Gemini o'zbekchaga o'giradi + baholaydi (bitta chaqiruv) -> saqlanadi.
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleAuth } from "google-auth-library";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } });

// Ikki yo'ldan biri: AI Studio kaliti YOKI Vertex AI (loyiha ID).
const API_KEY = process.env.GEMINI_API_KEY;              // AI Studio kaliti (shu bo'lsa, shu ishlatiladi)
const PROJECT = process.env.GCP_PROJECT;                 // Vertex AI loyiha ID (kalit yo'q bo'lsa)
const LOCATION = process.env.GCP_LOCATION || "us-central1";
const TOKEN = process.env.DEVICE_TOKEN || "temirchi123"; // telefon yuborishda ishlatadigan parol
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const DB = path.join(__dirname, "data.json");

// Vertex uchun access token (service account yoki Cloud Run ADC orqali)
let _authClient = null;
async function vertexToken() {
  if (!_authClient) {
    const opts = { scopes: "https://www.googleapis.com/auth/cloud-platform" };
    if (process.env.GOOGLE_CREDENTIALS) opts.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    _authClient = await new GoogleAuth(opts).getClient();
  }
  return (await _authClient.getAccessToken()).token;
}

function load() {
  try { return JSON.parse(fs.readFileSync(DB, "utf8")); }
  catch (e) { return { calls: [], reminders: [] }; }
}
function save(d) {
  try { fs.writeFileSync(DB, JSON.stringify(d, null, 2)); } catch (e) { console.error("save xato", e); }
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function clamp(v) { return Math.max(0, Math.min(100, Math.round(+v || 0))); }

function mimeFor(name) {
  const n = (name || "").toLowerCase();
  if (n.endsWith(".mp3")) return "audio/mp3";
  if (n.endsWith(".wav")) return "audio/wav";
  if (n.endsWith(".ogg") || n.endsWith(".opus")) return "audio/ogg";
  if (n.endsWith(".m4a") || n.endsWith(".mp4")) return "audio/mp4";
  if (n.endsWith(".aac")) return "audio/aac";
  if (n.endsWith(".flac")) return "audio/flac";
  if (n.endsWith(".aiff")) return "audio/aiff";
  return "audio/mp3";
}

app.use(express.json());
const DASH = "<!doctype html>\n<html lang=\"uz\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n<title>Temirchi — Qo'ng'iroq tahlili</title>\n<style>\n  :root{--bg:#eef1f6;--surface:#fff;--surface-2:#f6f8fb;--line:#e2e7f0;--ink:#141821;--muted:#5b6473;--faint:#8a93a4;--brand:#2757d6;--brand-2:#1c3aa0;--brand-soft:#e7edfd;--good:#15a24a;--good-soft:#e2f6e9;--amber:#e08600;--amber-soft:#fdf0d8;--bad:#dc3546;--bad-soft:#fde5e7;--shadow:0 1px 2px rgba(20,24,33,.04),0 6px 20px rgba(20,24,33,.06)}\n  @media (prefers-color-scheme:dark){:root{--bg:#0d1017;--surface:#161b24;--surface-2:#1d232e;--line:#2a3240;--ink:#eef2f8;--muted:#9aa4b4;--faint:#6b7688;--brand:#5c86f5;--brand-2:#7b9dff;--brand-soft:#1b2740;--good:#3ad07a;--good-soft:#12301f;--amber:#f6ad3c;--amber-soft:#352a10;--bad:#ff6b78;--bad-soft:#3a1a1e;--shadow:0 1px 2px rgba(0,0,0,.3),0 6px 20px rgba(0,0,0,.35)}}\n  *{box-sizing:border-box}\n  body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,system-ui,sans-serif;font-size:14px;line-height:1.45}\n  .wrap{max-width:560px;margin:0 auto;padding:16px 16px 40px}\n  header{display:flex;align-items:center;gap:12px;margin-bottom:16px}\n  .badge{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,var(--brand),var(--brand-2));display:grid;place-items:center;color:#fff;font-weight:800;flex:0 0 auto}\n  h1{font-size:18px;margin:0}\n  .sub{font-size:12px;color:var(--faint)}\n  .card{background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:15px;margin-bottom:14px}\n  label{display:block;font-size:12px;font-weight:700;color:var(--muted);margin:0 0 6px}\n  input,select{width:100%;padding:11px 12px;border-radius:11px;border:1.5px solid var(--line);background:var(--surface-2);color:var(--ink);font-size:15px;margin-bottom:12px}\n  .btn{width:100%;padding:12px;border:none;border-radius:12px;background:var(--brand);color:#fff;font-weight:700;font-size:15px;cursor:pointer}\n  .btn:disabled{opacity:.5}\n  .row{display:flex;gap:12px;align-items:center}\n  .callc{display:flex;gap:12px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:12px;margin-bottom:10px;cursor:pointer;width:100%;text-align:left}\n  .sbox{width:54px;height:54px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:0 0 auto;font-weight:800}\n  .sbox .sv{font-size:20px;line-height:1}.sbox .sl{font-size:8px;font-weight:700;letter-spacing:.03em;margin-top:2px}\n  .nm{font-weight:700;font-size:14.5px}.meta{font-size:11.5px;color:var(--muted);margin-top:3px}\n  .spin{width:16px;height:16px;border:2px solid var(--amber-soft);border-top-color:var(--amber);border-radius:50%;animation:sp .8s linear infinite;display:inline-block;vertical-align:middle}\n  @keyframes sp{to{transform:rotate(360deg)}}\n  .empty{text-align:center;color:var(--faint);padding:30px 10px;font-size:13px}\n  .modal{position:fixed;inset:0;background:rgba(10,14,22,.5);display:none;align-items:flex-end;justify-content:center;z-index:50}\n  .modal.on{display:flex}\n  .sheet{background:var(--surface);width:100%;max-width:560px;max-height:92vh;overflow-y:auto;border-radius:20px 20px 0 0;padding:18px 18px 30px}\n  .grip{width:40px;height:4px;border-radius:9px;background:var(--line);margin:0 auto 14px}\n  .dim{display:grid;grid-template-columns:74px 1fr 30px;gap:9px;align-items:center;margin-bottom:8px}\n  .dim .dl{font-size:12px;color:var(--muted);font-weight:600}.dim .dt{height:8px;border-radius:9px;background:var(--surface-2);overflow:hidden}.dim .df{height:100%;border-radius:9px}.dim .dv{font-size:12px;font-weight:700;text-align:right}\n  .bubble{padding:9px 12px;border-radius:13px;font-size:13px;margin-bottom:7px;max-width:86%}\n  .b-op{background:var(--brand-soft)}.b-cl{background:var(--surface-2);margin-left:auto}\n  .kv{background:var(--surface-2);border-radius:11px;padding:10px 12px}.kv .k{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);font-weight:700}.kv .v{font-weight:700;margin-top:2px}\n  .dlabel{font-size:12px;font-weight:700;color:var(--muted);margin:16px 2px 8px}\n  .note{font-size:11.5px;color:var(--muted);background:var(--surface-2);border-radius:10px;padding:9px 11px;margin-top:12px}\n  .status-msg{font-size:12px;margin-top:8px;min-height:16px}\n</style>\n</head>\n<body>\n<div class=\"wrap\">\n  <header>\n    <div class=\"badge\">T</div>\n    <div><h1>Qo'ng'iroq tahlili</h1><div class=\"sub\">Temirchi — AI baholash serveri</div></div>\n  </header>\n\n  <div class=\"card\">\n    <label>Audio fayl (mp3, m4a, wav, ogg...)</label>\n    <input type=\"file\" id=\"audio\" accept=\"audio/*\">\n    <div class=\"row\">\n      <div style=\"flex:1\"><label>Telefon raqami</label><input id=\"phone\" placeholder=\"+998 __ ___ __ __\"></div>\n      <div style=\"width:120px\"><label>Yo'nalish</label><select id=\"dir\"><option value=\"out\">Chiquvchi</option><option value=\"in\">Kiruvchi</option></select></div>\n    </div>\n    <label>Kirish paroli (token)</label>\n    <input id=\"token\" value=\"temirchi123\">\n    <button class=\"btn\" id=\"send\">Yuklash va tahlil qilish</button>\n    <div class=\"status-msg\" id=\"msg\"></div>\n  </div>\n\n  <div id=\"list\"></div>\n</div>\n\n<div class=\"modal\" id=\"modal\"><div class=\"sheet\" id=\"sheet\"></div></div>\n\n<script>\nvar DIMS=[[\"salom\",\"Salom\"],[\"tinglash\",\"Tinglash\"],[\"ehtiyoj\",\"Ehtiyoj\"],[\"taqdimot\",\"Taqdimot\"],[\"ishonch\",\"Ishonch\"],[\"narx\",\"Narx\"],[\"yakun\",\"Yakun\"]];\nfunction sColor(s){return s>=70?\"var(--good)\":s>=45?\"var(--amber)\":\"var(--bad)\";}\nfunction sSoft(s){return s>=70?\"var(--good-soft)\":s>=45?\"var(--amber-soft)\":\"var(--bad-soft)\";}\nfunction sLab(s){return s>=70?\"YAXSHI\":s>=45?\"O'RTA\":\"PAST\";}\nfunction esc(s){return String(s==null?\"\":s).replace(/[&<>\"]/g,function(c){return{\"&\":\"&amp;\",\"<\":\"&lt;\",\">\":\"&gt;\",\"\\\"\":\"&quot;\"}[c];});}\nvar MON=[\"Yan\",\"Fev\",\"Mar\",\"Apr\",\"May\",\"Iyn\",\"Iyl\",\"Avg\",\"Sen\",\"Okt\",\"Noy\",\"Dek\"];\n\nfunction radar(scores){\n  var n=scores.length,cx=130,cy=112,R=72,rings=\"\",axes=\"\",labels=\"\",pts=[];\n  [0.34,0.67,1].forEach(function(k){var rp=\"\";for(var i=0;i<n;i++){var a=(-90+i*360/n)*Math.PI/180;rp+=(i?\" \":\"\")+(cx+R*k*Math.cos(a)).toFixed(1)+\",\"+(cy+R*k*Math.sin(a)).toFixed(1);}rings+='<polygon points=\"'+rp+'\" fill=\"none\" stroke=\"var(--line)\"/>';});\n  for(var i=0;i<n;i++){var a=(-90+i*360/n)*Math.PI/180;axes+='<line x1=\"'+cx+'\" y1=\"'+cy+'\" x2=\"'+(cx+R*Math.cos(a)).toFixed(1)+'\" y2=\"'+(cy+R*Math.sin(a)).toFixed(1)+'\" stroke=\"var(--line)\"/>';var v=Math.max(0,Math.min(100,scores[i].val))/100;pts.push((cx+R*v*Math.cos(a)).toFixed(1)+\",\"+(cy+R*v*Math.sin(a)).toFixed(1));var lr=R+15,lx=cx+lr*Math.cos(a),ly=cy+lr*Math.sin(a),an=Math.abs(Math.cos(a))<0.34?\"middle\":(Math.cos(a)>0?\"start\":\"end\");labels+='<text x=\"'+lx.toFixed(1)+'\" y=\"'+(ly+3).toFixed(1)+'\" text-anchor=\"'+an+'\" font-size=\"10\" font-weight=\"700\" fill=\"var(--muted)\">'+esc(scores[i].label)+'</text>';}\n  var dots=\"\";pts.forEach(function(p){var xy=p.split(\",\");dots+='<circle cx=\"'+xy[0]+'\" cy=\"'+xy[1]+'\" r=\"2.8\" fill=\"var(--brand)\"/>';});\n  return '<svg viewBox=\"0 0 260 224\" width=\"100%\" style=\"max-width:300px;display:block;margin:0 auto\">'+rings+axes+'<polygon points=\"'+pts.join(\" \")+'\" fill=\"var(--brand)\" fill-opacity=\"0.2\" stroke=\"var(--brand)\" stroke-width=\"2\"/>'+dots+labels+'</svg>';\n}\n\nvar calls=[];\nfunction fetchCalls(){\n  fetch(\"/api/calls\").then(function(r){return r.json();}).then(function(d){calls=d;render();\n    if(d.some(function(c){return c.status===\"processing\";}))setTimeout(fetchCalls,3000);\n  }).catch(function(){});\n}\nfunction render(){\n  var el=document.getElementById(\"list\");\n  if(!calls.length){el.innerHTML='<div class=\"empty\">Hali qo\\'ng\\'iroq yo\\'q.<br>Yuqoridan audio yuklab, sinab ko\\'ring.</div>';return;}\n  el.innerHTML=calls.map(function(c){\n    var d=new Date(c.started_at);var when=d.getDate()+\" \"+MON[d.getMonth()]+\", \"+(\"0\"+d.getHours()).slice(-2)+\":\"+(\"0\"+d.getMinutes()).slice(-2);\n    if(c.status===\"processing\")return '<div class=\"callc\"><div class=\"sbox\" style=\"background:var(--amber-soft)\"><span class=\"spin\"></span></div><div><div class=\"nm\">'+esc(c.phone||c.audioName)+'</div><div class=\"meta\">AI tahlil qilyapti...</div></div></div>';\n    if(c.status===\"error\")return '<div class=\"callc\"><div class=\"sbox\" style=\"background:var(--bad-soft);color:var(--bad)\"><div class=\"sv\">!</div></div><div><div class=\"nm\">'+esc(c.phone||c.audioName)+'</div><div class=\"meta\" style=\"color:var(--bad)\">Xato: '+esc((c.error||\"\").slice(0,60))+'</div></div></div>';\n    var s=c.analysis?c.analysis.overall:0;\n    return '<button class=\"callc\" onclick=\"openCall(\\''+c.id+'\\')\"><div class=\"sbox\" style=\"background:'+sSoft(s)+';color:'+sColor(s)+'\"><div class=\"sv\">'+s+'</div><div class=\"sl\">'+sLab(s)+'</div></div><div style=\"flex:1\"><div class=\"nm\">'+esc(c.phone||c.audioName)+'</div><div class=\"meta\">'+when+' · Lid '+(c.analysis?c.analysis.leadQuality:0)+'%</div></div></button>';\n  }).join(\"\");\n}\nfunction openCall(id){\n  var c=calls.find(function(x){return x.id===id;});if(!c||!c.analysis)return;\n  var a=c.analysis,s=a.overall,scores=DIMS.map(function(d){return {label:d[1],val:a.scores[d[0]]};});\n  var d=new Date(c.started_at);\n  var h='<div class=\"grip\"></div><div class=\"row\" style=\"justify-content:space-between;margin-bottom:14px\"><div><div class=\"nm\" style=\"font-size:18px\">'+esc(c.phone||\"Qo\\'ng\\'iroq\")+'</div><div class=\"sub\">'+d.getDate()+\" \"+MON[d.getMonth()]+'</div></div><div class=\"sbox\" style=\"width:60px;height:60px;background:'+sSoft(s)+';color:'+sColor(s)+'\"><div class=\"sv\" style=\"font-size:23px\">'+s+'</div><div class=\"sl\">'+sLab(s)+'</div></div></div>';\n  h+='<div class=\"row\" style=\"gap:10px\"><div class=\"kv\" style=\"flex:1\"><div class=\"k\">Lid sifati</div><div class=\"v\">'+a.leadQuality+'%</div></div><div class=\"kv\" style=\"flex:1\"><div class=\"k\">Yo\\'nalish</div><div class=\"v\">'+(c.direction===\"in\"?\"Kiruvchi\":\"Chiquvchi\")+'</div></div></div>';\n  h+='<div class=\"dlabel\">Baholash (7 mezon)</div><div class=\"card\" style=\"margin:0 0 0\">'+radar(scores)+'</div>';\n  h+='<div class=\"card\" style=\"margin-top:12px\">'+scores.map(function(x){return '<div class=\"dim\"><div class=\"dl\">'+esc(x.label)+'</div><div class=\"dt\"><div class=\"df\" style=\"width:'+x.val+'%;background:'+sColor(x.val)+'\"></div></div><div class=\"dv\" style=\"color:'+sColor(x.val)+'\">'+x.val+'</div></div>';}).join(\"\")+'</div>';\n  h+='<div class=\"dlabel\">AI xulosa</div><div class=\"card\" style=\"line-height:1.55\">'+esc(a.summary)+'</div>';\n  if(a.nextDate){var nd=new Date(a.nextDate);h+='<div class=\"dlabel\">Aniqlangan keyingi qadam</div><div class=\"card\" style=\"background:var(--amber-soft);border-color:var(--amber)\"><b>'+esc(a.nextAction)+'</b> — '+nd.getDate()+\" \"+MON[nd.getMonth()]+\", \"+(\"0\"+nd.getHours()).slice(-2)+\":\"+(\"0\"+nd.getMinutes()).slice(-2)+'<br><span class=\"sub\">✓ Avtomatik eslatmaga qo\\'shildi</span></div>';}\n  var dlg=(a.dialog&&a.dialog.length)?a.dialog:[{who:\"op\",text:c.transcript||\"\"}];\n  h+='<div class=\"dlabel\">Transkript</div><div>'+dlg.map(function(t){var op=(t.who===\"op\"||t.who===\"operator\");return '<div class=\"bubble '+(op?\"b-op\":\"b-cl\")+'\">'+esc(t.text)+'</div>';}).join(\"\")+'</div>';\n  h+='<div class=\"note\">🎧 '+esc(c.audioName)+' · Gemini: o\\'zbekcha transkripsiya + AI baho</div>';\n  document.getElementById(\"sheet\").innerHTML=h;\n  document.getElementById(\"modal\").classList.add(\"on\");\n}\ndocument.getElementById(\"modal\").onclick=function(e){if(e.target===this)this.classList.remove(\"on\");};\n\ndocument.getElementById(\"send\").onclick=function(){\n  var f=document.getElementById(\"audio\").files[0];\n  var msg=document.getElementById(\"msg\");\n  if(!f){msg.style.color=\"var(--bad)\";msg.textContent=\"Avval audio fayl tanlang\";return;}\n  var fd=new FormData();\n  fd.append(\"audio\",f);\n  fd.append(\"phone\",document.getElementById(\"phone\").value);\n  fd.append(\"direction\",document.getElementById(\"dir\").value);\n  fd.append(\"token\",document.getElementById(\"token\").value);\n  this.disabled=true;msg.style.color=\"var(--muted)\";msg.textContent=\"Yuklanmoqda va tahlil qilinmoqda...\";\n  var btn=this;\n  fetch(\"/api/upload\",{method:\"POST\",body:fd}).then(function(r){return r.json();}).then(function(d){\n    btn.disabled=false;\n    if(d.error){msg.style.color=\"var(--bad)\";msg.textContent=\"Xato: \"+d.error;return;}\n    msg.style.color=\"var(--good)\";msg.textContent=\"Qabul qilindi ✅ Tahlil tayyor bo'lganda pastda chiqadi.\";\n    document.getElementById(\"audio\").value=\"\";\n    fetchCalls();\n  }).catch(function(e){btn.disabled=false;msg.style.color=\"var(--bad)\";msg.textContent=\"Ulanish xatosi\";});\n};\n\nfetchCalls();\n</script>\n</body>\n</html>\n";
app.get("/", (req, res) => res.type("html").send(DASH));

app.get("/api/calls", (req, res) => { res.json(load().calls); });
app.get("/api/calls/:id", (req, res) => {
  const c = load().calls.find((x) => x.id === req.params.id);
  if (c) res.json(c); else res.status(404).json({ error: "topilmadi" });
});
app.get("/api/reminders", (req, res) => { res.json(load().reminders || []); });

// --- Yuklash (telefon yoki qo'lda) ---
app.post("/api/upload", upload.single("audio"), async (req, res) => {
  try {
    const token = req.body.token || (req.headers.authorization || "").replace("Bearer ", "");
    if (token !== TOKEN) return res.status(401).json({ error: "noto'g'ri token" });
    if (!API_KEY && !PROJECT) return res.status(500).json({ error: "Gemini sozlanmagan (GEMINI_API_KEY yoki GCP_PROJECT kerak)" });
    if (!req.file) return res.status(400).json({ error: "audio fayl yo'q" });

    const id = uid();
    const startedAt = req.body.started_at
      ? new Date(isNaN(+req.body.started_at) ? Date.parse(req.body.started_at) : +req.body.started_at)
      : new Date();

    const db = load();
    const call = {
      id,
      phone: req.body.phone || "",
      direction: req.body.direction || "out",
      started_at: (isNaN(startedAt) ? new Date() : startedAt).toISOString(),
      audioName: req.file.originalname || "audio.mp3",
      status: "processing",
      transcript: "",
      analysis: null
    };
    db.calls.unshift(call);
    save(db);

    res.json({ id, status: "processing" }); // tez javob, tahlil fonda ketadi

    processCall(id, req.file.buffer, call.audioName).catch((e) => markError(id, e.message));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// --- Gemini: audio -> o'zbekcha matn + baho (bitta chaqiruv) ---
function analysisPrompt() {
  const today = new Date().toISOString().slice(0, 16);
  return (
    "Bu audio yozuvi — O'zbekistondagi metall konstruksiya biznesi (tapchan-kapsula, yarim-kapsula karkas, " +
    "geleviy plyonkali soyabon yasab sotish) uchun sotuv qo'ng'irog'i. Bugungi sana-vaqt: " + today + ".\n\n" +
    "Vazifa: 1) Audiodagi suhbatni o'zbekcha matnga o'gir (kim gapiryapti: operator yoki mijoz). " +
    "2) Qo'ng'iroqni ekspert sifatida baholab, FAQAT JSON qaytar.\n\n" +
    "JSON format aynan shunday bo'lsin:\n" +
    "{\"overall\":<0-100 umumiy ball>,\"leadQuality\":<0-100 mijoz qiziqishi>," +
    "\"scores\":{\"salom\":<0-100>,\"tinglash\":<0-100>,\"ehtiyoj\":<0-100>,\"taqdimot\":<0-100>," +
    "\"ishonch\":<0-100>,\"narx\":<0-100>,\"yakun\":<0-100>}," +
    "\"summary\":\"2-3 gap o'zbekcha xulosa: kuchli va zaif tomonlar, tavsiya\"," +
    "\"nextDate\":\"suhbatda kelishilgan keyingi aloqa sanasi YYYY-MM-DDTHH:mm formatida yoki null\"," +
    "\"nextAction\":\"Qayta qo'ng'iroq | O'lchov | O'rnatish | To'lov\"," +
    "\"dialog\":[{\"who\":\"op yoki cl\",\"text\":\"...\"}]}"
  );
}

async function geminiAnalyze(buffer, mime) {
  const body = {
    contents: [{
      parts: [
        { text: analysisPrompt() },
        { inline_data: { mime_type: mime, data: buffer.toString("base64") } }
      ]
    }],
    generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
  };
  let url, headers = { "Content-Type": "application/json" };
  if (API_KEY) {
    // AI Studio yo'li
    url = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent?key=" + API_KEY;
  } else {
    // Vertex AI yo'li
    const token = await vertexToken();
    headers.Authorization = "Bearer " + token;
    url = "https://" + LOCATION + "-aiplatform.googleapis.com/v1/projects/" + PROJECT +
      "/locations/" + LOCATION + "/publishers/google/models/" + MODEL + ":generateContent";
  }
  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("Gemini xato: " + (await r.text()));
  const j = await r.json();
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini bo'sh javob qaytardi");
  return JSON.parse(text);
}

async function processCall(id, buffer, filename) {
  const a = await geminiAnalyze(buffer, mimeFor(filename));
  const sc = a.scores || {};
  const dialog = Array.isArray(a.dialog) ? a.dialog : [];
  const db = load();
  const c = db.calls.find((x) => x.id === id);
  if (!c) return;
  c.transcript = dialog.map((t) => (t.who === "cl" ? "Mijoz: " : "Operator: ") + (t.text || "")).join("\n");
  c.status = "done";
  c.analysis = {
    overall: clamp(a.overall),
    leadQuality: clamp(a.leadQuality),
    scores: {
      salom: clamp(sc.salom), tinglash: clamp(sc.tinglash), ehtiyoj: clamp(sc.ehtiyoj),
      taqdimot: clamp(sc.taqdimot), ishonch: clamp(sc.ishonch), narx: clamp(sc.narx), yakun: clamp(sc.yakun)
    },
    summary: a.summary || "",
    nextDate: a.nextDate && a.nextDate !== "null" && String(a.nextDate).length >= 10 ? a.nextDate : null,
    nextAction: a.nextAction || "Qayta qo'ng'iroq",
    dialog: dialog
  };
  // Kelishilgan sana bo'lsa -> avtomatik eslatma
  if (c.analysis.nextDate) {
    db.reminders = db.reminders || [];
    db.reminders.push({
      id: uid(), callId: id, phone: c.phone,
      type: c.analysis.nextAction, datetime: c.analysis.nextDate,
      note: "AI tahlil asosida", done: false
    });
  }
  save(db);
  console.log("Tahlil tayyor:", id, "ball:", c.analysis.overall);
}

function markError(id, msg) {
  const db = load();
  const c = db.calls.find((x) => x.id === id);
  if (c) { c.status = "error"; c.error = msg; save(db); }
  console.error("Tahlil xato:", id, msg);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Temirchi Call AI (Gemini) ishga tushdi, port: " + PORT));
