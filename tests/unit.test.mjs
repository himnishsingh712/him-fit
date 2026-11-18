// Unit tests for the pure maths modules. Run: npm test
import assert from 'node:assert/strict';
import {computePlan, measuredMaintenance, navyBF, bmr, goalCheck, correctedWeight} from '../src/profile.js';
import {energyAt, energyDay, caffeineLevel, interp} from '../src/energy.js';
import {placeHits} from '../src/hits.js';
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const P = {dob:'2004-05-10', sex:'m', heightCm:181, weightKg:66, activity:'sit', trainDays:4, sessionMin:60, goal:'leanbulk', pace:0.25, targetKg:72};
t('BMR Mifflin-St Jeor', () => assert.equal(Math.round(bmr(P, 66, 22)), 1686));
t('Navy body fat', () => assert.equal(navyBF({sex:'m', heightCm:181}, 78, 35).toFixed(1), '12.7'));
t('goal mismatch', () => { assert.ok(goalCheck({...P, goal:'recomp'}, 66)); assert.equal(goalCheck(P, 66), null); });
t('weight correction by hours awake', () => { assert.equal(correctedWeight(69.5, 1), 69.5); assert.equal(correctedWeight(69.5, 10).toFixed(2), '68.67'); });
t('measured maintenance from intake and weight trend', () => {
  const days = [], ws = []; for (let i = 0; i < 28; i++) { const d = new Date(2026, 10, 2 + i); const k = d.toISOString().slice(0, 10); days.push({k, kcal: 2800}); ws.push({k, w: 66 + i * 0.25 / 7}); }
  const mm = measuredMaintenance(days, ws, days[27].k, 2400); assert.ok(mm.ready); assert.ok(Math.abs(mm.kcal - 2525) < 15, mm.kcal);
});
t('plan freezes targets per week and blends maintenance', () => { const pl = computePlan(P, {date:'2026-11-18', weights:[], intake:[]}); assert.equal(pl.targets.kcal, 2530); assert.equal(pl.targets.p, 120); assert.equal(pl.blend, 0); });
t('interp', () => assert.equal(interp([[0, 0], [10, 10]], 5), 5));
t('caffeine peaks within ~1 h and halves in ~5 h', () => { const d = [{t: 0, mg: 100}]; const pk = caffeineLevel(d, 3600e3); assert.ok(pk > 70 && pk < 100); const later = caffeineLevel(d, 6 * 3600e3); assert.ok(later < pk * 0.6); });
const D = (h, m = 0) => new Date(2026, 10, 19, h, m).getTime();
const base = {wake: D(9), bed: D(1), usualWakeMin: 540, usualBedMin: 60, priorSleep: [8, 8, 8], report: {sq: 2, mood: 2, feel: 2}, intakes: [], caffeine: [], water: [], hits: [], hitsAvg7: 0, lastNight: {}, targets: {kcal: 2500, p: 120, water: 2500}};
t('short sleep costs energy', () => assert.ok(energyAt({...base, bed: D(4)}, D(12)).score < energyAt(base, D(12)).score - 10));
t('skipping food drags energy down', () => { const fed = {...base, intakes: [{t: D(10), kcal: 700, p: 40, c: 80, f: 20, fib: 8, sug: 10}, {t: D(14), kcal: 700, p: 40, c: 80, f: 20, fib: 8, sug: 10}]}; assert.ok(energyAt(fed, D(17)).score > energyAt(base, D(17)).score + 8); });
t('cannabis: lift then couch', () => { const h = {...base, hits: [D(15), D(15, 2), D(15, 4)]}; assert.ok(energyAt(h, D(15, 15)).score > energyAt(base, D(15, 15)).score); assert.ok(energyAt(h, D(16, 40)).score < energyAt(base, D(16, 40)).score); });
t('sick tag', () => assert.equal(energyAt(base, D(12)).score - energyAt({...base, tags: ['sick']}, D(12)).score, 12));
t('energyDay gives phases and a curve', () => { const e = energyDay(base, D(14), D(25)); assert.ok(e.pts.length > 50); assert.equal(e.phases.length, 3); });
t('hits: small chain stays at tap time', () => { const taps = [D(15), D(15, 1)]; assert.deepEqual(placeHits(taps, D(11)).times, taps); });
t('hits: catch-up of 12 lands over the last ~2 h (6 an hour)', () => { const taps = Array.from({length: 12}, (_, i) => D(17) + i * 5000); const r = placeHits(taps, D(11)); assert.equal(r.chain.n, 12); assert.ok(Math.abs(r.chain.end - r.chain.start - 2 * 3600e3) < 60e3); });
t('hits: "since I woke" override', () => { const taps = Array.from({length: 12}, (_, i) => D(17) + i * 5000); const r = placeHits(taps, D(11), 'wake'); assert.equal(r.chain.start, D(11)); });
t('hits: catch-up after a recent hit is at least n/10 h long', () => { const taps = [D(16, 50), ...Array.from({length: 10}, (_, i) => D(17) + i * 5000)]; const r = placeHits(taps, D(11)); assert.ok(r.chain.end - r.chain.start >= 3600e3 - 1); });
console.log(`\n${n} unit tests passed`);
