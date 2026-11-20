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
  {k:'caf', n:'Caffeine', u:'mg', t:400, kind:'max', g:'stim'},
  {k:'tau', n:'Taurine', u:'mg', t:null, kind:'info', g:'stim'},
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
  // ---- coffee, tea, energy drinks (per 100 ml or 100 g) ----
  espresso: {name:'Espresso', nova:1, v:{kcal:9,p:0.1,k:115,mg:80,b2:0.18,b3:5.2,caf:212}},
  milk:     {name:'Toned milk (3% fat)', nova:1, v:{kcal:58,p:3.1,c:4.7,f:3,sat:1.9,sug:4.7,chol:9,na:50,k:150,ca:120,mg:11,ph:95,zn:0.4,io:15,se:2,vA:30,vD:0.1,b1:0.04,b2:0.18,b3:0.1,b6:0.04,fol:5,b12:0.4,cho:15}},
  sugar:    {name:'Sugar', nova:2, v:{kcal:400,c:100,sug:100}},
  instant:  {name:'Instant coffee powder', nova:3, v:{kcal:353,p:12,c:75,k:3500,mg:330,b3:28,caf:3142}},
  chaipatti:{name:'Tea leaves (CTC), as brewed', nova:1, v:{caf:2000,k:800}},
  blacktea: {name:'Black tea, brewed', nova:1, v:{kcal:1,k:37,caf:20}},
  greentea: {name:'Green tea, brewed', nova:1, v:{kcal:1,k:8,caf:12}},
  redbull:  {name:'Red Bull (India label)', nova:4, v:{kcal:46,c:11,sug:11,na:40,b2:0.2,b3:2.4,caf:30,tau:400}},
  monster:  {name:'Monster Energy (India label)', nova:4, v:{kcal:47,c:12,sug:11,na:80,b3:2.5,b6:0.34,caf:30,tau:400}},
  hell:     {name:'Hell Energy Classic (India label)', nova:4, v:{kcal:46,c:11,sug:11,na:40,b2:0.2,b3:2.4,caf:30,tau:400}},
  // Outside foods: values are PER PORTION (use 100 in parts = 1 portion). See project doc outside-foods-database.md
  domslice: {name:"Domino's Margherita, medium New Hand Tossed (1 slice)", nova:4, v:{kcal:195,p:9.6,c:28.9,sug:0.92,fib:1.1,f:4.6,sat:3,chol:17,na:383,k:99,ca:118,mg:14,fe:0.59,zn:0.9,ph:117,se:14.6,vA:43,vD:0.09,vE:0.6,vK:1.7,vC:0.72,b1:0.05,b2:0.08,b3:0.6,b6:0.04,fol:12,b12:0.51,cho:8}},
  domsticks: {name:"Domino's Garlic Breadsticks (1 serve)", nova:4, v:{kcal:144,p:2.9,c:20.9,sug:0.08,fib:0.75,f:3.9,sat:1.3,chol:4,na:244,k:33,ca:6,mg:6,fe:0.34,zn:0.2,ph:31,se:9.3,vA:14,vD:0.03,vE:0.46,vK:0.42,vC:0.31,b1:0.03,b2:0.01,b3:0.34,b6:0.02,fol:7,b12:0,cho:3}},
  domdip: {name:"Domino's Cheesy Dip (1)", nova:4, v:{kcal:55,p:0.75,c:2.3,sug:0.5,fib:0,f:4.8,sat:2,chol:0,na:250,k:0,ca:20,mg:0,fe:0,zn:0,ph:30,se:0,vA:10,vD:0,vE:0,vK:0,vC:0,b1:0,b2:0,b3:0,b6:0,fol:0,b12:0.05,cho:0}},
  phslice: {name:'Pizza Hut Margherita, medium Pan (1 slice)', nova:4, v:{kcal:230,p:10.1,c:32.2,sug:0.93,fib:1.3,f:6.7,sat:2.5,chol:17,na:453,k:105,ca:119,mg:15,fe:0.66,zn:0.94,ph:123,se:16.7,vA:43,vD:0.09,vE:1.3,vK:2.1,vC:0.72,b1:0.06,b2:0.08,b3:0.68,b6:0.04,fol:13,b12:0.51,cho:8}},
  phgbc: {name:'Pizza Hut Garlic Bread Cheese (1 order, 136 g)', nova:4, v:{kcal:494,p:10.4,c:54.8,sug:1.7,fib:1.5,f:31.7,sat:26.7,chol:58,na:1731,k:84,ca:89,mg:15,fe:0.73,zn:0.81,ph:116,se:20.4,vA:176,vD:0.39,vE:0.57,vK:2,vC:0.93,b1:0.07,b2:0.06,b3:0.66,b6:0.06,fol:15,b12:0.36,cho:12}},
  phstix: {name:'Pizza Hut Loaded Bread Stix (1 order, 210 g)', nova:4, v:{kcal:673,p:16.4,c:113.2,sug:8.1,fib:3.8,f:18.3,sat:3.2,chol:0,na:1301,k:162,ca:42,mg:32,fe:1.7,zn:1,ph:180,se:47.9,vA:8,vD:0,vE:2.5,vK:1.6,vC:0.93,b1:0.17,b2:0.06,b3:1.8,b6:0.09,fol:36,b12:0.04,cho:15}},
  dalmak: {name:'Sadak Chaap Dal Makhani (~500 ml box, ≈520 g)', nova:3, v:{kcal:755,p:25.6,c:67.1,sug:7.5,fib:19.3,f:45,sat:24.6,chol:114,na:2300,k:1121,ca:159,mg:167,fe:6.3,zn:3,ph:497,se:6.7,vA:367,vD:0.67,vE:3.3,vK:13.2,vC:10.7,b1:0.32,b2:0.23,b3:2.6,b6:0.38,fol:311,b12:0.16,cho:106}},
  naan: {name:'Butter naan (1 piece, ~92 g)', nova:3, v:{kcal:322,p:8.37,c:48.39,sug:1.47,fib:1.47,f:10.58,sat:3.77,chol:15,na:326,k:72,ca:18,mg:13,fe:0.66,zn:0.43,ph:68,se:18.86,vA:46,vD:0.09,vE:0.55,vK:0.8,vC:0,b1:0.06,b2:0.04,b3:0.69,b6:0.02,fol:15,b12:0.04,cho:8}},
  rumali: {name:'Rumali roti (1 piece, ~54 g)', nova:3, v:{kcal:98,p:3,c:19.7,sug:0.08,fib:1.6,f:0.7,sat:0.13,chol:0,na:123,k:35,ca:4,mg:9,fe:0.37,zn:0.23,ph:35,se:9.38,vA:0,vD:0,vE:0.18,vK:0.19,vC:0,b1:0.04,b2:0.01,b3:0.42,b6:0.02,fol:7,b12:0,cho:4}},
  tandroti: {name:'Butter tandoori roti (1 piece, ~55 g)', nova:3, v:{kcal:180,p:5.55,c:30.14,sug:0.17,fib:4.5,f:5.23,sat:2.83,chol:12,na:365,k:153,ca:16,mg:58,fe:1.47,zn:1.05,ph:151,se:25.85,vA:36,vD:0.07,vE:0.42,vK:1.15,vC:0,b1:0.21,b2:0.07,b3:2.09,b6:0.17,fol:19,b12:0.01,cho:14}},
  kachori: {name:'Tea Post mini kachori (4 pieces, ~92 g)', nova:3, v:{kcal:380,p:7.43,c:33.44,sug:4.03,fib:2.44,f:24.09,sat:2.87,chol:0,na:658,k:256,ca:18,mg:39,fe:1.27,zn:0.74,ph:102,se:9.66,vA:0,vD:0,vE:4.67,vK:4.35,vC:0,b1:0.13,b2:0.04,b3:0.77,b6:0.1,fol:49,b12:0,cho:23}},
  lays:     {name:"Lay's India's Magic Masala", nova:4, v:{kcal:538,p:6.9,c:53.4,sug:2.5,fib:3,f:33.1,sat:14.5,chol:0,na:993,k:1100,ca:20,mg:50,fe:1.2,zn:0.6,ph:140,se:2,io:0,vA:5,vD:0,vE:3,vK:15,vC:5,b1:0.1,b2:0.1,b3:3.5,b6:0.5,fol:30,b12:0,cho:15,o3:0}},
  unclechips:{name:'Uncle Chipps Spicy Treat', nova:4, v:{kcal:536,p:6.4,c:54.6,sug:2,fib:3,f:32.4,sat:14.6,chol:0,na:868,k:1100,ca:20,mg:50,fe:1.2,zn:0.6,ph:140,se:2,io:0,vA:5,vD:0,vE:3,vK:15,vC:5,b1:0.1,b2:0.1,b3:3.5,b6:0.5,fol:30,b12:0,cho:15,o3:0}},
  cran:     {name:'Real Cranberry', nova:4, v:{kcal:56,c:13.6,sug:12.9,na:4.9,k:30,vC:10}},
};

// ===== Foods (one unit each). parts: [ingredient, grams]. param: per-unit option =====
export const FOODS = [
  // sauces: per-taco amount in teaspoons (1 tsp = 5 g), 0–2, default 1 each
  {id:'taco', name:'Paratha taco', sub:'paratha + cheese cube + ½ tsp ghee + sauces', parts:[['paratha',80],['cube',25],['ghee',2.25]],
    sauces:[{key:'ketchup', label:'Ketchup', g:5, def:1, max:2}, {key:'chipotle', label:'Chipotle', g:5, def:1, max:2}, {key:'mustard', label:'Mustard', g:5, def:1, max:2}]},
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
  {id:'lays', name:"Lay's Magic Masala (blue)", sub:'₹20 pack · 48 g', parts:[['lays',48]]},
  {id:'unclechips', name:'Uncle Chipps Spicy Treat (green)', sub:'₹20 pack · 48 g', parts:[['unclechips',48]]},
  // ===== Outside foods (out:true) =====
  {id:'domslice', out:true, step:1, name:"Domino's Margherita", sub:'medium · per slice · 6 slices = whole (1,170 kcal)', parts:[['domslice',100]]},
  {id:'phslice', out:true, step:1, name:'Pizza Hut Margherita', sub:'medium Pan · per slice · 6 slices = whole (1,377 kcal)', parts:[['phslice',100]]},
  {id:'domsticks', out:true, name:"Domino's Garlic Breadsticks", sub:'per serve · 1 pack = 2 serves', parts:[['domsticks',100]]},
  {id:'domdip', out:true, step:1, name:"Domino's Cheesy Dip", sub:'1 dip', parts:[['domdip',100]]},
  {id:'phgbc', out:true, name:'Pizza Hut Garlic Bread Cheese', sub:'1 order (136 g)', parts:[['phgbc',100]]},
  {id:'phstix', out:true, name:'Pizza Hut Loaded Bread Stix', sub:'1 order (210 g)', parts:[['phstix',100]]},
  {id:'dalmak', out:true, step:0.25, name:'Sadak Chaap Dal Makhani', sub:'per ~500 ml box · ¼ = quarter box', parts:[['dalmak',100]]},
  {id:'naan', out:true, name:'Butter naan', sub:'per piece', parts:[['naan',100]]},
  {id:'rumali', out:true, name:'Rumali roti', sub:'per piece', parts:[['rumali',100]]},
  {id:'tandroti', out:true, name:'Butter tandoori roti', sub:'per piece', parts:[['tandroti',100]]},
  {id:'kachori', out:true, step:0.25, name:'Tea Post mini kachori', sub:'per order of 4 · ¼ = 1 kachori', parts:[['kachori',100]]},
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
// Coffee, tea and energy drinks: one serving each. parts in ml (liquids) or g (powders).
// shots: espresso drinks can take 1–3 shots (30 ml each). sugar: teaspoons asked every time (4 g each).
export const CAFF = [
  {id:'esp1', cat:'coffee', name:'Espresso', sub:'single shot, 30 ml', parts:[['espresso',30]]},
  {id:'esp2', cat:'coffee', name:'Double espresso', sub:'2 shots, 60 ml', parts:[['espresso',60]]},
  {id:'americano', cat:'coffee', name:'Americano', sub:'espresso + hot water', shots:2, parts:[]},
  {id:'cappuccino', cat:'coffee', name:'Cappuccino', sub:'espresso + 150 ml milk', shots:1, parts:[['milk',150]]},
  {id:'latte', cat:'coffee', name:'Latte', sub:'espresso + 220 ml milk', shots:1, parts:[['milk',220]]},
  {id:'iced', cat:'coffee', name:'Iced coffee', sub:'espresso + 60 ml milk, ice', shots:2, parts:[['milk',60]]},
  {id:'coldcoffee', cat:'coffee', name:'Cold coffee', sub:'3 g instant + 200 ml milk, blended', parts:[['instant',3],['milk',200]]},
  {id:'chai', cat:'tea', name:'Chai', sub:'1 cup: 75 ml milk + tea leaves', parts:[['chaipatti',2],['milk',75]]},
  {id:'blacktea', cat:'tea', name:'Black tea', sub:'200 ml, no milk', parts:[['blacktea',200]]},
  {id:'greentea', cat:'tea', name:'Green tea', sub:'200 ml', parts:[['greentea',200]]},
  {id:'redbull', cat:'energy', name:'Red Bull', sub:'250 ml can', sizes:[250], parts:[['redbull',250]], nosugar:true},
  {id:'monster', cat:'energy', name:'Monster', sub:'350 ml can', sizes:[350,500], parts:[['monster',350]], nosugar:true},
  {id:'hell', cat:'energy', name:'Hell', sub:'250 ml can', sizes:[250], parts:[['hell',250]], nosugar:true},
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
  {id:'b12', name:'Methylcobalamin 1500', dose:'1 tablet', sched:{type:'daily', from:'2026-11-21'}, v:{b12:1500}}, // daily until the Feb 2027 retest (was 2 tablets on Sundays)
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

