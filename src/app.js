import {EXERCISES, SPORTS, DURS, XMAP, SMAP as SPMAP, GROUPS, EQN, MUSCLES, entryKcal, dayTrainKcal, weeklySets, sessions as trSessions, bestSet, fmtSets} from './training.js';
import {NUTRIENTS, ING, FOODS, STANDARD_DAY, DRINKS, MIXERS, SUPPS, DEFAULT_CONFIG, CAFF} from './data.js';
import {energyAt, energyDay, band, ratingBand, MODEL_VERSION, caffeineLevel, RATE_SCORE} from './energy.js';
import {placeHits} from './hits.js';
import {toCSV, download} from './export.js';
import {sb} from './supabase.js';
import {GOALS, GMAP, ACTIVITY, AMAP, computePlan, bodyNow, goalCheck, etaWeeks, bmiBand, ffmiBand, bfBand, weekStart, formulaMaintenance, ageAt, correctedWeight, weightCorrPct} from './profile.js';
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
const CMAP = Object.fromEntries(CAFF.map(c => [c.id, c]));
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
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  lift:'<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
};
// bold glyphs for the quick row: solid shapes (heads, bodies) + thick round strokes for limbs
const F = 'fill="currentColor" stroke="none"', L = w => `fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const GLYPHS = {
  bong: `<rect x="10.3" y="1.6" width="3.4" height="1.6" rx=".8" ${F}/><rect x="10.7" y="2.6" width="2.6" height="9" ${F}/><circle cx="12" cy="15.4" r="4.7" ${F}/><rect x="7.4" y="19.6" width="9.2" height="2" rx="1" ${F}/><path d="M15.6 13.8l3.2-2.3" ${L(2.2)}/><path d="M17.6 7.4c1-1-.4-2 .6-3M20 9.2c1-1-.4-2 .6-3" ${L(1.5)}/>`,
  pushup: `<circle cx="4.4" cy="8.6" r="2.2" ${F}/><path d="M6.8 9.6l13.6 3.6" ${L(3)}/><path d="M8.6 10.6l-.5 5.4" ${L(2.6)}/><path d="M20.4 13.2l.8 2.4" ${L(2.4)}/><rect x="2" y="17.2" width="20" height="1.8" rx=".9" ${F}/>`,
  squat: `<circle cx="11.6" cy="3.6" r="2.2" ${F}/><path d="M11.4 6.6l-1 5.2 5.2 1.6-1.2 5.4" ${L(3)}/><path d="M11.2 8.2h6" ${L(2.4)}/><rect x="6.2" y="19.6" width="12" height="1.8" rx=".9" ${F}/>`,
  mobility: `<circle cx="12" cy="3.5" r="2.2" ${F}/><path d="M12 6.6v6.8" ${L(3)}/><path d="M12 8.2L7.6 4.4M12 8.2l4.4-3.8" ${L(2.4)}/><path d="M12 13.4l-4.2 6.8M12 13.4l4.2 6.8" ${L(2.6)}/>`,
};
const glyph = (n, s = 28) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[n]}</svg>`;
const ic = (n, s=22, w=2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

// ================= meals =================
const MEALS = [
  {id:'breakfast', n:'Breakfast'}, {id:'msnack', n:'Morning snack'}, {id:'lunch', n:'Lunch'},
  {id:'esnack', n:'Evening snack'}, {id:'dinner', n:'Dinner'}, {id:'late', n:'Late night'},
];
const MEALN = Object.fromEntries(MEALS.map(m => [m.id, m.n]));
function mealByHour(h) { return h >= 5 && h < 11 ? 'breakfast' : h < 12 ? 'msnack' : h < 15 ? 'lunch' : h < 19 ? 'esnack' : h < 23 ? 'dinner' : 'late'; }
const mealOf = it => it.m || (it.t ? mealByHour(new Date(it.t).getHours()) : 'breakfast');
const MEAL_T = {breakfast:null, msnack:'11:30', lunch:'13:30', esnack:'17:00', dinner:'21:00', late:'00:30'};
function mealTime(k, m) { if (m === 'breakfast') { const w = S.days[k]?.ci?.mc?.wake || PROF()?.wake || '09:00'; return atClock(k, w, false) + 45 * 60e3; } return atClock(k, MEAL_T[m]); }
const STD_MEAL = {omelette:'breakfast', toast:'breakfast', cosmix:'breakfast', sattu:'breakfast', dahi:'esnack', banana:'esnack', taco:'dinner'};

// ================= nutrition engine =================
const unitCache = {};
// per-unit sauce grams for foods with sauce choices (taco): level 0–2 tsp
const sauceLv = (s, o) => { const v = o?.[s.key]; return v == null ? s.def : v; };
const sauceParts = (f, o = {}) => (f?.sauces || []).map(s => [s.key, s.g * sauceLv(s, o)]);
const sauceDefaults = f => Object.fromEntries((f?.sauces || []).map(s => [s.key, s.def]));
function sauceSummary(f, o) { if (!f?.sauces) return ''; const on = f.sauces.filter(s => sauceLv(s, o) > 0); if (f.sauces.every(s => sauceLv(s, o) === s.def)) return ''; if (!on.length) return 'no sauce'; return on.map(s => s.label.toLowerCase() + (sauceLv(s, o) > 1 ? ' ×' + sauceLv(s, o) : '')).join(' + ') + (on.length === 1 ? ' only' : ''); }
const sauceRow = (f, o, act, id) => (f.sauces || []).map(s => { const lv = sauceLv(s, o); return `<div class="row sauce"><span class="small">${s.label}</span><div class="seg" style="grid-template-columns:repeat(${s.max + 1},1fr);width:190px">${Array.from({length: s.max + 1}, (_, i) => `<button class="${lv === i ? 'on' : ''}" data-act="${act}" data-id="${id}" data-k="${s.key}" data-n="${i}" aria-label="${s.label} ${i ? i + ' teaspoon' : 'none'}">${i ? i + ' tsp' : 'None'}</button>`).join('')}</div></div>`; }).join('');
function vecAdd(t, v, mult) { for (const k in v) t[k] = (t[k] || 0) + v[k] * mult; return t; }
function foodUnit(fid, o = {}) {
  const f = FMAP[fid]; if (!f) return {};
  const pv = f.param ? (o[f.param.key] ?? f.param.def) : 0;
  const sp = sauceParts(f, o);
  const ck = fid + '|' + pv + '|' + sp.map(x => x[1]).join(','); if (unitCache[ck]) return unitCache[ck];
  const t = {};
  f.parts.forEach(([i, g]) => vecAdd(t, ING[i].v, g / 100));
  sp.forEach(([i, g]) => vecAdd(t, ING[i].v, g / 100));
  if (f.perParam) f.perParam.forEach(([i, g]) => vecAdd(t, ING[i].v, g * pv / 100));
  return (unitCache[ck] = t);
}
const FR = {0.25:'¼', 0.5:'½', 0.75:'¾'};
const fq = q => { const w = Math.floor(q), r = Math.round((q - w) * 4) / 4; return r === 1 ? String(w + 1) : r ? (w ? w : '') + FR[r] : String(w); };
const stepOf = fid => FMAP[fid]?.step || 0.5;
const roundStep = (v, st) => Math.round((+v || 0) / st) * st;
function itemVec(it) { return vecAdd({}, foodUnit(it.f, it.o || {}), it.q); }
function cafParts(dr) {
  const c = CMAP[dr.d]; if (!c) return [];
  const parts = c.parts.map(([i, g]) => [i, c.sizes && ING[i] && c.cat === 'energy' ? (dr.size || c.sizes[0]) : g]);
  if (c.shots) parts.push(['espresso', 30 * (dr.shots || c.shots)]);
  if (!c.nosugar && dr.sugar) parts.push(['sugar', 4 * dr.sugar]);
  return parts;
}
function drinkVec(dr) {
  const t = {};
  if (dr.k === 'caf') { cafParts(dr).forEach(([i, g]) => vecAdd(t, ING[i].v, g / 100)); return t; }
  if (ING[dr.d]) vecAdd(t, ING[dr.d].v, dr.ml / 100);
  if (dr.m && dr.m !== 'none' && ING[dr.m]) vecAdd(t, ING[dr.m].v, (dr.mml || 0) / 100);
  return t;
}
function itemLabel(it) {
  const f = FMAP[it.f]; if (!f) return 'Unknown item';
  let n = f.name;
  if (f.param) n += ` · ${it.o?.[f.param.key] ?? f.param.def} ${f.param.label.toLowerCase()}`;
  const ss = sauceSummary(f, it.o);
  if (it.f === 'dosa' && it.q === 8) return 'Dosa · full pack (8)';
  return (it.q !== 1 ? `${n} × ${fq(it.q)}` : n) + (ss ? ` · ${ss}` : '');
}
function drinkLabel(dr) {
  if (dr.k === 'caf') { const c = CMAP[dr.d]; if (!c) return 'Drink'; return c.name + (c.shots ? ` · ${dr.shots || c.shots} shot${(dr.shots || c.shots) > 1 ? 's' : ''}` : '') + (c.sizes && c.sizes.length > 1 ? ` ${dr.size || c.sizes[0]} ml` : '') + (!c.nosugar ? (dr.sugar ? ` · ${dr.sugar} tsp sugar` : ' · no sugar') : ''); }
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
    const f = FMAP[it.f]; if (f) { novaKcal(f.parts, it.q, nova); novaKcal(sauceParts(f, it.o), it.q, nova); if (f.perParam) novaKcal(f.perParam.map(([i,g]) => [i, g * (it.o?.[f.param.key] ?? f.param.def)]), it.q, nova); }
  });
  (day?.ci?.drinks || []).forEach(dr => {
    const v = drinkVec(dr); vecAdd(tot, v, 1); contrib.push({label: drinkLabel(dr), v});
    if (dr.k === 'caf') novaKcal(cafParts(dr), 1, nova); else { novaKcal([[dr.d, dr.ml]], 1, nova); if (dr.m && dr.m !== 'none') novaKcal([[dr.m, dr.mml || 0]], 1, nova); }
  });
  if (!opts.noSupps) Object.entries(day?.supp || {}).forEach(([sid, on]) => {
    if (!on || !SMAP[sid]) return; vecAdd(tot, SMAP[sid].v, 1); contrib.push({label: SMAP[sid].name + ' (supplement)', v: SMAP[sid].v, supp: true});
  });
  const kc = sum(Object.values(nova));
  return {tot, contrib, processed: kc ? (nova[4] || 0) / kc * 100 : null, hasFood: (day?.items || []).length > 0};
}
function stdDrinks(day) { return sum((day?.ci?.drinks || []).map(dr => dr.k === 'caf' ? 0 : (ING[dr.d]?.v.alc || 0) * (dr.ml || 0) / 100)) / 10; }

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

const APP_VERSION = '1.17.1';
// ================= state & storage =================
// Offline-first: every change is saved on the phone immediately (localStorage),
// then pushed to Supabase when online. Pull fetches only rows changed since the last pull.
const S = {
  days: {}, config: null, view: 'today', date: todayKey(), range: 7, open: null, cart: {}, dosaMode: null, meal: null,
  sheet: null, sync: 'loading', toast: null, user: null, authMode: (() => { try { return localStorage.getItem('hf:hasAccount') ? 'signin' : 'signup'; } catch (e) { return 'signin'; } })(), authMsg: '', authErr: '', busy: false, recovery: false,
};
const CFG = () => Object.assign({}, DEFAULT_CONFIG, S.config || {});
const PROF = () => CFG().profile || null;
let DV = 0; const planCache = {};
function weightHoursAwake(k) { const ci = S.days[k]?.ci; if (!ci?.wt) return null; return (ci.wt - sleepTimes(k).wake) / 3600e3; }
function weightCorr(k) { const ci = S.days[k]?.ci; if (!(ci?.w > 0)) return null; return correctedWeight(+ci.w, weightHoursAwake(k)); }
function weightList() { return allKeys().filter(k => S.days[k]?.ci?.w > 0).map(k => ({k, w: weightCorr(k)})); }
const EXCLUDE_TAGS = ['sick', 'travel'];
const excluded = k => (S.days[k]?.ci?.tags || []).some(t => EXCLUDE_TAGS.includes(t));
// body weight for training calories: latest weigh-in, else profile
function kgNow() { const wl = weightList(); return wl.length ? wl[wl.length - 1].w : +(PROF()?.weightKg || 70); }
const trainK = k => dayTrainKcal(S.days[k]?.tr, kgNow());
// training calories you didn't eat yesterday roll into today (one day only, max +600)
function carryK(k) { const y = addDays(k, -1), ky = trainK(y); if (!ky || !S.days[y]?.items?.length) return 0; const pl = plan(y); if (!pl) return 0;
  const eaten = dayCalc(S.days[y], {noSupps: true}).tot.kcal || 0; const usedOfTrain = Math.max(0, eaten - pl.targets.kcal); return Math.min(600, Math.max(0, ky - usedOfTrain)); }
function kcalTarget(k = S.date) { const pl = plan(k); if (!pl) return null; return pl.targets.kcal + trainK(k) + carryK(k); }
// measured maintenance learns your no-training base: training calories are taken off what you ate that day
function intakeList() { return allKeys().filter(k => (S.days[k]?.items || []).length).map(k => ({k, kcal: (dayCalc(S.days[k], {noSupps: true}).tot.kcal || 0) - trainK(k), complete: excluded(k) ? false : S.days[k]?.ci?.lc})); }
function tapeAt(k) { const ks = allKeys().filter(x => x <= k && S.days[x]?.ci?.waist > 0); const x = ks[ks.length-1]; return x ? {k: x, waist: +S.days[x].ci.waist, neck: +S.days[x].ci.neck || null, hip: +S.days[x].ci.hip || null} : null; }
const TAPE = [['waist','Waist','at the navel, relaxed, after a normal breath out'],['neck','Neck','just below the Adam\'s apple'],['chest','Chest','nipple level, arms down, normal breath'],['arm','Upper arm','right arm, flexed, biggest point'],['thigh','Mid-thigh','right leg, standing, halfway hip crease to kneecap'],['calf','Calf','right leg, standing, widest point']];
const tapeFields = () => PROF()?.sex === 'f' ? [...TAPE, ['hip','Hips','widest point']] : TAPE;
const IN = 2.54; const toIn = cm => Math.round(cm / IN * 4) / 4; const inStr = cm => `${toIn(cm)}″`;
function tapeSeries(f) { return allKeys().filter(k => S.days[k]?.ci?.[f] > 0).map(k => ({k, v: +S.days[k].ci[f]})); }
function lastTapeKey() { const ks = allKeys().filter(k => tapeFields().some(([f]) => S.days[k]?.ci?.[f] > 0)); return ks[ks.length-1] || null; }
function tapeSheet() {
  const sh = S.sheet;
  return `<div class="sheetbg" data-act="closesheet"><div class="sheet tall" role="dialog" aria-label="Update measurements" data-stop="1"><div class="row"><h3>Measurements</h3><button class="iconbtn" data-act="closesheet" aria-label="Close">${ic('x',18)}</button></div>
    <div class="muted small">Inches. Pre-filled with your last values; change the ones you re-measured. Morning, before food, same spots.</div>
    <label class="fl">Measured on<input class="field" type="date" value="${sh.date}" max="${todayKey()}" data-tapedate="1"></label>
    <div class="g2">${tapeFields().map(([f, n, how]) => `<label class="fl">${n}<input class="field" type="number" inputmode="decimal" step="0.25" value="${sh.vals[f] ?? ''}" placeholder="—" data-tape="${f}"><span class="muted" style="font-weight:400;font-size:11px">${how}</span></label>`).join('')}</div>
    <button class="btn primary" data-act="tapesave">Save</button></div></div>`;
}
// Physique and potential: what the numbers imply. Fixed assumptions, stated on screen.
function physiqueCard(p, b) {
  if (b.bf == null || b.lean == null) return '';
  const h2 = (p.heightCm / 100) ** 2, adj = 6.1 * (1.8 - p.heightCm / 100); const ffmiOf = lean => lean / h2 + adj; const leanAt = f => (f - adj) * h2;
  const fat = b.kg - b.lean; let h = '';
  // target implies (2/3 of gain as muscle on a lean bulk; heavy bulk 1/2; losses: 1/4 from muscle)
  if (p.targetKg) { const dW = p.targetKg - b.kg; const share = dW >= 0 ? (p.goal === 'heavybulk' ? 0.5 : 2 / 3) : 0.25; const lean2 = b.lean + dW * share, fat2 = fat + dW * (1 - share);
    h += `<div class="row small"><span>At your target of <b>${p.targetKg} kg</b></span><span><b>FFMI ${ffmiOf(lean2).toFixed(1)}</b> · ~${(fat2 / p.targetKg * 100).toFixed(0)}% fat</span></div><div class="muted small">Assumes ${dW >= 0 ? `${Math.round(share * 100)}% of the gain is muscle (typical for a beginner on a ${p.goal === 'heavybulk' ? 'heavy' : 'lean'} bulk)` : 'a quarter of the loss comes from muscle'}.</div>`; }
  h += `<div class="row small"><span>Well-trained natural (FFMI 22, after years)</span><span><b>${leanAt(22).toFixed(0)} kg lean</b> · +${(leanAt(22) - b.lean).toFixed(0)} kg from now</span></div>`;
  h += `<div class="muted small">Beginners can gain roughly 0.5–1 kg of muscle a month in the first year; it slows after that. FFMI 25 is about the natural ceiling.</div>`;
  // proportions
  const t = k => { const sr = tapeSeries(k); return sr.length ? sr[sr.length-1].v : null; };
  const ch = t('chest'), wa = t('waist'), ar = t('arm'), ca = t('calf'), ne = t('neck');
  if (ch && wa) h += `<div class="row small"><span>Chest-to-waist</span><span><b>${(ch / wa).toFixed(2)}</b> <span class="muted">· athletic look ~1.2+</span></span></div>`;
  if (ar && ca && ne) { const mx = Math.max(ar, ca, ne); const lag = [['arm', ar], ['calf', ca], ['neck', ne]].sort((x, y) => x[1] - y[1])[0];
    h += `<div class="row small"><span>Arm · calf · neck</span><span><b>${toIn(ar)}″ · ${toIn(ca)}″ · ${toIn(ne)}″</b></span></div><div class="muted small">Classic balance is flexed arm ≈ calf ≈ neck. Furthest behind: <b>${lag[0]}</b> (${toIn(mx - lag[1])}″ short of the biggest).</div>`; }
  // gain composition between the first and latest full tape checks
  const fulls = allKeys().filter(k => S.days[k]?.ci?.waist > 0 && S.days[k]?.ci?.neck > 0);
  if (fulls.length >= 2 && (parseKey(fulls[fulls.length-1]) - parseKey(fulls[0])) / 864e5 >= 14) {
    const at = k => { const bb = bodyNow(p, ctxFor(k)); return bb.bf != null ? {kg: bb.kg, lean: bb.lean, fat: bb.kg - bb.lean} : null; };
    const a = at(fulls[0]), z = at(fulls[fulls.length-1]);
    if (a && z && Math.abs(z.kg - a.kg) >= 0.5) { const dl = z.lean - a.lean, df = z.fat - a.fat;
      h += `<div class="flag ${df > dl && z.kg > a.kg ? 'warn' : 'info'}"><div><strong>Since ${shortDate(fulls[0])}:</strong> ${(z.kg - a.kg >= 0 ? '+' : '')}${(z.kg - a.kg).toFixed(1)} kg = ${(dl >= 0 ? '+' : '')}${dl.toFixed(1)} kg lean, ${(df >= 0 ? '+' : '')}${df.toFixed(1)} kg fat. Tape estimates: trust the direction more than the decimals.</div></div>`; } }
  return `<div class="card span2"><div class="row"><h2>Physique and potential</h2><span class="small muted">lean ${b.lean.toFixed(1)} kg · fat ${fat.toFixed(1)} kg</span></div>${h}</div>`;
}
function tapeProgress() {
  const p = PROF(); if (!p) return '';
  const rows = tapeFields().map(([f, n]) => { const sr = tapeSeries(f); if (!sr.length) return null; const a = sr[0], b = sr[sr.length-1]; return {f, n, first: a, last: b, d: b.v - a.v}; }).filter(Boolean);
  if (!rows.length) return `<div class="card span2"><h2>Measurements</h2><div class="muted small">No tape measurements yet: waist, neck, chest, upper arm, mid-thigh, calf.</div><button class="btn primary" data-act="tapeopen">Add measurements</button></div>`;
  // waist gained per kg gained since the first waist measurement (lean-bulk guardrail)
  let guard = ''; const ws = tapeSeries('waist');
  if (ws.length >= 2) { const wl = weightList(); const near = k => { const xs = wl.filter(x => Math.abs(parseKey(x.k) - parseKey(k)) <= 3 * 864e5); return xs.length ? mean(xs.map(x => x.w)) : null; };
    const w0 = near(ws[0].k), w1 = near(ws[ws.length-1].k); if (w0 && w1 && Math.abs(w1 - w0) >= 1) { const r = (ws[ws.length-1].v - ws[0].v) / (w1 - w0);
      guard = `<div class="flag ${w1 > w0 ? (r > 1 ? 'warn' : 'info') : 'info'}"><div><strong>${r >= 0 ? '+' : ''}${(r / IN).toFixed(2)}″ of waist per kg ${w1 > w0 ? 'gained' : 'lost'}</strong> since ${shortDate(ws[0].k)} (${(w1 - w0 >= 0 ? '+' : '')}${(w1 - w0).toFixed(1)} kg). ${w1 > w0 ? (r <= 0.7 ? 'Mostly lean gain.' : r <= 1 ? 'Some fat coming with it. Fine, keep an eye on it.' : 'Waist is growing too fast for the weight. The surplus is probably too big.') : ''}</div></div>`; } }
  return `<div class="card span2"><div class="row"><h2>Measurements</h2><button class="pill" data-act="tapeopen">Update measurements</button></div><div class="muted small">Change since your first measurement.</div>${guard}
    <div class="list">${rows.map(r => `<div class="li"><div class="main"><div class="t">${r.n}</div><div class="s">${inStr(r.first.v)} (${shortDate(r.first.k)}) → ${inStr(r.last.v)} (${shortDate(r.last.k)})</div></div><div class="num"><b style="color:${r.d === 0 ? 'var(--muted)' : (r.f === 'waist' ? (r.d > 0 ? 'var(--acc)' : 'var(--ok)') : (r.d > 0 ? 'var(--ok)' : 'var(--acc)'))}">${r.d > 0 ? '+' : ''}${(r.d / IN).toFixed(2)}″</b></div></div>`).join('')}</div>
    <div class="muted small">Tape error is about ¼–½ inch, so changes under ½ inch are noise. Rule of thumb on a bulk: up to 0.28″ of waist per kg gained is mostly lean; over 0.4″ per kg means too much fat.</div></div>`;
}
function ctxFor(k) { return {date: k, weights: weightList().filter(w => w.k <= k), intake: intakeList(), tape: tapeAt(k)}; }
function plan(k = S.date) { const p = PROF(); if (!p) return null; const ck = weekStart(k) + '|' + DV + '|' + JSON.stringify(p); if (!planCache[ck]) planCache[ck] = computePlan({...p, trainDays: 0}, ctxFor(k)); return planCache[ck]; } // training is logged, not assumed
const T = k => { const pl = plan(); if (k === 'kcal' && pl) return kcalTarget(S.date); if (pl && pl.targets[k] != null) return pl.targets[k]; return (CFG().targets && CFG().targets[k] != null) ? CFG().targets[k] : NMAP[k]?.t; };
const SPORT_ML = {football: 750, racket: 500, gym: 500};
const waterTarget = (k = S.date) => (plan()?.water || CFG().waterTargetMl) + sum((S.days[k]?.ci?.ev || []).map(x => SPORT_ML[x.k] || 0)) + sum((S.days[k]?.tr || []).map(e => e.sport ? Math.round((SPMAP[e.sport]?.ml || 0) * Math.min(2, (e.min || 0) / 60) / 50) * 50 : 0));
let cfgDirty = false;
async function saveConfig(cfg) {
  S.config = cfg; LS.set(lk('config'), cfg); cfgDirty = true; LS.set(lk('cfgDirty'), true); DV++; render();
  if (!navigator.onLine || !S.user) { setSync('local'); return; }
  const {error} = await sb.from('config').upsert([{user_id: S.user.id, data: cfg, updated_at: new Date().toISOString()}], {onConflict: 'user_id'});
  if (!error) { cfgDirty = false; LS.set(lk('cfgDirty'), false); setSync('ok'); } else setSync('err', 'Profile saved on this phone — will sync when it can');
}
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const lk = n => `hf:${S.user?.id || 'anon'}:${n}`;
let dirty = {}; let flushTimer = null; let flushing = false;
function day(k) { return S.days[k] || (S.days[k] = {items: [], water: 0, supp: {}, ci: {}}); }
function saveLocal() { LS.set(lk('days'), S.days); LS.set(lk('dirty'), dirty); }
function touch(k) {
  S.days[k].u = Date.now(); dirty[k] = true; DV++; saveLocal();
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
  if (cfgDirty && S.config) saveConfig(S.config); else if (!c.error) { const localZ = S.config?.zz; S.config = c.data ? c.data.data : null; if (localZ && S.config && !S.config.zz) { S.config.zz = localZ; saveConfig(S.config); } else LS.set(lk('config'), S.config); }
  DV++; if (PROF()) setTimeout(logTargetChange, 0); if (S.autoSetup && PROF() && S.view === 'setup') { S.autoSetup = false; S.pf = null; route(); return; }
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
function hasData(d) { return d && ((d.items || []).length || (d.tr || []).length || d.water || Object.values(d.supp || {}).some(Boolean) || Object.keys(d.ci || {}).length); }
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
  const now = weightAvg(k), before = weightAvg(addDays(k, -7)); const pf = PROF();
  if (pf) {
    const pl = plan(k); const gc = goalCheck(pf, now || pf.weightKg); if (gc) out.push({t:'warn', h:'Goal and target don\'t match', b: gc});
    if (now && before) { const ch = now - before, pc = pl.pace; if (Math.abs(ch - pc) > 0.4) out.push({t:'info', h: ch > pc ? 'Ahead of your pace' : 'Behind your pace', b:`${ch >= 0 ? '+' : ''}${ch.toFixed(1)} kg this week vs ${pc >= 0 ? '+' : ''}${pc} planned (7-day averages). One week can be water and salt; two weeks in a row is real.`}); }
    if (now && pf.targetKg && Math.abs(now - pf.targetKg) < 0.3) out.push({t:'info', h:`At your target of ${pf.targetKg} kg`, b:'7-day average. Time to pick a new goal on the Me tab.'});
  } else {
    if (now && before && now - before > cfg.maxGainPerWeek) out.push({t:'warn', h:'Gaining too fast', b:`+${(now-before).toFixed(1)} kg in a week (limit ${cfg.maxGainPerWeek}).`});
  }
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
// ================= energy =================
const atClock = (k, hhmm, afterMidnightIsNext = true) => { const [h, m] = (hhmm || '00:00').split(':').map(Number); const d = parseKey(k); d.setHours(h, m, 0, 0); if (afterMidnightIsNext && h < 6) d.setDate(d.getDate() + 1); return d.getTime(); };
const minOf = hhmm => { const [h, m] = (hhmm || '00:00').split(':').map(Number); return h * 60 + m; };
// bedtime belongs to the night before day k: evening times are on k-1, after-midnight times on k
const bedMs = (k, hhmm) => { const [h, m] = hhmm.split(':').map(Number); const d = parseKey(k); if (h >= 12) d.setDate(d.getDate() - 1); d.setHours(h, m, 0, 0); return d.getTime(); };
function sleepTimes(k) { const p = PROF() || {}; const ci = S.days[k]?.ci || {}; const mc = ci.mc;
  if ((!mc || mc.skipped) && ci.slp) return {bed: ci.slp.s, wake: ci.slp.e, real: false}; // from the sleep button, before the morning questions
  const bed = mc?.bed || p.bed || '01:00', wake = mc?.wake || p.wake || '09:00'; return {bed: bedMs(k, bed), wake: atClock(k, wake, false), real: !!(mc && mc.bed && !mc.skipped && mc.sq != null)}; }
// sleep button: one 'Going to sleep' / 'I'm awake' pair for night sleep and naps
// the start is kept in config (zz) AND as a backup on that day (ci.zz), so a sync can't erase it
function sleepStartAt() { const z = CFG().zz?.t; if (z) return z; const t = todayKey(); for (const kk of [t, addDays(t, -1)]) { const b = S.days[kk]?.ci?.zz; if (b) return b; } return null; }
const keyAt = ms => keyOf(new Date(ms - 6 * 3600e3));
const isNight = (s, e) => { const h = new Date(s).getHours(); return h >= 20 || h < 8 || e - s >= 5 * 3600e3; };
function sleepEnd() {
  const c = CFG(); const s = sleepStartAt(), e = Date.now(); if (!s) return;
  delete c.zz; saveConfig(c); { const kb = keyAt(s); const db = S.days[kb]; if (db?.ci?.zz) { delete db.ci.zz; touch(kb); } }
  if (e - s > 16 * 3600e3) { toast('That sleep start was over 16 h ago — cleared, not logged'); return; }
  if (e - s < 10 * 60e3) { toast('Under 10 minutes — not logged'); return; }
  if (!isNight(s, e)) { const ks = keyAt(s), d = day(ks); d.ci = d.ci || {}; d.ci.naps = d.ci.naps || []; d.ci.naps.push({id: uid(), s, e}); touch(ks); toast(`Nap logged · ${fmtH((e - s) / 3600e3)}`); return; }
  const kw = keyAt(e), d = day(kw); d.ci = d.ci || {}; d.ci.slp = {s, e};
  const mc = d.ci.mc && !d.ci.mc.skipped ? d.ci.mc : null;
  if (mc) { mc.bed = hhmm(s); mc.wake = hhmm(e); } else if (S.mc) { S.mc.bed = hhmm(s); S.mc.wake = hhmm(e); }
  const sl = Math.round((e - s) / 3600e3 * 4) / 4; if (sl > 0 && sl < 16) d.ci.sl = sl;
  touch(kw); toast(`Good morning · ${fmtH((e - s) / 3600e3)} of sleep`);
}
function endOfDayMs(k) { const p = PROF() || {}; return atClock(addDays(k, 1), p.bed || '01:00', false) - (minOf(p.bed || '01:00') >= 720 ? 864e5 : 0); }
function energyInput(k) {
  const d = S.days[k] || {}, y = S.days[addDays(k, -1)] || {}; const ci = d.ci || {}; const st = sleepTimes(k); const p = PROF() || {};
  const vec = (v, t) => ({t, kcal: v.kcal || 0, p: v.p || 0, c: v.c || 0, f: v.f || 0, fib: v.fib || 0, sug: v.sug || 0, alc: v.alc || 0});
  const intakes = [...(d.items || []).map(it => vec(itemVec(it), it.t || st.wake)), ...(ci.drinks || []).filter(dr => dr.t).map(dr => vec(drinkVec(dr), dr.t))];
  const caffeine = [...(y.ci?.drinks || []), ...(ci.drinks || [])].filter(dr => dr.t).map(dr => ({t: dr.t, mg: drinkVec(dr).caf || 0})).filter(x => x.mg > 0);
  let water = (d.wl || []).slice(); const logged = sum(water.map(x => x.ml)); const rest = (d.water || 0) - logged;
  if (rest > 0) { const span = Math.max(1, Math.min(Date.now(), endOfDayMs(k)) - st.wake); for (let i = 0; i < 4; i++) water.push({t: st.wake + span * (i + 0.5) / 4, ml: rest / 4}); }
  const h7 = rangeKeys(addDays(k, -1), 7).map(x => S.days[x]?.ci?.hits).filter(x => x != null);
  const yEve = atClock(addDays(k, -1), '18:00', false), yLate = atClock(addDays(k, -1), '21:00', false);
  const lastNight = {std: sum((y.ci?.drinks || []).filter(dr => dr.t >= yEve).map(dr => (drinkVec(dr).alc || 0) / 10)), lateHits: (y.ci?.hitsT || []).filter(t => t >= yLate).length, totalHits: y.ci?.hits || 0};
  // patterns from what you already log
  const pattern = {};
  if (st.real) {
    const ym = (y.items || []).map(it => ({t: it.t, kc: itemVec(it).kcal || 0})).filter(x => x.t && x.kc >= 100 && x.t <= st.bed);
    if (ym.length) pattern.lateMealH = (st.bed - Math.max(...ym.map(x => x.t))) / 3600e3;
    pattern.bedCaf = caffeineLevel(caffeine.filter(x => x.t <= st.bed), st.bed);
  }
  { const nights = [4, 5, 6, 7].map(i => S.days[addDays(k, -i)]?.ci?.sl).filter(x => x != null); if (nights.length >= 2) pattern.weekShort = mean(nights.map(h => Math.max(0, 7.5 - h))); }
  const streak = f => { let n = 0; for (let i = 0; i < 14; i++) { const mc = S.days[addDays(k, -i)]?.ci?.mc; if (mc && !mc.skipped && mc[f] != null && mc[f] <= 1) n++; else break; } return n; };
  pattern.lowMoodDays = streak('mood'); pattern.badSleepDays = streak('sq');
  // how your ratings usually sit against the model (needs 10+ checks with the model's score saved)
  const allR = allKeys().flatMap(x => (S.days[x]?.ci?.er || []).filter(r => r.v && r.m != null)).slice(-30);
  const rateBias = allR.length >= 10 ? mean(allR.map(r => RATE_SCORE[r.v] - r.m)) : 0;
  // sleep need: 7 h, moving halfway toward your own average once there are 7+ nights in the last 14 (never below 6.5)
  const nights = Array.from({length: 14}, (_, i) => S.days[addDays(k, -i - 1)]?.ci?.sl).filter(x => x != null && x > 2);
  const sleepNeed = nights.length >= 7 ? Math.min(7.5, Math.max(6.5, (7 + mean(nights)) / 2)) : 7;
  const trEv = dd => { const tr = dd?.tr || []; return [...tr.filter(e => e.sport).map(e => ({t: e.t, k: e.sport === 'football' ? 'football' : e.sport === 'mobility' ? 'mobility' : 'racket', sc: e.sport === 'mobility' ? Math.min(2, Math.max(0.5, (e.min || 10) / 10)) : Math.min(2, Math.max(0.4, (e.min || 0) / 60)) * (e.sport === 'pickleball' ? 0.6 : 1)})), ...trSessions(tr).map(se => ({t: se.t, k: 'gym', sc: Math.min(2, Math.max(0.15, se.min / 45))}))]; };
  return {pattern, rateBias, sleepNeed, events: [...(ci.ev || []).map(x => ({t: x.t, k: x.k})), ...trEv(S.days[k])], rates: (ci.er || []).filter(r => r.v).map(r => ({t: r.t, v: r.v})),
    wake: st.wake, bed: st.bed, real: st.real, usualWakeMin: minOf(p.wake || '09:00'), usualBedMin: minOf(p.bed || '01:00'),
    priorSleep: [1, 2, 3].map(i => { const c = S.days[addDays(k, -i)]?.ci; return c?.sl != null ? c.sl + 0.7 * napHours(c) : null; }), report: ci.mc && !ci.mc.skipped && ci.mc.sq != null && ci.mc.mood != null && ci.mc.feel != null ? {sq: ci.mc.sq, mood: ci.mc.mood, feel: ci.mc.feel} : null,
    naps: (ci.naps || []).map(n => ({s: n.s, e: n.e})), intakes, caffeine, water, hits: ci.hitsT || [], tags: ci.tags || [], yTags: y.ci?.tags || [], yEvents: [...(y.ci?.ev || []).map(x => ({t: x.t, k: x.k})), ...trEv(y)], hitsAvg7: h7.length ? mean(h7) : 0, lastNight, targets: {kcal: T('kcal'), p: T('p'), water: waterTarget()}};
}
// the bedtime you reported the next morning, if any (ends that day's curve)
function realBedMs(k) { const nk = addDays(k, 1); const zz = sleepStartAt(); if (zz && keyAt(zz) === k && zz > sleepTimes(k).wake + 3600e3) return zz;
  const sp = S.days[nk]?.ci?.slp; if (sp && keyAt(sp.s) === k && !S.days[nk]?.ci?.mc?.bed) return sp.s; const mc = S.days[nk]?.ci?.mc; if (!mc || mc.skipped || !mc.bed) return null; const b = bedMs(nk, mc.bed), w = sleepTimes(k).wake; return b > w + 3600e3 ? b : null; }
function dayEnd(k) { return realBedMs(k) ?? endOfDayMs(k); }
function energyFor(k, now = Date.now(), opt = {}) { const inp = energyInput(k); if (opt.noRates) inp.rates = []; const rb = realBedMs(k); const end = rb ?? Math.max(endOfDayMs(k), Math.min(now, endOfDayMs(k) + 3 * 3600e3)); const ci = S.days[k]?.ci || {}; return {inp, ...energyDay(inp, Math.min(now, end), end), end, rates: ci.er || [], evs: ci.ev || []}; }
function addHit(k, n) {
  const d = day(k); d.ci = d.ci || {}; const ci = d.ci;
  if (k !== todayKey()) { ci.hits = Math.max(0, (ci.hits || 0) + n); touch(k); return; }
  ci.hitsTap = ci.hitsTap || (ci.hitsT || []).slice();
  if (n > 0) ci.hitsTap.push(Date.now()); else if (ci.hitsTap.length) ci.hitsTap.pop(); else { ci.hits = Math.max(0, (ci.hits || 0) - 1); }
  const r = placeHits(ci.hitsTap, sleepTimes(k).wake); ci.hitsT = r.times; ci.hitsChain = r.chain; ci.hits = ci.hitsTap.length; touch(k);
}
function respreadHits(k, mode) { const ci = day(k).ci; if (!ci?.hitsTap?.length) return; const r = placeHits(ci.hitsTap, sleepTimes(k).wake, mode); ci.hitsT = r.times; ci.hitsChain = r.chain; touch(k); }
function hitsChainLine(k) { const ch = S.days[k]?.ci?.hitsChain; if (!ch) return ''; return `<div class="flag info"><div>${ch.n} hits spread over ${tlabel(ch.start)}–${tlabel(ch.end)}. <span class="small">Change: <a href="#" data-act="hitmode" data-id="1h">last hour</a> · <a href="#" data-act="hitmode" data-id="3h">last 2–3 h</a> · <a href="#" data-act="hitmode" data-id="wake">since I woke</a></span></div></div>`; }
const napHours = ci => sum((ci?.naps || []).map(n => Math.max(0, n.e - n.s))) / 3600e3;
const fmtH = h => { const m = Math.round(h * 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`; };
// one Sleep card: night sleep and naps together; + Add sleep classifies by time (same rule as the sleep button)
function nightOf(k) { const ci = S.days[k]?.ci || {}; const mc = ci.mc && !ci.mc.skipped ? ci.mc : null;
  if (mc?.bed && mc?.wake) return {s: bedMs(k, mc.bed), e: atClock(k, mc.wake, false)}; if (ci.slp) return {s: ci.slp.s, e: ci.slp.e}; return null; }
function sleepCard(k) {
  const ci = S.days[k]?.ci || {}; const nt = nightOf(k); const naps = (ci.naps || []).slice().sort((a, b) => a.s - b.s);
  const row = (kind, id, s0, e0) => `<button class="li linkish" style="width:100%" data-act="sleepedit" data-id="${id}" data-kind="${kind}"><div class="main"><div class="t" style="font-weight:600">${kind === 'night' ? 'Night' : 'Nap'}</div><div class="s">${tlabel(s0)} → ${tlabel(e0)}</div></div><b>${fmtH((e0 - s0) / 3600e3)}</b></button>`;
  const tot = (nt ? (nt.e - nt.s) / 3600e3 : 0) + napHours(ci);
  return `<div class="card"><div class="row"><h2>Sleep</h2><span class="small muted">${tot ? fmtH(tot) + ' total' : ''}</span></div>
    ${nt || naps.length ? `<div class="list">${nt ? row('night', 'night', nt.s, nt.e) : ''}${naps.map(n => row('nap', n.id, n.s, n.e)).join('')}</div>` : '<div class="muted small">Nothing yet. Use 🌙 Sleep on Today, or add it here if you forgot.</div>'}
    <button class="btn" data-act="sleepnew">+ Add sleep</button>
    <div class="muted small">Starts between 8 PM and 8 AM, or 5 h or longer = night sleep; anything else = a nap. Tap an entry to change or remove it.</div></div>`;
}
function saveSleep(k, from, to, editKind, editId) {
  const d = day(k); d.ci = d.ci || {};
  const fh = +from.split(':')[0]; const nS = bedMs(k, from), nE = atClock(k, to, false); const nightLike = (fh >= 20 || fh < 8 || nE - nS >= 5 * 3600e3) && nE > nS && nE - nS < 16 * 3600e3;
  // remove the entry being edited first
  if (editKind === 'nap') d.ci.naps = (d.ci.naps || []).filter(n => n.id !== editId);
  if (editKind === 'night') clearNight(d);
  if (nightLike) { const mc = d.ci.mc && !d.ci.mc.skipped ? d.ci.mc : null; if (mc) { mc.bed = from; mc.wake = to; } else d.ci.slp = {s: nS, e: nE};
    d.ci.sl = Math.round((nE - nS) / 3600e3 * 4) / 4; touch(k); toast(`✓ Night sleep saved · ${fmtH((nE - nS) / 3600e3)}`); return true; }
  let st = atClock(k, from), en = atClock(k, to); if (en <= st) en += 864e5; if (en - st > 10 * 3600e3) { toast('That nap is over 10 h — check the times'); return false; }
  d.ci.naps = d.ci.naps || []; d.ci.naps.push({id: uid(), s: st, e: en}); touch(k); toast(`✓ Nap saved · ${fmtH((en - st) / 3600e3)}`); return true;
}
function clearNight(d) { const mc = d.ci?.mc; if (mc && !mc.skipped) { delete mc.bed; delete mc.wake; } if (d.ci) { delete d.ci.slp; delete d.ci.sl; } }
const median = a => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length/2); return s.length % 2 ? s[m] : (s[m-1]+s[m])/2; };
const INSIGHTS = [
  {x:'Drinks (std)', y:'sleep', fx: d => Array.isArray(d?.ci?.drinks) ? stdDrinks(d) : undefined, fy: (d, n) => n?.ci?.sl, lag:1, yu:'h', verb:'you slept', after:'the next night', yd:1, bin:true},
  {x:'Sleep', y:'calories', fx: d => d?.ci?.sl, fy: d => (d?.items || []).length ? dayCalc(d, {noSupps:true}).tot.kcal : undefined, lag:0, yu:'kcal', verb:'you ate', after:'that day', yd:0},
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
  // The date is changed only on Today (‹ date ›); it applies to every screen. Other screens show it read-only:
  // muted when it's today, amber "Viewing <date> · change on Today" when it isn't (tap → Today).
  const arrows = !!opts.nav, show = opts.date !== false;
  let dateEl = '';
  if (arrows) dateEl = `<button class="iconbtn sm" data-act="day" data-n="-1" aria-label="Previous day">${ic('left', 16)}</button><span class="sub">${k === t ? niceDate(k) : `${niceDate(k)} · <a href="#" data-act="gotoday">today</a>`}</span><button class="iconbtn sm" data-act="day" data-n="1" aria-label="Next day" ${k >= t ? 'disabled' : ''}>${ic('right', 16)}</button>`;
  else if (show) dateEl = k === t ? `<span class="sub">${niceDate(k)}</span>` : `<a href="#today" class="sub pastday" aria-label="Viewing a past day; change the date on Today">Viewing ${niceDate(k)} · change on Today</a>`;
  const dateRow = (dateEl || opts.corner) ? `<div class="toprow"><div class="datenav2${arrows ? '' : ' ro'}">${dateEl}</div>${opts.corner || ''}</div>` : '';
  return `${dateRow}<div class="top"><div><h1>${esc(title)}</h1><button class="status" id="sync" data-act="account" aria-label="Account and sync">${syncHTML()}</button></div>${opts.right || ''}</div>`;
}
function baseStepper(id, base, add) {
  const tot = base + add;
  return `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px"><div class="stepper"><button data-act="cart" data-id="${id}" data-n="-1" data-base="${base}" aria-label="One fewer" ${tot > 0 ? '' : 'disabled style="opacity:.35"'}>−</button><input class="qn ${tot ? '' : 'zero'}" type="number" inputmode="decimal" step="${stepOf(id)}" min="${base}" value="${tot}" data-act="cartset" data-id="${id}" data-base="${base}" aria-label="Total amount, tap to type" style="${add ? 'color:var(--acc)' : ''}"><button data-act="cart" data-id="${id}" data-n="1" aria-label="One more">+</button></div>${base ? `<span class="small muted">${fq(base)} in this meal${add > 0 ? ` · +${fq(add)}` : add < 0 ? ` · −${fq(-add)}` : ''}</span>` : ''}</div>`;
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
  const tgt = PROF()?.targetKg || CFG().weightTarget; const all = [...pts.map(p => p.w), ...avg.map(p => p.a), tgt];
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
  let h = header(k === todayKey() ? 'Today' : 'Day', {nav: true, corner: `<a class="iconbtn sm" href="#me" aria-label="Me" style="display:inline-flex;align-items:center;justify-content:center;color:inherit">${ic('user', 18)}</a>`, right: `<div style="display:flex;gap:6px;align-items:center">${k !== todayKey() ? '' : sleepStartAt() ? `<button class="pill pillsm on2" data-act="sleepend">☀️ I'm awake</button>` : `<button class="pill pillsm ghost2" data-act="sleepstart">🌙 Sleep</button>`}<a class="pill pillsm" href="#checkin">Check-in</a></div>`});
  const fl = k === todayKey() ? flags(k) : [];
  h += '<div class="grid">';
  try { h += todayStrip(k, tot); } catch (er) { console.error(er); }
  if (k === todayKey()) h += quickAdd(k);
  if (k === todayKey() && !d.ci?.mc) h += morningCard(k);
  if (k === todayKey()) h += rateCard(k);
  if (k === todayKey() && d.ci?.hitsChain) h += `<div class="span2">${hitsChainLine(k)}</div>`;
  if (k === todayKey() && new Date().getDay() === 1 && !S.hideReview) { try { h += weeklyReviewCard(addDays(weekStart(k), -7), true); } catch (er) { console.error(er); } }
  if (fl.length) h += `<div class="span2" style="display:flex;flex-direction:column;gap:8px">${fl.map(f => `<div class="flag ${f.t}">${ic(f.t === 'warn' ? 'warn' : 'info', 18, 2.2)}<div><strong>${esc(f.h)}</strong> ${esc(f.b)}</div></div>`).join('')}</div>`;
  const kc = tot.kcal || 0, p = tot.p || 0;
  h += `<div class="card"><div><div class="row"><b>Calories</b><span class="big">${fmt(kc,'kcal')} <small>/ ${fmt(T('kcal'),'kcal')} kcal</small></span></div><div class="bar" style="margin-top:8px"><div style="width:${Math.min(100, kc/T('kcal')*100)}%;background:var(--acc)"></div></div></div>
    <div><div class="row"><b>Protein</b><span class="big">${fmt(p,'g')} <small>/ ${T('p')} g</small></span></div><div class="bar" style="margin-top:8px"><div style="width:${Math.min(100, p/T('p')*100)}%;background:var(--acc2)"></div></div></div>
    <div class="tiles"><div class="tile"><div class="l">Carbs</div><div class="v">${fmt(tot.c,'g')} g</div></div><div class="tile"><div class="l">Fat</div><div class="v" style="color:${barColor('f', tot.f||0)}">${fmt(tot.f,'g')} g</div></div><div class="tile"><div class="l">Sodium</div><div class="v" style="color:${barColor('na', tot.na||0)}">${fmt(tot.na,'mg')} mg</div></div></div>
    <a href="#nutrients" class="small" style="font-weight:600">All nutrients and vitamins</a></div>`;
  const wt = waterTarget(), w = d.water || 0;
  h += `<div class="card"><div class="row"><h2>Water</h2><span class="big">${(w/1000).toFixed(2).replace(/\.?0+$/, '')} <small>/ ${(wt/1000).toFixed(2).replace(/\.?0+$/, '')} L</small></span></div><div class="bar"><div style="width:${Math.min(100, w/wt*100)}%;background:var(--water)"></div></div>
    <div class="btns c4"><button class="btn wbtn" data-act="water" data-n="250">+250</button><button class="btn wbtn" data-act="water" data-n="500">+500</button><button class="btn wbtn" data-act="water" data-n="1000">+1 L</button><button class="btn" data-act="water" data-n="-250" aria-label="Remove 250 ml">−250</button></div></div>`;
  const due = dueList(k);
  h += `<div class="card"><div class="row"><h2>Supplements</h2><span style="display:flex;gap:12px;align-items:center">${due.length && due.some(x => !d.supp?.[x.id]) ? '<button class="pill" data-act="suppall">Took all</button>' : ''}<a href="#supplements" class="small" style="font-weight:600">Schedule</a></span></div>${due.length ? due.map(s => `<label class="chk"><input type="checkbox" data-act="supp" data-id="${s.id}" ${d.supp?.[s.id] ? 'checked' : ''}><span>${esc(s.name)} <span class="muted" style="font-weight:400">· ${esc(s.dose)}</span></span></label>`).join('') : '<div class="muted small">Nothing scheduled.</div>'}</div>`;
  const ci = d.ci || {};
  const tile = (l, v) => `<div class="tile c"><div class="l">${l}</div><div class="v">${v}</div></div>`;
  h += `<a class="card" href="#checkin" style="text-decoration:none;color:inherit"><div class="row"><h2>Check-in</h2><span class="small" style="font-weight:600;color:var(--acc)">Log sleep, drinks, hits →</span></div><div class="tiles">${tile('Weight', ci.w ? ci.w + ' kg' : '—')}${tile('Sleep', ci.sl != null || napHours(ci) ? ((ci.sl || 0) + napHours(ci)).toFixed(1).replace(/\.0$/, '') + ' h' + (napHours(ci) ? ' · nap' : '') : '—')}${tile('Training', (d.tr || []).length ? '~' + fmt(dayTrainKcal(d.tr, kgNow()),'kcal') + ' kcal' : '—')}${tile('Bong hits', ci.hits ?? '—')}${tile('Cigarettes', ci.cigs ?? '—')}${tile('Drinks', ci.drinks?.length ? stdDrinks(d).toFixed(1) + ' std' : (ci.drinks ? '0' : '—'))}</div><div class="muted small">Weight, sleep, bong hits, cigarettes and drinks — all optional. Training is in its own tab.</div></a>`;
  return h + '</div>';
}
function viewMeals() {
  const k = S.date, d = day(k); let h = header('Meals'); h += `<div class="grid">`;
  const items = (d.items || []).slice().sort((a, b) => (a.t || 0) - (b.t || 0));
  h += `<div class="card span2"><div class="list">${MEALS.map(m => { const its = items.filter(it => mealOf(it) === m.id); const mt = {}; its.forEach(it => vecAdd(mt, itemVec(it), 1));
      return `<div class="mealsec"><div class="row"><div class="t" style="font-weight:700">${m.n}${its.length ? ` <span class="small muted" style="font-weight:400">· ${fmt(mt.kcal,'kcal')} kcal · ${fmt(mt.p,'g')} g</span>` : ''}</div><a href="#log" class="addbtn" data-act="logmeal" data-id="${m.id}" aria-label="Add to ${m.n.toLowerCase()}">+</a></div>${its.map(it => { const v = itemVec(it); return `<button class="li linkish" style="width:100%" data-act="edititem" data-id="${it.id}" aria-label="Edit ${esc(itemLabel(it))}"><div class="main"><div class="t" style="font-weight:500">${esc(itemLabel(it))}</div></div><div class="small muted">${fmt(v.kcal,'kcal')} kcal · ${fmt(v.p,'g')} g</div></button>`; }).join('')}</div>`; }).join('')}</div>
    <div class="muted small">Tap a food to change the amount, time or meal, or remove it.</div></div>`;
  const cdr = (d.ci?.drinks || []).filter(dr => CMAP[dr.d]);
  if (cdr.length) h += `<div class="card span2"><h2>Coffee, tea &amp; energy drinks</h2><div class="list">${cdr.map(dr => `<div class="li"><div class="main"><div class="t">${esc(drinkLabel(dr))}</div><div class="s">${dr.t ? tlabel(dr.t) : ''}</div></div><button class="iconbtn" data-act="deldrink" data-id="${dr.id}" aria-label="Remove">${ic('x',16)}</button></div>`).join('')}</div></div>`;
  return h + '</div>';
}
// ================= training =================
function trEntries(k) { return (S.days[k]?.tr || []).slice().sort((a, b) => a.t - b.t); }
const trName = e => e.sport ? SPMAP[e.sport]?.n || e.sport : `${XMAP[e.x]?.n || e.x}${XMAP[e.x]?.eq.length > 1 ? ` (${EQN[e.eq].toLowerCase()})` : ''}`;
const trDetail = e => e.sport ? `${e.min} min` : fmtSets(e);
function viewTraining() {
  const k = S.date, es = trEntries(k), kg = kgNow(); let h = header('Training'); h += `<div class="grid">`;
  const kc = dayTrainKcal(es, kg), cy = carryK(k);
  h += `<div class="card span2"><div class="row"><div><h2 style="margin:0">${k === todayKey() ? 'Today' : 'This day'}</h2><div class="small muted">${es.length ? `${es.length} ${es.length === 1 ? 'entry' : 'entries'} · ~${fmt(kc,'kcal')} kcal added to your target` : 'Nothing logged'}${cy ? ` · +${fmt(cy,'kcal')} kcal carried over from yesterday` : ''}</div></div><a href="#trainadd" class="addbtn" aria-label="Add exercise">+</a></div>
    ${es.map(e => `<button class="li linkish" style="width:100%" data-act="tredit" data-id="${e.id}"><div class="main"><div class="t" style="font-weight:600">${esc(trName(e))}</div><div class="s">${esc(trDetail(e))} · ${tlabel(e.t)}</div></div><div class="small muted">~${fmt(entryKcal(e, kg),'kcal')} kcal</div></button>`).join('')}
    ${es.length ? '<div class="muted small">Tap an entry to change it or remove it.</div>' : ''}</div>`;
  // weekly sets per muscle (7 days ending this day)
  const wk = rangeKeys(k, 7).flatMap(kk => S.days[kk]?.tr || []); const ws = weeklySets(wk);
  if (wk.some(e => !e.sport)) h += `<div class="card span2"><h2>Sets this week</h2><div class="muted small">Last 7 days. Muscle grows best with about 10–20 hard sets a week per muscle; a set counts in full for the main muscle and half for helpers.</div>${MUSCLES.map(([m, n]) => { const v = ws[m] || 0; const c = v >= 10 ? 'var(--ok)' : v >= 5 ? 'var(--acc)' : 'var(--muted)'; return `<div class="row small"><span style="width:80px">${n}</span><div class="bar" style="flex:1;height:6px;margin:0 8px"><div style="width:${Math.min(100, v / 20 * 100)}%;background:${c}"></div></div><b style="width:36px;text-align:right">${fq(v)}</b></div>`; }).join('')}</div>`;
  h += `<a href="#trends" class="card span2" style="text-decoration:none;color:inherit"><div class="row"><span class="small"><b>Training history</b> · weekly activity, sets per muscle, lift progress</span><span class="small" style="color:var(--acc);font-weight:600">Trends →</span></div></a>`;
  return h + '</div>';
}
function viewTrainAdd() {
  let h = header('Add exercise'); h += `<a href="#training" class="small muted" style="display:block;margin:0 0 6px">‹ Training</a><div class="grid">`;
  GROUPS.forEach(([g, n]) => { const xs = g === 'sport' ? SPORTS.map(x => ({id: x.id, n: x.n, sport: true})) : EXERCISES.filter(x => x.g === g);
    h += `<div class="card span2"><h2>${n}</h2><div class="list">${xs.map(x => `<button class="li linkish" style="width:100%" data-act="tradd" data-id="${x.id}" data-sport="${x.sport ? 1 : ''}"><div class="main"><div class="t">${esc(x.n)}</div>${!x.sport && x.eq.length > 1 ? `<div class="s">${x.eq.map(q => EQN[q]).join(' · ')}</div>` : ''}</div><span class="addbtn" style="width:28px;height:28px;font-size:17px">+</span></button>`).join('')}</div></div>`; });
  return h + '</div>';
}
function lastTr(x, eq) { const ks = allKeys().sort().reverse(); for (const kk of ks) { const e = (S.days[kk]?.tr || []).filter(y => (y.x === x && (!eq || y.eq === eq)) || y.sport === x).sort((a, b) => b.t - a.t)[0]; if (e) return e; } return null; }
function trSheetFrom(e) { return e.sport ? {type: 'tr', id: e.id, sport: e.sport, min: e.min, time: hhmm(e.t)} : {type: 'tr', id: e.id, x: e.x, eq: e.eq, sets: (e.sets || []).map(s => ({...s})), differ: !(e.sets || []).every(s => s.r === e.sets[0].r && (s.w || 0) === (e.sets[0].w || 0)), time: hhmm(e.t)}; }
function trSheetNew(id, sport) { const now = hhmm(S.date === todayKey() ? Date.now() : mealTime(S.date, 'esnack'));
  if (sport) { const l = lastTr(id); return {type: 'tr', sport: id, min: l?.min || 60, time: now}; }
  const x = XMAP[id]; const l = lastTr(id); const eq = l?.eq && x.eq.includes(l.eq) ? l.eq : x.eq[0]; const l2 = lastTr(id, eq);
  return {type: 'tr', x: id, eq, sets: l2 ? l2.sets.map(s => ({...s})) : [{r: 10, w: eq === 'bw' ? 0 : 10}, {r: 10, w: eq === 'bw' ? 0 : 10}, {r: 10, w: eq === 'bw' ? 0 : 10}], differ: false, time: now}; }
function trSheetHTML(sh) {
  const close = `<button class="iconbtn" data-act="closesheet" aria-label="Close">${ic('x',18)}</button>`;
  if (sh.sport) return `<div class="sheetbg" data-act="closesheet"><div class="sheet" role="dialog" aria-label="Sport" data-stop="1"><div class="row"><h3>${esc(SPMAP[sh.sport].n)}</h3>${close}</div>
    <div class="fl">How long<div class="btns c3">${DURS.map(m => `<button class="btn ${sh.min === m ? 'on' : ''}" data-act="trset" data-f="min" data-v="${m}">${m < 60 ? m + ' min' : m / 60 + ' h'}</button>`).join('')}</div></div>
    <div class="row"><span>Time</span><input class="field" style="width:150px" type="time" value="${sh.time}" data-act="trtime" aria-label="Time"></div>
    <div class="muted small">~${fmt(entryKcal({sport: sh.sport, min: sh.min}, kgNow()),'kcal')} kcal added to your target</div>
    <button class="btn primary" data-act="trsave">${sh.id ? 'Save' : 'Add'}</button>${sh.id ? `<button class="btn" data-act="trdel">Remove</button>` : ''}</div></div>`;
  const x = XMAP[sh.x], bw = sh.eq === 'bw', s0 = sh.sets[0] || {r: 10, w: 0};
  const num = (f, v, step, lbl, i = '') => `<label class="fl" style="flex:1">${lbl}<input class="field" type="number" inputmode="decimal" step="${step}" min="0" value="${v ?? ''}" data-act="trnum" data-f="${f}" data-i="${i}"></label>`;
  return `<div class="sheetbg" data-act="closesheet"><div class="sheet tall" role="dialog" aria-label="Exercise" data-stop="1"><div class="row"><h3>${esc(x.n)}</h3>${close}</div>
    ${x.eq.length > 1 ? `<div class="btns c${x.eq.length}">${x.eq.map(q => `<button class="btn ${sh.eq === q ? 'on' : ''}" data-act="trset" data-f="eq" data-v="${q}">${EQN[q]}</button>`).join('')}</div>` : ''}
    ${!sh.differ ? `<div style="display:flex;gap:8px">${num('n', sh.sets.length, 1, 'Sets')}${num('r', s0.r, 1, 'Reps')}${bw ? '' : num('w', s0.w, 0.5, 'Weight (kg)')}</div>`
      : sh.sets.map((st, i) => `<div style="display:flex;gap:8px;align-items:flex-end"><span class="small muted" style="width:44px;padding-bottom:12px">Set ${i + 1}</span>${num('r', st.r, 1, 'Reps', i)}${bw ? '' : num('w', st.w, 0.5, 'kg', i)}</div>`).join('') + `<div class="row"><button class="btn" data-act="trset" data-f="addset">+ Set</button>${sh.sets.length > 1 ? `<button class="btn" data-act="trset" data-f="dropset">− Set</button>` : ''}</div>`}
    <label class="row small" style="justify-content:flex-start;gap:8px"><input type="checkbox" data-act="trdiffer" ${sh.differ ? 'checked' : ''}> Sets differ</label>
    <div class="row"><span>Time</span><input class="field" style="width:150px" type="time" value="${sh.time}" data-act="trtime" aria-label="Time"></div>
    <div class="muted small">${esc(fmtSets({sets: sh.sets}))} · ~${fmt(entryKcal({eq: sh.eq, sets: sh.sets}, kgNow()),'kcal')} kcal</div>
    <button class="btn primary" data-act="trsave">${sh.id ? 'Save' : 'Add'}</button>${sh.id ? `<button class="btn" data-act="trdel">Remove</button>` : ''}</div></div>`;
}
// time for food added on the Log screen: what you set, else now (today) or the meal's usual time (past days). The meal never moves it.
function logTimeFor(k, m) { return k === todayKey() ? Date.now() : mealTime(k, m); }
function viewLog() {
  const curMealT = S.meal || (S.date === todayKey() ? mealByHour(new Date().getHours()) : 'breakfast'); let h = header(`Add to ${MEALN[curMealT].toLowerCase()}`);
  const cart = S.cart; const cartKeys = Object.keys(cart).filter(id => cart[id].q !== 0);
  h += `<div class="grid">`;
  const curMeal = S.meal || (S.date === todayKey() ? mealByHour(new Date().getHours()) : 'breakfast');
  h += `<a href="#meals" class="small muted" style="display:block;margin:0 0 6px">‹ Meals</a>`;
  h += `<button class="card span2 drinkbtn" data-act="logdrink"><b>Coffee, tea, energy drinks</b><span class="small muted">Logs caffeine with the time, for your energy score. Alcohol is in Check-in.</span></button>`;
  const logged = {}; // the list always starts from zero: it only adds
  { const yIts = (S.days[addDays(S.date, -1)]?.items || []).filter(it => mealOf(it) === curMeal); if (yIts.length) { const v = {}; yIts.forEach(it => vecAdd(v, itemVec(it), 1)); h += `<button class="card span2 drinkbtn" data-act="repeatmeal" data-id="${curMeal}" style="border-color:var(--acc)"><b>Repeat yesterday's ${MEALN[curMeal].toLowerCase()}</b><span class="small muted">${esc(yIts.map(itemLabel).join(', '))} · ${fmt(v.kcal,'kcal')} kcal · ${fmt(v.p,'g')} g</span></button>`; } }
  const use = {}; rangeKeys(addDays(S.date, -1), 30).forEach(x => (S.days[x]?.items || []).forEach(it => { if (mealOf(it) === curMeal) use[it.f] = (use[it.f] || 0) + 1; }));
  const bySort = xs => xs.map((f, i) => ({f, i})).sort((a, b) => (use[b.f.id] || 0) - (use[a.f.id] || 0) || a.i - b.i).map(x => x.f);
  const FOODS_SORTED = [...bySort(FOODS.filter(f => !f.out)), 'OUT', ...bySort(FOODS.filter(f => f.out))];
  h += `<div class="card span2"><h2>Your foods</h2><div class="muted small">Sorted by what you usually eat at ${MEALN[curMeal].toLowerCase()}. Everything starts at 0 — pick what you're adding and tap Done. It's saved at the time you add it; to fix an amount, time or meal, tap the food on the Meals page. Tap a number to type halves (0.5, 1.5…); curd, big pizza, dal makhani and kachori go in quarters (0.25).</div><div class="list">`;
  FOODS_SORTED.forEach(f => {
    if (f === 'OUT') { h += `<div class="li"><div class="main"><div class="t" style="color:var(--acc)">Outside food</div><div class="s">Restaurant and takeaway portions</div></div></div>`; return; }
    const c = cart[f.id] || {q: 0}; const u = foodUnit(f.id, c.o || {});
    if (f.dosa) {
      h += `<div class="li" style="flex-direction:column;align-items:stretch"><div class="row"><div class="main"><div class="t">${f.name}</div><div class="s">${fmt(u.kcal,'kcal')} kcal · ${fmt(u.p,'g')} g each · full pack ${fmt(u.kcal*8,'kcal')} kcal · ${fmt(u.p*8,'g')} g</div></div>${S.dosaMode === 'n' ? baseStepper(f.id, logged.dosa || 0, c.q) : `<span style="text-align:right"><span class="n" style="font-family:var(--head);font-weight:700">${c.q ? '+' + c.q : ''}</span>${logged.dosa ? `<span class="small muted" style="display:block">${fq(logged.dosa)} logged</span>` : ''}</span>`}</div>
        <div class="btns c3"><button class="btn ${c.q === 1 && S.dosaMode !== 'n' ? 'on' : ''}" data-act="dosa" data-m="1">1 dosa</button><button class="btn ${S.dosaMode === 'n' ? 'on' : ''}" data-act="dosa" data-m="n">Number…</button><button class="btn ${c.q === 8 && S.dosaMode !== 'n' ? 'on' : ''}" data-act="dosa" data-m="8">Full pack (8)</button></div></div>`;
      return;
    }
    h += `<div class="li ${c.q ? '' : ''}"><div class="main"><div class="t">${f.name}</div><div class="s">${f.param ? `${fmt(u.kcal,'kcal')} kcal at ${c.o?.[f.param.key] ?? f.param.def} eggs · ${fmt(u.p,'g')} g` : `${fmt(u.kcal,'kcal')} kcal · ${fmt(u.p,'g')} g protein${f.sauces ? ' each, with sauces below' : ''}`}${f.out ? `<br>${esc(f.sub)}` : ''}</div></div>${baseStepper(f.id, logged[f.id] || 0, c.q)}</div>`;
    if (f.sauces && c.q > 0) h += `<div class="li" style="flex-direction:column;align-items:stretch;gap:6px"><div class="s small muted">Sauces per taco (1 tsp = 5 g)</div>${sauceRow(f, c.o, 'sauce', f.id)}</div>`;
    if (f.param && c.q > 0) h += `<div class="li"><div class="main"><div class="s" style="padding-left:12px">${f.param.label} per omelette</div></div>${stepper('param', f.id, c.o?.[f.param.key] ?? f.param.def)}</div>`;
  });
  h += `</div><div class="muted small">New foods get added to this list from their pack labels — ask Claude in chat.</div></div></div>`;
  const tot = {}; cartKeys.forEach(id => vecAdd(tot, foodUnit(id, cart[id].o || {}), cart[id].q));
  if (cartKeys.length) { const parts = cartKeys.map(id => `${cart[id].q > 0 ? '+' : '−'}${fq(Math.abs(cart[id].q))} ${FMAP[id].name.split(' (')[0].toLowerCase()}`);
    const lbl = parts.length <= 2 ? parts.join(', ') : `${parts.length} changes`;
    h += `<div class="cta"><button class="btn primary" data-act="addcart">Done · ${MEALN[curMeal]}: ${esc(lbl)} · ${tot.kcal >= 0 ? '+' : '−'}${fmt(Math.abs(tot.kcal),'kcal')} kcal</button></div>`; }
  return h;
}
function viewCheckin() {
  const k = S.date, d = day(k), ci = d.ci || {};
  let h = header('Check-in');
  h += `<div class="grid">`;
  h += `<div class="card"><div class="row"><label for="w"><h2>Weight</h2><div class="muted small">${ci.w && ci.wt ? (() => { const ha = weightHoursAwake(k); const pc = weightCorrPct(ha); return pc ? `Weighed ${ha.toFixed(0)} h after waking: counts as <b>${weightCorr(k).toFixed(1)} kg</b> (−${(pc * 100).toFixed(1)}%)` : 'Weighed soon after waking: counts as is'; })() : 'Any time; corrected to a morning number by hours since waking'}</div></label><span style="display:flex;align-items:center;gap:6px"><input id="w" class="num" type="number" inputmode="decimal" step="0.1" min="30" max="200" value="${ci.w ?? ''}" placeholder="—" data-act="ci" data-f="w"><span class="muted">kg</span></span></div>${lastWeightNote(k)}</div>`;

  h += sleepCard(k);
  h += dayTagsCard(ci);
  h += `<div class="card"><div class="row"><div><h2>Bong hits</h2><div class="muted small">${hitsNote(k)}</div></div>${stepper('cistep', 'hits', ci.hits ?? '—')}</div>${hitsChainLine(k)}<div class="muted small">Tap + when you take them. 5+ taps in a row count as catching up: spread back at ~6 an hour (12 hits = last 2 h). Change it if they were spread out more.</div></div>`;
  h += `<div class="card"><div class="row"><h2>Cigarettes</h2>${stepper('cistep', 'cigs', ci.cigs ?? '—')}</div></div>`;
  { const ev = (ci.ev || []).slice().sort((a, b) => a.t - b.t);
    h += `<div class="card"><h2>Moments</h2><div class="btns c3">${['hot', 'cool', 'spicy'].map(id => `<button class="btn" data-act="evadd" data-id="${id}">${EVN[id]}</button>`).join('')}</div>
      ${evList(ev, Object.keys(EVN), 'moments')}
      <div class="muted small">Tap one, check the time, tap OK. Each OK adds one — it never replaces an earlier one. They show on your energy chart.</div></div>`; }
  const drinks = ci.drinks || [];
  h += `<div class="card"><div class="row"><h2>Drinks</h2><button class="pill" data-act="adddrink">+ Add drink</button></div>${drinks.length ? `<div class="list">${drinks.map(dr => { const v = drinkVec(dr); return `<div class="li"><div class="main"><div class="t">${esc(drinkLabel(dr))}</div><div class="s">${fmt(v.kcal,'kcal')} kcal · ${dr.k === 'caf' ? Math.round(v.caf || 0) + ' mg caffeine' : (stdDrinks({ci:{drinks:[dr]}})).toFixed(1) + ' standard drinks'}${dr.t ? ' · ' + tlabel(dr.t) : ''}</div></div><button class="iconbtn" data-act="deldrink" data-id="${dr.id}" aria-label="Remove drink">${ic('x',18)}</button></div>`; }).join('')}</div><div class="muted small">Total ${stdDrinks(d).toFixed(1)} standard drinks (10 g alcohol each). Calories count toward your day.</div>` : `<div class="muted small">None logged. ${ci.drinks ? '' : '<button class="btn" data-act="nodrinks" style="height:36px;margin-left:6px">Log “none today”</button>'}</div>`}</div>`;
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
function avgNutrients(k, n) {
  const ks = rangeKeys(k, n).filter(x => (S.days[x]?.items || []).length && !excluded(x)); if (ks.length < 3) return {};
  const t = {}; ks.forEach(x => vecAdd(t, dayCalc(S.days[x]).tot, 1 / ks.length)); return t;
}
function lowAllWeek(k) {
  const ks = rangeKeys(addDays(k, -1), 7).filter(x => (S.days[x]?.items || []).length && !excluded(x)); if (ks.length < 5) return [];
  const tots = ks.map(x => dayCalc(S.days[x]).tot); const out = [];
  NUTRIENTS.filter(n => n.kind === 'min' && T(n.k)).forEach(n => {
    const lowDays = tots.filter(t => (t[n.k] || 0) < 0.7 * T(n.k)).length; if (lowDays < 5) return;
    const avg = mean(tots.map(t => t[n.k] || 0)); const gap = T(n.k) - avg;
    let best = null; FOODS.forEach(f => { const u = foodUnit(f.id); const per = u[n.k] || 0; if (per > 0 && (!best || per / (u.kcal || 1) > best.r)) best = {f, per, r: per / (u.kcal || 1)}; });
    const fix = best ? `${best.f.name}: +${fmt(best.per, n.u)} ${n.u} each (${Math.max(1, Math.ceil(gap / best.per))} closes the gap)` : '';
    out.push({k: n.k, n: n.n, u: n.u, avg, t: T(n.k), lowDays, fix});
  });
  return out;
}
function exportData(kind) {
  const ks = allKeys().filter(k => hasData(S.days[k])); const stamp = todayKey();
  if (kind === 'json') return download(`himfit-backup-${stamp}.json`, JSON.stringify({exported: new Date().toISOString(), version: APP_VERSION, config: S.config, days: S.days}, null, 1), 'application/json');
  if (kind === 'days') {
    const rows = [['date','kcal','protein_g','carbs_g','fat_g','fibre_g','sodium_mg','caffeine_mg','processed_pct','water_ml','weight_raw_kg','weight_corrected_kg','weighed_at','waist_cm','neck_cm','chest_cm','arm_cm','thigh_cm','calf_cm','sleep_h','nap_h','bed','wake','sleep_quality','mood','body_feel','energy_rated','energy_predicted','model','bong_hits','cigarettes','std_drinks','trained','kcal_burned','tags','log_complete','kcal_target','protein_target']];
    ks.forEach(k => { const d = S.days[k], ci = d.ci || {}, c = dayCalc(d), t = c.tot, mc = ci.mc || {}; const pl = plan(k);
      rows.push([k, Math.round(t.kcal || 0), Math.round(t.p || 0), Math.round(t.c || 0), Math.round(t.f || 0), Math.round(t.fib || 0), Math.round(t.na || 0), Math.round(t.caf || 0), c.processed == null ? '' : Math.round(c.processed), d.water || 0, ci.w ?? '', ci.w ? weightCorr(k).toFixed(2) : '', ci.wt ? new Date(ci.wt).toISOString() : '', ci.waist ?? '', ci.neck ?? '', ci.chest ?? '', ci.arm ?? '', ci.thigh ?? '', ci.calf ?? '', ci.sl ?? '', napHours(ci) ? napHours(ci).toFixed(2) : '', mc.bed || '', mc.wake || '', mc.sq != null ? WORDS.sq[mc.sq] : '', mc.mood != null ? WORDS.mood[mc.mood] : '', mc.feel != null ? WORDS.feel[mc.feel] : '', ci.eRep ?? '', ci.ePred ?? '', ci.eVer || '', ci.hits ?? '', ci.cigs ?? '', ci.drinks ? stdDrinks(d).toFixed(1) : '', ci.tr == null ? '' : ci.tr ? 'yes' : 'no', ci.burn ?? '', (ci.tags || []).join(' '), ci.lc == null ? '' : ci.lc ? 'yes' : 'no', pl ? pl.targets.kcal : '', pl ? pl.targets.p : '']); });
    return download(`himfit-days-${stamp}.csv`, toCSV(rows));
  }
  if (kind === 'food') {
    const rows = [['date','time','meal','food','quantity','options','kcal','protein_g','carbs_g','fat_g','fibre_g','sodium_mg']];
    ks.forEach(k => (S.days[k].items || []).forEach(it => { const v = itemVec(it); rows.push([k, it.t ? new Date(it.t).toISOString() : '', MEALN[mealOf(it)], FMAP[it.f]?.name || it.f, it.q, JSON.stringify(it.o || {}), Math.round(v.kcal || 0), +(v.p || 0).toFixed(1), +(v.c || 0).toFixed(1), +(v.f || 0).toFixed(1), +(v.fib || 0).toFixed(1), Math.round(v.na || 0)]); }));
    return download(`himfit-food-${stamp}.csv`, toCSV(rows));
  }
  if (kind === 'training') {
    const rows = [['date','time','exercise','equipment','set','reps','weight_kg','minutes','kcal']]; const kg = kgNow();
    ks.forEach(k => trEntries(k).forEach(e => { const tm = new Date(e.t).toISOString(); const kc = Math.round(entryKcal(e, kg));
      if (e.sport) rows.push([k, tm, SPMAP[e.sport]?.n || e.sport, '', '', '', '', e.min, kc]);
      else e.sets.forEach((st, i) => rows.push([k, tm, XMAP[e.x]?.n || e.x, EQN[e.eq] || e.eq, i + 1, st.r, st.w || '', '', i === 0 ? kc : ''])); }));
    return download(`himfit-training-${stamp}.csv`, toCSV(rows));
  }
  if (kind === 'drinks') {
    const rows = [['date','time','drink','kcal','caffeine_mg','taurine_mg','sugar_g','std_drinks']];
    ks.forEach(k => (S.days[k].ci?.drinks || []).forEach(dr => { const v = drinkVec(dr); rows.push([k, dr.t ? new Date(dr.t).toISOString() : '', drinkLabel(dr), Math.round(v.kcal || 0), Math.round(v.caf || 0), Math.round(v.tau || 0), +(v.sug || 0).toFixed(1), ((v.alc || 0) / 10).toFixed(1)]); }));
    return download(`himfit-drinks-${stamp}.csv`, toCSV(rows));
  }
}
function viewNutrients() {
  const k = S.date, d = day(k), c = dayCalc(d);
  let h = header('Nutrients');
  h += `<div class="grid">`;
  const ps = c.processed;
  h += `<div class="card span2"><div class="row"><div><h2>Processed-food share</h2><div class="muted small">% of calories from ultra-processed items (NOVA 4)</div></div><span class="big">${ps == null ? '—' : Math.round(ps) + '%'}</span></div>${ps != null ? `<div class="bar"><div style="width:${ps}%;background:var(--acc2)"></div></div>` : ''}<div class="muted small">Ultra-processed in your foods: cheese cubes, cheese spread, the three sauces, protein bread, Health Factory base, Cosmix; plus spirits, cola, 7Up and cranberry juice.</div></div>`;
  { const tk = trainK(k), cy = carryK(k), pl0 = plan(k); if (pl0 && (tk || cy)) h += `<div class="card span2"><div class="row small"><span>Calorie target today</span><b>${fmt(kcalTarget(k),'kcal')} kcal</b></div><div class="muted small">${fmt(pl0.targets.kcal,'kcal')} base${tk ? ` + ${fmt(tk,'kcal')} training today` : ''}${cy ? ` + ${fmt(cy,'kcal')} not eaten from yesterday's training` : ''}</div></div>`; }
  const avg7 = avgNutrients(k, 7); const lows = lowAllWeek(k);
  if (lows.length) h += `<div class="card span2"><h2>Low all week</h2>${lows.map(x => `<div class="row small"><span><b>${esc(x.n)}</b> · avg ${fmt(x.avg, x.u)} of ${fmt(x.t, x.u)} ${x.u}</span><span class="muted">${x.fix ? esc(x.fix) : ''}</span></div>`).join('')}<div class="muted small">Under 70% of target on at least 5 of the last 7 logged days. Fix uses foods already on your list.</div></div>`;
  const groups = [['macro','Macros'],['mineral','Minerals'],['vitamin','Vitamins & others'],['stim','Caffeine & taurine'],['other','Alcohol']];
  groups.forEach(([g, title]) => {
    const ns = NUTRIENTS.filter(n => n.g === g); if (g === 'other' && !(c.tot.alc > 0)) return; if (g === 'stim' && !(c.tot.caf > 0)) return;
    h += `<div class="card ${g === 'macro' ? '' : ''}"><h2>${title}</h2><div>`;
    ns.forEach(n => {
      const v = c.tot[n.k] || 0; const t = T(n.k); const st = status(n.k, v); const open = S.open === n.k; const a7 = avg7[n.k];
      h += `<button class="nrow" data-act="opennut" data-id="${n.k}" aria-expanded="${open}"><div class="row"><span style="font-weight:600">${n.n}</span><span><b>${fmt(v, n.u)}</b>${t ? ` / ${fmt(t, n.u)}` : ''} ${n.u}${n.kind === 'max' ? ' max' : ''} ${st ? `<span class="chip ${st[0]}">${st[1]}</span>` : ''}${a7 != null ? `<span class="a7">7-day avg ${fmt(a7, n.u)}</span>` : ''}</span></div>${t ? `<div class="bar" style="height:8px"><div style="width:${Math.min(100, v/t*100)}%;background:${barColor(n.k, v)}"></div></div>` : ''}</button>`;
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
  const lastWs = addDays(weekStart(end), -7); if (allKeys().some(k => k >= lastWs && k < weekStart(end) && hasData(S.days[k]))) h += `<div class="grid" style="margin-bottom:14px">${weeklyReviewCard(lastWs, false)}</div>`;
  h += `<div class="seg" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px">${[7,30,90].map(r => `<button class="${S.range === r ? 'on' : ''}" data-act="range" data-n="${r}">${r} days</button>`).join('')}</div><div class="grid">`;
  // weight
  const wv = keys.map(k => S.days[k]?.ci?.w).filter(x => x > 0); const nowAvg = weightAvg(end);
  let rate = null; { const pts = keys.map((k, i) => [i, S.days[k]?.ci?.w]).filter(p => p[1] > 0); if (pts.length >= 2 && pts[pts.length-1][0] - pts[0][0] >= 4) { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const mx = mean(xs), my = mean(ys); const sl = sum(xs.map((x, i) => (x-mx)*(ys[i]-my))) / sum(xs.map(x => (x-mx)**2)); rate = sl * 7; } }
  const tgt = PROF()?.targetKg || CFG().weightTarget; const lim = PROF() ? plan(end).pace : CFG().maxGainPerWeek;
  h += `<div class="card"><div class="row"><h2>Weight</h2><span class="big">${nowAvg ? nowAvg.toFixed(1) : '—'} <small>kg · 7-day avg</small></span></div>${wv.length ? weightChart(keys) : '<div class="muted small">No weights in this period.</div>'}${rate != null ? `<div class="flag ${Math.abs(rate - lim) > 0.4 ? 'warn' : 'info'}"><div><strong>${rate >= 0 ? '+' : ''}${rate.toFixed(2)} kg/week</strong> · ${PROF() ? 'plan' : 'limit'} ${lim >= 0 && PROF() ? '+' : ''}${lim}${rate > 0.05 && nowAvg && nowAvg < tgt ? ` · about ${Math.ceil((tgt - nowAvg) / rate)} weeks to ${tgt} kg` : ''}</div></div>` : ''}<div class="muted small">Dots = days you weighed. Line = 7-day average, so skipped days don't matter.</div></div>`;
  // calories & protein
  const kv = keys.map(k => { const d = S.days[k]; if (!d || !(d.items || []).length) return {v: null, l: lab(k)}; const t = dayCalc(d).tot; return {v: t.kcal, l: lab(k), c: (t.p || 0) < T('p') ? 'var(--acc2)' : 'var(--acc)', p: t.p}; });
  const logged = kv.filter(x => x.v != null);
  h += `<div class="card"><div class="row"><h2>Calories &amp; protein</h2><span class="small muted">${logged.length ? `avg ${fmt(mean(logged.map(x => x.v)),'kcal')} kcal · ${fmt(mean(logged.map(x => x.p)),'g')} g` : ''}</span></div>${bars(kv, {line: T('kcal'), min: T('kcal'), label: 'Daily calories against target'})}<div class="muted small">Orange = protein under ${T('p')} g that day (${logged.filter(x => x.p < T('p')).length} of ${logged.length}). Dashed line = calorie target.</div></div>`;
  h += trainingTrends(keys, lab);
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
  return h + '</div>';
}
// training on Trends: activity over the range, sets per muscle by week, and each lift's progress
function trainingTrends(keys, lab) {
  const kg = kgNow(); let h = '';
  const tv = keys.map(k => { const es = S.days[k]?.tr || []; const kc = dayTrainKcal(es, kg); return {v: es.length ? Math.round(kc) : null, l: lab(k), c: es.some(e => e.sport && e.sport !== 'mobility') ? 'var(--water)' : 'var(--acc)'}; });
  const act = tv.filter(x => x.v != null), totK = sum(act.map(x => x.v));
  const setsN = sum(keys.flatMap(k => (S.days[k]?.tr || []).filter(e => !e.sport).map(e => e.sets.length)));
  const mins = sum(keys.flatMap(k => (S.days[k]?.tr || []).map(e => e.sport ? e.min || 0 : e.sets.length * 2.5)));
  h += `<div class="card"><div class="row"><h2>Training</h2><span class="big">${act.length} <small>active days</small></span></div>
    <div class="small muted">${fmt(totK,'kcal')} kcal burned · ${setsN} sets · ${Math.round(mins)} min</div>
    ${act.length ? bars(tv, {label: 'Training calories per day'}) + '<div class="muted small">Calories from training each day. Blue = a day with sport.</div>' : '<div class="muted small">Nothing logged in this period.</div>'}</div>`;
  // sets per muscle, last 8 weeks
  const wsNow = weekStart(todayKey()); const weeks = Array.from({length: 8}, (_, i) => addDays(wsNow, -7 * (7 - i)));
  const grid = weeks.map(ws => weeklySets(Array.from({length: 7}, (_, j) => S.days[addDays(ws, j)]?.tr || []).flat()));
  if (grid.some(g => Object.keys(g).length)) {
    const cell = v => { const c = !v ? 'rgba(255,255,255,.04)' : v < 5 ? 'rgba(255,184,0,.18)' : v < 10 ? 'rgba(255,184,0,.38)' : v <= 20 ? 'rgba(122,201,122,.55)' : 'rgba(122,201,122,.85)'; return `<td style="background:${c};text-align:center;border-radius:6px;padding:4px 0;font-size:12px">${v ? fq(v) : ''}</td>`; };
    const tot = MUSCLES.map(([m, n]) => [n, sum(grid.slice(-4).map(g => g[m] || 0))]).sort((a, b) => b[1] - a[1]);
    h += `<div class="card"><h2>Sets per muscle, by week</h2><div class="muted small">Last 8 weeks (Mon–Sun). Green = 10–20 sets, the range that builds muscle best.</div>
      <table style="width:100%;border-spacing:3px;margin-top:6px"><tr><td></td>${weeks.map(ws => `<td class="small muted" style="text-align:center">${parseKey(ws).getDate()}/${parseKey(ws).getMonth() + 1}</td>`).join('')}</tr>
      ${MUSCLES.map(([m, n]) => `<tr><td class="small" style="white-space:nowrap;padding-right:4px">${n}</td>${grid.map(g => cell(g[m] || 0)).join('')}</tr>`).join('')}</table>
      <div class="small" style="margin-top:6px">Last 4 weeks: most <b>${tot[0][0].toLowerCase()}</b> (${fq(tot[0][1])} sets), least <b>${tot[tot.length - 1][0].toLowerCase()}</b> (${fq(tot[tot.length - 1][1])}).</div></div>`;
  }
  // lift progress lines
  const hist = {}; allKeys().sort().forEach(kk => (S.days[kk]?.tr || []).forEach(e => { if (e.sport) return; const b = bestSet(e); if (!b) return; const key = e.x + '|' + e.eq; (hist[key] = hist[key] || []).push({k: kk, v: b.e1 ?? b.reps, unit: b.e1 != null ? 'kg' : 'reps', e}); }));
  const prog = Object.values(hist).filter(xs => xs.length >= 2);
  if (prog.length) h += `<div class="card"><h2>Lift progress</h2><div class="muted small">Best set each time you did it. Weighted lifts show an estimated 1-rep max.</div>${prog.map(xs => {
      const W = 120, H = 28, mn = Math.min(...xs.map(x => x.v)), mx = Math.max(...xs.map(x => x.v)), sp = mx - mn || 1;
      const pts = xs.map((x, i) => `${(i / (xs.length - 1) * W).toFixed(1)},${(H - 3 - (x.v - mn) / sp * (H - 6)).toFixed(1)}`).join(' ');
      const a = xs[0], z = xs[xs.length - 1], up = z.v - a.v, f = x => x.unit === 'kg' ? x.v.toFixed(1) + ' kg' : x.v + ' reps';
      return `<div class="row small" style="gap:8px"><span style="flex:1;min-width:0">${esc(trName(z.e))}</span><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><polyline points="${pts}" fill="none" stroke="${up >= 0 ? 'var(--ok)' : 'var(--over)'}" stroke-width="2" stroke-linejoin="round"/></svg><span style="width:110px;text-align:right">${f(a)} → <b>${f(z)}</b></span></div>`; }).join('')}</div>`;
  return h;
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
  // bloodwork
  const bw = cfg.bloodwork || {}; const reps = (bw.reports || []).slice().sort((a, b) => a.date < b.date ? 1 : -1);
  const markers = [...new Set(reps.flatMap(r => Object.keys(r.markers || {})))];
  h += `<div class="card span2"><div class="row"><h2>Bloodwork</h2>${bw.nextDue ? `<span class="chip close">Next due ${shortDate(bw.nextDue)}</span>` : '<span class="chip close">Not done yet</span>'}</div>${reps.length ? `<div style="overflow-x:auto"><table class="bw"><thead><tr><th>Marker</th>${reps.slice(0, 4).map(r => `<th>${shortDate(r.date)}</th>`).join('')}</tr></thead><tbody>${markers.map(m => `<tr><td>${esc(m)}</td>${reps.slice(0, 4).map(r => { const x = r.markers[m]; return `<td>${x == null ? '—' : esc(typeof x === 'object' ? `${x.v} ${x.u || ''}${x.flag ? ' · ' + x.flag : ''}` : x)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>` : '<div class="muted small">No reports yet. Pending: CBC, ferritin, vitamin D, B12, TSH, HbA1c.</div>'}<div class="muted small">Download the PDF from Tata 1mg and upload it in a chat with Claude. Agreed changes to targets and supplements show up here.</div></div>`;
  // profiles
  h += `<div class="card span2"><h2>What each tablet adds</h2><div class="list">${SUPPS.map(s => `<div class="li"><div class="main"><div class="t">${esc(s.name)}${s.est ? ' <span class="chip close">estimated</span>' : ''}</div><div class="s">${Object.entries(s.v).map(([nk, v]) => `${NMAP[nk]?.n || nk} ${fmt(v, NMAP[nk]?.u)} ${NMAP[nk]?.u || ''}`).join(' · ')}</div></div></div>`).join('')}</div></div>`;
  return h + '</div>';
}

// ================= energy UI =================
const BCOL = {g:'var(--ok)', y:'var(--acc)', r:'var(--over)'};
// whole-day tags (on/off for the day) and timed tags (each tap logs one at that time)
const TAGS = [['sick','Sick'],['stressed','Stressed'],['exam','Exam/deadline'],['party','Party']];
const TIMED = {crashed: '😴 Crashed', great: '😊 Great mood', productive: '📚 Productive', gym: '🏋️ Gym', football: '⚽ Football', racket: '🏸 Racket', chill: '🎧 Chill'};
const TAG_GROUPS = [['Body', [['sick', 0], ['crashed', 1]]], ['Mood', [['stressed', 0], ['great', 1]]], ['Day', [['exam', 0], ['party', 0], ['productive', 1]]], ['Chill', [['chill', 1]]]];
const TAGN = Object.fromEntries(TAGS);
const tagRow = (on, act) => `<div class="seg5">${TAGS.map(([id, n]) => `<button class="${on.includes(id) ? 'on' : ''}" data-act="${act}" data-id="${id}">${n}</button>`).join('')}</div>`;
function evList(ev, keys, box) { const xs = (ev || []).filter(x => keys.includes(x.k)).sort((a, b) => a.t - b.t); if (!xs.length) return '';
  const open = (S.evOpen || {})[box];
  return `<button class="linkish small muted" data-act="evtoggle" data-id="${box}" style="display:block;margin-top:6px">Logged today (${xs.length}) ${open ? '▴' : '▾'}</button>` + (!open ? '' : `<div class="list">${xs.map(x => `<div class="li"><div class="main"><div class="t">${EVN[x.k] || TIMED[x.k] || x.k}</div></div><input class="field" style="width:130px" type="time" value="${hhmm(x.t)}" data-act="evtime" data-id="${x.id}" aria-label="Time"><button class="iconbtn" data-act="evdel" data-id="${x.id}" aria-label="Remove">${ic('x',16)}</button></div>`).join('')}</div>`); }
const evCount = (ev, k) => (ev || []).filter(x => x.k === k).length;
function dayTagsCard(ci) { const on = ci.tags || [];
  return `<div class="card"><h2>Day tags</h2>${TAG_GROUPS.map(([g, xs]) => `<div class="row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap;margin:4px 0"><span class="small muted" style="width:52px;flex:none">${g}</span>${xs.map(([id, timed]) => timed
      ? `<button class="chipbtn" data-act="evadd" data-id="${id}">${TIMED[id]}</button>`
      : `<button class="chipbtn ${on.includes(id) ? 'on' : ''}" data-act="daytag" data-id="${id}">${TAGN[id]}</button>`).join('')}</div>`).join('')}
    ${evList(ci.ev, Object.keys(TIMED), 'tags')}
    <div class="muted small">Sick, Stressed, Exam/deadline and Party are for the whole day (tap again to turn off). The others ask for the time (starts at now), then OK — each one adds an entry. All count in your energy score. Sick days are left out of maintenance.</div></div>`; }
const WORDS = {sq:['Terrible','Poor','Okay','Good','Great'], mood:['Low','Irritable','Okay','Good','Great'], feel:['Drained','Heavy','Okay','Light','Energetic']};
const hhmm = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const tlabel = ms => new Date(ms).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
function morningCard(k) {
  const d = day(k), y = S.days[addDays(k, -1)]; const p = PROF() || {};
  const sp = d.ci?.slp; const m = S.mc || (S.mc = sp ? {bed: hhmm(sp.s), wake: hhmm(sp.e), sq: null, mood: null, feel: null, yr: null, lc: null} : {bed: p.bed || '01:00', wake: Date.now() >= atClock(k, p.wake || '09:00', false) ? (p.wake || '09:00') : hhmm(Date.now()), sq: null, mood: null, feel: null, yr: null, lc: null});
  const row = (f, label, words) => `<div class="fl">${label}<div class="seg5">${words.map((w, i) => `<button class="${m[f] === i ? 'on' : ''}" data-act="mcset" data-f="${f}" data-v="${i}">${w}</button>`).join('')}</div></div>`;
  const hasY = y && hasData(y);
  const sl = (() => { const b = bedMs(k, m.bed), w = atClock(k, m.wake, false); return (w - b) / 3600e3; })();
  return `<div class="card span2 mcard"><div class="row"><h2>${new Date().getHours() < 14 ? 'Good morning' : 'Morning check-in'}${p.name ? ', ' + esc(p.name) : ''}</h2><a href="#" class="small muted" data-act="mcskip">Skip today</a></div>
    <div class="g2"><label class="fl">Went to sleep<input class="field" type="time" value="${m.bed}" data-mc="bed"></label><label class="fl">Woke up<input class="field" type="time" value="${m.wake}" data-mc="wake"></label></div>
    <div class="muted small" id="mcsl">${sl > 0 && sl < 16 ? `${sl.toFixed(1)} h of sleep` : 'Check the times'}</div>
    ${row('sq', 'How did you sleep?', WORDS.sq)}${row('mood', 'Mood right now', WORDS.mood)}${row('feel', 'How does your body feel?', WORDS.feel)}
    <div class="fl">Anything about today? <span class="muted" style="font-weight:400">optional</span>${tagRow(m.tags || [], 'mctag')}</div>
    ${hasY ? `${row('yr', 'Yesterday, how was your energy really?', ['Awful','Low','Okay','Good','Great'])}<div class="fl">Was yesterday's food log complete?<div class="btns c2"><button class="btn ${m.lc === true ? 'on' : ''}" data-act="mcset" data-f="lc" data-v="1">Yes, all logged</button><button class="btn ${m.lc === false ? 'on' : ''}" data-act="mcset" data-f="lc" data-v="0">No, missed some</button></div></div>` : ''}
    <button class="btn primary" data-act="mcsave" ${m.sq == null || m.mood == null || m.feel == null ? 'disabled style="opacity:.5"' : ''}>Save</button></div>`;
}
function saveMorning(k) { { const st = sleepStartAt(); if (st && Date.now() - st > 3600e3) { const c0 = CFG(); delete c0.zz; saveConfig(c0); const kb = keyAt(st), db = S.days[kb]; if (db?.ci?.zz) { delete db.ci.zz; touch(kb); } } }
  const m = S.mc; const d = day(k); d.ci = d.ci || {};
  const b = bedMs(k, m.bed), w = atClock(k, m.wake, false); const sl = Math.round((w - b) / 3600e3 * 4) / 4;
  d.ci.mc = {bed: m.bed, wake: m.wake, sq: m.sq, mood: m.mood, feel: m.feel, t: Date.now()}; if (m.tags?.length) d.ci.tags = m.tags.slice();
  if (sl > 0 && sl < 16) d.ci.sl = sl;
  const yk = addDays(k, -1), y = S.days[yk];
  if (y && hasData(y)) {
    y.ci = y.ci || {}; if (m.yr != null) y.ci.eRep = m.yr + 1; if (m.lc != null) y.ci.lc = m.lc;
    try { const e = energyFor(yk, dayEnd(yk), {noRates: true}); y.ci.ePred = Math.round(mean(e.pts.map(p => p.score))); y.ci.eVer = MODEL_VERSION; } catch (er) {}
    y.u = Date.now(); dirty[yk] = true;
  }
  S.mc = null; touch(k);
}
function energyCurve(e, now) {
  const W = 340, H = 120, pts = e.pts; if (pts.length < 2) return '';
  const t0 = pts[0].t, t1 = pts[pts.length-1].t; const X = t => 6 + (t - t0) / (t1 - t0) * (W - 12), Y = v => 6 + (100 - v) / 100 * (H - 12);
  const past = pts.filter(p => p.t <= now), fut = pts.filter(p => p.t >= now - 6e5);
  const path = ps => { let out = '', pen = false; ps.forEach(p => { if (p.asleep) { pen = false; return; } out += (pen ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.score).toFixed(1); pen = true; }); return out; };
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H + 18}" role="img" aria-label="Energy through the day">`;
  (e.inp.naps || []).forEach(n => { const a = Math.max(t0, n.s), b = Math.min(t1, n.e); if (b > a) s += `<rect x="${X(a).toFixed(1)}" y="0" width="${(X(b) - X(a)).toFixed(1)}" height="${H}" fill="var(--water)" opacity=".12"/><text x="${((X(a) + X(b)) / 2).toFixed(1)}" y="14" text-anchor="middle" font-size="10" fill="var(--water)" font-family="Inter,sans-serif">nap</text>`; });
  [[70,'var(--ok)'],[45,'var(--over)']].forEach(([v, c]) => s += `<line x1="0" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" stroke="${c}" stroke-opacity=".35" stroke-dasharray="3 4"/>`);
  if (past.length > 1) s += `<path d="${path(past)}" fill="none" stroke="var(--acc)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
  if (fut.length > 1) s += `<path d="${path(fut)}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4 4"/>`;
  const evt = (t, c, r) => t >= t0 && t <= t1 ? `<circle cx="${X(t).toFixed(1)}" cy="${H + 8}" r="${r}" fill="${c}"/>` : '';
  e.inp.intakes.filter(x => x.kcal >= 100 && !x.alc).forEach(x => s += evt(x.t, 'var(--acc2)', 3.5));
  e.inp.caffeine.forEach(x => s += evt(x.t, 'var(--water)', 3.5));
  e.inp.hits.forEach(x => s += evt(x, 'var(--muted)', 2.2));
  e.inp.intakes.filter(x => x.alc).forEach(x => s += evt(x.t, 'var(--over)', 3.5));
  const RY = RATE_SCORE;
  (e.rates || []).forEach(r => { if (r.v && r.t >= t0 && r.t <= t1) { const x = X(r.t), y = Y(RY[r.v]); s += `<rect x="${(x - 4).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="8" height="8" transform="rotate(45 ${x.toFixed(1)} ${y.toFixed(1)})" fill="var(--text)" stroke="var(--card)" stroke-width="1.5"><title>You: ${RATE_W[r.v - 1]}</title></rect>`; } });
  (e.evs || []).forEach(x => { if (x.t >= t0 && x.t <= t1) s += `<text x="${X(x.t).toFixed(1)}" y="${H - 2}" text-anchor="middle" font-size="11">${(EVN[x.k] || TIMED[x.k] || '•').split(' ')[0]}</text>`; });
  if (now >= t0 && now <= t1) { const c = e.cur; s += `<line x1="${X(now)}" x2="${X(now)}" y1="0" y2="${H}" stroke="var(--text)" stroke-opacity=".25"/><circle cx="${X(now)}" cy="${Y(c.score)}" r="5" fill="${BCOL[band(c.score).c]}" stroke="var(--card)" stroke-width="2"/>`; }
  return s + '</svg>';
}
function energyCard(k) {
  const isToday = k === todayKey(); const now = isToday ? Date.now() : dayEnd(k);
  const e = energyFor(k, now); const c = e.cur, b = band(c.score);
  const top = [...c.parts].sort((x, y) => Math.abs(y.v) - Math.abs(x.v)).filter(x => Math.abs(x.v) >= 1.5).slice(0, 4);
  const ph = e.phases.filter(x => x.v);
  let h = `<div class="card span2 ecard"><div class="row"><div><h2>Energy</h2><div class="muted small">${isToday ? `now · ${tlabel(Date.now())}` : 'end of day'}${e.inp.real ? '' : ' · estimated, no morning check-in'}</div></div><button class="escore" data-act="energyinfo" style="--bc:${BCOL[b.c]}" aria-label="Energy ${c.score}, ${b.n}. Open breakdown"><b>${c.score}</b><span>${b.n}</span></button></div>
    ${energyCurve(e, now)}<div class="elegend small muted"><span><i style="background:var(--acc2)"></i>food</span><span><i style="background:var(--water)"></i>caffeine</span><span><i style="background:var(--muted)"></i>hits</span><span><i style="background:var(--over)"></i>alcohol</span><span>◆ your rating</span><span>🚿 🌶️ ⚽ moments &amp; tags</span><span>dashed = forecast if nothing changes</span></div>
    <div class="phases">${ph.map(x => { const bb = band(x.v.score); return `<div class="ph ${x.v.now ? 'now' : ''}"><div class="l">${x.n}</div><div class="v" style="color:${BCOL[bb.c]}">${x.v.score}</div><div class="s">${x.v.past ? bb.n : x.v.now ? 'so far · ' + bb.n.toLowerCase() : 'forecast'}</div><div class="s muted">${tlabel(x.v.from).replace(':00', '')}–${tlabel(x.v.to).replace(':00', '')}</div></div>`; }).join('')}</div>
    <div class="why">${top.map(x => `<div class="row small"><span>${esc(x.label)}</span><b style="color:${x.v > 0 ? 'var(--ok)' : 'var(--over)'}">${x.v > 0 ? '+' : '−'}${Math.abs(x.v).toFixed(0)}</b></div>`).join('')}</div>
    ${isToday && e.help.length ? `<div class="help">${e.help.map(x => `<div class="flag info"><div><strong>${esc(x.label)}</strong> → about +${x.gain} within 90 min</div></div>`).join('')}</div>` : ''}
    </div>`;
  return h;
}
const LAYERS = [['tags','Day tags'],['sleep','Sleep'],['nap','Naps'],['report','Your morning report'],['clock','Body clock'],['fuel','Food'],['water','Water'],['caffeine','Caffeine'],['alcohol','Alcohol'],['cannabis','Cannabis'],['moments','Moments'],['pattern','Patterns'],['you','Your energy checks']];
function energySheet() { return `<div class="sheetbg" data-act="closesheet"><div class="sheet tall" role="dialog" aria-label="Energy breakdown" data-stop="1"><div class="row"><h3>Energy breakdown</h3><button class="iconbtn" data-act="closesheet" aria-label="Close">${ic('x',18)}</button></div>${energyBreakdown()}</div></div>`; }
function energyBreakdown() {
  const k = S.date, isToday = k === todayKey(); const e = energyFor(k, isToday ? Date.now() : dayEnd(k)); const c = e.cur;
  const groups = LAYERS.map(([id, n]) => { const xs = c.parts.filter(p => p.layer === id); if (!xs.length) return ''; const tot = sum(xs.map(x => x.v));
    return `<div class="eg"><div class="row"><b>${n}</b><b style="color:${tot >= 0 ? 'var(--ok)' : 'var(--over)'}">${tot >= 0 ? '+' : '−'}${Math.abs(tot).toFixed(1)}</b></div>${xs.map(x => `<div class="row small"><span class="muted">${esc(x.label)}</span><span>${x.v >= 0 ? '+' : '−'}${Math.abs(x.v).toFixed(1)}</span></div>`).join('')}</div>`; }).join('');
  return `<div class="row"><h3 style="margin:0">Energy ${c.score} · ${band(c.score).n}</h3><span class="chip info">model ${MODEL_VERSION}</span></div>
    <div class="row small"><span class="muted">Starting point</span><b>75</b></div>${groups}<div class="row"><b>Total</b><b>${c.score}</b></div>
    <details><summary class="small" style="font-weight:600">How this works</summary><div class="small muted howto">
    <p>Fixed rules, no AI. Every 10 minutes from your wake time, the app adds up its layers on top of 75 and keeps the result between 5 and 98. 70+ is green, 45–69 yellow, under 45 red.</p>
    <p><b>Sleep:</b> hours slept on a sliding scale (7.5–9 h best, every half hour less costs more, and the cost grows as the day goes on); debt from the 3 nights before; how far your sleep midpoint moved from your usual; going to bed after 3 AM.</p>
    <p><b>Morning report:</b> your three words. Body feel fades fastest (to 40% by 6 h awake), mood and sleep quality stay longer.</p>
    <p><b>Body clock:</b> grogginess for 30–60 min after waking (longer after short sleep), a peak ~3 h after waking, a dip ~7 h after waking, a second wind ~11 h, then wind-down after 13 h awake (faster with sleep debt).</p>
    <p><b>Food:</b> hours since you last ate (3 h free, then it costs more each hour); each sitting gives a sugar lift for ~90 min and, if it was sugary with little protein, fat or fibre, a crash 1.5–3 h later; big meals cause a food coma (bigger and longer if fatty, smaller if high-protein, worse if it lands on your afternoon dip); protein and fibre give steady fuel for 4 h; and how much you've eaten vs what's expected by this hour.</p>
    <p><b>Water:</b> how much vs what's expected by this hour.</p>
    <p><b>Caffeine:</b> a blood-level model: absorbs in ~45–60 min, halves every 5 h. The lift grows with the level but flattens (the third coffee adds less than the first). After a big dose, a small dip as it wears off.</p>
    <p><b>Alcohol:</b> 1–2 drinks give a short lift, then every standard drink sedates for ~4 h. Last night's drinks cost you in the morning and fade by evening.</p>
    <p><b>Cannabis:</b> each session (hits within 30 min) gives a lift peaking at 15 min and gone by 45, then a couch phase from 40 min to 3.5 h. Bigger sessions hit harder but with diminishing returns. Your 7-day average is your tolerance: the more you smoke daily, the smaller both effects. Past 6 hits a day adds fog; hits after 9 PM cost you the next morning.</p>
    <p><b>Naps:</b> each nap gives grogginess right after waking (10 min for under 30 min, up to 40 min for over an hour), then a lift up to +10 that fades over ~5 h. A nap also resets part of your 'hours awake' clock (a 2 h nap resets 80%), so late-day tiredness starts later. Time asleep doesn't count toward 'food or water expected by now', and you get less hungry asleep. Naps count 70% toward sleep debt.</p>
    <p><b>Day tags (whole day):</b> sick −12 all day and −4 the next morning; stressed −5; exam/deadline +4 for the first 8 h awake, then −4; party +4 in the evening and −6 the next morning, fading by midday.</p>
    <p><b>Day tags (timed, from when you tap):</b> crashed −8 easing off over 3 h; great mood +4 for 3 h; productive +1 for 1 h then −3 for 3 h; gym +5 for 1.5 h then −3 (2–5 h after); football +5 for 1 h then −6 (1.5–5 h after) and −3 next morning; racket +5 for 1 h then −3 (1.5–4 h after); chill +3 for 3 h. Any sport within 2 h of bedtime: −3 next morning. Sport also raises that day's water target (football +750 ml, racket and gym +500 ml). All tags together are capped at ±15.</p>
    <p><b>Moments:</b> cool shower +7 right after, gone in ~75 min. Hot shower +3 for 20 min, then −4 relaxed for about an hour. 🌶️ +3 for 20 min, then −7 relaxed, gone in 2 h.</p>
    <p><b>Patterns:</b> eating within 2 h of bed costs −3 next morning (within 1 h, −5); caffeine still in you at bedtime costs up to −6 next morning; both halve when you've answered the morning questions (your sleep-quality answer already carries part of it) and fade by midday. Short sleep on nights 4–7 back costs up to −5 all day. Low mood, or bad sleep, 3+ mornings running: −3 each.</p>
    <p><b>Overlaps (v2.1):</b> related things reinforce each other instead of adding up in full. Last-night penalties (sleep debt, late bedtime, body clock, morning fog, hangover, next-morning effects of party, sickness or football, late meal or caffeine, bad-sleep streak) count at 75% once you've answered the morning questions, and among them the biggest counts in full, the second at 60%, the rest at 40%. Same idea for: hunger, under-eating and low protein (biggest full, others 50%); couch phase and fog (50%); tiredness from crashing, sport, mental work, 🌶️, a hot shower or stress (second 50%, rest 30%); the afternoon dip and a food coma (60%). The breakdown marks every reduced line. Sleep need is 7 h, moving halfway toward your own average once there are 7+ nights (never below 6.5 h). 3–4 quick hit taps are spread over up to the last hour; each extra hit in one sitting adds less than the one before.</p>
    <p><b>Your energy checks:</b> a nudge, not an override. Your rating is read on your own scale (after 10 checks the app learns how your ratings usually sit against the model). If it's within 8 points of the model, nothing changes. Beyond that the score moves 30% of the extra gap, never more than ±10, fading to nothing over 3 hours — and only half that if the model has strong reasons (score 40 or under, or 80 or over) and your rating points the other way. The prediction stored for comparison leaves this out, so the model is still tested fairly.</p>
    <p><b>Not counted:</b> cigarettes (your call) and training (no time recorded).</p>
    <p><b>Day split:</b> your waking day (wake-up to bedtime) is cut into three equal parts. 'So far' is the part already lived; 'forecast' assumes nothing else happens (no more food or water). Once the next morning's check-in gives your real bedtime, that day ends there.</p>
    <p><b>Model ${MODEL_VERSION} (v2 from 19 Nov, v2.1 overlaps from 20 Nov), frozen until 16 Dec 2026.</b> Until then none of these numbers change. On 16 Dec every layer is tested against your energy checks: layers that don't help get cut or re-weighted, one at a time.</p></div></details>`;
}
function energyCompareCard() {
  const ks = allKeys().filter(k => S.days[k]?.ci?.eRep && S.days[k]?.ci?.ePred).slice(-30);
  if (!ks.length) return `<div class="card span2"><h2>Energy: predicted vs felt</h2><div class="muted small">Each morning you rate yesterday's energy. Your ratings and the app's predictions show up here side by side.</div></div>`;
  const rows = ks.map(k => { const d = S.days[k].ci; const pb = ratingBand(d.ePred); return {k, rep: d.eRep, pred: d.ePred, pb, diff: pb - d.eRep}; });
  const exact = rows.filter(r => r.diff === 0).length, close = rows.filter(r => Math.abs(r.diff) <= 1).length;
  const bias = mean(rows.map(r => r.diff));
  const words = ['','Awful','Low','Okay','Good','Great'];
  return `<div class="card span2"><div class="row"><h2>Energy: predicted vs felt</h2><span class="small muted">${rows.length} days</span></div>
    ${rows.length >= 7 ? `<div class="tiles t3"><div class="tile"><div class="l">Exact match</div><div class="v">${Math.round(exact / rows.length * 100)}%</div></div><div class="tile"><div class="l">Within one step</div><div class="v">${Math.round(close / rows.length * 100)}%</div></div><div class="tile"><div class="l">The app tends to</div><div class="v" style="font-size:15px">${Math.abs(bias) < 0.3 ? 'be about right' : bias > 0 ? 'overrate you' : 'underrate you'}</div></div></div>` : `<div class="muted small">Accuracy shows after 7 rated days (${rows.length} so far).</div>`}
    <div class="list">${rows.slice(-7).reverse().map(r => `<div class="li"><div class="main"><div class="t">${shortDate(r.k)}</div><div class="s">app ${r.pred} (${words[r.pb].toLowerCase()}) · you said ${words[r.rep].toLowerCase()}</div></div><span class="chip ${r.diff === 0 ? 'ok' : Math.abs(r.diff) === 1 ? 'close' : 'over'}">${r.diff === 0 ? 'match' : (r.diff > 0 ? '+' : '') + r.diff}</span></div>`).join('')}</div></div>`;
}

// quick energy ratings: up to 3 a day, 3, 7 and 11 h after waking
const RATE_SLOTS = [3, 7, 11], RATE_W = ['Awful','Low','Okay','Good','Great'];
function rateSlotNow(k) {
  if (k !== todayKey() || sleepStartAt()) return null; const ci = S.days[k]?.ci || {}; const a = (Date.now() - sleepTimes(k).wake) / 3600e3;
  let s = -1; RATE_SLOTS.forEach((h, i) => { if (a >= h) s = i; }); if (s < 0 || a > 16) return null;
  return (ci.er || []).some(r => r.s === s) ? null : s;
}
function rateCard(k) {
  const s = rateSlotNow(k); if (s == null) return '';
  return `<div class="card span2 rcard"><div class="row"><h2>How's your energy right now?</h2><a href="#" class="small muted" data-act="rateskip" data-n="${s}">Skip</a></div><div class="seg5">${RATE_W.map((w, i) => `<button data-act="rate" data-n="${s}" data-v="${i + 1}">${w}</button>`).join('')}</div><div class="muted small">Check ${s + 1} of 3 today. Your ratings are compared with the energy curve to tune it to you.</div></div>`;
}
const EVN = {hot: '🚿 Hot shower', cool: '🚿 Cool shower', spicy: '🌶️ Spicy time'};
function todayStrip(k, tot) {
  const isToday = k === todayKey(); const e = energyFor(k, isToday ? Date.now() : dayEnd(k)); const b = band(e.cur.score);
  const kl = T('kcal') - (tot.kcal || 0), pl = T('p') - (tot.p || 0);
  return `<a class="card span2 strip" href="#energy"><div class="sx" style="--bc:${BCOL[b.c]}"><div class="l">Energy${isToday ? '' : ' (end of day)'}</div><div class="v">${e.cur.asleep ? 'zz' : e.cur.score}</div><div class="s">${e.cur.asleep ? 'napping' : b.n}</div></div>
    <div class="sx"><div class="l">${kl >= 0 ? 'Calories left' : 'Calories over'}</div><div class="v" style="color:${kl >= 0 ? 'var(--text)' : 'var(--over)'}">${fmt(Math.abs(kl),'kcal')}</div><div class="s">of ${fmt(T('kcal'),'kcal')}</div></div>
    <div class="sx"><div class="l">${pl > 0 ? 'Protein left' : 'Protein'}</div><div class="v" style="color:${pl > 0 ? 'var(--text)' : 'var(--ok)'}">${pl > 0 ? fmt(pl,'g') + ' g' : 'done'}</div><div class="s">of ${T('p')} g</div></div></a>`;
}
function quickAdd(k) {
  // one-tap actions that change your energy right away; each push-up / squat tap is one set in Training
  return `<div class="span2 qadd" style="grid-template-columns:repeat(4,minmax(0,1fr))"><button class="btn qi" data-act="qhit" aria-label="Add 1 bong hit">${glyph('bong', 28)}<span>+1</span></button><button class="btn qi" data-act="qtr" data-id="pushup" data-n="10" aria-label="Add 10 push-ups">${glyph('pushup', 30)}<span>+10</span></button><button class="btn qi" data-act="qtr" data-id="bwsquat" data-n="25" aria-label="Add 25 squats">${glyph('squat', 28)}<span>+25</span></button><button class="btn qi" data-act="qmob" aria-label="Log mobility">${glyph('mobility', 28)}</button></div>${sleepStartAt() ? `<div class="span2 muted small" style="text-align:center">Sleeping since ${tlabel(sleepStartAt())} · <a href="#" data-act="sleepundo">Undo</a></div>` : ''}`;
}
function lastSitting() {
  for (const k of [todayKey(), addDays(todayKey(), -1)]) { const its = (S.days[k]?.items || []).filter(it => it.t).sort((a, b) => a.t - b.t); if (its.length) { const t = its[its.length-1].t; return its.filter(it => t - it.t <= 20 * 60e3); } }
  return [];
}
function viewEnergy() {
  const k = S.date; let h = header('Energy'); h += '<div class="grid">';
  try { h += energyCard(k); h += `<div class="card span2">${energyBreakdown()}</div>`; } catch (er) { console.error(er); h += '<div class="card span2 muted small">Energy needs your profile and a morning check-in.</div>'; }
  h += energyCompareCard();
  return h + '</div>';
}
// ---- weekly review and weekday vs weekend (fixed rules)
const bedRel = hhmm => (minOf(hhmm) - 720 + 1440) % 1440; // minutes after noon, so 23:30 and 01:30 average sensibly
const bedFmt = rel => { const m = Math.round(rel + 720) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
function weekStats(ks) {
  const lg = ks.filter(k => (S.days[k]?.items || []).length && !excluded(k));
  const tot = lg.map(k => dayCalc(S.days[k]).tot); const ci = k => S.days[k]?.ci || {};
  const avg = a => a.length ? mean(a) : null;
  const beds = ks.map(k => ci(k).mc).filter(m => m && m.bed && !m.skipped).map(m => bedRel(m.bed));
  return {n: ks.length, logged: lg.length, complete: lg.filter(k => ci(k).lc !== false).length,
    kcal: avg(tot.map(t => t.kcal || 0)), p: avg(tot.map(t => t.p || 0)), caf: avg(lg.map(k => dayCalc(S.days[k]).tot.caf || 0)),
    sleep: avg(ks.map(k => ci(k).sl != null ? ci(k).sl + napHours(ci(k)) : null).filter(x => x != null)), bed: beds.length ? bedFmt(mean(beds)) : null,
    hits: avg(ks.map(k => ci(k).hits).filter(x => x != null)), std: sum(ks.map(k => S.days[k]?.ci?.drinks ? stdDrinks(S.days[k]) : 0)),
    epred: avg(ks.map(k => ci(k).ePred).filter(x => x != null)), erep: avg(ks.map(k => ci(k).eRep).filter(x => x != null))};
}
function weeklyReviewCard(ws, dismiss) {
  const ks = rangeKeys(addDays(ws, 6), 7); const st = weekStats(ks); const pl = plan(ws); const tg = pl ? pl.targets : {kcal: T('kcal'), p: T('p')};
  const wAvg = from => { const w = weightList().filter(x => x.k >= from && x.k <= addDays(from, 6)); return w.length ? mean(w.map(x => x.w)) : null; };
  const wNow = wAvg(ws), wPrev = wAvg(addDays(ws, -7)); const lows = lowAllWeek(addDays(ws, 7)); const tc = targetChange(addDays(ws, 7));
  const days = ks.filter(k => S.days[k]?.ci?.ePred != null).map(k => ({k, e: S.days[k].ci.ePred})).sort((a, b) => b.e - a.e);
  // one decision, first rule that applies
  let dec;
  if (st.logged < 5) dec = `Log at least 5 full days next week. ${st.logged} of 7 isn't enough to trust the numbers below.`;
  else if (st.p != null && st.p < 0.9 * tg.p) { const u = foodUnit('cosmix'); dec = `Protein averaged ${fmt(st.p,'g')} of ${tg.p} g. Add one Cosmix scoop a day (+${fmt(u.p,'g')} g).`; }
  else if (st.sleep != null && st.sleep < 7) dec = `Sleep averaged ${st.sleep.toFixed(1)} h. Move bedtime ${Math.round((7.5 - st.sleep) * 60)} min earlier${st.bed ? ` than your ${st.bed} average` : ''}.`;
  else if (st.kcal != null && Math.abs(st.kcal - tg.kcal) > 0.1 * tg.kcal) dec = `Calories averaged ${fmt(st.kcal,'kcal')} vs ${fmt(tg.kcal,'kcal')}. Get within 10% for the target to mean anything.`;
  else if (lows.length) dec = `${lows[0].n} stayed low all week. ${lows[0].fix}.`;
  else dec = 'Nothing to change. Keep logging the same way.';
  const tl = (l, v, sub) => `<div class="tile"><div class="l">${l}</div><div class="v">${v}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
  return `<div class="card span2 review"><div class="row"><h2>Week of ${shortDate(ws)}</h2>${dismiss ? '<a href="#" class="small muted" data-act="hidereview">Hide</a>' : `<span class="small muted">${st.logged}/7 days logged</span>`}</div>
    <div class="flag ${st.logged < 5 ? 'warn' : 'info'}"><div><strong>This week's one change:</strong> ${esc(dec)}</div></div>
    <div class="tiles t3">${tl('Calories', st.kcal != null ? fmt(st.kcal,'kcal') : '—', `target ${fmt(tg.kcal,'kcal')}`)}${tl('Protein', st.p != null ? fmt(st.p,'g') + ' g' : '—', `target ${tg.p} g`)}${tl('Weight', wNow ? wNow.toFixed(1) + ' kg' : '—', wNow && wPrev ? `${wNow - wPrev >= 0 ? '+' : ''}${(wNow - wPrev).toFixed(2)} kg vs last week` : 'corrected avg')}
    ${tl('Sleep', st.sleep != null ? st.sleep.toFixed(1) + ' h' : '—', st.bed ? `bed ~${st.bed}` : '')}${tl('Energy', st.epred != null ? Math.round(st.epred) : '—', st.erep != null ? `you rated ${st.erep.toFixed(1)}/5` : 'app average')}${tl('Bong hits', st.hits != null ? st.hits.toFixed(1) : '—', 'per day')}
    ${tl('Caffeine', st.caf != null ? Math.round(st.caf) + ' mg' : '—', 'per logged day')}${tl('Alcohol', st.std ? st.std.toFixed(1) : '0', 'standard drinks')}${tl('Complete logs', `${st.complete}/${st.logged}`, 'days marked complete')}</div>
    ${days.length >= 2 ? `<div class="small">Best energy: <b>${DOW[parseKey(days[0].k).getDay()]} (${days[0].e})</b> · worst: <b>${DOW[parseKey(days[days.length-1].k).getDay()]} (${days[days.length-1].e})</b></div>` : ''}
    ${lows.length ? `<div class="small">Low all week: ${lows.map(x => esc(x.n)).join(', ')}</div>` : ''}${tc ? `<div class="small muted">${esc(tc.text)}</div>` : ''}</div>`;
}
function targetChange(k = todayKey()) {
  const cur = plan(k), prev = plan(addDays(weekStart(k), -1)); if (!cur || !prev) return null;
  const dk = cur.targets.kcal - prev.targets.kcal, dp = cur.targets.p - prev.targets.p; if (Math.abs(dk) < 10 && Math.abs(dp) < 5) return null;
  const why = [];
  if (Math.abs(cur.kg - prev.kg) >= 0.1) why.push(`weight basis ${prev.kg.toFixed(1)} → ${cur.kg.toFixed(1)} kg`);
  if (cur.blend > prev.blend + 0.01) why.push(`measured maintenance now ${Math.round(cur.blend * 100)}% of the number (${fmt(cur.measured.kcal,'kcal')} from your logs vs ${fmt(cur.formula.kcal,'kcal')} formula)`);
  else if (Math.abs(cur.maint - prev.maint) >= 20 && cur.blend > 0) why.push(`measured maintenance moved ${fmt(prev.maint,'kcal')} → ${fmt(cur.maint,'kcal')}`);
  if (cur.goal.id !== prev.goal.id || cur.pace !== prev.pace) why.push(`goal or pace changed`);
  return {week: cur.weekStart, text: `Target ${fmt(prev.targets.kcal,'kcal')} → ${fmt(cur.targets.kcal,'kcal')} kcal${dp ? `, protein ${prev.targets.p} → ${cur.targets.p} g` : ''}: ${why.join('; ') || 'recalculated'}`};
}
function logTargetChange() {
  try { const tc = targetChange(); if (!tc || !S.config) return; const ch = S.config.changes || []; if (ch.some(c => c.week === tc.week)) return; saveConfig({...S.config, changes: [...ch, {date: tc.week, week: tc.week, text: tc.text}]}); } catch (er) { console.error(er); }
}
// ================= profile: setup + Me =================
const PF_DEFAULT = {name:'', dob:'', sex:'m', heightCm:'', weightKg:'', waist:'', neck:'', hip:'', experience:'new', trainDays:4, sessionMin:60, activity:'sit', diet:'egg', wake:'09:00', bed:'01:00', goal:'leanbulk', targetKg:'', pace:0.25};
function startSetup() { const p = PROF(); S.pf = Object.assign({}, PF_DEFAULT, p || {}); const w = weightList(); if (w.length) S.pf.weightKg = w[w.length-1].w; }
const num = v => v === '' || v == null ? null : +v;
function pfPreview() {
  const p = S.pf; const kg = num(p.weightKg), h = num(p.heightCm), age = ageAt(p.dob, todayKey());
  if (!kg || !h || age == null) return '<span class="muted">Fill in date of birth, height and weight to see your numbers.</span>';
  const fm = formulaMaintenance({...p, heightCm: h, trainDays: 0}, kg, age); const g = GMAP[p.goal];
  const kcal = Math.round((fm.kcal + p.pace * 7700 / 7) / 10) * 10;
  return `BMR <b>${fmt(fm.bmr,'kcal')}</b> · maintenance <b>~${fmt(fm.kcal,'kcal')}</b> · target <b>~${fmt(kcal,'kcal')} kcal</b> · protein <b>${Math.round(g.prot * kg / 5) * 5} g</b>`;
}
function viewSetup() {
  const p = S.pf || (startSetup(), S.pf); const first = !PROF();
  const opt = (f, v, label, sub) => `<button type="button" class="btn opt ${String(p[f]) === String(v) ? 'on' : ''}" data-act="pfset" data-f="${f}" data-v="${v}">${label}${sub ? `<span>${sub}</span>` : ''}</button>`;
  const inp = (f, label, type, extra = '') => `<label class="fl">${label}<input class="field" data-pf="${f}" type="${type}" value="${esc(p[f] ?? '')}" ${extra}></label>`;
  const g = GMAP[p.goal];
  let h = `<div class="top"><div><div class="sub">${first ? 'One-time setup · edit anytime on the Me tab' : 'Me'}</div><h1>${first ? 'About you' : 'Edit profile'}</h1></div></div><div class="grid">`;
  h += `<div class="card span2"><h2>Basics</h2><div class="g2">${inp('name','Name','text','autocomplete="given-name"')}${inp('dob','Date of birth','date')}</div>
    <div class="fl">Sex<div class="btns c2">${opt('sex','m','Male')}${opt('sex','f','Female')}</div></div>
    <div class="g2">${inp('heightCm','Height (cm)','number','inputmode="decimal" step="0.5" min="120" max="230"')}${inp('weightKg','Weight today (kg)','number','inputmode="decimal" step="0.1" min="30" max="250"')}</div></div>`;
  h += `<div class="card span2"><h2>Activity</h2>
    <div class="fl">Outside the gym<div class="btns c1">${ACTIVITY.map(a => opt('activity', a.id, a.n, a.d)).join('')}</div></div>
    <div class="muted small">Training isn't set here any more: what you log in the Training tab is added to that day's calories.</div>
    <div class="fl">Lifting experience<div class="btns c3">${opt('experience','new','Under 1 yr')}${opt('experience','mid','1–3 yrs')}${opt('experience','exp','3+ yrs')}</div></div></div>`;
  h += `<div class="card span2"><h2>Routine</h2><div class="g2">${inp('wake','Usual wake time','time')}${inp('bed','Usual bedtime','time')}</div>
    <div class="fl">Diet<div class="btns c3">${opt('diet','veg','Vegetarian')}${opt('diet','egg','Veg + eggs')}${opt('diet','nonveg','Non-veg')}</div></div></div>`;
  h += `<div class="card span2"><h2>Goal</h2><div class="btns c1">${GOALS.map(x => opt('goal', x.id, x.n, x.d)).join('')}</div>
    ${inp('targetKg','Target weight (kg)','number','inputmode="decimal" step="0.5" min="30" max="250"')}<div class="fl">Pace (kg per week)<div class="btns c${g.paces.length}">${g.paces.map(v => opt('pace', v, (v > 0 ? '+' : '') + v + ' kg')).join('')}</div></div>
    ${(() => { const kg = num(p.weightKg); const gc = kg && num(p.targetKg) ? goalCheck({...p, targetKg: num(p.targetKg)}, kg) : null; return gc ? `<div class="flag warn"><div>${esc(gc)}</div></div>` : ''; })()}
    <div class="muted small">Paces outside these ranges aren't offered: faster gain is mostly fat and water, faster loss costs muscle.</div></div>`;
  h += `<div class="card span2"><div class="small" id="pfprev">${pfPreview()}</div>${S.pfErr ? `<div class="flag warn" role="alert">${esc(S.pfErr)}</div>` : ''}<button class="btn primary" data-act="pfsave">${first ? 'Save and see my numbers' : 'Save'}</button>${first ? '<a href="#" class="small" data-act="pflater" style="text-align:center">Do this later</a>' : '<a href="#me" class="small" style="text-align:center">Cancel</a>'}</div>`;
  return h + '</div>';
}
function savePF() {
  const p = S.pf; const out = {...p, name: (p.name || '').trim(), heightCm: num(p.heightCm), weightKg: num(p.weightKg), targetKg: num(p.targetKg), trainDays: +p.trainDays, sessionMin: +p.sessionMin, pace: +p.pace, waist: num(p.waist), neck: num(p.neck), hip: num(p.hip)};
  const age = ageAt(out.dob, todayKey());
  if (!out.dob || age == null || age < 13 || age > 90) return 'Enter your date of birth.';
  if (!out.heightCm || out.heightCm < 120 || out.heightCm > 230) return 'Enter your height in cm (120–230).';
  if (!out.weightKg || out.weightKg < 30 || out.weightKg > 250) return 'Enter today\'s weight in kg.';
  if (!out.targetKg || out.targetKg < 30 || out.targetKg > 250) return 'Enter a target weight in kg.';
  if (!GMAP[out.goal].paces.includes(out.pace)) out.pace = GMAP[out.goal].paces[0];
  out.updatedAt = new Date().toISOString();
  const k = todayKey(), d = day(k); d.ci = d.ci || {};
  if (!d.ci.w) d.ci.w = out.weightKg;
  if (PROF() && out.weightKg !== +PROF().weightKg) d.ci.w = out.weightKg;
  [...TAPE, ['hip']].forEach(([f]) => delete out[f]); // measurements live in the daily log, so they have dates
  const cfg = Object.assign({}, S.config || {}, {profile: out});
  const ch = (cfg.changes || []).slice(); ch.push({date: k, text: `Profile ${PROF() ? 'updated' : 'set'}: ${GMAP[out.goal].n}, target ${out.targetKg} kg at ${out.pace >= 0 ? '+' : ''}${out.pace} kg/week`}); cfg.changes = ch;
  touch(k); saveConfig(cfg); return null;
}
function viewMe() {
  const p = PROF();
  if (!p) return `${header('Me', {date: false})}<div class="card"><h2>No profile yet</h2><div class="muted small">Your calorie and protein targets come from your profile.</div><a class="btn primary" href="#setup">Set up profile</a></div>`;
  const k = todayKey(); const pl = plan(k); const b = bodyNow(p, ctxFor(k)); const fm = pl.formula, mm = pl.measured;
  let h = header(p.name ? p.name : 'Me', {date: false, right: `<a class="pill" href="#setup" style="display:inline-flex;align-items:center;text-decoration:none">Edit</a>`});
  h += '<div class="grid">';
  const gc = goalCheck(p, b.kg); if (gc) h += `<div class="flag warn span2"><div><strong>Goal and target don't match.</strong> ${esc(gc)}</div></div>`;
  const tl = (l, v, s, c) => `<div class="tile"><div class="l">${l}</div><div class="v" ${c ? `style="color:${c}"` : ''}>${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
  h += `<div class="card span2"><div class="row"><h2>Body now</h2><span class="small muted">${b.age} yrs · ${p.heightCm} cm</span></div><div class="tiles t3">
    ${tl('Weight', b.kg.toFixed(1) + ' kg', '7-day average')}
    ${tl('Body fat', b.bf != null ? b.bf.toFixed(1) + '%' : '—', b.bf != null ? `${bfBand(b.bf, p.sex)} · ${b.bfNavy != null ? 'Navy ' + b.bfNavy.toFixed(1) : ''}${b.bfNavy != null && b.bfRfm != null ? ' / ' : ''}${b.bfRfm != null ? 'RFM ' + b.bfRfm.toFixed(1) : ''} · ${shortDate(b.tape.k)}` : 'measure waist (+ neck)')}
    ${tl('FFMI', b.ffmiAdj != null ? b.ffmiAdj.toFixed(1) : '—', b.ffmiAdj != null ? ffmiBand(b.ffmiAdj) + ' · lean ' + b.lean.toFixed(1) + ' kg' : 'needs body fat')}
    ${tl('BMR', fmt(b.bmrNow,'kcal'), 'kcal at full rest')}
    ${tl('Waist / height', b.whtr != null ? b.whtr.toFixed(2) : '—', b.whtr != null ? (b.whtr < 0.5 ? 'healthy, under 0.5' : 'above 0.5: belly fat risk') : 'needs waist')}
    ${tl('BMI', b.bmi.toFixed(1), bmiBand(b.bmi) + ' · ignores muscle')}</div></div>`;
  { const open = (S.meOpen || {}).tape; const last = (tapeSeries('waist').slice(-1)[0] || {}).k;
    h += `<div class="card span2"><div class="row"><button class="linkish" data-act="meopen" data-id="tape"><h2 style="margin:0">Measurements ${open ? '▴' : '▾'}</h2><div class="small muted">${last ? 'last check ' + shortDate(last) : 'none yet'} · physique inside</div></button><button class="pill" data-act="tapeopen">Update</button></div></div>`;
    if (open) { h += tapeProgress(); h += physiqueCard(p, b); } }
  const pct = Math.round(pl.blend * 100); const cOpen = (S.meOpen || {}).cal;
  h += `<div class="card span2"><div class="row"><button class="linkish" data-act="meopen" data-id="cal"><h2 style="margin:0">Your calories ${cOpen ? '▴' : '▾'}</h2><div class="small muted">${fmt(kcalTarget(k),'kcal')} kcal today · how it's worked out</div></button><a href="#" class="small muted" data-act="histsheet">Target history ›</a></div>`;
  if (cOpen) h += `<div class="row"><span class="small muted">week of ${shortDate(pl.weekStart)}</span></div>
    <div class="steps">
      <div class="row"><span>BMR <span class="muted small">Mifflin–St Jeor at ${pl.kg.toFixed(1)} kg</span></span><b>${fmt(fm.bmr,'kcal')}</b></div>
      <div class="row"><span>× ${fm.base} daily movement <span class="muted small">${AMAP[p.activity].n.toLowerCase()}</span></span><b>${fmt(fm.bmr * fm.base,'kcal')}</b></div>
      <div class="row"><span>+ training <span class="muted small">not assumed: logged training is added on the day (see below)</span></span><b>+0</b></div>
      <div class="row"><span>= Maintenance, formula</span><b>${fmt(fm.kcal,'kcal')}</b></div>
      <div class="row"><span>Maintenance, measured <span class="muted small">${mm.ready ? `from ${mm.nDays} days of food and ${mm.nWeights} weigh-ins` : mm.suspect ? 'more than 25% off the formula: check that days are logged completely' : `needs 14 logged days (${mm.nDays}) and 8 weigh-ins (${mm.nWeights}) over 10+ days`}</span></span><b>${mm.ready || mm.suspect ? fmt(mm.kcal,'kcal') : '—'}</b></div>
      <div class="bar" style="height:6px"><div style="width:${pct}%;background:var(--ok)"></div></div><div class="muted small">Using ${pct}% measured, ${100 - pct}% formula. Measured takes over as your data grows (100% at 28 days).</div>
      <div class="row"><span>= Maintenance used</span><b>${fmt(pl.maint,'kcal')}</b></div>
      <div class="row"><span>${pl.adj >= 0 ? '+' : '−'} ${GMAP[p.goal].n.toLowerCase()} at ${pl.pace >= 0 ? '+' : ''}${pl.pace} kg/week <span class="muted small">pace × 7,700 kcal ÷ 7</span></span><b>${pl.adj >= 0 ? '+' : '−'}${fmt(Math.abs(pl.adj),'kcal')}</b></div>
      <div class="row big2"><span>Base target (no training)</span><b>${fmt(pl.targets.kcal,'kcal')} kcal</b></div>
      ${trainK(k) || carryK(k) ? `<div class="row"><span>+ today's training${carryK(k) ? ' and yesterday\'s carry-over' : ''}</span><b>+${fmt(trainK(k) + carryK(k),'kcal')}</b></div><div class="row big2"><span>Today's target</span><b>${fmt(kcalTarget(k),'kcal')} kcal</b></div>` : ''}
      <div class="muted small">Measured maintenance takes your logged training calories off what you ate, so it learns your no-training base and training is only counted once.</div></div>`;
  h += `</div>`;
  const tg = pl.targets; const tc = targetChange(k);
  if (tc) h += `<div class="flag info span2"><div><strong>This week:</strong> ${esc(tc.text)}</div></div>`;
  return h + '</div>';
}

// ================= sheets =================
function sheetHTML() {
  const sh = S.sheet; if (!sh) return '';
  if (sh.type === 'tr') return trSheetHTML(sh);
  if (sh.type === 'sleep') return `<div class="sheetbg" data-act="closesheet"><div class="sheet" role="dialog" aria-label="Sleep" data-stop="1"><div class="row"><h3>${sh.kind ? (sh.kind === 'night' ? 'Night sleep' : 'Nap') : 'Add sleep'}</h3><button class="iconbtn" data-act="closesheet" aria-label="Close">${ic('x',18)}</button></div>
    <div class="g2"><label class="fl">Fell asleep<input class="field" type="time" value="${sh.from}" data-act="slf" data-f="from"></label><label class="fl">Woke up<input class="field" type="time" value="${sh.to}" data-act="slf" data-f="to"></label></div>
    <button class="btn primary" data-act="sleepsave">Save</button>${sh.kind ? `<button class="btn" data-act="sleepdel">Remove</button>` : ''}</div></div>`;
  if (sh.type === 'ev') return `<div class="sheetbg" data-act="closesheet"><div class="sheet" role="dialog" aria-label="Log" data-stop="1"><div class="row"><h3>${EVN[sh.k] || TIMED[sh.k]}</h3><button class="iconbtn" data-act="closesheet" aria-label="Close">${ic('x',18)}</button></div><div class="row"><span>Time</span><input class="field" style="width:150px" type="time" value="${sh.time}" data-act="evsheettime" aria-label="Time"></div><button class="btn primary" data-act="evok">OK</button></div></div>`;
  if (sh.type === 'hist') { const cfg = CFG(); return `<div class="sheetbg" data-act="closesheet"><div class="sheet tall" role="dialog" aria-label="Target history" data-stop="1"><div class="row"><h3>Target history</h3><button class="iconbtn" data-act="closesheet" aria-label="Close">${ic('x',18)}</button></div><div class="muted small">Every change to your daily targets, with the reason. Written automatically.</div>${(cfg.changes || []).slice().sort((a, b) => a.date < b.date ? 1 : -1).map(c => `<div class="row small" style="justify-content:flex-start;align-items:flex-start"><span class="muted" style="width:64px;flex:none">${shortDate(c.date)}</span><span>${esc(c.text)}</span></div>`).join('') || '<div class="muted small">No changes yet.</div>'}</div></div>`; }
  if (sh.type === 'item') {
    const d = day(S.date); const it = d.items.find(x => x.id === sh.id); if (!it) return '';
    const f = FMAP[it.f]; const v = itemVec(it);
    return `<div class="sheetbg" data-act="closesheet"><div class="sheet" role="dialog" aria-label="Edit item" data-stop="1"><div class="row"><h3>${esc(f.name)}</h3><button class="iconbtn" data-act="closesheet" aria-label="Close">${ic('x',18)}</button></div>
      <div class="row"><span>Quantity</span><div class="stepper"><button data-act="itemq" data-id="${it.id}" data-n="-1" aria-label="Fewer">−</button><input class="qn" type="number" inputmode="decimal" step="${stepOf(it.f)}" min="${stepOf(it.f)}" value="${it.q}" data-act="itemqset" data-id="${it.id}" aria-label="Quantity, tap to type"><button data-act="itemq" data-id="${it.id}" data-n="1" aria-label="More">+</button></div></div><div class="small muted" style="margin-top:-4px">Tap the number to type an amount, e.g. ${stepOf(it.f) === 0.25 ? '0.25 = ¼' : '0.5 = ½'}</div>${f.param ? `<div class="row"><span>${f.param.label}</span>${stepper('itemp', it.id, it.o?.[f.param.key] ?? f.param.def)}</div>` : ''}${f.sauces ? `<div class="small muted">Sauces per taco (1 tsp = 5 g)</div>${sauceRow(f, it.o, 'itemsauce', it.id)}` : ''}${f.out ? `<div class="small muted">${esc(f.sub)}</div>` : ''}
      <div class="row"><span>Time</span><input class="field" style="width:150px" type="time" value="${hhmm(it.t || Date.now())}" data-act="itemtime" data-id="${it.id}" aria-label="Time eaten"></div>
      <div class="btns c3">${MEALS.map(m => `<button class="btn ${m.id === mealOf(it) ? 'on' : ''}" data-act="itemmeal" data-id="${m.id}" data-item="${it.id}" style="padding:0 6px;font-size:13px">${m.n}</button>`).join('')}</div>
      <div class="muted small">${fmt(v.kcal,'kcal')} kcal · ${fmt(v.p,'g')} g protein · ${fmt(v.f,'g')} g fat</div><button class="btn danger" data-act="delitem" data-id="${it.id}">Remove</button></div></div>`;
  }
  if (sh.type === 'drink') {
    const cat = sh.cat || 'alc';
    const segs = [['alc','Alcohol'],['coffee','Coffee'],['tea','Tea'],['energy','Energy']].map(([id, n]) => `<button class="${cat === id ? 'on' : ''}" data-act="dcat" data-id="${id}">${n}</button>`).join('');
    const timeRow = `<div class="row"><span style="font-weight:600">Time</span><input class="field" style="width:150px" type="time" value="${sh.time || hhmm(Date.now())}" data-act="dtime" aria-label="Time"></div>`;
    let body;
    if (cat === 'alc') {
      const dd = DMAP[sh.d]; const ml = sh.ml; const mx = sh.m || 'none'; const v = drinkVec({d: sh.d, ml, m: mx, mml: sh.mml || 0});
      body = `<div class="btns c4">${DRINKS.map(x => `<button class="btn ${x.id === sh.d ? 'on' : ''}" data-act="dpick" data-id="${x.id}" style="padding:0 6px;font-size:13px">${x.name}</button>`).join('')}</div>
      <div class="muted small">${dd.name} · ${dd.sub}</div>
      <div class="row"><span style="font-weight:600">Amount</span><span style="display:flex;align-items:center;gap:6px"><input class="num" type="number" inputmode="numeric" min="0" max="3000" value="${ml}" data-act="dml" aria-label="Drink amount in ml"><span class="muted">ml</span></span></div>
      <div class="btns c3">${dd.presets.map(p => `<button class="btn ${p === ml ? 'on' : ''}" data-act="dpre" data-n="${p}">${p} ml</button>`).join('')}</div>
      <div style="font-weight:600">Mixer</div><div class="btns c4">${MIXERS.map(m => `<button class="btn ${m.id === mx ? 'on' : ''}" data-act="mpick" data-id="${m.id}" style="padding:0 6px;font-size:13px">${m.name}</button>`).join('')}</div>
      ${mx !== 'none' ? `<div class="row"><span>Mixer amount</span><span style="display:flex;align-items:center;gap:6px"><input class="num" type="number" inputmode="numeric" min="0" max="2000" value="${sh.mml || 0}" data-act="mml" aria-label="Mixer amount in ml"><span class="muted">ml</span></span></div><div class="btns c3">${[100,150,200].map(p => `<button class="btn ${p === sh.mml ? 'on' : ''}" data-act="mpre" data-n="${p}">${p} ml</button>`).join('')}</div>` : ''}
      ${timeRow}<div class="muted small">${fmt(v.kcal,'kcal')} kcal · ${((v.alc || 0) / 10).toFixed(1)} standard drinks</div>`;
    } else {
      const cc = CMAP[sh.d]; const dr = {k: 'caf', d: sh.d, shots: sh.shots, sugar: sh.sugar, size: sh.size}; const v = drinkVec(dr);
      body = `<div class="btns c3">${CAFF.filter(x => x.cat === cat).map(x => `<button class="btn ${x.id === sh.d ? 'on' : ''}" data-act="cpick" data-id="${x.id}" style="padding:0 6px;font-size:13px">${x.name}</button>`).join('')}</div>
      <div class="muted small">${esc(cc.sub)}</div>
      ${cc.shots ? `<div class="row"><span style="font-weight:600">Espresso shots</span>${stepper('cshots', cc.id, sh.shots || cc.shots)}</div>` : ''}
      ${cc.sizes && cc.sizes.length > 1 ? `<div class="btns c${cc.sizes.length}">${cc.sizes.map(z => `<button class="btn ${z === sh.size ? 'on' : ''}" data-act="csize" data-n="${z}">${z} ml</button>`).join('')}</div>` : ''}
      ${cc.nosugar ? '' : `<div class="row"><span style="font-weight:600">Sugar <span class="muted small" style="font-weight:400">teaspoons</span></span>${stepper('csugar', cc.id, sh.sugar || 0)}</div>`}
      ${timeRow}<div class="muted small">${fmt(v.kcal,'kcal')} kcal · <b>${Math.round(v.caf || 0)} mg caffeine</b>${v.tau ? ` · ${Math.round(v.tau)} mg taurine` : ''}${v.sug ? ` · ${fmt(v.sug,'g')} g sugar` : ''}</div>`;
    }
    return `<div class="sheetbg" data-act="closesheet"><div class="sheet tall" role="dialog" aria-label="Add drink" data-stop="1"><div class="row"><h3>Add drink</h3><button class="iconbtn" data-act="closesheet" aria-label="Close">${ic('x',18)}</button></div>
      <div class="seg" style="grid-template-columns:repeat(4,1fr)">${segs}</div>${body}
      <button class="btn primary" data-act="savedrink">Add to ${S.date === todayKey() ? 'today' : shortDate(S.date)}</button></div></div>`;
  }
  if (sh.type === 'energy') return energySheet();
  if (sh.type === 'tape') return tapeSheet();
  if (sh.type === 'account') {
    return `<div class="sheetbg" data-act="closesheet"><div class="sheet" role="dialog" aria-label="Account" data-stop="1"><div class="row"><h3>Account</h3><button class="iconbtn" data-act="closesheet" aria-label="Close">${ic('x',18)}</button></div>
      <div><div class="muted small">Signed in as</div><div style="font-weight:600">${esc(S.user?.email)}</div></div>
      <div class="row"><span class="status" style="font-size:13px">${syncHTML()}</span><button class="btn" data-act="syncnow">Sync now</button></div>
      <div class="muted small">${Object.keys(dirty).length} day(s) waiting to sync. Everything is saved on this phone first.</div>
      <div style="font-weight:600">Export your data</div><div class="btns c2"><button class="btn" data-act="export" data-id="days">Days (CSV)</button><button class="btn" data-act="export" data-id="food">Food (CSV)</button><button class="btn" data-act="export" data-id="drinks">Drinks (CSV)</button><button class="btn" data-act="export" data-id="training">Training (CSV)</button><button class="btn" data-act="export" data-id="json">Full backup (JSON)</button></div>
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
  S.days = LS.get(lk('days'), {}); dirty = LS.get(lk('dirty'), {}); S.config = LS.get(lk('config'), null); cfgDirty = LS.get(lk('cfgDirty'), false);
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
const VIEWS = {energy: viewEnergy, today: viewToday, meals: viewMeals, training: viewTraining, trainadd: viewTrainAdd, log: viewLog, checkin: viewCheckin, nutrients: viewNutrients, trends: viewTrends, supplements: viewSupps, me: viewMe, setup: viewSetup};
function nav() {
  const a = (v, icon, label) => `<a href="#${v}" class="${S.view === v ? 'on' : ''}" ${S.view === v ? 'aria-current="page"' : ''}>${ic(icon, 24)}${label}</a>`;
  return `<nav class="bottom" aria-label="Main">${a('today','home','Today')}${a('nutrients','pie','Nutrients')}<a href="#meals" class="fab" aria-label="Meals">${ic('plus', 26, 2.6)}</a>${a('training','lift','Training')}${a('trends','trend','Trends')}</nav>`;
}
function render() {
  const sy = window.scrollY;
  if (!S.user) { document.getElementById('app').innerHTML = viewAuth(); return; }
  document.getElementById('app').innerHTML = `<main class="wrap">${(VIEWS[S.view] || viewToday)()}</main>${S.view === 'setup' ? '' : nav()}${sheetHTML()}${S.toast ? `<div class="toast" role="status">${esc(S.toast)}</div>` : ''}`;
  window.scrollTo(0, sy);
}
function route() { if (!S.user) { render(); return; } if (location.hash !== '#log') { S.meal = null; S.logTime = null; S.cart = {}; } const v = location.hash.replace('#', ''); S.view = VIEWS[v] ? v : 'today'; if (!PROF() && !S.skipSetup && S.view !== 'setup') { S.view = 'setup'; S.autoSetup = true; startSetup(); } if (S.view === 'setup' && !S.pf) startSetup(); S.open = null; S.openMeal = null; render(); window.scrollTo(0, 0); }
// green outline on the field (or row) that was just saved, after the re-render
function okMark(sel) { setTimeout(() => { const e = document.querySelector(sel); if (!e) return; e.classList.add('saved'); setTimeout(() => e.classList.remove('saved'), 1600); }, 30); }
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
    case 'water': { const before = d.water || 0; d.water = Math.max(0, before + n); if (k === todayKey()) { d.wl = d.wl || []; if (n > 0) d.wl.push({t: Date.now(), ml: n}); else { let r = before - d.water; while (r > 0 && d.wl.length) { const l = d.wl[d.wl.length-1]; if (l.ml <= r) { r -= l.ml; d.wl.pop(); } else { l.ml -= r; r = 0; } } } } touch(k); break; }
    case 'cart': { const c = S.cart[id] || (S.cart[id] = {q: 0, o: {...sauceDefaults(FMAP[id])}}); c.q = Math.max(-(+el.dataset.base || 0), c.q + n); if (FMAP[id].param && !c.o[FMAP[id].param.key]) c.o[FMAP[id].param.key] = FMAP[id].param.def; render(); break; }
    case 'sauce': { const c = S.cart[id] || (S.cart[id] = {q: 0, o: {...sauceDefaults(FMAP[id])}}); c.o[el.dataset.k] = n; render(); break; }
    case 'itemsauce': { const it = d.items.find(x => x.id === id); if (it) { it.o = {...(it.o || {}), [el.dataset.k]: n}; touch(k); } break; }
    case 'rate': { const dd = day(todayKey()); dd.ci = dd.ci || {}; dd.ci.er = (dd.ci.er || []).filter(r => r.s !== n); let m = null; try { m = energyFor(todayKey(), Date.now(), {noRates: true}).cur.score; } catch (er) {} dd.ci.er.push({s: n, v: +el.dataset.v, t: Date.now(), m}); touch(todayKey()); toast('Thanks — noted'); break; }
    case 'rateskip': { e.preventDefault(); const dd = day(todayKey()); dd.ci = dd.ci || {}; dd.ci.er = (dd.ci.er || []).filter(r => r.s !== n); dd.ci.er.push({s: n, v: null, t: Date.now()}); touch(todayKey()); break; }
    case 'evadd': S.sheet = {type: 'ev', k: id, time: hhmm(k === todayKey() ? Date.now() : mealTime(k, 'esnack'))}; render(); break;
    case 'evok': { d.ci = d.ci || {}; d.ci.ev = d.ci.ev || []; const id2 = S.sheet.k, t = atClock(k, S.sheet.time); d.ci.ev.push({id: uid(), k: id2, t}); S.sheet = null; touch(k); toast(`✓ ${EVN[id2] || TIMED[id2]} logged · ${tlabel(t)}`); break; }
    case 'evtoggle': S.evOpen = S.evOpen || {}; S.evOpen[id] = !S.evOpen[id]; render(); break;
    case 'evdel': { d.ci.ev = (d.ci?.ev || []).filter(x => x.id !== id); touch(k); break; }
    case 'param': { const f = FMAP[id]; const c = S.cart[id]; const pk = f.param.key; c.o[pk] = Math.min(f.param.max, Math.max(f.param.min, (c.o[pk] ?? f.param.def) + n)); render(); break; }
    case 'dosa': { const m = el.dataset.m; const c = S.cart.dosa || (S.cart.dosa = {q: 0, o: {}}); if (m === 'n') { S.dosaMode = 'n'; c.q = Math.max(c.q, 1); } else { S.dosaMode = null; c.q = c.q === +m ? 0 : +m; } render(); break; }
    case 'addcart': { const m = S.meal || (S.date === todayKey() ? mealByHour(new Date().getHours()) : 'breakfast'); const now = logTimeFor(k, m); Object.entries(S.cart).forEach(([fid, c]) => { if (c.q < 0) { let left = -c.q; d.items.filter(it => it.f === fid && mealOf(it) === m).sort((a, b) => (b.t || 0) - (a.t || 0)).forEach(it => { if (left <= 0) return; const take = Math.min(left, it.q); it.q = Math.round((it.q - take) * 100) / 100; left -= take; }); d.items = d.items.filter(it => it.q > 0); return; } if (c.q > 0) d.items.push({id: uid(), f: fid, q: c.q, o: {...(FMAP[fid].sauces ? Object.fromEntries(FMAP[fid].sauces.map(s => [s.key, sauceLv(s, c.o)])) : {}), ...(FMAP[fid].param ? {[FMAP[fid].param.key]: c.o[FMAP[fid].param.key] ?? FMAP[fid].param.def} : {})}, t: now, m}); }); S.cart = {}; S.dosaMode = null; S.meal = null; S.logTime = null; touch(k); toast(`Added to ${MEALN[m]}`); location.hash = '#meals'; break; }
    case 'stdday': { const now = Date.now(); STANDARD_DAY.forEach(s => d.items.push({id: uid(), f: s.f, q: s.q, o: s.o || {}, t: now, m: STD_MEAL[s.f] || 'breakfast'})); touch(k); toast('Standard day added'); location.hash = '#today'; break; }
    case 'edititem': S.sheet = {type: 'item', id}; render(); break;
    case 'itemq': { const it = d.items.find(x => x.id === id); if (!it) break; const st = stepOf(it.f); const dq = it.q > 1 || n > 0 ? n : -st; const q = Math.round((it.q + dq) / st) * st;
      if (q <= 0) { d.items = d.items.filter(x => x.id !== id); if (S.sheet?.id === id) S.sheet = null; toast(`Removed ${FMAP[it.f]?.name || 'item'}`); } else { it.q = q; if (S.sheet?.id === id) { toast(`✓ Updated · ${fq(q)}`); okMark(`[data-act=itemqset][data-id="${id}"]`); } } touch(k); break; }
    case 'itemp': { const it = d.items.find(x => x.id === id); const f = it && FMAP[it.f]; if (f?.param) { it.o = it.o || {}; it.o[f.param.key] = Math.min(f.param.max, Math.max(f.param.min, (it.o[f.param.key] ?? f.param.def) + n)); touch(k); } break; }
    case 'meal': S.meal = id; Object.keys(S.cart).forEach(f => { if (S.cart[f].q < 0) delete S.cart[f]; }); render(); break;
    case 'logmeal': S.meal = id; break;
    case 'pfset': { const f = el.dataset.f; let v = el.dataset.v; if (['trainDays','sessionMin','pace'].includes(f)) v = +v; S.pf[f] = v; if (f === 'goal') S.pf.pace = GMAP[v].paces[0]; render(); break; }
    case 'pfsave': { const err = savePF(); S.pfErr = err; if (err) { render(); break; } S.pf = null; toast('Profile saved'); location.hash = '#me'; break; }
    case 'pflater': e.preventDefault(); S.skipSetup = true; location.hash = '#today'; route(); break;
    case 'mcset': { const f = el.dataset.f; S.mc[f] = f === 'lc' ? el.dataset.v === '1' : +el.dataset.v; render(); break; }
    case 'mctag': { const t = S.mc.tags = S.mc.tags || []; const i = t.indexOf(id); if (i >= 0) t.splice(i, 1); else t.push(id); render(); break; }
    case 'daytag': { d.ci = d.ci || {}; const t = d.ci.tags = d.ci.tags || []; const i = t.indexOf(id); if (i >= 0) t.splice(i, 1); else t.push(id); touch(k); break; }
    case 'mcsave': saveMorning(k); toast('Morning check-in saved'); break;
    case 'mcskip': e.preventDefault(); d.ci = d.ci || {}; d.ci.mc = {skipped: true, t: Date.now()}; S.mc = null; touch(k); break;
    case 'sleepstart': { const now = Date.now(), c = CFG(); c.zz = {t: now}; saveConfig(c); const kb = keyAt(now), db = day(kb); db.ci = db.ci || {}; db.ci.zz = now; touch(kb); toast(`Good night · from ${tlabel(now)}`); break; }
    case 'sleepend': sleepEnd(); break;
    case 'sleepundo': { e.preventDefault(); const c = CFG(); const st = sleepStartAt(); delete c.zz; saveConfig(c); if (st) { const kb = keyAt(st), db = S.days[kb]; if (db?.ci?.zz) { delete db.ci.zz; touch(kb); } } toast('Undone'); break; }
    case 'energyinfo': e.preventDefault(); S.sheet = {type: 'energy'}; render(); break;
    case 'qtr': { const now = Date.now(), kk = todayKey(), dd = day(kk); dd.tr = dd.tr || []; const reps = n;
      const last = dd.tr.filter(e => e.x === id && !e.sport).sort((a, b) => b.t - a.t)[0];
      if (last && now - last.t <= 30 * 60e3) { last.sets.push({r: reps, w: 0}); last.t = now; } else dd.tr.push({id: uid(), x: id, eq: 'bw', sets: [{r: reps, w: 0}], t: now});
      const tot = dd.tr.filter(e => e.x === id).reduce((s2, e) => s2 + e.sets.reduce((a2, z) => a2 + z.r, 0), 0);
      touch(kk); toast(`✓ +${reps} ${XMAP[id].n.toLowerCase()} · ${tot} today`); break; }
    case 'qmob': { const now = Date.now(), kk = todayKey(), dd = day(kk); dd.tr = dd.tr || []; dd.tr.push({id: uid(), sport: 'mobility', min: 10, t: now}); touch(kk); toast(`✓ Mobility logged · ${tlabel(now)}`); break; }
    case 'tradd': S.sheet = trSheetNew(id, el.dataset.sport === '1'); render(); break;
    case 'tredit': { const e2 = (d.tr || []).find(x => x.id === id); if (e2) { S.sheet = trSheetFrom(e2); render(); } break; }
    case 'trset': { const sh = S.sheet, f = el.dataset.f; if (f === 'min') sh.min = +el.dataset.v; else if (f === 'eq') { sh.eq = el.dataset.v; const l = lastTr(sh.x, sh.eq); if (l && !sh.id) sh.sets = l.sets.map(z => ({...z})); if (sh.eq === 'bw') sh.sets.forEach(z => z.w = 0); } else if (f === 'addset') sh.sets.push({...sh.sets[sh.sets.length - 1]}); else if (f === 'dropset') sh.sets.pop(); render(); break; }
    case 'trsave': { const sh = S.sheet; d.tr = d.tr || []; const t = atClock(k, sh.time);
      const ent = sh.sport ? {sport: sh.sport, min: sh.min, t} : {x: sh.x, eq: sh.eq, sets: sh.sets.filter(z => z.r > 0).map(z => ({r: +z.r, w: sh.eq === 'bw' ? 0 : +(z.w || 0)})), t};
      if (!ent.sport && !ent.sets.length) { toast('Add at least one set'); break; }
      if (sh.id) { const i = d.tr.findIndex(x => x.id === sh.id); if (i >= 0) d.tr[i] = {...d.tr[i], ...ent}; } else d.tr.push({id: uid(), ...ent});
      const nm = trName(ent); S.sheet = null; touch(k); toast(`✓ ${sh.id ? 'Updated' : 'Added'} · ${nm} · ${trDetail(ent)}`); break; }
    case 'trdel': { const sh = S.sheet; d.tr = (d.tr || []).filter(x => x.id !== sh.id); S.sheet = null; touch(k); toast('Removed'); break; }
    case 'meopen': S.meOpen = S.meOpen || {}; S.meOpen[id] = !S.meOpen[id]; render(); break;
    case 'histsheet': e.preventDefault(); S.sheet = {type: 'hist'}; render(); break;
    case 'dcat': { const c = el.dataset.id; Object.assign(S.sheet, c === 'alc' ? {cat: c, d: 'beer5', ml: 330, m: 'none', mml: 0} : {cat: c, d: CAFF.find(x => x.cat === c).id, shots: null, sugar: c === 'tea' ? 1 : 0, size: null}); if (c !== 'alc') { const cc = CMAP[S.sheet.d]; S.sheet.shots = cc.shots || null; S.sheet.size = cc.sizes ? cc.sizes[0] : null; } render(); break; }
    case 'cpick': { const cc = CMAP[id]; S.sheet.d = id; S.sheet.shots = cc.shots || null; S.sheet.size = cc.sizes ? cc.sizes[0] : null; S.sheet.sugar = id === 'chai' ? 1 : 0; render(); break; }
    case 'cshots': S.sheet.shots = Math.min(4, Math.max(1, (S.sheet.shots || 1) + n)); render(); break;
    case 'csugar': S.sheet.sugar = Math.min(8, Math.max(0, (S.sheet.sugar || 0) + n)); render(); break;
    case 'csize': S.sheet.size = n; render(); break;
    case 'logdrink': S.sheet = {type: 'drink', cat: 'coffee', d: 'esp1', shots: null, sugar: 0, size: null, time: S.date === todayKey() ? hhmm(Date.now()) : '17:00'}; render(); break;
    case 'hitmode': e.preventDefault(); respreadHits(k, id); toast('Hit times updated'); break;
    case 'qhit': addHit(todayKey(), 1); toast(`Hit logged · ${day(todayKey()).ci.hits} today`); break;
    case 'qchai': { const dd = day(todayKey()); dd.ci = dd.ci || {}; dd.ci.drinks = dd.ci.drinks || []; dd.ci.drinks.push({id: uid(), k: 'caf', d: 'chai', sugar: 1, t: Date.now()}); touch(todayKey()); toast('Chai logged · 1 tsp sugar'); break; }
    case 'qrepeat': { const its = lastSitting(); if (!its.length) { toast('Nothing to repeat yet'); break; } const now = Date.now(), m = mealByHour(new Date().getHours()); const dd = day(todayKey()); its.forEach(it => dd.items.push({id: uid(), f: it.f, q: it.q, o: {...(it.o || {})}, t: now, m})); touch(todayKey()); toast(`Repeated: ${its.map(itemLabel).join(', ')}`); break; }
    case 'hidereview': S.hideReview = true; render(); break;
    case 'suppundo': d.supp = d.supp || {}; dueList(k).forEach(x => d.supp[x.id] = false); touch(k); toast('Supplements unticked'); break;
    case 'suppall': d.supp = d.supp || {}; dueList(k).forEach(x => d.supp[x.id] = true); touch(k); toast('All supplements ticked'); break;
    case 'repeatmeal': { const yk = addDays(k, -1); const its = (S.days[yk]?.items || []).filter(it => mealOf(it) === id); const t = logTimeFor(k, id); S.logTime = null; its.forEach(it => d.items.push({id: uid(), f: it.f, q: it.q, o: {...(it.o || {})}, t, m: id})); touch(k); toast(`Added yesterday's ${MEALN[id].toLowerCase()}`); location.hash = '#meals'; break; }
    case 'export': exportData(id); break;
    case 'sleepnew': S.sheet = {type: 'sleep', from: hhmm(Date.now() - 3600e3), to: hhmm(Date.now())}; render(); break;
    case 'sleepedit': { const kind = el.dataset.kind; let sx; if (kind === 'night') sx = nightOf(k); else sx = (d.ci?.naps || []).find(n => n.id === id); if (sx) { S.sheet = {type: 'sleep', kind, id, from: hhmm(sx.s), to: hhmm(sx.e)}; render(); } break; }
    case 'sleepsave': { const sh = S.sheet; if (saveSleep(k, sh.from, sh.to, sh.kind, sh.id)) { S.sheet = null; render(); } break; }
    case 'sleepdel': { const sh = S.sheet; if (sh.kind === 'night') clearNight(d); else d.ci.naps = (d.ci.naps || []).filter(n => n.id !== sh.id); S.sheet = null; touch(k); toast('Removed'); break; }
    case 'addnap': { const dr = S.napDraft || {s: hhmm(Date.now() - 3600e3), e: hhmm(Date.now())}; let st = atClock(k, dr.s), en = atClock(k, dr.e); if (en <= st) en += 864e5; if (en - st > 10 * 3600e3) { toast('That nap is over 10 h — check the times'); break; } d.ci = d.ci || {}; d.ci.naps = d.ci.naps || []; d.ci.naps.push({id: uid(), s: st, e: en}); S.napDraft = null; touch(k); toast(`Nap added · ${fmtH((en - st) / 3600e3)}`); break; }
    case 'delnap': d.ci.naps = (d.ci.naps || []).filter(n => n.id !== id); touch(k); break;
    case 'tapeopen': { const vals = {}; tapeFields().forEach(([f]) => { const sr = tapeSeries(f); if (sr.length) vals[f] = toIn(sr[sr.length-1].v); }); S.sheet = {type: 'tape', date: todayKey(), vals, orig: {...vals}}; render(); break; }
    case 'tapesave': { const sh = S.sheet; const dk = sh.date && sh.date <= todayKey() ? sh.date : todayKey(); const dd = day(dk); dd.ci = dd.ci || {}; let n2 = 0;
      tapeFields().forEach(([f]) => { const v = num(sh.vals[f]); if (v && v !== sh.orig[f]) { dd.ci[f] = Math.round(v * IN * 10) / 10; n2++; } });
      S.sheet = null; if (n2) { touch(dk); toast(`${n2} measurement${n2 > 1 ? 's' : ''} saved for ${shortDate(dk)}`); } else { render(); toast('Nothing changed'); } break; }
    case 'openmeal': S.openMeal = S.openMeal === id ? null : id; render(); break;
    case 'itemmeal': { const it = d.items.find(x => x.id === el.dataset.item); if (it) { it.m = id; touch(k); toast(`✓ Moved to ${MEALN[id]}`); } break; }
    case 'delitem': d.items = d.items.filter(x => x.id !== id); S.sheet = null; touch(k); toast('Removed'); break;
    case 'closesheet': S.sheet = null; render(); break;
    case 'cistep': { d.ci = d.ci || {}; const f = id; if (f === 'hits') { addHit(k, n); break; } const step = +(el.dataset.step || 1); const cur = d.ci[f]; d.ci[f] = cur == null ? (f === 'sl' ? 7 : Math.max(0, n)) : Math.min(f === 'sl' ? 16 : 999, Math.max(0, Math.round((cur + n * step) * 10) / 10)); touch(k); break; }
    case 'trained': d.ci = d.ci || {}; d.ci.tr = el.dataset.v === '1'; touch(k); break;
    case 'adddrink': S.sheet = {type: 'drink', cat: 'alc', d: 'beer5', ml: 330, m: 'none', mml: 0, time: S.date === todayKey() ? hhmm(Date.now()) : '22:00'}; render(); break;
    case 'dpick': S.sheet.d = id; S.sheet.ml = DMAP[id].presets[0]; if (['beer5','beer8','wine'].includes(id)) { S.sheet.m = 'none'; S.sheet.mml = 0; } render(); break;
    case 'dpre': S.sheet.ml = n; render(); break;
    case 'mpick': S.sheet.m = id; if (id !== 'none' && !S.sheet.mml) S.sheet.mml = 150; render(); break;
    case 'mpre': S.sheet.mml = n; render(); break;
    case 'savedrink': { const sh = S.sheet; d.ci = d.ci || {}; d.ci.drinks = d.ci.drinks || []; const t = sh.time ? atClock(k, sh.time) : Date.now(); if (sh.cat && sh.cat !== 'alc') d.ci.drinks.push({id: uid(), k: 'caf', d: sh.d, shots: sh.shots || undefined, sugar: sh.sugar || 0, size: sh.size || undefined, t}); else d.ci.drinks.push({id: uid(), d: sh.d, ml: +sh.ml || 0, m: sh.m, mml: sh.m === 'none' ? 0 : (+sh.mml || 0), t}); S.sheet = null; touch(k); toast('Drink added'); break; }
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
  if (act === 'ci') { d.ci = d.ci || {}; const f = el.dataset.f; const v = el.value === '' ? null : +el.value; if (v == null || isNaN(v)) { delete d.ci[f]; if (f === 'w') delete d.ci.wt; } else { d.ci[f] = v; if (f === 'w') d.ci.wt = k === todayKey() ? Date.now() : atClock(k, (PROF()?.wake || '09:00'), false); } touch(k); if (f === 'w' && v != null && !isNaN(v)) { toast(`✓ Weight saved · ${v} kg`); okMark('[data-act=ci][data-f=w]'); } }
  if (act === 'tapein') { d.ci = d.ci || {}; const f = el.dataset.f; const v = el.value === '' ? null : +el.value; if (v == null || isNaN(v)) delete d.ci[f]; else d.ci[f] = Math.round(v * IN * 10) / 10; touch(k); }
  if (act === 'slf') { if (el.value && S.sheet) S.sheet[el.dataset.f] = el.value; }
  if (act === 'sleeptime') { d.ci = d.ci || {}; const mc = d.ci.mc && !d.ci.mc.skipped ? d.ci.mc : (d.ci.mc = {bed: PROF()?.bed || '01:00', wake: PROF()?.wake || '09:00', t: Date.now()}); mc[el.dataset.f] = el.value; const sl = Math.round((atClock(k, mc.wake, false) - bedMs(k, mc.bed)) / 3600e3 * 4) / 4; if (sl > 0 && sl < 16) d.ci.sl = sl; touch(k); toast(`✓ Sleep saved${sl > 0 && sl < 16 ? ' · ' + fmtH(sl) : ''}`); okMark(`[data-act=sleeptime][data-f=${el.dataset.f}]`); }
  if (act === 'cartset') { const id = el.dataset.id, base = +el.dataset.base || 0; const c = S.cart[id] || (S.cart[id] = {q: 0, o: {...sauceDefaults(FMAP[id])}}); c.q = Math.max(-base, roundStep(el.value, stepOf(id)) - base); if (FMAP[id].param && !c.o[FMAP[id].param.key]) c.o[FMAP[id].param.key] = FMAP[id].param.def; if (id === 'dosa' && c.q) S.dosaMode = 'n'; render(); }
  if (act === 'itemqset') { const it = (d.items || []).find(x => x.id === el.dataset.id); if (it) { it.q = Math.max(stepOf(it.f), roundStep(el.value, stepOf(it.f)) || it.q); touch(k); toast(`✓ Updated · ${fq(it.q)}`); okMark(`[data-act=itemqset][data-id="${it.id}"]`); } }
  if (act === 'trtime') { if (el.value && S.sheet) S.sheet.time = el.value; }
  if (act === 'trdiffer') { const sh = S.sheet; sh.differ = el.checked; render(); }
  if (act === 'trnum') { const sh = S.sheet, f = el.dataset.f, v = el.value === '' ? 0 : +el.value, i = el.dataset.i;
    if (i !== '') sh.sets[+i][f] = v;
    else if (f === 'n') { const n = Math.max(1, Math.min(12, Math.round(v) || 1)); const b = sh.sets[0] || {r: 10, w: 0}; sh.sets = Array.from({length: n}, () => ({...b})); }
    else sh.sets.forEach(z => z[f] = v);
    render(); }
  if (act === 'evsheettime') { if (el.value) S.sheet.time = el.value; }
  if (act === 'evtime') { const x = (d.ci?.ev || []).find(y => y.id === el.dataset.id); if (x && el.value) { x.t = atClock(k, el.value); touch(k); toast(`✓ Time changed to ${tlabel(x.t)}`); okMark(`[data-act=evtime][data-id="${x.id}"]`); } }
  if (act === 'logtime') { S.logTime = el.value || null; }
  if (act === 'itemtime') { const it = (d.items || []).find(x => x.id === el.dataset.id); if (it && el.value) { it.t = atClock(k, el.value); touch(k); toast('✓ Updated · time ' + tlabel(it.t)); okMark(`[data-act=itemtime][data-id="${it.id}"]`); } }
  if (act === 'dtime') { S.sheet.time = el.value; }
  if (act === 'dml') { S.sheet.ml = Math.max(0, +el.value || 0); render(); }
  if (act === 'mml') { S.sheet.mml = Math.max(0, +el.value || 0); render(); }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset?.tape && S.sheet?.type === 'tape') { S.sheet.vals[el.dataset.tape] = el.value; return; }
  if (el.dataset?.tapedate && S.sheet?.type === 'tape') { S.sheet.date = el.value; return; }
  if (el.dataset?.nap) { S.napDraft = S.napDraft || {s: hhmm(Date.now() - 3600e3), e: hhmm(Date.now())}; S.napDraft[el.dataset.nap] = el.value; return; }
  if (el.dataset?.mc && S.mc) { S.mc[el.dataset.mc] = el.value; const sl = (atClock(S.date, S.mc.wake, false) - bedMs(S.date, S.mc.bed)) / 3600e3; const o = document.getElementById('mcsl'); if (o) o.textContent = sl > 0 && sl < 16 ? `${sl.toFixed(1)} h of sleep` : 'Check the times'; return; }
  const f = el.dataset?.pf; if (!f || !S.pf) return;
  S.pf[f] = el.value; const pv = document.getElementById('pfprev'); if (pv) pv.innerHTML = pfPreview();
  if (f === 'weightKg' || f === 'targetKg') { clearTimeout(S.pfT); S.pfT = setTimeout(() => { const a = document.activeElement?.dataset?.pf; render(); if (a) { const x = document.querySelector(`[data-pf="${a}"]`); if (x) { x.focus(); const L = x.value.length; try { x.setSelectionRange(L, L); } catch (er) {} } } }, 900); }
});
window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.sheet) { S.sheet = null; render(); } });
// roll the date forward if the app stays open past 6 AM
setInterval(() => { const t = todayKey(); if (S.lastToday && S.lastToday !== t && S.date === S.lastToday) { S.date = t; render(); } S.lastToday = t; }, 60000);
S.lastToday = todayKey();
boot();
