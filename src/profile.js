// Profile maths: BMR, maintenance, targets, body composition.
// Pure functions only (no app state), so they can be tested on their own.
// Every number here comes from a named formula; docs/HOW-IT-WORKS.md explains each one.

export const GOALS = [
  {id:'fatloss',   n:'Fat loss',                    d:'Lose weight, mostly fat.',                         paces:[-0.25, -0.5, -0.75], prot:2.2},
  {id:'cut',       n:'Cut, keep muscle',            d:'Slower loss while lifting hard to keep muscle.',   paces:[-0.25, -0.5],        prot:2.2},
  {id:'recomp',    n:'Recomp',                      d:'Build muscle and lose fat at once. Weight stays roughly flat.', paces:[0], prot:2.0},
  {id:'leanbulk',  n:'Lean bulk',                   d:'Gain muscle with as little fat as possible.',      paces:[0.25, 0.35, 0.5],    prot:1.8},
  {id:'heavybulk', n:'Heavy bulk',                  d:'Gain weight fast. More fat comes with it.',        paces:[0.5, 0.75],          prot:1.6},
  {id:'maintain',  n:'Maintain',                    d:'Hold your current weight.',                        paces:[0],                  prot:1.6},
];
export const GMAP = Object.fromEntries(GOALS.map(g => [g.id, g]));
export const ACTIVITY = [
  {id:'sit',  n:'Mostly sitting',     d:'Classes, desk, phone. Under ~5k steps.', f:1.25},
  {id:'some', n:'On your feet some',  d:'Walking around campus, errands. ~5–10k steps.', f:1.4},
  {id:'lots', n:'On your feet a lot', d:'Standing or walking most of the day. 10k+ steps.', f:1.55},
];
export const AMAP = Object.fromEntries(ACTIVITY.map(a => [a.id, a]));
export const KCAL_PER_KG = 7700; // energy in 1 kg of body-weight change (mixed tissue)

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate()+n); return keyOf(d); };
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
export const weekStart = k => { const d = parseKey(k); const dow = (d.getDay() + 6) % 7; return addDays(k, -dow); }; // Monday

export function ageAt(dob, k) {
  if (!dob) return null; const b = parseKey(dob), d = parseKey(k);
  let a = d.getFullYear() - b.getFullYear(); if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a--; return a;
}
// Mifflin–St Jeor (1990): the most accurate simple BMR formula for non-obese adults.
export function bmr(p, kg, age) { return 10 * kg + 6.25 * p.heightCm - 5 * age + (p.sex === 'f' ? -161 : 5); }
// Net energy of a weight session ≈ 3.8 kcal per kg per hour (MET ~4.8 minus resting).
export function trainingKcalPerDay(p, kg) { return 3.8 * kg * ((p.sessionMin || 60) / 60) * (p.trainDays || 0) / 7; }
export function formulaMaintenance(p, kg, age) {
  const b = bmr(p, kg, age), base = AMAP[p.activity]?.f || 1.25, tr = trainingKcalPerDay(p, kg);
  return {bmr: b, base, train: tr, kcal: b * base + tr};
}
// US Navy circumference method (Hodgdon & Beckett 1984). ±3–4% vs DEXA.
export function navyBF(p, waist, neck, hip) {
  if (!waist || !neck || !p.heightCm) return null;
  const L = Math.log10;
  if (p.sex === 'f') { if (!hip) return null; return 495 / (1.29579 - 0.35004 * L(waist + hip - neck) + 0.22100 * L(p.heightCm)) - 450; }
  if (waist - neck <= 0) return null;
  return 495 / (1.0324 - 0.19077 * L(waist - neck) + 0.15456 * L(p.heightCm)) - 450;
}
// Relative Fat Mass (Woolcott & Bergman 2018): needs only height and waist. Similar accuracy to the Navy method against DEXA.
export function rfm(p, waist) { if (!waist || !p.heightCm) return null; return (p.sex === 'f' ? 76 : 64) - 20 * p.heightCm / waist; }
// least-squares slope of weight vs day index, in kg per day
export function slope(pts) {
  if (pts.length < 2) return null; const xs = pts.map(p => p.x), ys = pts.map(p => p.y); const mx = mean(xs), my = mean(ys);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0); if (!den) return null;
  return xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den;
}
// Measured maintenance (energy balance): average intake minus the energy stored or lost,
// read off the weight trend. Needs real data; blends in as the data grows.
export function measuredMaintenance(intake, weights, end, formulaKcal) {
  const from = addDays(end, -27);
  const days = intake.filter(d => d.k >= from && d.k <= end && d.complete !== false && d.kcal > 0);
  const ws = weights.filter(w => w.k >= from && w.k <= end).map(w => ({x: daysBetween(from, w.k), y: w.w}));
  const out = {nDays: days.length, nWeights: ws.length, span: ws.length ? ws[ws.length-1].x - ws[0].x : 0, ready: false};
  if (days.length < 14 || ws.length < 8 || out.span < 10) return out;
  const sl = slope(ws); const avgIn = mean(days.map(d => d.kcal));
  const kcal = avgIn - sl * KCAL_PER_KG;
  Object.assign(out, {avgIn, slopeWk: sl * 7, kcal});
  if (formulaKcal && Math.abs(kcal - formulaKcal) / formulaKcal > 0.25) { out.suspect = true; return out; }
  out.ready = true; out.weight = Math.min(1, 0.5 + (days.length - 14) / 28); // 14 days = 50%, 28 days = 100%
  return out;
}

// Daily reference intakes by sex and age (US DRI; potassium AI from 2019 update).
function microTargets(sex, age) {
  const f = sex === 'f', teen = age != null && age < 19, old = age != null && age > 50;
  return {
    k: f ? 2600 : 3400, ca: teen ? 1300 : (old && f ? 1200 : 1000), mg: f ? (teen ? 360 : 310) : (teen ? 410 : 420),
    fe: f ? (old ? 8 : teen ? 15 : 18) : (teen ? 11 : 8), zn: f ? (teen ? 9 : 8) : 11, ph: teen ? 1250 : 700, se: 55, io: 150,
    vA: f ? 700 : 900, vD: old ? 15 : 15, vE: 15, vK: f ? (teen ? 75 : 90) : (teen ? 75 : 120), vC: f ? (teen ? 65 : 75) : (teen ? 75 : 90),
    b1: f ? (teen ? 1.0 : 1.1) : 1.2, b2: f ? (teen ? 1.0 : 1.1) : 1.3, b3: f ? 14 : 16, b6: old ? (f ? 1.5 : 1.7) : (teen ? (f ? 1.2 : 1.3) : 1.3),
    fol: 400, b12: 2.4, cho: f ? (teen ? 400 : 425) : 550, o3: 250,
  };
}

// Everything the app needs for one week. Targets are frozen per Monday-to-Sunday week,
// computed from data before that Monday, so a noisy weigh-in never moves today's numbers.
export function computePlan(p, ctx) {
  const ws = weekStart(ctx.date); const basisEnd = addDays(ws, -1);
  const prior = ctx.weights.filter(w => w.k >= addDays(ws, -7) && w.k <= basisEnd);
  const thisWeek = ctx.weights.filter(w => w.k >= ws && w.k <= ctx.date);
  const kg = prior.length ? mean(prior.map(w => w.w)) : thisWeek.length ? thisWeek[0].w : p.weightKg;
  const kgSrc = prior.length ? `7-day average before ${ws}` : thisWeek.length ? 'first weigh-in this week' : 'profile weight';
  const age = ageAt(p.dob, ws) ?? 22;
  const fm = formulaMaintenance(p, kg, age);
  const mm = measuredMaintenance(ctx.intake, ctx.weights, basisEnd, fm.kcal);
  const w = mm.ready ? mm.weight : 0;
  const maint = fm.kcal * (1 - w) + (mm.kcal || 0) * w;
  const g = GMAP[p.goal] || GMAP.maintain; const pace = g.paces.includes(p.pace) ? p.pace : g.paces[0];
  let adj = pace * KCAL_PER_KG / 7; if (adj < -0.25 * maint) adj = -0.25 * maint; // never more than a 25% deficit
  const kcal = Math.round((maint + adj) / 10) * 10;
  const prot = Math.round(g.prot * kg / 5) * 5;
  const fatMax = Math.round(kcal * 0.30 / 9), fatMin = Math.round(0.8 * kg);
  const fatPlan = Math.round(kcal * 0.27 / 9);
  const carbs = Math.max(0, Math.round((kcal - prot * 4 - fatPlan * 9) / 4 / 5) * 5);
  const water = Math.max(2500, Math.round((35 * kg + 500 * (p.trainDays || 0) / 7) / 250) * 250);
  const targets = Object.assign(microTargets(p.sex, age), {kcal, p: prot, f: fatMax, sat: Math.round(kcal * 0.10 / 9), c: carbs, fib: Math.round(kcal / 1000 * 14), na: 2000, chol: 300});
  return {weekStart: ws, kg, kgSrc, age, formula: fm, measured: mm, blend: w, maint, goal: g, pace, adj, targets, fatMin, fatPlan, water};
}

// Current body metrics (not frozen; uses the latest data).
export function bodyNow(p, ctx) {
  const recent = ctx.weights.filter(w => w.k > addDays(ctx.date, -7) && w.k <= ctx.date);
  const kg = recent.length ? mean(recent.map(w => w.w)) : (ctx.weights.length ? ctx.weights[ctx.weights.length-1].w : p.weightKg);
  const h = p.heightCm / 100; const bmi = kg / (h * h);
  const tape = ctx.tape; // {waist, neck, hip, k}
  const tapeFresh = tape && daysBetween(tape.k, ctx.date) <= 60;
  const bfNavy = tapeFresh ? navyBF(p, tape.waist, tape.neck, tape.hip) : null; const bfRfm = tapeFresh ? rfm(p, tape.waist) : null;
  const bfs = [bfNavy, bfRfm].filter(x => x != null); const bf = bfs.length ? bfs.reduce((a, b) => a + b, 0) / bfs.length : null;
  const lean = bf != null ? kg * (1 - bf / 100) : null;
  const ffmi = lean != null ? lean / (h * h) : null;
  const ffmiAdj = ffmi != null ? ffmi + 6.1 * (1.8 - h) : null;
  const whtr = tapeFresh && tape.waist ? tape.waist / p.heightCm : null;
  // actual pace: slope of the last 21 days of weigh-ins
  const from = addDays(ctx.date, -20);
  const pts = ctx.weights.filter(w => w.k >= from).map(w => ({x: daysBetween(from, w.k), y: w.w}));
  const sp = pts.length >= 5 && pts[pts.length-1].x - pts[0].x >= 7 ? slope(pts) * 7 : null;
  const age = ageAt(p.dob, ctx.date) ?? 22;
  return {kg, bmi, bf, bfNavy, bfRfm, lean, ffmi, ffmiAdj, whtr, tape: tapeFresh ? tape : null, paceActual: sp, bmrNow: bmr(p, kg, age), age};
}

export function goalCheck(p, kgNow) {
  const g = GMAP[p.goal]; if (!g || !p.targetKg || !kgNow) return null; const diff = p.targetKg - kgNow;
  if ((p.goal === 'recomp' || p.goal === 'maintain') && Math.abs(diff) > 2) return `${g.n} keeps your weight roughly flat, but your target is ${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg away. For that, pick ${diff > 0 ? 'Lean bulk' : 'Fat loss or Cut'}.`;
  if ((p.goal === 'leanbulk' || p.goal === 'heavybulk') && diff < -0.5) return `Your target weight is below your current weight, but ${g.n} means gaining.`;
  if ((p.goal === 'fatloss' || p.goal === 'cut') && diff > 0.5) return `Your target weight is above your current weight, but ${g.n} means losing.`;
  return null;
}
export function etaWeeks(p, kgNow, rate) {
  if (!p.targetKg || !kgNow || !rate) return null; const diff = p.targetKg - kgNow;
  if (Math.abs(diff) < 0.3) return 0; if (Math.sign(diff) !== Math.sign(rate)) return null; return diff / rate;
}
// labels for interpreting the numbers
export const bmiBand = b => b < 18.5 ? 'underweight' : b < 25 ? 'normal' : b < 30 ? 'overweight' : 'obese';
export const ffmiBand = f => f < 18 ? 'below average' : f < 20 ? 'average' : f < 22 ? 'trained' : f < 24 ? 'very muscular' : 'elite';
export const bfBand = (bf, sex) => sex === 'f' ? (bf < 21 ? 'athletic' : bf < 25 ? 'fit' : bf < 32 ? 'average' : 'high') : (bf < 14 ? 'athletic' : bf < 18 ? 'fit' : bf < 25 ? 'average' : 'high');

// Weight rises through the day with food and water. Weigh-ins are corrected to a
// morning-equivalent using hours since waking (about 1.4% by late night).
export const WEIGHT_CORR = [[0, 0], [2, 0], [2.01, 0.004], [5, 0.004], [5.01, 0.008], [9, 0.008], [9.01, 0.012], [13, 0.012], [13.01, 0.014]];
export function weightCorrPct(hoursAwake) { if (hoursAwake == null || hoursAwake < 2) return 0; if (hoursAwake < 5) return 0.004; if (hoursAwake < 9) return 0.008; if (hoursAwake < 13) return 0.012; return 0.014; }
export function correctedWeight(raw, hoursAwake) { return raw * (1 - weightCorrPct(hoursAwake)); }
