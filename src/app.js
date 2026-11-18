import {NUTRIENTS, ING, FOODS, STANDARD_DAY, DRINKS, MIXERS, SUPPS, DEFAULT_CONFIG} from './data.js';
import {sb} from './supabase.js';
// ================= utilities =================
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate()+n); return keyOf(d); };
const todayKey = () => keyOf(new Date(Date.now() - 6*3600*1000)); // day ends at 6 AM
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const niceDate = k => { const d = parseKey(k); return `${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`; };
const shortDate = k => { const d = parseKey(k); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const uid = () => Math.random().toString(36).slice(2, 10);
const sum = a => a.reduce((x, y) => x + y, 0);
const mean = a => a.length ? sum(a) / a.length : null;
const NMAP = Object.fromEntries(NUTRIENTS.map(n => [n.k, n]));
const FMAP = Object.fromEntries(FOODS.map(f => [f.id, f]));
const DMAP = Object.fromEntries(DRINKS.map(d => [d.id, d]));
const SMAP = Object.fromEntries(SUPPS.map(s => [s.id, s]));
function fmt(v, u) {
  if (v == null || isNaN(v)) return '—';
  if (u === 'kcal' || u === 'mg' || (u === 'mcg' && v >= 10)) return Math.round(v).toLocaleString('en-IN');
  if (v >= 100) return Math.round(v).toLocaleString('en-IN');
  if (v >= 10) return (Math.round(v*10)/10).toString();
  return (Math.round(v*10)/10).toString();
}
const ICON = {
  home:'<path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  pie:'<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  trend:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  pill:'<path d="M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7z"/><path d="M8.5 8.5l7 7"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  left:'<path d="M15 18l-6-6 6-6"/>', right:'<path d="M9 18l6-6-6-6"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  warn:'<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
};
const ic = (n, s=22, w=2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

// ================= meals =================
const MEALS = [
  {id:'breakfast', n:'Breakfast'}, {id:'msnack', n:'Morning snack'}, {id:'lunch', n:'Lunch'},
  {id:'esnack', n:'Evening snack'}, {id:'dinner', n:'Dinner'}, {id:'late', n:'Late night'},
];
const MEALN = Object.fromEntries(MEALS.map(m => [m.id, m.n]));
function mealByHour(h) { return h >= 5 && h < 11 ? 'breakfast' : h < 12 ? 'msnack' : h < 15 ? 'lunch' : h < 19 ? 'esnack' : h < 23 ? 'dinner' : 'late'; }
const mealOf = it => it.m || (it.t ? mealByHour(new Date(it.t).getHours()) : 'breakfast');
const STD_MEAL = {omelette:'breakfast', toast:'breakfast', cosmix:'breakfast', sattu:'breakfast', dahi:'esnack', banana:'esnack', taco:'dinner'};

// ================= nutrition engine =================
const unitCache = {};
function vecAdd(t, v, mult) { for (const k in v) t[k] = (t[k] || 0) + v[k] * mult; return t; }
function foodUnit(fid, o = {}) {
  const f = FMAP[fid]; if (!f) return {};
  const pv = f.param ? (o[f.param.key] ?? f.param.def) : 0;
  const ck = fid + '|' + pv; if (unitCache[ck]) return unitCache[ck];
  const t = {};
  f.parts.forEach(([i, g]) => vecAdd(t, ING[i].v, g / 100));
  if (f.perParam) f.perParam.forEach(([i, g]) => vecAdd(t, ING[i].v, g * pv / 100));
  return (unitCache[ck] = t);
}
const FR = {0.25:'¼', 0.5:'½', 0.75:'¾'};
const fq = q => { const w = Math.floor(q), r = Math.round((q - w) * 4) / 4; return r === 1 ? String(w + 1) : r ? (w ? w : '') + FR[r] : String(w); };
const stepOf = fid => FMAP[fid]?.step || 0.5;
const roundStep = (v, st) => Math.round((+v || 0) / st) * st;
function itemVec(it) { return vecAdd({}, foodUnit(it.f, it.o || {}), it.q); }
function drinkVec(dr) {
  const t = {};
  if (ING[dr.d]) vecAdd(t, ING[dr.d].v, dr.ml / 100);
  if (dr.m && dr.m !== 'none' && ING[dr.m]) vecAdd(t, ING[dr.m].v, (dr.mml || 0) / 100);
  return t;
}
function itemLabel(it) {
  const f = FMAP[it.f]; if (!f) return 'Unknown item';
  let n = f.name;
  if (f.param) n += ` · ${it.o?.[f.param.key] ?? f.param.def} ${f.param.label.toLowerCase()}`;
  if (it.f === 'dosa' && it.q === 8) return 'Dosa · full pack (8)';
  return it.q !== 1 ? `${n} × ${fq(it.q)}` : n;
}
function drinkLabel(dr) {
  const d = DMAP[dr.d]; const m = MIXERS.find(x => x.id === dr.m);
  return `${d ? d.name : 'Drink'} ${dr.ml} ml` + (m && m.id !== 'none' ? ` + ${m.name.toLowerCase()} ${dr.mml || 0} ml` : '');
}
// processed share uses NOVA group of each ingredient, weighted by its kcal
function novaKcal(parts, mult, acc) {
  parts.forEach(([i, g]) => { const ing = ING[i]; const kc = (ing.v.kcal || 0) * g / 100 * mult; acc[ing.nova] = (acc[ing.nova] || 0) + kc; });
}
function dayCalc(day, opts = {}) {
  const tot = {}; const contrib = []; const nova = {};
  (day?.items || []).forEach(it => {
    const v = itemVec(it); vecAdd(tot, v, 1); contrib.push({label: itemLabel(it), v});
    const f = FMAP[it.f]; if (f) { novaKcal(f.parts, it.q, nova); if (f.perParam) novaKcal(f.perParam.map(([i,g]) => [i, g * (it.o?.[f.param.key] ?? f.param.def)]), it.q, nova); }
  });
  (day?.ci?.drinks || []).forEach(dr => {
    const v = drinkVec(dr); vecAdd(tot, v, 1); contrib.push({label: drinkLabel(dr), v});
    novaKcal([[dr.d, dr.ml]], 1, nova); if (dr.m && dr.m !== 'none') novaKcal([[dr.m, dr.mml || 0]], 1, nova);
  });
  if (!opts.noSupps) Object.entries(day?.supp || {}).forEach(([sid, on]) => {
    if (!on || !SMAP[sid]) return; vecAdd(tot, SMAP[sid].v, 1); contrib.push({label: SMAP[sid].name + ' (supplement)', v: SMAP[sid].v, supp: true});
  });
  const kc = sum(Object.values(nova));
  return {tot, contrib, processed: kc ? (nova[4] || 0) / kc * 100 : null, hasFood: (day?.items || []).length > 0};
}
function stdDrinks(day) { return sum((day?.ci?.drinks || []).map(dr => (ING[dr.d]?.v.alc || 0) * dr.ml / 100)) / 10; }

// ================= supplement schedule =================
function suppDue(sid, k) {
  const s = SMAP[sid]; const d = parseKey(k); const sc = s.sched;
  if (sc.until && k > sc.until) return false;
  if (sc.type === 'daily') return true;
  if (sc.type === 'weekly') return d.getDay() === sc.dow;
  if (sc.type === 'd3') { if (d.getDay() !== 0) return false; if (k <= (CFG().d3WeeklyUntil || '2026-12-29')) return true; return d.getDate() <= 7; }
  return false;
}
const dueList = k => SUPPS.filter(s => suppDue(s.id, k));

const APP_VERSION = '1.2.1';
// ================= state & storage =================
// Offline-first: every change is saved on the phone immediately (localStorage),
// then pushed to Supabase when online. Pull fetches only rows changed since the last pull.
const S = {
  days: {}, config: null, view: 'today', date: todayKey(), range: 7, open: null, cart: {}, dosaMode: null, meal: null,
  sheet: null, sync: 'loading', toast: null, user: null, authMode: (() => { try { return localStorage.getItem('hf:hasAccount') ? 'signin' : 'signup'; } catch (e) { return 'signin'; } })(), authMsg: '', authErr: '', busy: false, recovery: false,
};
const CFG = () => Object.assign({}, DEFAULT_CONFIG, S.config || {});
const T = k => (CFG().targets && CFG().targets[k] != null) ? CFG().targets[k] : NMAP[k]?.t;
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const lk = n => `hf:${S.user?.id || 'anon'}:${n}`;
let dirty = {}; let flushTimer = null; let flushing = false;
function day(k) { return S.days[k] || (S.days[k] = {items: [], water: 0, supp: {}, ci: {}}); }
function saveLocal() { LS.set(lk('days'), S.days); LS.set(lk('dirty'), dirty); }
function touch(k) {
  S.days[k].u = Date.now(); dirty[k] = true; saveLocal();
  clearTimeout(flushTimer); flushTimer = setTimeout(flushAll, 600);
  setSync('saving'); render();
}
async function flushAll() {
  const ks = Object.keys(dirty);
  if (!ks.length) { setSync(navigator.onLine ? 'ok' : 'local'); return; }
  if (!navigator.onLine || !S.user) { setSync('local'); return; }
  if (flushing) { clearTimeout(flushTimer); flushTimer = setTimeout(flushAll, 500); return; }
  flushing = true;
  const rows = ks.map(k => ({user_id: S.user.id, date: k, data: S.days[k], updated_at: new Date(S.days[k].u || Date.now()).toISOString()}));
  const {error} = await sb.from('days').upsert(rows, {onConflict: 'user_id,date'});
  flushing = false;
  if (error) { setSync('err', 'Saved on this phone — will sync when it can'); return; }
  rows.forEach(r => { if ((S.days[r.date].u || 0) <= Date.parse(r.updated_at)) delete dirty[r.date]; });
  saveLocal();
  if (Object.keys(dirty).length) { flushTimer = setTimeout(flushAll, 500); setSync('saving'); } else setSync('ok');
}
async function pull() {
  if (!navigator.onLine || !S.user) { setSync('local'); return; }
  const since = LS.get(lk('since'), null);
  let q = sb.from('days').select('date,data,updated_at').order('updated_at');
  if (since) q = q.gt('updated_at', new Date(Date.parse(since) - 864e5).toISOString()); // 1-day margin for clock differences
  const {data, error} = await q;
  if (error) { setSync('err', 'Could not reach the server'); return; }
  let last = since;
  (data || []).forEach(r => {
    const su = Date.parse(r.updated_at);
    if (dirty[r.date] && (S.days[r.date]?.u || 0) > su) return; // our unsynced edit is newer
    S.days[r.date] = Object.assign({}, r.data || {}, {u: su});
    if (!last || su > Date.parse(last)) last = r.updated_at;
  });
  if (last) LS.set(lk('since'), last);
  const c = await sb.from('config').select('data').maybeSingle();
  if (!c.error) { S.config = c.data ? c.data.data : null; LS.set(lk('config'), S.config); }
  saveLocal(); render(); setSync(Object.keys(dirty).length ? 'saving' : 'ok');
}
let syncMsg = '';
function setSync(s, msg) { S.sync = s; syncMsg = msg || ''; const el = document.getElementById('sync'); if (el) el.innerHTML = syncHTML(); }
function syncHTML() {
  const m = {loading:['saving','Connecting…'], ok:['','Synced'], saving:['saving','Saving…'], local:['off','Offline — saved on this phone'], err:['off', syncMsg || 'Sync problem']}[S.sync] || ['',''];
  return `<span class="dot ${m[0]}"></span>${esc(m[1])}`;
}

// ================= derived stats =================
const allKeys = () => Object.keys(S.days).filter(k => /^\d{4}-\d\d-\d\d$/.test(k)).sort();
const firstKey = () => { const ks = allKeys().filter(k => hasData(S.days[k])); return ks[0] || todayKey(); };
function hasData(d) { return d && ((d.items || []).length || d.water || Object.values(d.supp || {}).some(Boolean) || Object.keys(d.ci || {}).length); }
function rangeKeys(end, n) { const a = []; for (let i = n-1; i >= 0; i--) a.push(addDays(end, -i)); return a; }
function weightAvg(end, n = 7) { const v = rangeKeys(end, n).map(k => S.days[k]?.ci?.w).filter(x => x > 0); return v.length ? mean(v) : null; }
function targetsHit(k) {
  const d = S.days[k]; const c = dayCalc(d, {noSupps: true}); if (!c.hasFood) return null;
  const kcalOk = c.tot.kcal >= T('kcal')*0.9 && c.tot.kcal <= T('kcal')*1.1; const pOk = (c.tot.p || 0) >= T('p');
  return kcalOk && pOk ? 2 : (kcalOk || pOk ? 1 : 0);
}
function flags(k) {
  const out = []; const cfg = CFG();
  const last7 = rangeKeys(addDays(k, -1), 7).filter(x => S.days[x] && (S.days[x].items || []).length);
  const low = last7.filter(x => (dayCalc(S.days[x], {noSupps: true}).tot.p || 0) < T('p'));
  if (low.length >= 3) out.push({t:'warn', h:'Protein under target', b:`on ${low.length} of the last ${last7.length} logged days.`});
  const now = weightAvg(k), before = weightAvg(addDays(k, -7));
  if (now && before && now - before > cfg.maxGainPerWeek) out.push({t:'warn', h:'Gaining too fast', b:`+${(now-before).toFixed(1)} kg in a week (limit ${cfg.maxGainPerWeek}). Plan rule: drop 1 taco.`});
  if (now && now >= cfg.weightTarget) out.push({t:'warn', h:`Reached ${cfg.weightTarget} kg`, b:'7-day average. Plan rule: drop 1 taco.'});
  const start = firstKey();
  SUPPS.filter(s => s.sched.type === 'daily').forEach(s => {
    const y1 = addDays(k, -1), y2 = addDays(k, -2);
    if (y2 >= start && suppDue(s.id, y1) && suppDue(s.id, y2) && !S.days[y1]?.supp?.[s.id] && !S.days[y2]?.supp?.[s.id]) out.push({t:'warn', h:`${s.name} missed`, b:'2 days running.'});
  });
  (cfg.upcoming || []).forEach(u => { const diff = (parseKey(u.date) - parseKey(k)) / 864e5; if (diff >= 0 && diff <= 7) out.push({t:'info', h: diff === 0 ? 'Today' : `In ${diff} day${diff>1?'s':''}`, b: u.text}); });
  return out;
}
function pearson(xs, ys) {
  const n = xs.length; if (n < 3) return 0; const mx = mean(xs), my = mean(ys);
  let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (xs[i]-mx)*(ys[i]-my); b += (xs[i]-mx)**2; c += (ys[i]-my)**2; }
  return b && c ? a / Math.sqrt(b*c) : 0;
}
const median = a => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length/2); return s.length % 2 ? s[m] : (s[m-1]+s[m])/2; };
const INSIGHTS = [
  {x:'Bong hits', y:'sleep', fx: d => d?.ci?.hits, fy: (d, n) => n?.ci?.sl, lag:1, yu:'h', verb:'you slept', after:'the next night', yd:1},
  {x:'Drinks (std)', y:'sleep', fx: d => Array.isArray(d?.ci?.drinks) ? stdDrinks(d) : undefined, fy: (d, n) => n?.ci?.sl, lag:1, yu:'h', verb:'you slept', after:'the next night', yd:1, bin:true},
  {x:'Cigarettes', y:'sleep', fx: d => d?.ci?.cigs, fy: (d, n) => n?.ci?.sl, lag:1, yu:'h', verb:'you slept', after:'the next night', yd:1},
  {x:'Sleep', y:'calories', fx: d => d?.ci?.sl, fy: d => (d?.items || []).length ? dayCalc(d, {noSupps:true}).tot.kcal : undefined, lag:0, yu:'kcal', verb:'you ate', after:'that day', yd:0},
  {x:'Bong hits', y:'calories', fx: d => d?.ci?.hits, fy: d => (d?.items || []).length ? dayCalc(d, {noSupps:true}).tot.kcal : undefined, lag:0, yu:'kcal', verb:'you ate', after:'that day', yd:0},
];
function insights() {
  const ks = allKeys(); return INSIGHTS.map(I => {
    const xs = [], ys = [];
    ks.forEach(k => { const x = I.fx(S.days[k]); const y = I.lag ? I.fy(S.days[k], S.days[addDays(k, 1)]) : I.fy(S.days[k]); if (x != null && x !== '' && y != null && y !== '' && !isNaN(x) && !isNaN(y)) { xs.push(+x); ys.push(+y); } });
    const n = xs.length; const res = {I, n};
    if (n < 14) return res;
    const r = pearson(xs, ys); res.r = r;
    const cut = I.bin ? 0 : median(xs);
    const hi = ys.filter((_, i) => xs[i] > cut), lo = ys.filter((_, i) => xs[i] <= cut);
    if (!hi.length || !lo.length) return res;
    res.diff = mean(hi) - mean(lo); res.cut = cut; res.show = Math.abs(r) >= 0.4;
    return res;
  });
}

// ================= render helpers =================
function status(nk, v) {
  const n = NMAP[nk]; const t = T(nk); if (!t || n.kind === 'info') return null;
  const pct = v / t * 100;
  if (n.kind === 'max') return pct > 100 ? ['over','OVER'] : ['ok','OK'];
  if (n.kind === 'goal') return pct < 90 ? ['close','LOW'] : pct > 110 ? ['over','OVER'] : ['ok','OK'];
  return pct >= 100 ? ['ok','OK'] : pct >= 70 ? ['close','CLOSE'] : ['over','LOW'];
}
function barColor(nk, v) { const s = status(nk, v); if (!s) return 'var(--muted)'; return s[0] === 'ok' ? 'var(--ok)' : s[0] === 'close' ? 'var(--acc)' : 'var(--over)'; }
function header(title, opts = {}) {
  const k = S.date, t = todayKey();
  const dn = opts.date === false ? '' : `<div class="datenav"><button class="iconbtn" data-act="day" data-n="-1" aria-label="Previous day">${ic('left')}</button><button class="iconbtn" data-act="day" data-n="1" aria-label="Next day" ${k >= t ? 'disabled' : ''}>${ic('right')}</button></div>`;
  const label = opts.date === false ? '' : (k === t ? niceDate(k) : `${niceDate(k)} · <a href="#" data-act="gotoday">back to today</a>`);
  return `<div class="top"><div><div class="sub">${label}</div><h1>${esc(title)}</h1><button class="status" id="sync" data-act="account" aria-label="Account and sync">${syncHTML()}</button></div>${opts.right || dn}</div>`;
}
function baseStepper(id, base, add) {
  const tot = base + add;
  return `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px"><div class="stepper"><button data-act="cart" data-id="${id}" data-n="-1" aria-label="One fewer" ${add ? '' : 'disabled style="opacity:.35"'}>−</button><input class="qn ${tot ? '' : 'zero'}" type="number" inputmode="decimal" step="${stepOf(id)}" min="${base}" value="${tot}" data-act="cartset" data-id="${id}" data-base="${base}" aria-label="Total amount, tap to type" style="${add ? 'color:var(--acc)' : ''}"><button data-act="cart" data-id="${id}" data-n="1" aria-label="One more">+</button></div>${base ? `<span class="small muted">${fq(base)} logged${add ? ` · +${fq(add)} new` : ''}</span>` : ''}</div>`;
}
function stepper(act, id, n, extra = '') { return `<div class="stepper"><button data-act="${act}" data-id="${id}" data-n="-1" ${extra} aria-label="Fewer">−</button><span class="n ${n ? '' : 'zero'}">${n}</span><button data-act="${act}" data-id="${id}" data-n="1" ${extra} aria-label="More">+</button></div>`; }
function bars(vals, opts = {}) {
  const W = 340, H = opts.h || 110, n = vals.length; if (!n) return '';
  const max = Math.max(opts.min || 1, ...vals.map(v => v?.v || 0), opts.line || 0) * 1.08;
  const bw = W / n; const g = Math.max(1, bw * 0.18);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H+16}" role="img" aria-label="${esc(opts.label || 'chart')}">`;
  vals.forEach((v, i) => { if (!v || v.v == null) return; const h = (v.v / max) * H; s += `<rect x="${(i*bw+g/2).toFixed(1)}" y="${(H-h).toFixed(1)}" width="${Math.max(1,bw-g).toFixed(1)}" height="${Math.max(0.5,h).toFixed(1)}" rx="${Math.min(4,bw/4).toFixed(1)}" fill="${v.c || 'var(--acc)'}"/>`; });
  if (opts.line) { const y = H - opts.line / max * H; s += `<line x1="0" x2="${W}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--ok)" stroke-width="1.5" stroke-dasharray="5 5"/>`; }
  if (n <= 10) vals.forEach((v, i) => { if (v?.l) s += `<text x="${(i*bw+bw/2).toFixed(1)}" y="${H+13}" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="Inter,sans-serif">${esc(v.l)}</text>`; });
  return s + '</svg>';
}
function weightChart(keys) {
  const W = 340, H = 150; const pts = keys.map((k, i) => ({i, w: S.days[k]?.ci?.w})).filter(p => p.w > 0);
  const avg = keys.map((k, i) => ({i, a: weightAvg(k)})).filter(p => p.a);
  const tgt = CFG().weightTarget; const all = [...pts.map(p => p.w), ...avg.map(p => p.a), tgt];
  const lo = Math.floor(Math.min(...all) - 0.5), hi = Math.ceil(Math.max(...all) + 0.5);
  const X = i => 8 + i / Math.max(1, keys.length - 1) * (W - 16), Y = w => 8 + (hi - w) / (hi - lo) * (H - 16);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight entries, 7-day average and target">`;
  s += `<line x1="0" x2="${W}" y1="${Y(tgt).toFixed(1)}" y2="${Y(tgt).toFixed(1)}" stroke="var(--ok)" stroke-width="1.5" stroke-dasharray="5 5"/><text x="${W-4}" y="${(Y(tgt)-5).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--ok)" font-family="Inter,sans-serif">Target ${tgt} kg</text>`;
  s += `<text x="4" y="${H-4}" font-size="10" fill="var(--muted)" font-family="Inter,sans-serif">${lo} kg</text>`;
  if (avg.length > 1) s += `<path d="${avg.map((p, j) => (j ? 'L' : 'M') + X(p.i).toFixed(1) + ' ' + Y(p.a).toFixed(1)).join(' ')}" fill="none" stroke="var(--acc)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  pts.forEach(p => s += `<circle cx="${X(p.i).toFixed(1)}" cy="${Y(p.w).toFixed(1)}" r="4" fill="var(--muted)"/>`);
  return s + '</svg>';
}

// ================= views =================
function viewToday() {
  const k = S.date, d = day(k), c = dayCalc(d); const tot = c.tot;
  let h = header(k === todayKey() ? 'Today' : 'Day', {right: `<div style="display:flex;gap:6px;align-items:center"><a class="pill" href="#checkin" style="display:inline-flex;align-items:center;text-decoration:none">Check-in</a><div class="datenav"><button class="iconbtn" data-act="day" data-n="-1" aria-label="Previous day">${ic('left')}</button><button class="iconbtn" data-act="day" data-n="1" aria-label="Next day" ${k >= todayKey() ? 'disabled' : ''}>${ic('right')}</button></div></div>`});
  const fl = k === todayKey() ? flags(k) : [];
  h += '<div class="grid">';
  if (fl.length) h += `<div class="span2" style="display:flex;flex-direction:column;gap:8px">${fl.map(f => `<div class="flag ${f.t}">${ic(f.t === 'warn' ? 'warn' : 'info', 18, 2.2)}<div><strong>${esc(f.h)}</strong> ${esc(f.b)}</div></div>`).join('')}</div>`;
  const kc = tot.kcal || 0, p = tot.p || 0;
  h += `<div class="card"><div><div class="row"><b>Calories</b><span class="big">${fmt(kc,'kcal')} <small>/ ${fmt(T('kcal'),'kcal')} kcal</small></span></div><div class="bar" style="margin-top:8px"><div style="width:${Math.min(100, kc/T('kcal')*100)}%;background:var(--acc)"></div></div></div>
    <div><div class="row"><b>Protein</b><span class="big">${fmt(p,'g')} <small>/ ${T('p')} g</small></span></div><div class="bar" style="margin-top:8px"><div style="width:${Math.min(100, p/T('p')*100)}%;background:var(--acc2)"></div></div></div>
    <div class="tiles"><div class="tile"><div class="l">Carbs</div><div class="v">${fmt(tot.c,'g')} g</div></div><div class="tile"><div class="l">Fat</div><div class="v" style="color:${barColor('f', tot.f||0)}">${fmt(tot.f,'g')} g</div></div><div class="tile"><div class="l">Sodium</div><div class="v" style="color:${barColor('na', tot.na||0)}">${fmt(tot.na,'mg')} mg</div></div></div>
    <a href="#nutrients" class="small" style="font-weight:600">All nutrients and vitamins</a></div>`;
  const items = (d.items || []).slice().sort((a, b) => (a.t||0) - (b.t||0)); const drinks = d.ci?.drinks || [];
  h += `<div class="card"><div class="row"><h2>Logged</h2><a href="#log" class="small" style="font-weight:600">+ Add food</a></div>`;
  if (!items.length && !drinks.length) h += `<div class="muted small">Nothing logged yet. Tap + to add food.</div>`;
  else h += `${MEALS.map(m => { const its = items.filter(it => mealOf(it) === m.id); if (!its.length) return ''; const mt = {}; its.forEach(it => vecAdd(mt, itemVec(it), 1));
      return `<div style="margin-top:6px"><div class="row" style="padding:6px 0;border-bottom:1px solid var(--border)"><a href="#log" data-act="logmeal" data-id="${m.id}" style="font-family:var(--head);font-weight:700;font-size:15px;color:var(--acc);text-decoration:none">${m.n} <span style="font-weight:500">+</span></a><span class="small muted">${fmt(mt.kcal,'kcal')} kcal · ${fmt(mt.p,'g')} g</span></div><div class="list">${its.map(it => { const v = itemVec(it); return `<div class="li"><div class="main"><div class="t">${esc(itemLabel(it))}</div></div><div class="num"><b>${fmt(v.kcal,'kcal')}</b><span class="muted">${fmt(v.p,'g')} g</span></div><button class="iconbtn" data-act="edititem" data-id="${it.id}" aria-label="Edit ${esc(itemLabel(it))}">${ic('right',18)}</button></div>`; }).join('')}</div></div>`; }).join('')}
    ${drinks.length ? `<div style="margin-top:6px"><div class="row" style="padding:6px 0;border-bottom:1px solid var(--border)"><a href="#checkin" style="font-family:var(--head);font-weight:700;font-size:15px;color:var(--acc);text-decoration:none">Drinks</a><span class="small muted">${stdDrinks(d).toFixed(1)} standard drinks</span></div>` : ''}<div class="list">${drinks.map(dr => { const v = drinkVec(dr); return `<div class="li"><div class="main"><div class="t">${esc(drinkLabel(dr))}</div><div class="s">${(stdDrinks({ci:{drinks:[dr]}})).toFixed(1)} standard drinks</div></div><div class="num"><b>${fmt(v.kcal,'kcal')}</b><span class="muted">drink</span></div><a class="iconbtn" href="#checkin" aria-label="Edit drinks in check-in">${ic('right',18)}</a></div>`; }).join('')}</div>${drinks.length ? '</div>' : ''}`;
  h += `</div>`;
  const wt = CFG().waterTargetMl, w = d.water || 0;
  h += `<div class="card"><div class="row"><h2>Water</h2><span class="big">${(w/1000).toFixed(w % 1000 ? 2 : 1).replace(/0$/, '')} <small>/ ${wt/1000} L</small></span></div><div class="bar"><div style="width:${Math.min(100, w/wt*100)}%;background:var(--water)"></div></div>
    <div class="btns c4"><button class="btn wbtn" data-act="water" data-n="250">+250</button><button class="btn wbtn" data-act="water" data-n="500">+500</button><button class="btn wbtn" data-act="water" data-n="1000">+1 L</button><button class="btn" data-act="water" data-n="-250" aria-label="Remove 250 ml">−250</button></div></div>`;
  const due = dueList(k);
  h += `<div class="card"><div class="row"><h2>Supplements</h2><a href="#supplements" class="small" style="font-weight:600">Schedule</a></div>${due.length ? due.map(s => `<label class="chk"><input type="checkbox" data-act="supp" data-id="${s.id}" ${d.supp?.[s.id] ? 'checked' : ''}><span>${esc(s.name)} <span class="muted" style="font-weight:400">· ${esc(s.dose)}</span></span></label>`).join('') : '<div class="muted small">Nothing scheduled.</div>'}</div>`;
  const ci = d.ci || {};
  const tile = (l, v) => `<div class="tile c"><div class="l">${l}</div><div class="v">${v}</div></div>`;
  h += `<a class="card" href="#checkin" style="text-decoration:none;color:inherit"><div class="row"><h2>Check-in</h2><span class="small" style="font-weight:600;color:var(--acc)">Log sleep, drinks, hits →</span></div><div class="tiles">${tile('Weight', ci.w ? ci.w + ' kg' : '—')}${tile('Sleep', ci.sl != null ? ci.sl + ' h' : '—')}${tile('Trained', ci.tr == null ? '—' : ci.tr ? 'Yes' : 'No')}${tile('Bong hits', ci.hits ?? '—')}${tile('Cigarettes', ci.cigs ?? '—')}${tile('Drinks', ci.drinks?.length ? stdDrinks(d).toFixed(1) + ' std' : (ci.drinks ? '0' : '—'))}</div><div class="muted small">Weight, sleep, training, bong hits, cigarettes and drinks — all optional, kept separate from food.</div></a>`;
  return h + '</div>';
}
function viewLog() {
  let h = header('Log food');
  const cart = S.cart; const cartKeys = Object.keys(cart).filter(id => cart[id].q > 0);
  h += `<div class="grid"><button class="card span2" data-act="stdday" style="background:var(--acc);color:#1C1410;border:none;text-align:left;cursor:pointer"><b style="font-size:16px">Apply standard day</b><span style="font-size:13px">Adds omelette (3 eggs), 4 ghee-toast slices, Cosmix, sattu, curd, 2 bananas, 5 tacos. Edit or remove anything after.</span></button>`;
  const curMeal = S.meal || (S.date === todayKey() ? mealByHour(new Date().getHours()) : 'breakfast');
  h += `<div class="card span2"><h2>Adding to</h2><div class="btns c3">${MEALS.map(m => `<button class="btn ${m.id === curMeal ? 'on' : ''}" data-act="meal" data-id="${m.id}" style="padding:0 6px;font-size:13px">${m.n}</button>`).join('')}</div></div>`;
  const logged = {}; (day(S.date).items || []).forEach(it => { logged[it.f] = (logged[it.f] || 0) + it.q; });
  h += `<div class="card span2"><h2>Your foods</h2><div class="muted small">Numbers start from what you've already logged ${S.date === todayKey() ? 'today' : 'that day'}; + adds more. Tap a number to type halves (0.5, 1.5…); curd and big pizza go in quarters (0.25).</div><div class="list">`;
  FOODS.forEach(f => {
    const c = cart[f.id] || {q: 0}; const u = foodUnit(f.id, c.o || {});
    if (f.dosa) {
      h += `<div class="li" style="flex-direction:column;align-items:stretch"><div class="row"><div class="main"><div class="t">${f.name}</div><div class="s">${fmt(u.kcal,'kcal')} kcal · ${fmt(u.p,'g')} g each · full pack ${fmt(u.kcal*8,'kcal')} kcal · ${fmt(u.p*8,'g')} g</div></div>${S.dosaMode === 'n' ? baseStepper(f.id, logged.dosa || 0, c.q) : `<span style="text-align:right"><span class="n" style="font-family:var(--head);font-weight:700">${c.q ? '+' + c.q : ''}</span>${logged.dosa ? `<span class="small muted" style="display:block">${fq(logged.dosa)} logged</span>` : ''}</span>`}</div>
        <div class="btns c3"><button class="btn ${c.q === 1 && S.dosaMode !== 'n' ? 'on' : ''}" data-act="dosa" data-m="1">1 dosa</button><button class="btn ${S.dosaMode === 'n' ? 'on' : ''}" data-act="dosa" data-m="n">Number…</button><button class="btn ${c.q === 8 && S.dosaMode !== 'n' ? 'on' : ''}" data-act="dosa" data-m="8">Full pack (8)</button></div></div>`;
      return;
    }
    h += `<div class="li ${c.q ? '' : ''}"><div class="main"><div class="t">${f.name}</div><div class="s">${f.param ? `${fmt(u.kcal,'kcal')} kcal at ${c.o?.[f.param.key] ?? f.param.def} eggs · ${fmt(u.p,'g')} g` : `${fmt(u.kcal,'kcal')} kcal · ${fmt(u.p,'g')} g protein`}</div></div>${baseStepper(f.id, logged[f.id] || 0, c.q)}</div>`;
    if (f.param && c.q) h += `<div class="li"><div class="main"><div class="s" style="padding-left:12px">${f.param.label} per omelette</div></div>${stepper('param', f.id, c.o?.[f.param.key] ?? f.param.def)}</div>`;
  });
  h += `</div><div class="muted small">New foods get added to this list from their pack labels — ask Claude in chat.</div></div></div>`;
  const tot = {}; cartKeys.forEach(id => vecAdd(tot, foodUnit(id, cart[id].o || {}), cart[id].q));
  const n = sum(cartKeys.map(id => cart[id].q));
  if (n) h += `<div class="cta"><button class="btn primary" data-act="addcart">Add ${fq(n)} to ${MEALN[curMeal]} · ${fmt(tot.kcal,'kcal')} kcal · ${fmt(tot.p,'g')} g</button></div>`;
  return h;
}
function viewCheckin() {
  const k = S.date, d = day(k), ci = d.ci || {};
  let h = header('Check-in');
  h += `<div class="grid">`;
  h += `<div class="card"><div class="row"><label for="w"><h2>Weight</h2><div class="muted small">Morning, after the toilet</div></label><span style="display:flex;align-items:center;gap:6px"><input id="w" class="num" type="number" inputmode="decimal" step="0.1" min="30" max="200" value="${ci.w ?? ''}" placeholder="—" data-act="ci" data-f="w"><span class="muted">kg</span></span></div>${lastWeightNote(k)}</div>`;
  h += `<div class="card"><div class="row"><div><h2>Sleep last night</h2><div class="muted small">Target 7–8 h</div></div>${stepper('cistep', 'sl', ci.sl ?? '—', 'data-step="0.5"')}</div></div>`;
  h += `<div class="card"><h2>Trained today?</h2><div class="btns c2"><button class="btn ${ci.tr === true ? 'on' : ''}" data-act="trained" data-v="1">Yes</button><button class="btn ${ci.tr === false ? 'on' : ''}" data-act="trained" data-v="0">No</button></div>${ci.tr ? `<div class="row"><label for="burn" style="font-size:14px;font-weight:500">Rough calories burned</label><input id="burn" class="num" type="number" inputmode="numeric" min="0" max="3000" value="${ci.burn ?? ''}" placeholder="—" data-act="ci" data-f="burn"></div><div class="muted small">Recorded only. Your calorie target already allows for training.</div>` : ''}</div>`;
  h += `<div class="card"><div class="row"><div><h2>Bong hits</h2><div class="muted small">${hitsNote(k)}</div></div>${stepper('cistep', 'hits', ci.hits ?? 0)}</div></div>`;
  h += `<div class="card"><div class="row"><h2>Cigarettes</h2>${stepper('cistep', 'cigs', ci.cigs ?? 0)}</div></div>`;
  const drinks = ci.drinks || [];
  h += `<div class="card"><div class="row"><h2>Drinks</h2><button class="pill" data-act="adddrink">+ Add drink</button></div>${drinks.length ? `<div class="list">${drinks.map(dr => { const v = drinkVec(dr); return `<div class="li"><div class="main"><div class="t">${esc(drinkLabel(dr))}</div><div class="s">${fmt(v.kcal,'kcal')} kcal · ${(stdDrinks({ci:{drinks:[dr]}})).toFixed(1)} standard drinks</div></div><button class="iconbtn" data-act="deldrink" data-id="${dr.id}" aria-label="Remove drink">${ic('x',18)}</button></div>`; }).join('')}</div><div class="muted small">Total ${stdDrinks(d).toFixed(1)} standard drinks (10 g alcohol each). Calories count toward your day.</div>` : `<div class="muted small">None logged. ${ci.drinks ? '' : '<button class="btn" data-act="nodrinks" style="height:36px;margin-left:6px">Log “none today”</button>'}</div>`}</div>`;
  h += `</div>`;
  return h;
}
function lastWeightNote(k) {
  for (let i = 1; i < 60; i++) { const kk = addDays(k, -i); const w = S.days[kk]?.ci?.w; if (w) return `<div class="muted small">Last: ${w} kg on ${shortDate(kk)}${weightAvg(k) ? ` · 7-day avg ${weightAvg(k).toFixed(1)} kg` : ''}</div>`; }
  return '';
}
function hitsNote(k) {
  const a7 = rangeKeys(k, 7).map(x => S.days[x]?.ci?.hits).filter(x => x != null);
  const a30 = rangeKeys(addDays(k, -7), 30).map(x => S.days[x]?.ci?.hits).filter(x => x != null);
  if (a7.length < 2) return 'Logged per day';
  let s = `7-day avg ${mean(a7).toFixed(1)}/day`;
  if (a30.length >= 7) { const ch = (mean(a7) - mean(a30)) / Math.max(0.1, mean(a30)) * 100; s += ` · ${Math.abs(ch).toFixed(0)}% ${ch <= 0 ? 'below' : 'above'} your previous 30 days`; }
  return s;
}
function viewNutrients() {
  const k = S.date, d = day(k), c = dayCalc(d);
  let h = header('Nutrients');
  h += `<div class="grid">`;
  const ps = c.processed;
  h += `<div class="card span2"><div class="row"><div><h2>Processed-food share</h2><div class="muted small">% of calories from ultra-processed items (NOVA 4)</div></div><span class="big">${ps == null ? '—' : Math.round(ps) + '%'}</span></div>${ps != null ? `<div class="bar"><div style="width:${ps}%;background:var(--acc2)"></div></div>` : ''}<div class="muted small">Ultra-processed in your foods: cheese cubes, cheese spread, the three sauces, protein bread, Health Factory base, Cosmix; plus spirits, cola, 7Up and cranberry juice.</div></div>`;
  const groups = [['macro','Macros'],['mineral','Minerals'],['vitamin','Vitamins & others'],['other','Alcohol']];
  groups.forEach(([g, title]) => {
    const ns = NUTRIENTS.filter(n => n.g === g); if (g === 'other' && !(c.tot.alc > 0)) return;
    h += `<div class="card ${g === 'macro' ? '' : ''}"><h2>${title}</h2><div>`;
    ns.forEach(n => {
      const v = c.tot[n.k] || 0; const t = T(n.k); const st = status(n.k, v); const open = S.open === n.k;
      h += `<button class="nrow" data-act="opennut" data-id="${n.k}" aria-expanded="${open}"><div class="row"><span style="font-weight:600">${n.n}</span><span><b>${fmt(v, n.u)}</b>${t ? ` / ${fmt(t, n.u)}` : ''} ${n.u}${n.kind === 'max' ? ' max' : ''} ${st ? `<span class="chip ${st[0]}">${st[1]}</span>` : ''}</span></div>${t ? `<div class="bar" style="height:8px"><div style="width:${Math.min(100, v/t*100)}%;background:${barColor(n.k, v)}"></div></div>` : ''}</button>`;
      if (open) {
        const list = c.contrib.map(x => ({label: x.label, v: x.v[n.k] || 0, supp: x.supp})).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
        h += `<div class="contrib">${list.length ? list.slice(0, 8).map(x => `<div class="row"><span>${esc(x.label)}</span><span><b>${fmt(x.v, n.u)} ${n.u}</b> · ${Math.round(x.v / (v || 1) * 100)}%</span></div>`).join('') : '<div class="muted">Nothing logged contains this.</div>'}</div>`;
      }
    });
    h += `</div></div>`;
  });
  h += `<div class="card span2 muted small">Calories and macros come from pack labels. Vitamins and minerals are estimates from food composition tables (IFCT / USDA), about ±20–30%. Supplements count only when ticked${SUPPS.some(s => s.est) ? '; Ace Blend amounts are estimated until its label is added' : ''}.</div>`;
  return h + '</div>';
}
function viewTrends() {
  const end = todayKey(), n = S.range, keys = rangeKeys(end, n);
  const lab = k => n <= 7 ? DOW[parseKey(k).getDay()].slice(0, 2) : '';
  let h = header('Trends', {date: false});
  h += `<div class="seg" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px">${[7,30,90].map(r => `<button class="${S.range === r ? 'on' : ''}" data-act="range" data-n="${r}">${r} days</button>`).join('')}</div><div class="grid">`;
  // weight
  const wv = keys.map(k => S.days[k]?.ci?.w).filter(x => x > 0); const nowAvg = weightAvg(end);
  let rate = null; { const pts = keys.map((k, i) => [i, S.days[k]?.ci?.w]).filter(p => p[1] > 0); if (pts.length >= 2 && pts[pts.length-1][0] - pts[0][0] >= 4) { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const mx = mean(xs), my = mean(ys); const sl = sum(xs.map((x, i) => (x-mx)*(ys[i]-my))) / sum(xs.map(x => (x-mx)**2)); rate = sl * 7; } }
  const tgt = CFG().weightTarget;
  h += `<div class="card"><div class="row"><h2>Weight</h2><span class="big">${nowAvg ? nowAvg.toFixed(1) : '—'} <small>kg · 7-day avg</small></span></div>${wv.length ? weightChart(keys) : '<div class="muted small">No weights in this period.</div>'}${rate != null ? `<div class="flag ${rate > CFG().maxGainPerWeek ? 'warn' : 'info'}"><div><strong>${rate >= 0 ? '+' : ''}${rate.toFixed(2)} kg/week</strong> · limit ${CFG().maxGainPerWeek}${rate > 0.05 && nowAvg && nowAvg < tgt ? ` · about ${Math.ceil((tgt - nowAvg) / rate)} weeks to ${tgt} kg` : ''}</div></div>` : ''}<div class="muted small">Dots = days you weighed. Line = 7-day average, so skipped days don't matter.</div></div>`;
  // calories & protein
  const kv = keys.map(k => { const d = S.days[k]; if (!d || !(d.items || []).length) return {v: null, l: lab(k)}; const t = dayCalc(d).tot; return {v: t.kcal, l: lab(k), c: (t.p || 0) < T('p') ? 'var(--acc2)' : 'var(--acc)', p: t.p}; });
  const logged = kv.filter(x => x.v != null);
  h += `<div class="card"><div class="row"><h2>Calories &amp; protein</h2><span class="small muted">${logged.length ? `avg ${fmt(mean(logged.map(x => x.v)),'kcal')} kcal · ${fmt(mean(logged.map(x => x.p)),'g')} g` : ''}</span></div>${bars(kv, {line: T('kcal'), min: T('kcal'), label: 'Daily calories against target'})}<div class="muted small">Orange = protein under ${T('p')} g that day (${logged.filter(x => x.p < T('p')).length} of ${logged.length}). Dashed line = calorie target.</div></div>`;
  // targets hit
  const th = keys.map(targetsHit); const hit = th.filter(x => x === 2).length, lg = th.filter(x => x != null).length;
  const cols = n <= 7 ? 7 : n <= 30 ? 10 : 15;
  h += `<div class="card"><div class="row"><h2>Targets hit</h2><span class="big">${hit} <small>/ ${lg} logged days</small></span></div><div class="sq" style="grid-template-columns:repeat(${cols},1fr)">${th.map((x, i) => `<div title="${shortDate(keys[i])}" style="background:${x === 2 ? 'var(--ok)' : x === 1 ? 'var(--acc)' : x === 0 ? 'var(--over)' : 'var(--tile)'}"></div>`).join('')}</div><div class="muted small">Green = calories within 10% and protein hit · amber = one of the two · red = neither · dark = nothing logged</div></div>`;
  // substances
  const series = (f, c) => keys.map(k => { const v = f(S.days[k]); return {v: v == null ? null : v, l: lab(k), c}; });
  const hs = series(d => d?.ci?.hits, 'var(--water)'), hv = hs.filter(x => x.v != null).map(x => x.v);
  const prev = rangeKeys(addDays(end, -n), Math.max(30, n)).map(k => S.days[k]?.ci?.hits).filter(x => x != null);
  h += `<div class="card"><div class="row"><h2>Bong hits</h2><span class="big">${hv.length ? mean(hv).toFixed(1) : '—'} <small>/day avg</small></span></div>${hv.length ? bars(hs, {label: 'Daily bong hits'}) : '<div class="muted small">Nothing logged.</div>'}${hv.length && prev.length >= 7 ? (() => { const ch = (mean(hv) - mean(prev)) / Math.max(0.1, mean(prev)) * 100; return `<div class="flag ${ch <= 0 ? 'info' : 'warn'}"><div><strong>${Math.abs(ch).toFixed(0)}% ${ch <= 0 ? 'below' : 'above'}</strong> the period before (${mean(prev).toFixed(1)}/day). Fewer is better for sleep, gums and recovery.</div></div>`; })() : ''}</div>`;
  const cs = series(d => d?.ci?.cigs, 'var(--muted)'), cv = cs.filter(x => x.v != null).map(x => x.v);
  h += `<div class="card"><div class="row"><h2>Cigarettes</h2><span class="big">${cv.length ? sum(cv) : '—'} <small>total</small></span></div>${cv.length ? bars(cs, {label: 'Daily cigarettes'}) : '<div class="muted small">Nothing logged.</div>'}<div class="muted small">${cv.length ? `${cv.filter(x => x === 0).length} of ${cv.length} logged days at zero` : ''}</div></div>`;
  const as = series(d => d?.ci?.drinks ? stdDrinks(d) : null, 'var(--acc2)'), av = as.filter(x => x.v != null).map(x => x.v);
  const akcal = sum(keys.map(k => sum((S.days[k]?.ci?.drinks || []).map(dr => drinkVec(dr).kcal || 0))));
  h += `<div class="card"><div class="row"><h2>Alcohol</h2><span class="big">${av.length ? sum(av).toFixed(1) : '—'} <small>standard drinks</small></span></div>${av.some(x => x > 0) ? bars(as, {label: 'Standard drinks per day'}) : '<div class="muted small">No drinks logged.</div>'}<div class="muted small">${av.filter(x => x > 0).length} drinking days · ${fmt(akcal,'kcal')} kcal from drinks</div></div>`;
  const ss = series(d => d?.ci?.sl, 'var(--water)'), sv = ss.filter(x => x.v != null).map(x => x.v);
  h += `<div class="card"><div class="row"><h2>Sleep</h2><span class="big">${sv.length ? mean(sv).toFixed(1) + ' h' : '—'} ${sv.length && mean(sv) < 7 ? '<span class="chip close">LOW</span>' : ''}</span></div>${sv.length ? bars(ss, {line: 7, min: 9, label: 'Hours slept'}) : '<div class="muted small">Nothing logged.</div>'}<div class="muted small">${sv.length} nights logged · target 7–8 h</div></div>`;
  const pp = keys.map(k => { const d = S.days[k]; if (!d || !(d.items || []).length) return {v: null, l: lab(k)}; return {v: dayCalc(d).processed, l: lab(k), c: 'var(--acc2)'}; }); const pv = pp.filter(x => x.v != null).map(x => x.v);
  h += `<div class="card"><div class="row"><h2>Processed-food share</h2><span class="big">${pv.length ? Math.round(mean(pv)) + '%' : '—'} <small>of calories</small></span></div>${pv.length ? bars(pp, {min: 100, label: 'Ultra-processed share of calories'}) : ''}</div>`;
  // insights
  const ins = insights(); const shown = ins.filter(x => x.show);
  h += `<div class="card span2"><h2>Insights</h2>${shown.length ? shown.map(x => { const I = x.I; const dd = x.diff; const amt = I.yu === 'h' ? Math.abs(dd).toFixed(1) + ' h' : Math.round(Math.abs(dd)) + ' kcal'; const cond = I.bin ? `On days you drank` : `On days with more than ${x.cut % 1 ? x.cut.toFixed(1) : x.cut} ${I.x.toLowerCase()}`; const dir = I.yu === 'h' ? (dd < 0 ? 'less' : 'more') : (dd < 0 ? 'less' : 'more'); return `<div class="flag info"><div>${cond}, ${I.verb} <strong>${amt} ${dir}</strong> ${I.after}. <span class="muted">(${x.n} days, r = ${x.r.toFixed(2)})</span></div></div>`; }).join('') : '<div class="muted small">No strong patterns yet.</div>'}
    <div class="muted small">Fixed method: a correlation is checked only with 14+ days where both values are logged, and shown only if it's at least moderate (|r| ≥ 0.4).</div>
    <div class="list">${ins.map(x => `<div class="li"><div class="main"><div class="t" style="font-size:13px">${x.I.x} → ${x.I.y}</div></div><div class="num">${x.n >= 14 ? (x.show ? '<span class="chip ok">shown</span>' : `<span class="chip info">r ${x.r?.toFixed(2) ?? '—'}</span>`) : `<span class="muted">${x.n}/14 days</span>`}</div></div>`).join('')}</div></div>`;
  return h + '</div>';
}
function viewSupps() {
  const k = S.date, d = day(k), cfg = CFG();
  let h = header('Supplements');
  h += `<div class="grid">`;
  const due = dueList(k);
  h += `<div class="card"><h2>${k === todayKey() ? 'Today' : shortDate(k)} · with breakfast</h2>${due.map(s => `<label class="chk"><input type="checkbox" data-act="supp" data-id="${s.id}" ${d.supp?.[s.id] ? 'checked' : ''}><span>${esc(s.name)} <span class="muted" style="font-weight:400">· ${esc(s.dose)}</span></span></label>`).join('') || '<div class="muted small">Nothing scheduled.</div>'}${(() => { for (let i = 1; i <= 7; i++) { const kk = addDays(k, i); const w = SUPPS.filter(s => s.sched.type !== 'daily' && suppDue(s.id, kk)); if (w.length) return `<div class="muted small">Next ${niceDate(kk)}: ${w.map(s => `${esc(s.name)} × ${esc(s.dose)}`).join(' · ')}</div>`; } return ''; })()}</div>`;
  const start = firstKey(); const last30 = rangeKeys(k, 30).filter(x => x >= start);
  h += `<div class="card"><h2>Last 30 days</h2>${SUPPS.map(s => { const sch = last30.filter(x => suppDue(s.id, x)); const took = sch.filter(x => S.days[x]?.supp?.[s.id]).length; const pct = sch.length ? took / sch.length * 100 : 0; return sch.length ? `<div><div class="row small"><b>${esc(s.name)}</b><span>${took} / ${sch.length}</span></div><div class="bar" style="height:8px;margin-top:6px"><div style="width:${pct}%;background:${pct >= 85 ? 'var(--ok)' : 'var(--acc)'}"></div></div></div>` : ''; }).join('')}<div class="muted small">Counts only scheduled days since you started logging.</div></div>`;
  const up = (cfg.upcoming || []).filter(u => u.date >= todayKey()).sort((a, b) => a.date < b.date ? -1 : 1);
  h += `<div class="card"><h2>Coming up</h2>${up.length ? up.map(u => `<div class="row" style="justify-content:flex-start;align-items:flex-start"><b style="width:64px;flex:none;font-family:var(--head)">${shortDate(u.date)}</b><span class="small">${esc(u.text)}</span></div>`).join('') : '<div class="muted small">No scheduled changes.</div>'}</div>`;
  h += `<div class="card"><h2>Change history</h2>${(cfg.changes || []).slice().sort((a, b) => a.date < b.date ? 1 : -1).map(c => `<div class="row small" style="justify-content:flex-start;align-items:flex-start"><span class="muted" style="width:64px;flex:none">${shortDate(c.date)}</span><span>${esc(c.text)}</span></div>`).join('') || '<div class="muted small">Nothing yet.</div>'}</div>`;
  // bloodwork
  const bw = cfg.bloodwork || {}; const reps = (bw.reports || []).slice().sort((a, b) => a.date < b.date ? 1 : -1);
  const markers = [...new Set(reps.flatMap(r => Object.keys(r.markers || {})))];
  h += `<div class="card span2"><div class="row"><h2>Bloodwork</h2>${bw.nextDue ? `<span class="chip close">Next due ${shortDate(bw.nextDue)}</span>` : '<span class="chip close">Not done yet</span>'}</div>${reps.length ? `<div style="overflow-x:auto"><table class="bw"><thead><tr><th>Marker</th>${reps.slice(0, 4).map(r => `<th>${shortDate(r.date)}</th>`).join('')}</tr></thead><tbody>${markers.map(m => `<tr><td>${esc(m)}</td>${reps.slice(0, 4).map(r => { const x = r.markers[m]; return `<td>${x == null ? '—' : esc(typeof x === 'object' ? `${x.v} ${x.u || ''}${x.flag ? ' · ' + x.flag : ''}` : x)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>` : '<div class="muted small">No reports yet. Pending: CBC, ferritin, vitamin D, B12, TSH, HbA1c.</div>'}<div class="muted small">Download the PDF from Tata 1mg and upload it in a chat with Claude. Agreed changes to targets and supplements show up here.</div></div>`;
  // profiles
  h += `<div class="card span2"><h2>What each tablet adds</h2><div class="list">${SUPPS.map(s => `<div class="li"><div class="main"><div class="t">${esc(s.name)}${s.est ? ' <span class="chip close">estimated</span>' : ''}</div><div class="s">${Object.entries(s.v).map(([nk, v]) => `${NMAP[nk]?.n || nk} ${fmt(v, NMAP[nk]?.u)} ${NMAP[nk]?.u || ''}`).join(' · ')}</div></div></div>`).join('')}</div></div>`;
  return h + '</div>';
}

// ================= sheets =================
function sheetHTML() {
  const sh = S.sheet; if (!sh) return '';
  if (sh.type === 'item') {
    const d = day(S.date); const it = d.items.find(x => x.id === sh.id); if (!it) return '';
    const f = FMAP[it.f]; const v = itemVec(it);
    return `<div class="sheetbg" data-act="closesheet"><div class="sheet" role="dialog" aria-label="Edit item" data-stop="1"><div class="row"><h3>${esc(f.name)}</h3><button class="iconbtn" data-act="closesheet" aria-label="Close">${ic('x',18)}</button></div>
      <div class="row"><span>Quantity</span><div class="stepper"><button data-act="itemq" data-id="${it.id}" data-n="-1" aria-label="Fewer">−</button><input class="qn" type="number" inputmode="decimal" step="${stepOf(it.f)}" min="${stepOf(it.f)}" value="${it.q}" data-act="itemqset" data-id="${it.id}" aria-label="Quantity, tap to type"><button data-act="itemq" data-id="${it.id}" data-n="1" aria-label="More">+</button></div></div><div class="small muted" style="margin-top:-4px">Tap the number to type an amount, e.g. ${stepOf(it.f) === 0.25 ? '0.25 = ¼' : '0.5 = ½'}</div>${f.param ? `<div class="row"><span>${f.param.label}</span>${stepper('itemp', it.id, it.o?.[f.param.key] ?? f.param.def)}</div>` : ''}
      <div class="btns c3">${MEALS.map(m => `<button class="btn ${m.id === mealOf(it) ? 'on' : ''}" data-act="itemmeal" data-id="${m.id}" data-item="${it.id}" style="padding:0 6px;font-size:13px">${m.n}</button>`).join('')}</div>
      <div class="muted small">${fmt(v.kcal,'kcal')} kcal · ${fmt(v.p,'g')} g protein · ${fmt(v.f,'g')} g fat</div><button class="btn danger" data-act="delitem" data-id="${it.id}">Remove</button></div></div>`;
  }
  if (sh.type === 'drink') {
    const dd = DMAP[sh.d]; const ml = sh.ml; const mx = sh.m || 'none';
    const v = drinkVec({d: sh.d, ml, m: mx, mml: sh.mml || 0});
    return `<div class="sheetbg" data-act="closesheet"><div class="sheet" role="dialog" aria-label="Add drink" data-stop="1"><div class="row"><h3>Add drink</h3><button class="iconbtn" data-act="closesheet" aria-label="Close">${ic('x',18)}</button></div>
      <div class="btns c4">${DRINKS.map(x => `<button class="btn ${x.id === sh.d ? 'on' : ''}" data-act="dpick" data-id="${x.id}" style="padding:0 6px;font-size:13px">${x.name}</button>`).join('')}</div>
      <div class="muted small">${dd.name} · ${dd.sub}</div>
      <div class="row"><span style="font-weight:600">Amount</span><span style="display:flex;align-items:center;gap:6px"><input class="num" type="number" inputmode="numeric" min="0" max="3000" value="${ml}" data-act="dml" aria-label="Drink amount in ml"><span class="muted">ml</span></span></div>
      <div class="btns c3">${dd.presets.map(p => `<button class="btn ${p === ml ? 'on' : ''}" data-act="dpre" data-n="${p}">${p} ml</button>`).join('')}</div>
      <div style="font-weight:600">Mixer</div><div class="btns c4">${MIXERS.map(m => `<button class="btn ${m.id === mx ? 'on' : ''}" data-act="mpick" data-id="${m.id}" style="padding:0 6px;font-size:13px">${m.name}</button>`).join('')}</div>
      ${mx !== 'none' ? `<div class="row"><span>Mixer amount</span><span style="display:flex;align-items:center;gap:6px"><input class="num" type="number" inputmode="numeric" min="0" max="2000" value="${sh.mml || 0}" data-act="mml" aria-label="Mixer amount in ml"><span class="muted">ml</span></span></div><div class="btns c3">${[100,150,200].map(p => `<button class="btn ${p === sh.mml ? 'on' : ''}" data-act="mpre" data-n="${p}">${p} ml</button>`).join('')}</div>` : ''}
      <div class="muted small">${fmt(v.kcal,'kcal')} kcal · ${((v.alc || 0) / 10).toFixed(1)} standard drinks</div>
      <button class="btn primary" data-act="savedrink">Add to ${S.date === todayKey() ? 'today' : shortDate(S.date)}</button></div></div>`;
  }
  if (sh.type === 'account') {
    return `<div class="sheetbg" data-act="closesheet"><div class="sheet" role="dialog" aria-label="Account" data-stop="1"><div class="row"><h3>Account</h3><button class="iconbtn" data-act="closesheet" aria-label="Close">${ic('x',18)}</button></div>
      <div><div class="muted small">Signed in as</div><div style="font-weight:600">${esc(S.user?.email)}</div></div>
      <div class="row"><span class="status" style="font-size:13px">${syncHTML()}</span><button class="btn" data-act="syncnow">Sync now</button></div>
      <div class="muted small">${Object.keys(dirty).length} day(s) waiting to sync. Everything is saved on this phone first.</div>
      <button class="btn danger" data-act="signout">Sign out</button><div class="muted small">HimFit v${APP_VERSION}</div></div></div>`;
  }
  return '';
}

// ================= auth =================
function viewAuth() {
  const m = S.authMode;
  const title = m === 'signup' ? 'Create account' : m === 'forgot' ? 'Reset password' : S.recovery ? 'Set a new password' : 'Sign in';
  const pw = m !== 'forgot';
  return `<main class="wrap" style="max-width:440px;padding-top:48px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px"><img src="/icons/icon-192.png" alt="" width="52" height="52" style="border-radius:14px"><div><div style="font-family:var(--head);font-size:28px;font-weight:700">HimFit</div><div class="sub">Food, supplements and habits, tracked.</div></div></div>
    <form class="card" id="authform" novalidate>
      <h2>${title}</h2>
      ${S.recovery ? '' : `<label class="small" style="display:flex;flex-direction:column;gap:6px;font-weight:600">Email<input name="email" type="email" autocomplete="email" required class="field"></label>`}
      ${pw || S.recovery ? `<label class="small" style="display:flex;flex-direction:column;gap:6px;font-weight:600">${S.recovery ? 'New password' : 'Password'}<input name="password" type="password" minlength="8" autocomplete="${m === 'signup' || S.recovery ? 'new-password' : 'current-password'}" required class="field"></label>` : ''}
      ${S.authErr ? `<div class="flag warn" role="alert">${esc(S.authErr)}</div>` : ''}
      ${S.authMsg ? `<div class="flag info" role="status">${esc(S.authMsg)}</div>` : ''}
      <button class="btn primary" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Please wait…' : S.recovery ? 'Save password' : m === 'signup' ? 'Create account' : m === 'forgot' ? 'Send reset link' : 'Sign in'}</button>
      ${S.recovery ? '' : `<div class="row small" style="justify-content:center;gap:16px;flex-wrap:wrap">
        ${m !== 'signin' ? '<a href="#" data-act="authmode" data-m="signin">Sign in</a>' : ''}
        ${m !== 'signup' ? '<a href="#" data-act="authmode" data-m="signup">Create account</a>' : ''}
        ${m !== 'forgot' ? '<a href="#" data-act="authmode" data-m="forgot">Forgot password?</a>' : ''}</div>`}
    </form>
    <p class="muted small" style="text-align:center;margin-top:16px">Your logs are private to your account.</p></main>`;
}
async function onAuthSubmit(form) {
  const email = form.elements.namedItem('email')?.value.trim(); const password = form.elements.namedItem('password')?.value || '';
  S.authErr = ''; S.authMsg = '';
  if (!S.recovery && !/^\S+@\S+\.\S+$/.test(email || '')) { S.authErr = 'Enter a valid email address.'; render(); return; }
  if ((S.authMode !== 'forgot' || S.recovery) && password.length < 8) { S.authErr = 'Password must be at least 8 characters.'; render(); return; }
  S.busy = true; render();
  try {
    if (S.recovery) {
      const {data, error} = await sb.auth.updateUser({password}); if (error) throw error;
      S.recovery = false; history.replaceState(null, '', location.pathname); startUser(data.user); return;
    }
    if (S.authMode === 'signin') {
      const {data, error} = await sb.auth.signInWithPassword({email, password}); if (error) throw error;
      startUser(data.user); return;
    }
    if (S.authMode === 'signup') {
      const {data, error} = await sb.auth.signUp({email, password, options: {emailRedirectTo: location.origin}}); if (error) throw error;
      if (data.session) { startUser(data.user); return; }
      S.authMode = 'signin'; S.authMsg = 'Account created. Open the confirmation email we sent, then sign in here.';
    }
    if (S.authMode === 'forgot') {
      const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: location.origin}); if (error) throw error;
      S.authMsg = 'If that email has an account, a reset link is on its way.';
    }
  } catch (e) {
    S.authErr = /invalid login/i.test(e.message || '') ? 'No account matches that email and password. New here? Tap “Create account” below.' : /not confirmed/i.test(e.message || '') ? 'Confirm your email first — check your inbox.' : (e.message || 'Something went wrong. Try again.');
  }
  S.busy = false; render();
}
function startUser(u) {
  try { localStorage.setItem('hf:hasAccount', '1'); } catch (e) {}
  S.user = u; S.busy = false; S.authErr = ''; S.authMsg = '';
  S.days = LS.get(lk('days'), {}); dirty = LS.get(lk('dirty'), {}); S.config = LS.get(lk('config'), null);
  route(); pull().then(flushAll);
}
async function boot() {
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'PASSWORD_RECOVERY') { S.recovery = true; S.user = null; render(); }
    if (ev === 'SIGNED_OUT') { S.user = null; S.days = {}; S.sheet = null; render(); }
  });
  const {data: {session}} = await sb.auth.getSession();
  if (session && !S.recovery) startUser(session.user); else render();
}
window.addEventListener('online', () => { if (S.user) { flushAll(); pull(); } });
window.addEventListener('offline', () => setSync('local'));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.user) { pull(); flushAll(); } });
document.addEventListener('submit', e => { if (e.target.id === 'authform') { e.preventDefault(); onAuthSubmit(e.target); } });

// ================= render & routing =================
const VIEWS = {today: viewToday, log: viewLog, checkin: viewCheckin, nutrients: viewNutrients, trends: viewTrends, supplements: viewSupps};
function nav() {
  const a = (v, icon, label) => `<a href="#${v}" class="${S.view === v ? 'on' : ''}" ${S.view === v ? 'aria-current="page"' : ''}>${ic(icon, 24)}${label}</a>`;
  return `<nav class="bottom" aria-label="Main">${a('today','home','Today')}${a('nutrients','pie','Nutrients')}<a href="#log" class="fab" aria-label="Log food">${ic('plus', 26, 2.6)}</a>${a('trends','trend','Trends')}${a('supplements','pill','Supps')}</nav>`;
}
function render() {
  const sy = window.scrollY;
  if (!S.user) { document.getElementById('app').innerHTML = viewAuth(); return; }
  document.getElementById('app').innerHTML = `<main class="wrap">${(VIEWS[S.view] || viewToday)()}</main>${nav()}${sheetHTML()}${S.toast ? `<div class="toast" role="status">${esc(S.toast)}</div>` : ''}`;
  window.scrollTo(0, sy);
}
function route() { if (!S.user) { render(); return; } if (location.hash !== '#log') S.meal = null; const v = location.hash.replace('#', ''); S.view = VIEWS[v] ? v : 'today'; S.open = null; render(); window.scrollTo(0, 0); }
let toastT; function toast(m) { S.toast = m; clearTimeout(toastT); toastT = setTimeout(() => { S.toast = null; render(); }, 1800); render(); }

// ================= events =================
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  if (act === 'closesheet' && e.target.closest('[data-stop]') && !e.target.closest('button[data-act="closesheet"]')) return;
  if (el.tagName === 'INPUT') return; // handled by change
  const k = S.date, d = S.user ? day(k) : {}, n = +el.dataset.n, id = el.dataset.id;
  switch (act) {
    case 'day': { const nk = addDays(S.date, n); if (nk <= todayKey()) { S.date = nk; S.open = null; render(); } break; }
    case 'gotoday': e.preventDefault(); S.date = todayKey(); render(); break;
    case 'water': d.water = Math.max(0, (d.water || 0) + n); touch(k); break;
    case 'cart': { const c = S.cart[id] || (S.cart[id] = {q: 0, o: {}}); c.q = Math.max(0, c.q + n); if (FMAP[id].param && !c.o[FMAP[id].param.key]) c.o[FMAP[id].param.key] = FMAP[id].param.def; render(); break; }
    case 'param': { const f = FMAP[id]; const c = S.cart[id]; const pk = f.param.key; c.o[pk] = Math.min(f.param.max, Math.max(f.param.min, (c.o[pk] ?? f.param.def) + n)); render(); break; }
    case 'dosa': { const m = el.dataset.m; const c = S.cart.dosa || (S.cart.dosa = {q: 0, o: {}}); if (m === 'n') { S.dosaMode = 'n'; c.q = Math.max(c.q, 1); } else { S.dosaMode = null; c.q = c.q === +m ? 0 : +m; } render(); break; }
    case 'addcart': { const now = Date.now(); const m = S.meal || (S.date === todayKey() ? mealByHour(new Date().getHours()) : 'breakfast'); Object.entries(S.cart).forEach(([fid, c]) => { if (c.q > 0) d.items.push({id: uid(), f: fid, q: c.q, o: FMAP[fid].param ? {[FMAP[fid].param.key]: c.o[FMAP[fid].param.key] ?? FMAP[fid].param.def} : {}, t: now, m}); }); S.cart = {}; S.dosaMode = null; S.meal = null; touch(k); toast('Added'); location.hash = '#today'; break; }
    case 'stdday': { const now = Date.now(); STANDARD_DAY.forEach(s => d.items.push({id: uid(), f: s.f, q: s.q, o: s.o || {}, t: now, m: STD_MEAL[s.f] || 'breakfast'})); touch(k); toast('Standard day added'); location.hash = '#today'; break; }
    case 'edititem': S.sheet = {type: 'item', id}; render(); break;
    case 'itemq': { const it = d.items.find(x => x.id === id); if (it) { it.q = Math.max(stepOf(it.f), it.q + n); touch(k); } break; }
    case 'itemp': { const it = d.items.find(x => x.id === id); const f = it && FMAP[it.f]; if (f?.param) { it.o = it.o || {}; it.o[f.param.key] = Math.min(f.param.max, Math.max(f.param.min, (it.o[f.param.key] ?? f.param.def) + n)); touch(k); } break; }
    case 'meal': S.meal = id; render(); break;
    case 'logmeal': S.meal = id; break;
    case 'itemmeal': { const it = d.items.find(x => x.id === el.dataset.item); if (it) { it.m = id; touch(k); } break; }
    case 'delitem': d.items = d.items.filter(x => x.id !== id); S.sheet = null; touch(k); toast('Removed'); break;
    case 'closesheet': S.sheet = null; render(); break;
    case 'cistep': { d.ci = d.ci || {}; const f = id; const step = +(el.dataset.step || 1); const cur = d.ci[f]; d.ci[f] = cur == null ? (f === 'sl' ? 7 : Math.max(0, n)) : Math.min(f === 'sl' ? 16 : 999, Math.max(0, Math.round((cur + n * step) * 10) / 10)); touch(k); break; }
    case 'trained': d.ci = d.ci || {}; d.ci.tr = el.dataset.v === '1'; touch(k); break;
    case 'adddrink': S.sheet = {type: 'drink', d: 'beer5', ml: 330, m: 'none', mml: 0}; render(); break;
    case 'dpick': S.sheet.d = id; S.sheet.ml = DMAP[id].presets[0]; if (['beer5','beer8','wine'].includes(id)) { S.sheet.m = 'none'; S.sheet.mml = 0; } render(); break;
    case 'dpre': S.sheet.ml = n; render(); break;
    case 'mpick': S.sheet.m = id; if (id !== 'none' && !S.sheet.mml) S.sheet.mml = 150; render(); break;
    case 'mpre': S.sheet.mml = n; render(); break;
    case 'savedrink': { const sh = S.sheet; d.ci = d.ci || {}; d.ci.drinks = d.ci.drinks || []; d.ci.drinks.push({id: uid(), d: sh.d, ml: +sh.ml || 0, m: sh.m, mml: sh.m === 'none' ? 0 : (+sh.mml || 0), t: Date.now()}); S.sheet = null; touch(k); toast('Drink added'); break; }
    case 'deldrink': d.ci.drinks = (d.ci.drinks || []).filter(x => x.id !== id); touch(k); break;
    case 'nodrinks': d.ci = d.ci || {}; d.ci.drinks = []; touch(k); break;
    case 'opennut': S.open = S.open === id ? null : id; render(); break;
    case 'range': S.range = n; render(); break;
    case 'account': S.sheet = {type: 'account'}; render(); break;
    case 'syncnow': flushAll(); pull(); toast('Syncing…'); break;
    case 'signout': sb.auth.signOut(); break;
    case 'authmode': e.preventDefault(); S.authMode = el.dataset.m; S.authErr = ''; S.authMsg = ''; render(); break;
  }
});
document.addEventListener('change', e => {
  const el = e.target; const act = el.dataset.act; if (!act) return;
  const k = S.date, d = day(k);
  if (act === 'supp') { d.supp = d.supp || {}; d.supp[el.dataset.id] = el.checked; touch(k); }
  if (act === 'ci') { d.ci = d.ci || {}; const v = el.value === '' ? null : +el.value; if (v == null || isNaN(v)) delete d.ci[el.dataset.f]; else d.ci[el.dataset.f] = v; touch(k); }
  if (act === 'cartset') { const id = el.dataset.id, base = +el.dataset.base || 0; const c = S.cart[id] || (S.cart[id] = {q: 0, o: {}}); c.q = Math.max(0, roundStep(el.value, stepOf(id)) - base); if (FMAP[id].param && !c.o[FMAP[id].param.key]) c.o[FMAP[id].param.key] = FMAP[id].param.def; if (id === 'dosa' && c.q) S.dosaMode = 'n'; render(); }
  if (act === 'itemqset') { const it = (d.items || []).find(x => x.id === el.dataset.id); if (it) { it.q = Math.max(stepOf(it.f), roundStep(el.value, stepOf(it.f)) || it.q); touch(k); } }
  if (act === 'dml') { S.sheet.ml = Math.max(0, +el.value || 0); render(); }
  if (act === 'mml') { S.sheet.mml = Math.max(0, +el.value || 0); render(); }
});
window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.sheet) { S.sheet = null; render(); } });
// roll the date forward if the app stays open past 6 AM
setInterval(() => { const t = todayKey(); if (S.lastToday && S.lastToday !== t && S.date === S.lastToday) { S.date = t; render(); } S.lastToday = t; }, 60000);
S.lastToday = todayKey();
boot();
