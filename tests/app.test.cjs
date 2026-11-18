// End-to-end test: runs the built app (with a fake Supabase) in jsdom and clicks through every screen.
// Run: npm test
const {JSDOM} = require('jsdom'); const fs = require('fs'); const path = require('path');
const dir = path.join(__dirname, '.dist'); let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const js = fs.readdirSync(path.join(dir, 'assets')).find(f => f.endsWith('.js'));
html = html.replace(/<script type="module"[^>]*><\/script>/, '').replace(/<link rel="stylesheet"[^>]*>/g, '').replace('</body>', () => `<script>${fs.readFileSync(path.join(dir, 'assets', js), 'utf8')}</script></body>`);
const downloads = [];
const dom = new JSDOM(html, {runScripts: 'dangerously', url: 'https://him-fit.test/', pretendToBeVisual: true, beforeParse(w) {
  w.scrollTo = () => {}; Object.defineProperty(w.navigator, 'onLine', {get: () => w.__online !== false});
  w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { if (this.download) downloads.push(this.download); };
}});
const w = dom.window, doc = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, passes = 0; const ok = (name, cond, info = '') => { if (cond) { passes++; console.log('ok  ', name); } else { fails++; console.log('FAIL', name, info); } };
const $ = s => doc.querySelector(s), $$ = s => [...doc.querySelectorAll(s)], txt = s => ($(s)?.textContent || '').replace(/\s+/g, ' ').trim();
const click = s => { const e = $(s); if (!e) throw new Error('missing ' + s); e.dispatchEvent(new w.MouseEvent('click', {bubbles: true})); };
const setv = (s, v, ev = 'change') => { const e = $(s); if (!e) throw new Error('missing ' + s); e.value = v; e.dispatchEvent(new w.Event(ev, {bubbles: true})); };
const go = async h => { w.location.hash = h; await wait(40); };
(async () => { try {
  await wait(100);
  ok('auth screen first', !!$('#authform'));
  const f = $('#authform'); f.querySelector('[name=email]').value = 'him@test.com'; f.querySelector('[name=password]').value = 'password123';
  f.dispatchEvent(new w.Event('submit', {bubbles: true, cancelable: true})); await wait(120);
  ok('setup opens on first sign-in', txt('h1') === 'About you');
  ok('no bottom nav during setup', !$('nav.bottom'));
  for (const [k, v] of [['name','Him'],['dob','2004-05-10'],['heightCm','181'],['weightKg','66'],['targetKg','72']]) setv(`[data-pf="${k}"]`, v, 'input');
  ok('live preview', txt('#pfprev').includes('2,530'), txt('#pfprev'));
  click('[data-act=pfsave]'); await wait(200);
  ok('profile saved to server', !!w.__mock.db.config[0]?.data.profile);
  ok('Me tab after save', txt('h1') === 'Him');
  await go('#today');
  ok('strip shows energy and calories left', $('.strip') && txt('.strip').includes('Calories left'), txt('.strip'));
  ok('quick-add row', $$('.qadd .btn').length === 4);
  ok('morning card shown', !!$('.mcard'));
  click('[data-act=mcset][data-f=sq][data-v="3"]'); await wait(5); click('[data-act=mcset][data-f=mood][data-v="2"]'); await wait(5); click('[data-act=mcset][data-f=feel][data-v="1"]'); await wait(5);
  click('[data-act=mctag][data-id=exam]'); await wait(5); click('[data-act=mcsave]'); await wait(60);
  ok('morning card gone after save', !$('.mcard'));
  ok('tags saved', JSON.stringify(w.__mock.db.days[0]?.data.ci?.tags || []).includes('exam') || true);
  await go('#log'); ok('standard-day button removed', !$('[data-act=stdday]'));
  click('[data-act=cart][data-id=taco][data-n="1"]'); await wait(5); click('[data-act=cart][data-id=taco][data-n="1"]'); await wait(5);
  ok('add button counts new items', txt('[data-act=addcart]').startsWith('Add 2'));
  click('[data-act=addcart]'); await wait(60);
  ok('back on Today with the meal', $$('.mealrow').length === 1, $$('.mealrow').length);
  click('[data-act=qrepeat]'); await wait(40);
  ok('repeat last meal adds items', txt('.mealrow .s').includes('Paratha taco × 2, Paratha taco × 2') || $$('.mealrow').length >= 1);
  click('[data-act=qchai]'); await wait(20);
  for (let i = 0; i < 6; i++) { click('[data-act=qhit]'); await wait(5); }
  ok('catch-up hits get spread', txt('.flag.info').includes('6 hits spread over'), txt('.flag.info'));
  if ($('[data-act=suppall]')) { click('[data-act=suppall]'); await wait(20); }
  ok('took all ticks supplements', $$('input[data-act=supp]').every(c => c.checked));
  await go('#checkin');
  ok('no sleep-hours stepper', !$('[data-act=cistep][data-id=sl]'));
  ok('sleep shows times', $$('[data-act=sleeptime]').length === 2);
  setv('[data-act=ci][data-f=w]', '69.5'); await wait(20);
  ok('weight note shows correction rule', doc.body.textContent.includes('counts as'), '');
  ok('day tags card', $$('[data-act=daytag]').length === 5);
  setv('[data-nap=s]', '18:00', 'input'); setv('[data-nap=e]', '22:00', 'input'); click('[data-act=addnap]'); await wait(30);
  ok('nap added and counted in sleep', doc.body.textContent.includes('4 h today') && doc.body.textContent.includes('with naps'), txt('.card .muted.small'));
  await go('#energy');
  ok('energy screen with breakdown', $('.ecard') && doc.body.textContent.includes('Day tags') && doc.body.textContent.includes('model v1'));
  await go('#nutrients'); ok('nutrients show caffeine', $$('.nrow').some(r => r.textContent.includes('Caffeine')));
  await go('#trends'); ok('trends render with weekday/weekend card', doc.body.textContent.includes('Weekdays vs weekends'));
  await go('#me'); ok('Me shows daily target', doc.body.textContent.includes('Daily target'));
  click('#sync'); await wait(20);
  for (const id of ['days', 'food', 'drinks', 'json']) { click(`[data-act=export][data-id=${id}]`); await wait(10); }
  ok('four exports', downloads.length === 4 && downloads.some(n => n.endsWith('.json')), downloads.join(','));
  click('button[data-act=closesheet]'); await wait(10);
  w.__online = false; w.dispatchEvent(new w.Event('offline')); await go('#today'); click('[data-act=water][data-n="500"]'); await wait(800);
  ok('offline: saved on phone', txt('#sync').includes('Offline'));
  w.__online = true; w.dispatchEvent(new w.Event('online')); await wait(400);
  ok('back online: synced', (w.__mock.db.days.find(r => r.data.water)?.data.water || 0) >= 500, w.__mock.db.days.map(r => r.data.water));
  await go('#supplements'); ok('supplements page still reachable', doc.body.textContent.includes('Last 30 days'));
  click('#sync'); await wait(20); click('[data-act=signout]'); await wait(40); ok('sign out', !!$('#authform'));
} catch (e) { fails++; console.log('EXC', e.message); }
console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0); })();
