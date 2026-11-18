// Energy model: a rule-based estimate of how energetic you are at any minute of the day.
// No AI, no black box: every layer below is a fixed, documented rule you can read.
// Input is plain data (times in ms); output is a curve plus the reasons behind each point.
//
// Layers (all add to a base of 75, then clamped 5–98):
//   1 Sleep foundation: duration, sleep debt, body-clock shift, very late bedtime
//   2 Morning report: sleep quality, mood, body feel (fades through the day)
//   3 Body clock: wake-up grogginess, late-morning peak, afternoon dip, evening second wind, wind-down
//   4 Fuel: time since food, each meal's sugar lift/crash, food-coma size effect, steady fuel, running totals
//   5 Water
//   6 Caffeine: blood level (absorbs in ~45 min, halves every 5 h), soft crash after big doses
//   7 Alcohol: tonight's sedation, last night's hangover
//   8 Cannabis: short lift, longer couch phase, heavy-day fog, next-morning fog; scaled by tolerance
//   9 Day tags: sick, stressed, travel, exam, party (and yesterday's party)
//  10 Naps: grogginess right after, a lift that fades over ~5 h, and they partly reset the 'hours awake' clock

const H = 3600e3, MIN = 60e3;
// Frozen until 16 Dec 2026 so predictions can be compared fairly with your ratings. Change one layer at a time after that.
export const MODEL_VERSION = 'v1';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// piecewise-linear interpolation over [[x, y], ...] (sorted by x); flat beyond the ends
export function interp(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i-1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  return pts[pts.length-1][1];
}
const gauss = (x, mu, sd) => Math.exp(-0.5 * ((x - mu) / sd) ** 2);
// a hump: rises from 0 at `start` to 1 at `peak`, back to 0 at `end` (minutes after an event)
const hump = (m, start, peak, end) => m <= start || m >= end ? 0 : m <= peak ? (m - start) / (peak - start) : (end - m) / (end - peak);

export const SLEEP_PTS = [[3,-38],[4,-32],[5,-22],[5.5,-16],[6,-11],[6.5,-6],[7,-2],[7.5,0],[8,2],[8.5,3],[9,2],[9.5,0],[10,-3],[11,-7]];
export const QUALITY = [-14, -7, 0, 4, 8];   // Terrible, Poor, Okay, Good, Great
export const FEEL    = [-15, -8, 0, 5, 10];  // Drained, Heavy, Okay, Light, Energetic
export const MOOD    = [-9, -5, 0, 3, 6];    // Low, Irritable, Okay, Good, Great
const FAST_PTS = [[0,0],[3,0],[4,-3],[5,-6],[6,-10],[8,-15],[10,-20]];                  // hours since food
const SIZE_PTS = [[300,0],[500,-2],[800,-5],[1100,-8],[1400,-11],[1800,-14]];           // meal kcal → food-coma depth
const ADEQ_PTS = [[0,-12],[0.35,-10],[0.5,-7],[0.7,-4],[0.85,-1.5],[1,0],[1.3,0],[1.6,-2],[2,-5]]; // eaten ÷ expected so far
const WATER_PTS = [[0,-8],[0.2,-7],[0.4,-4],[0.6,-2],[0.8,0]];
const JETLAG_PTS = [[0,0],[0.5,0],[1,-2],[2,-5],[3,-8],[4,-11],[6,-12]];

// caffeine blood level (mg-equivalent) at time t from doses [{t, mg}]: one-compartment model
const KA = 3.5, KE = Math.LN2 / 5; // absorption per hour (peak ~45–60 min), elimination half-life 5 h
export function caffeineLevel(doses, t) {
  let c = 0; doses.forEach(d => { const h = (t - d.t) / H; if (h > 0) c += d.mg * KA / (KA - KE) * (Math.exp(-KE * h) - Math.exp(-KA * h)); }); return c;
}
// group events within `gap` minutes into sessions
function sessions(times, gap) {
  const s = []; [...times].sort((a, b) => a - b).forEach(t => { const last = s[s.length-1]; if (last && t - last.end <= gap * MIN) { last.end = t; last.n++; } else s.push({t, end: t, n: 1}); }); return s;
}

// in = {
//   wake, bed (ms) · usualWakeMin, usualBedMin (minutes after midnight) · priorSleep: [h night-1, h night-2, h night-3]
//   report: {sq, mood, feel} as 0–4, or null · intakes: [{t, kcal, p, c, f, fib, sug, alc}] (food and drinks, today)
//   caffeine: [{t, mg}] (today + yesterday) · water: [{t, ml}] · hits: [ms] (today) · hitsAvg7: hits/day over last week
//   lastNight: {std (standard drinks after 6 PM), lateHits (after 9 PM), totalHits} · targets: {kcal, p, water}
// }
export function energyAt(inp, t) {
  const R = [];
  const add = (layer, key, label, v) => { if (Math.abs(v) >= 0.05) R.push({layer, key, label, v}); };
  const a = Math.max(0, (t - inp.wake) / H); // hours since the main wake-up
  const sleepH = Math.max(0, (inp.wake - inp.bed) / H);
  // naps: finished ones before t, and whether t is inside one
  const naps = (inp.naps || []).filter(n => n.e > n.s && n.s >= inp.wake - H).sort((x, y) => x.s - y.s);
  const asleep = naps.some(n => t >= n.s && t < n.e);
  const done = naps.filter(n => n.e <= t); const napBefore = naps.reduce((s, n) => s + Math.max(0, Math.min(t, n.e) - n.s), 0) / H;
  let aEff = a; // 'hours awake' for tiredness: a nap resets part of it (a 2 h nap resets 80%)
  if (done.length) { const ln = done[done.length-1]; const nh = (ln.e - ln.s) / H, r = Math.min(0.8, nh / 2); aEff = (t - ln.e) / H + Math.max(0, (ln.s - inp.wake) / H) * (1 - r); }
  const awakeH = Math.max(0, a - napBefore); // hours actually awake, for 'expected by now' targets
  // ---- 1 sleep foundation
  let s1 = interp(SLEEP_PTS, sleepH); if (s1 < 0) s1 *= Math.min(1.5, 1 + 0.04 * aEff); // short sleep bites harder as the day goes on
  add('sleep', 'dur', `${sleepH.toFixed(1)} h sleep`, s1);
  const w = [0.5, 0.3, 0.2]; let debt = 0; (inp.priorSleep || []).forEach((h, i) => { if (h != null) debt += w[i] * Math.max(0, 7.5 - h); });
  let s2 = -Math.min(12, 6 * debt); if (sleepH >= 8.5) s2 *= 0.5; add('sleep', 'debt', 'Sleep debt from earlier nights', s2);
  const mid = (inp.bed + inp.wake) / 2; const midMin = (new Date(mid).getHours() * 60 + new Date(mid).getMinutes());
  let uMid = (inp.usualBedMin + ((inp.usualWakeMin - inp.usualBedMin + 1440) % 1440) / 2) % 1440;
  let shift = Math.abs(midMin - uMid); if (shift > 720) shift = 1440 - shift; shift /= 60;
  add('sleep', 'jetlag', `Body clock off by ${shift.toFixed(1)} h`, interp(JETLAG_PTS, shift) * (a > 8 ? 0.5 : 1));
  const bh = new Date(inp.bed).getHours() + new Date(inp.bed).getMinutes() / 60; const late = bh >= 3 && bh < 12 ? bh - 3 : 0;
  add('sleep', 'late', 'Very late bedtime', -Math.min(9, 3 * late));
  // ---- 2 morning report
  if (inp.report) {
    const fade = (from, to, hrs) => from + (to - from) * clamp(a / hrs, 0, 1);
    add('report', 'sq', 'Sleep quality you reported', QUALITY[inp.report.sq] * fade(1, 0.7, 10));
    add('report', 'feel', 'How your body felt on waking', FEEL[inp.report.feel] * fade(1, 0.4, 6));
    add('report', 'mood', 'Your morning mood', MOOD[inp.report.mood] * fade(1, 0.75, 12));
  }
  // ---- 3 body clock (relative to your wake time)
  const inertiaMin = sleepH < 6 ? 60 : sleepH < 7 ? 45 : 30;
  const sinceWake = (t - inp.wake) / MIN;
  if (sinceWake >= 0 && sinceWake < inertiaMin) add('clock', 'inertia', 'Just woke up (grogginess)', -18 * (1 - sinceWake / inertiaMin));
  add('clock', 'peak', 'Late-morning peak', 5 * gauss(a, 3, 1.5));
  add('clock', 'dip', 'Afternoon dip', -7 * gauss(a, 7, 1.3));
  add('clock', 'second', 'Evening second wind', 3 * gauss(a, 11, 1.5));
  if (aEff > 13) add('clock', 'wind', `${aEff.toFixed(0)} h awake${done.length ? ' (after your nap)' : ''}`, -Math.min(20, (aEff - 13) * 4 * (1 + debt / 3)));
  // ---- 4 fuel
  const ins = (inp.intakes || []).filter(x => x.t <= t && x.t >= inp.wake - 2 * H);
  const meals = ins.filter(x => (x.kcal || 0) >= 100);
  const lastMeal = meals.length ? Math.max(...meals.map(x => x.t)) : null;
  let fastH = lastMeal ? (t - lastMeal) / H : Math.max(0, a - 1); // first hour after waking without food is normal
  if (lastMeal) fastH -= 0.7 * naps.reduce((s, n) => s + Math.max(0, Math.min(t, n.e) - Math.max(lastMeal, n.s)), 0) / H; // you get less hungry asleep
  add('fuel', 'fast', lastMeal ? `${fastH.toFixed(1)} h since you ate` : `Nothing eaten since waking`, interp(FAST_PTS, fastH));
  // meals within 20 minutes of each other count as one sitting
  const sit = []; [...ins].sort((x, y) => x.t - y.t).forEach(x => { const l = sit[sit.length-1]; if (l && x.t - l.t <= 20 * MIN) { for (const k of ['kcal','p','c','f','fib','sug','alc']) l[k] = (l[k] || 0) + (x[k] || 0); } else sit.push({...x}); });
  let lift = 0, crash = 0, coma = 0, steady = 0;
  sit.forEach(m => {
    const mm = (t - m.t) / MIN; if (mm < 0 || mm > 360) return;
    const c = m.c || 0, sug = m.sug || 0, fib = m.fib || 0, p = m.p || 0, f = m.f || 0, kc = m.kcal || 0;
    const quick = sug + 0.3 * Math.max(0, c - sug - fib), buffer = p + 0.5 * f + 2 * fib, ratio = quick / Math.max(1, quick + buffer);
    lift += Math.min(8, quick / 8) * hump(mm, 0, 30, 90);
    if (quick > 25 && ratio > 0.5) crash -= Math.min(10, (quick - 20) / 4 * ratio) * hump(mm, 80, 120, 190);
    if (kc >= 300) {
      let depth = interp(SIZE_PTS, kc); if (f >= 55) depth *= 1.5; else if (f >= 35) depth *= 1.25; if (p * 4 >= 0.25 * kc) depth *= 0.8;
      const ma = (m.t - inp.wake) / H + 1.25; if (ma > 5.5 && ma < 9) depth *= 1.2; // lands on the afternoon dip
      const end = f >= 35 ? 210 : 150; coma += depth * hump(mm, 20, 75, end);
    }
    if (mm >= 30 && mm <= 240) steady += Math.min(5, (p + fib) / 10) * (mm < 45 ? (mm - 30) / 15 : mm > 210 ? (240 - mm) / 30 : 1);
  });
  add('fuel', 'lift', 'Sugar lift', lift); add('fuel', 'crash', 'Sugar crash', crash); add('fuel', 'coma', 'Food coma (big or fatty meal)', coma); add('fuel', 'steady', 'Steady fuel (protein, fibre)', steady);
  if (a >= 3 && inp.targets?.kcal) {
    const exp = clamp((awakeH - 1) / 14, 0.05, 1); const eaten = ins.reduce((s, x) => s + (x.kcal || 0), 0); const prot = ins.reduce((s, x) => s + (x.p || 0), 0);
    const r = eaten / (inp.targets.kcal * exp); add('fuel', 'adeq', `${Math.round(r * 100)}% of the food expected by now`, interp(ADEQ_PTS, r));
    const rp = prot / ((inp.targets.p || 100) * exp); if (rp < 0.75) add('fuel', 'prot', 'Low protein so far', rp < 0.5 ? -3 : -1.5);
  }
  // ---- 5 water
  if (a >= 3 && inp.targets?.water) {
    const drunk = (inp.water || []).filter(x => x.t <= t).reduce((s, x) => s + x.ml, 0);
    const r = drunk / (inp.targets.water * clamp((awakeH - 1) / 14, 0.1, 1)); add('water', 'water', `${Math.round(Math.min(r, 9) * 100)}% of water expected by now`, interp(WATER_PTS, r));
  }
  // ---- 6 caffeine
  const cl = caffeineLevel(inp.caffeine || [], t);
  if (cl > 1) add('caffeine', 'caf', `Caffeine in your blood (~${Math.round(cl)} mg)`, 13 * (1 - Math.exp(-cl / 90)));
  const today = (inp.caffeine || []).filter(d => d.t >= inp.wake - H && d.t <= t);
  if (today.length) { const pk = Math.max(...today.map(d => caffeineLevel(today, d.t + 0.9 * H))); const sinceLast = (t - Math.max(...today.map(d => d.t))) / H;
    if (pk > 120 && sinceLast > 3) add('caffeine', 'cafcrash', 'Caffeine wearing off', -Math.min(4, (pk - cl) / 50)); }
  // ---- 7 alcohol
  let alcNow = 0; sit.forEach(m => { const std = (m.alc || 0) / 10; if (!std) return; const mm = (t - m.t) / MIN; alcNow += -4 * std * hump(mm, 20, 90, 240) + (std <= 2 ? 2 * hump(mm, 0, 20, 60) : 0); });
  add('alcohol', 'alc', 'Alcohol today', Math.max(-18, alcNow));
  if (inp.lastNight?.std) add('alcohol', 'hang', `Last night's drinks (${inp.lastNight.std.toFixed(1)} std)`, -Math.min(18, 3 * inp.lastNight.std) * (a <= 4 ? 1 : a >= 10 ? 0.4 : 1 - 0.6 * (a - 4) / 6));
  // ---- 8 cannabis
  const tol = 1 / (1 + (inp.hitsAvg7 || 0) / 15); // heavier regular use = weaker effect both ways
  let up = 0, down = 0; sessions((inp.hits || []).filter(h => h <= t), 30).forEach(se => { const mm = (t - se.t) / MIN; const de = Math.sqrt(se.n) * tol; up += Math.min(9, 5 * de) * hump(mm, 0, 15, 45); down -= Math.min(16, 6 * de) * hump(mm, 40, 100, 210); });
  add('cannabis', 'high', 'Cannabis lift', up); add('cannabis', 'couch', 'Cannabis couch phase', down);
  const hitsSoFar = (inp.hits || []).filter(h => h <= t).length; if (hitsSoFar > 6) add('cannabis', 'fog', `${hitsSoFar} hits today (fog)`, -Math.min(10, 0.8 * (hitsSoFar - 6)));
  if (inp.lastNight?.lateHits) add('cannabis', 'morningfog', 'Late-night hits', -Math.min(10, 1.2 * inp.lastNight.lateHits) * clamp(1 - a / 6, 0, 1));
  if ((inp.lastNight?.totalHits || 0) > 10 && a < 4) add('cannabis', 'heavyday', 'Heavy smoking yesterday', -3);
  // ---- 10 naps
  done.forEach(n => { const nh = (n.e - n.s) / H, since = (t - n.e) / MIN;
    const depth = nh < 0.5 ? 6 : nh < 1 ? 10 : 15, dur = nh < 0.5 ? 10 : nh < 1 ? 25 : 40;
    if (since < dur) add('nap', 'napgrog', 'Waking from a nap (grogginess)', -depth * (1 - since / dur));
    add('nap', 'napboost', `${nh.toFixed(1)} h nap`, Math.min(10, 5 * nh) * Math.exp(-since / 60 / 5)); });
  // ---- 9 day tags
  const tg = inp.tags || [];
  if (tg.includes('sick')) add('tags', 'sick', 'Sick today', -12);
  if (tg.includes('stressed')) add('tags', 'stressed', 'Stressed', -5);
  if (tg.includes('travel')) add('tags', 'travel', 'Travel day', -5);
  if (tg.includes('exam')) add('tags', 'exam', a < 8 ? 'Exam adrenaline' : 'After the exam', a < 8 ? 4 : -4);
  if (tg.includes('party') && a >= 10) add('tags', 'party', 'Party night', 4);
  if ((inp.yTags || []).includes('party')) add('tags', 'yparty', "Last night's party", -6 * clamp(1 - a / 6, 0, 1));
  const raw = 75 + R.reduce((s, x) => s + x.v, 0);
  return {t, score: clamp(Math.round(raw), 5, 98), parts: R, asleep};
}

export const band = s => s >= 85 ? {c:'g', n:'Peak'} : s >= 70 ? {c:'g', n:'Charged'} : s >= 55 ? {c:'y', n:'Steady'} : s >= 45 ? {c:'y', n:'Flat'} : s >= 30 ? {c:'r', n:'Low'} : {c:'r', n:'Drained'};
export const ratingBand = s => s >= 80 ? 5 : s >= 65 ? 4 : s >= 50 ? 3 : s >= 35 ? 2 : 1; // model score → 1–5 like your own rating

// whole day: curve from wake to bedtime every 10 min, current point, three phase verdicts, and what would help
export function energyDay(inp, now, endMs) {
  const pts = []; for (let t = inp.wake; t <= endMs; t += 10 * MIN) pts.push(energyAt(inp, t));
  const cur = energyAt(inp, clamp(now, inp.wake, endMs));
  const phase = (from, to) => { const xs = pts.filter(p => p.t >= from && p.t < to && !p.asleep); if (!xs.length) return null; return {score: Math.round(xs.reduce((s, p) => s + p.score, 0) / xs.length), past: to <= now, now: from <= now && now < to}; };
  const d0 = new Date(inp.wake); const at = h => new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), h).getTime();
  const phases = [{n:'Morning', v: phase(inp.wake, at(13))}, {n:'Afternoon', v: phase(Math.max(inp.wake, at(13)), at(18))}, {n:'Evening', v: phase(Math.max(inp.wake, at(18)), endMs + 1)}];
  // what would help: simulate a change now and see the score 90 min later
  const help = [];
  if (now < endMs - H && !cur.asleep) {
    const later = Math.min(endMs, now + 90 * MIN); const base = energyAt(inp, later).score;
    const tryIt = (label, patch) => { const g = energyAt({...inp, ...patch(inp)}, later).score - base; if (g >= 3) help.push({label, gain: g}); };
    tryIt('Eat a proper meal (~500 kcal with protein)', i => ({intakes: [...(i.intakes || []), {t: now, kcal: 500, p: 30, c: 60, f: 15, fib: 6, sug: 8}]}));
    tryIt('Drink 500 ml of water', i => ({water: [...(i.water || []), {t: now, ml: 500}]}));
    const cutoff = inp.bed + 24 * H - 8 * H; // no caffeine within 8 h of your usual bedtime
    if (now < cutoff) tryIt('A coffee (~80 mg caffeine)', i => ({caffeine: [...(i.caffeine || []), {t: now, mg: 80}]}));
    help.sort((x, y) => y.gain - x.gain);
  }
  return {pts, cur, phases, help: help.slice(0, 2)};
}
