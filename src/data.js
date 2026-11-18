// Food, drink and supplement database. Values per 100 g / 100 ml unless noted.
// ===== Nutrient definitions =====
// t = daily target; kind: 'min' (aim to reach), 'max' (stay under), 'info' (no target)
export const NUTRIENTS = [
  {k:'kcal', n:'Calories', u:'kcal', t:3050, kind:'goal', g:'macro'},
  {k:'p',   n:'Protein', u:'g', t:145, kind:'min', g:'macro'},
  {k:'c',   n:'Carbs', u:'g', t:null, kind:'info', g:'macro'},
  {k:'f',   n:'Fat', u:'g', t:90, kind:'max', g:'macro'},
  {k:'sat', n:'Saturated fat', u:'g', t:34, kind:'max', g:'macro'},
  {k:'fib', n:'Fibre', u:'g', t:35, kind:'min', g:'macro'},
  {k:'sug', n:'Sugars', u:'g', t:null, kind:'info', g:'macro'},
  {k:'chol',n:'Cholesterol', u:'mg', t:300, kind:'max', g:'macro'},
  {k:'na',  n:'Sodium', u:'mg', t:2000, kind:'max', g:'mineral'},
  {k:'k',   n:'Potassium', u:'mg', t:3500, kind:'min', g:'mineral'},
  {k:'ca',  n:'Calcium', u:'mg', t:1000, kind:'min', g:'mineral'},
  {k:'mg',  n:'Magnesium', u:'mg', t:420, kind:'min', g:'mineral'},
  {k:'fe',  n:'Iron', u:'mg', t:8, kind:'min', g:'mineral'},
  {k:'zn',  n:'Zinc', u:'mg', t:11, kind:'min', g:'mineral'},
  {k:'ph',  n:'Phosphorus', u:'mg', t:700, kind:'min', g:'mineral'},
  {k:'se',  n:'Selenium', u:'mcg', t:55, kind:'min', g:'mineral'},
  {k:'io',  n:'Iodine', u:'mcg', t:150, kind:'min', g:'mineral'},
  {k:'vA',  n:'Vitamin A', u:'mcg', t:900, kind:'min', g:'vitamin'},
  {k:'vD',  n:'Vitamin D', u:'mcg', t:15, kind:'min', g:'vitamin'},
  {k:'vE',  n:'Vitamin E', u:'mg', t:15, kind:'min', g:'vitamin'},
  {k:'vK',  n:'Vitamin K', u:'mcg', t:120, kind:'min', g:'vitamin'},
  {k:'vC',  n:'Vitamin C', u:'mg', t:90, kind:'min', g:'vitamin'},
  {k:'b1',  n:'B1 Thiamin', u:'mg', t:1.2, kind:'min', g:'vitamin'},
  {k:'b2',  n:'B2 Riboflavin', u:'mg', t:1.3, kind:'min', g:'vitamin'},
  {k:'b3',  n:'B3 Niacin', u:'mg', t:16, kind:'min', g:'vitamin'},
  {k:'b6',  n:'B6', u:'mg', t:1.3, kind:'min', g:'vitamin'},
  {k:'fol', n:'Folate', u:'mcg', t:400, kind:'min', g:'vitamin'},
  {k:'b12', n:'B12', u:'mcg', t:2.4, kind:'min', g:'vitamin'},
  {k:'cho', n:'Choline', u:'mg', t:550, kind:'min', g:'vitamin'},
  {k:'o3',  n:'Omega-3 (EPA+DHA)', u:'mg', t:250, kind:'min', g:'vitamin'},
  {k:'alc', n:'Alcohol', u:'g', t:null, kind:'info', g:'other'},
];
export const NK = NUTRIENTS.map(x => x.k);

// ===== Ingredients, per 100 g (or 100 ml for drinks) =====
// src: 'label' = pack label (macros); micros are estimates from IFCT 2017 / USDA FoodData Central.
// nova: 1 unprocessed, 2 culinary ingredient, 3 processed, 4 ultra-processed
export const ING = {
  paratha:  {name:'iD Wheat Lachha Paratha', nova:3, v:{kcal:313,p:11.5,c:30.8,f:16,sat:5,fib:4,sug:1,chol:0,na:300,k:200,ca:30,mg:60,fe:2.5,zn:1.6,ph:180,se:20,io:0,vA:0,vD:0,vE:1.5,vK:3,vC:0,b1:0.25,b2:0.08,b3:3,b6:0.2,fol:25,b12:0,cho:15,o3:0}},
  cube:     {name:'Amul Processed Cheese Cube', nova:4, v:{kcal:311,p:20,c:1.5,f:25,sat:16,fib:0,sug:1.5,chol:67,na:1220,k:130,ca:600,mg:25,fe:0.2,zn:2.8,ph:700,se:15,io:30,vA:250,vD:0.3,vE:0.5,vK:2.5,vC:0,b1:0.03,b2:0.35,b3:0.1,b6:0.07,fol:8,b12:1.0,cho:15,o3:0}},
  diced:    {name:'Amul Diced Cheese Blend', nova:3, v:{kcal:289,p:23,c:2,f:21,sat:13,fib:0,sug:2,chol:60,na:400,k:90,ca:650,mg:25,fe:0.3,zn:3.2,ph:450,se:15,io:30,vA:220,vD:0.3,vE:0.5,vK:2.3,vC:0,b1:0.03,b2:0.3,b3:0.1,b6:0.06,fol:10,b12:1.4,cho:15,o3:0}},
  spread:   {name:'Amul Cheese Spread Pepper', nova:4, v:{kcal:277,p:11.5,c:12.8,f:20,sat:13,fib:0,sug:12.8,chol:60,na:900,k:250,ca:300,mg:20,fe:0.3,zn:1.5,ph:600,se:8,io:20,vA:180,vD:0.2,vE:0.4,vK:2,vC:0,b1:0.03,b2:0.3,b3:0.1,b6:0.05,fol:8,b12:0.6,cho:15,o3:0}},
  bread:    {name:"Baker's Loaf High Protein Bread", nova:4, v:{kcal:241.6,p:15.2,c:39.1,f:2.7,sat:0.6,fib:6.2,sug:4,chol:0,na:387,k:250,ca:80,mg:70,fe:3,zn:1.8,ph:220,se:25,io:5,vA:0,vD:0,vE:0.5,vK:2,vC:0,b1:0.35,b2:0.15,b3:4,b6:0.2,fol:50,b12:0,cho:20,o3:0}},
  ghee:     {name:'Country Delight Desi Danedar Ghee', nova:2, v:{kcal:898.5,p:0,c:0,f:99.8,sat:69.6,fib:0,sug:0,chol:256,na:2,k:5,ca:4,mg:0,fe:0,zn:0,ph:3,se:0,io:0,vA:840,vD:1.5,vE:2.8,vK:8.6,vC:0,b1:0,b2:0,b3:0,b6:0,fol:0,b12:0,cho:20,o3:0}},
  ketchup:  {name:'Maggi Hot & Sweet Tomato Chilli Sauce', nova:4, v:{kcal:135,p:0.4,c:33.8,f:0,sat:0,fib:0.5,sug:33.3,chol:0,na:808,k:300,ca:15,mg:15,fe:0.5,zn:0.2,ph:30,se:0,io:0,vA:20,vD:0,vE:1,vK:3,vC:5,b1:0.01,b2:0.05,b3:1,b6:0.1,fol:8,b12:0,cho:10,o3:0}},
  chipotle: {name:'Veeba Chipotle Southwest', nova:4, v:{kcal:259.9,p:3,c:14.5,f:21.1,sat:3.5,fib:0.5,sug:8,chol:0,na:1060,k:80,ca:10,mg:5,fe:0.3,zn:0.1,ph:20,se:1,io:0,vA:30,vD:0,vE:3,vK:30,vC:1,b1:0,b2:0,b3:0.2,b6:0.05,fol:2,b12:0,cho:10,o3:0}},
  mustard:  {name:'Veeba American Mustard', nova:4, v:{kcal:80.6,p:2.8,c:10.6,f:3,sat:0.14,fib:2,sug:3.75,chol:0,na:1840,k:100,ca:50,mg:30,fe:1,zn:0.5,ph:80,se:20,io:0,vA:3,vD:0,vE:0.3,vK:1,vC:0,b1:0.1,b2:0.05,b3:0.5,b6:0.05,fol:7,b12:0,cho:15,o3:0}},
  bdbase:   {name:"Baker's Dozen sourdough pizza base", nova:3, v:{kcal:301.8,p:10.2,c:55.7,f:4.2,sat:0.5,fib:3.2,sug:2.3,chol:0,na:260,k:250,ca:30,mg:80,fe:3,zn:2,ph:250,se:30,io:0,vA:0,vD:0,vE:0.6,vK:2,vC:0,b1:0.3,b2:0.1,b3:4,b6:0.25,fol:40,b12:0,cho:20,o3:0}},
  hfbase:   {name:'The Health Factory Zero Maida pizza base', nova:4, v:{kcal:245.2,p:13.7,c:44.7,f:1.3,sat:0.34,fib:6.3,sug:4.2,chol:0,na:334,k:280,ca:40,mg:90,fe:3.5,zn:2.2,ph:280,se:30,io:0,vA:0,vD:0,vE:0.6,vK:2,vC:0,b1:0.35,b2:0.12,b3:4.5,b6:0.25,fol:45,b12:0,cho:20,o3:0}},
  ragu:     {name:'Ragu Pizza Sauce', nova:3, v:{kcal:48,p:1.6,c:8,f:1.6,sat:0.2,fib:1.6,sug:4.8,chol:0,na:397,k:350,ca:25,mg:18,fe:0.8,zn:0.2,ph:30,se:0.5,io:0,vA:25,vD:0,vE:1.5,vK:10,vC:6,b1:0.03,b2:0.05,b3:1,b6:0.1,fol:10,b12:0,cho:8,o3:0}},
  batter:   {name:'iD Idli & Dosa Batter', nova:1, v:{kcal:143.4,p:5.5,c:26.3,f:1.6,sat:0.68,fib:1.5,sug:0,chol:0,na:92,k:150,ca:25,mg:30,fe:1.2,zn:0.8,ph:100,se:8,io:0,vA:0,vD:0,vE:0.1,vK:1,vC:0,b1:0.1,b2:0.05,b3:1,b6:0.08,fol:30,b12:0,cho:10,o3:0}},
  salt:     {name:'Iodised salt', nova:2, v:{kcal:0,na:38758,io:3000}},
  egg:      {name:'Egg', nova:1, v:{kcal:143,p:12.6,c:0.7,f:9.5,sat:3.1,fib:0,sug:0.4,chol:372,na:142,k:138,ca:56,mg:12,fe:1.75,zn:1.29,ph:198,se:30.7,io:50,vA:160,vD:2,vE:1.05,vK:0.3,vC:0,b1:0.04,b2:0.46,b3:0.07,b6:0.17,fol:47,b12:0.89,cho:294,o3:58}},
  dahi:     {name:'Amul Masti Dahi', nova:1, v:{kcal:65,p:4,c:4.6,f:3.1,sat:2,fib:0,sug:4.6,chol:9,na:46,k:170,ca:130,mg:13,fe:0.1,zn:0.6,ph:110,se:3,io:20,vA:30,vD:0.05,vE:0.06,vK:0.2,vC:0.5,b1:0.04,b2:0.16,b3:0.1,b6:0.04,fol:8,b12:0.4,cho:15,o3:0}},
  banana:   {name:'Banana', nova:1, v:{kcal:89,p:1.09,c:22.8,f:0.33,sat:0.11,fib:2.6,sug:12.2,chol:0,na:1,k:358,ca:5,mg:27,fe:0.26,zn:0.15,ph:22,se:1,io:0,vA:3,vD:0,vE:0.1,vK:0.5,vC:8.7,b1:0.03,b2:0.07,b3:0.67,b6:0.37,fol:20,b12:0,cho:9.8,o3:0}},
  cosmix:   {name:'Cosmix No-Nonsense Plant Protein, Ratnagiri Mango', nova:4, v:{kcal:368.4,p:62.4,c:28.7,f:0.5,sat:0.1,fib:13,sug:0,chol:0,na:790,k:160,ca:160,mg:105,fe:14,zn:5,ph:650,se:13,io:0,vA:0,vD:0,vE:0,vK:0,vC:0,b1:0,b2:0,b3:0,b6:0,fol:0,b12:0,cho:0,o3:0}},
  sattu:    {name:'Chana sattu (local)', nova:1, v:{kcal:385,p:22,c:60,f:5.7,sat:0.6,fib:18,sug:3,chol:0,na:25,k:850,ca:60,mg:140,fe:5.5,zn:3,ph:300,se:8,io:0,vA:3,vD:0,vE:0.8,vK:9,vC:0,b1:0.4,b2:0.2,b3:1.5,b6:0.5,fol:150,b12:0,cho:60,o3:0}},
  // ---- drinks, per 100 ml (kcal include alcohol) ----
  beer5:    {name:'Beer (regular 5%)', nova:3, v:{kcal:43,p:0.46,c:3.6,na:4,k:27,ca:4,mg:6,ph:14,se:0.6,b2:0.025,b3:0.51,b6:0.046,fol:6,alc:3.9}},
  beer8:    {name:'Beer (strong 8%)', nova:3, v:{kcal:66,p:0.6,c:4.5,na:5,k:30,ca:5,mg:8,ph:16,se:0.7,b2:0.03,b3:0.6,b6:0.05,fol:7,alc:6.3}},
  wine:     {name:'Wine (12.5%)', nova:3, v:{kcal:83,p:0.07,c:2.6,sug:0.6,na:5,k:110,ca:8,mg:12,fe:0.4,ph:20,b6:0.05,alc:9.9}},
  whisky:   {name:'Whisky (40%)', nova:4, v:{kcal:222,alc:31.6}},
  rum:      {name:'Rum (40%)', nova:4, v:{kcal:222,alc:31.6}},
  gin:      {name:'Gin (40%)', nova:4, v:{kcal:222,alc:31.6}},
  vodka:    {name:'Vodka (40%)', nova:4, v:{kcal:222,alc:31.6}},
  soda:     {name:'Soda water', nova:1, v:{kcal:0,na:10}},
  cola:     {name:'Cola', nova:4, v:{kcal:42,c:10.6,sug:10.6,na:4,ph:10}},
  water:    {name:'Water', nova:1, v:{kcal:0}},
  sevenup:  {name:'7Up', nova:4, v:{kcal:46,c:11.4,sug:11.4,na:27}},
  oj:       {name:'Tropicana 100% Orange', nova:1, v:{kcal:41,p:0.8,c:9.3,sug:8.3,fib:0.4,na:1,k:200,ca:10,mg:11,vC:28,b1:0.09,fol:30}},
  cran:     {name:'Real Cranberry', nova:4, v:{kcal:56,c:13.6,sug:12.9,na:4.9,k:30,vC:10}},
};

// ===== Foods (one unit each). parts: [ingredient, grams]. param: per-unit option =====
export const FOODS = [
  {id:'taco', name:'Paratha taco', sub:'paratha + cheese cube + ½ tsp ghee + 3 sauces', parts:[['paratha',80],['cube',25],['ghee',2.25],['ketchup',5],['chipotle',5],['mustard',5]]},
  {id:'omelette', name:'Omelette', sub:'eggs + 1 tsp ghee + salt, chilli', param:{key:'eggs', label:'Eggs', def:3, min:1, max:8}, parts:[['ghee',4.5],['salt',0.5]], perParam:[['egg',50]]},
  {id:'toast', name:'Ghee-toast slice', sub:"Baker's Loaf slice + ¼ tsp ghee", parts:[['bread',25],['ghee',1.125]]},
  {id:'spreadtoast', name:'Bread + Pepper Punchy', sub:'ghee-toast slice + 2 tsp spread', parts:[['bread',25],['ghee',1.125],['spread',10]]},
  {id:'smallpizza', name:'Small pizza', sub:'sourdough square + 1 tbsp Ragu + 25 g cheese', parts:[['bdbase',35],['ragu',16],['diced',25]]},
  {id:'bigpizza', step:0.25, name:'Big pizza', sub:'Health Factory base + 2 tbsp Ragu + 50 g cheese', parts:[['hfbase',70],['ragu',32],['diced',50]]},
  {id:'dosa', name:'Dosa', sub:'⅛ pack iD batter + 1 tsp ghee', dosa:true, parts:[['batter',62.5],['ghee',4.5],['salt',0.375]]},
  {id:'boiledegg', name:'Boiled egg', sub:'1 large egg', parts:[['egg',50]]},
  {id:'dahi', step:0.25, name:'Amul Masti Dahi', sub:'400 g cup · ¼ = 100 g', parts:[['dahi',400]]},
  {id:'banana', name:'Banana', sub:'1 medium', parts:[['banana',118]]},
  {id:'cosmix', name:'Cosmix', sub:'1 scoop (38 g)', parts:[['cosmix',38]]},
  {id:'sattu', name:'Sattu', sub:'1 scoop (35 g)', parts:[['sattu',35]]},
];
export const STANDARD_DAY = [
  {f:'omelette', q:1, o:{eggs:3}}, {f:'toast', q:4}, {f:'cosmix', q:1}, {f:'sattu', q:1},
  {f:'dahi', q:1}, {f:'banana', q:2}, {f:'taco', q:5},
];

export const DRINKS = [
  {id:'beer5', name:'Beer', sub:'regular 5%', presets:[330,500,650]},
  {id:'beer8', name:'Beer strong', sub:'8%', presets:[330,500,650]},
  {id:'wine', name:'Wine', sub:'12.5%', presets:[150,300]},
  {id:'whisky', name:'Whisky', sub:'40%', presets:[30,60,90]},
  {id:'rum', name:'Rum', sub:'40%', presets:[30,60,90]},
  {id:'gin', name:'Gin', sub:'40%', presets:[30,60,90]},
  {id:'vodka', name:'Vodka', sub:'40%', presets:[30,60,90]},
];
export const MIXERS = [
  {id:'none', name:'No mixer'}, {id:'soda', name:'Soda'}, {id:'cola', name:'Cola'}, {id:'water', name:'Water'},
  {id:'sevenup', name:'7Up'}, {id:'oj', name:'Orange juice'}, {id:'cran', name:'Cranberry juice'},
];

// ===== Supplements: nutrients per dose =====
export const SUPPS = [
  {id:'ace', name:'Ace Blend multivitamin', dose:'1 capsule', sched:{type:'daily'},
    v:{vA:500, vD:15, vC:80, vE:5, vK:30, b1:1.4, b2:2, b3:14, b6:1.9, fol:300, b12:2.2, zn:8.5, se:40, cho:82}},
  {id:'fish', name:'Tata 1mg 4X Salmon Omega', dose:'1 capsule', sched:{type:'daily'}, v:{o3:600, vE:1}},
  {id:'limcee', name:'Limcee 500', dose:'1 chewable', sched:{type:'daily', until:'2026-12-31'}, v:{vC:500}},
  {id:'d3', name:'Calciquick-D3 60K', dose:'1 capsule', sched:{type:'d3'}, v:{vD:1500}},
  {id:'b12', name:'Methylcobalamin 1500', dose:'2 tablets', sched:{type:'weekly', dow:0}, v:{b12:3000}},
];

export const DEFAULT_CONFIG = {
  targets: {kcal:3050, p:145},
  weightTarget: 70,
  maxGainPerWeek: 0.6,
  waterTargetMl: 3000,
  d3WeeklyUntil: '2026-12-29',
  changes: [],
  upcoming: [],
  bloodwork: {nextDue:null, reports:[]},
};

