(function(root){
  'use strict';
  const VERSION=6;
  const WORLD={w:3000,h:2160};
  const OBSTACLES=[{x:310,y:250,w:310,h:180,type:'building'},{x:1460,y:220,w:370,h:200,type:'building'},{x:300,y:1130,w:310,h:290,type:'building'},{x:1690,y:1190,w:340,h:230,type:'building'},{x:830,y:520,w:156,h:84,type:'container'},{x:1450,y:740,w:92,h:210,type:'container'},{x:720,y:930,w:180,h:76,type:'container'},{x:1270,y:1210,w:230,h:84,type:'container'},{x:1820,y:590,w:110,h:110,type:'crates'},{x:1030,y:280,w:110,h:95,type:'crates'},{x:1000,y:1045,w:75,h:75,type:'crates'},{x:1310,y:530,w:85,h:85,type:'crates'},{x:460,y:690,w:120,h:66,type:'barricade'},{x:1960,y:920,w:120,h:66,type:'barricade'},{x:830,y:1430,w:150,h:66,type:'barricade'},
    {x:2330,y:250,w:370,h:260,type:'building'},{x:2420,y:1590,w:330,h:220,type:'building'},{x:460,y:1790,w:290,h:200,type:'building'},{x:1980,y:1810,w:160,h:86,type:'container'},{x:2600,y:1130,w:150,h:86,type:'container'},
    {x:640,y:845,w:116,h:53,type:'car',paint:'#3c6770'},{x:2030,y:843,w:120,h:55,type:'car',paint:'#774d41'},{x:2640,y:929,w:120,h:54,type:'car',paint:'#66754e'},{x:1140,y:1640,w:56,h:119,type:'car',paint:'#c1aa76'},{x:2770,y:1290,w:115,h:60,type:'car',paint:'#627a82'}];
  const WEAPONS={
    pistol:{name:'Пистолет · 9 мм',price:0,damage:24,interval:.24,speed:1.2,mag:14,reload:1.1,pellets:1,spread:.022,range:920,ammo:'pistol',description:'Стартовое оружие. Бесконечный запас 9 мм; нужна только перезарядка.'},
    ak:{name:'АК-47 · 7,62 мм',price:240,damage:34,interval:.105,speed:1,mag:30,reload:1.65,pellets:1,spread:.03,range:1080,ammo:'rifle',description:'Автоматический огонь. Отдельные патроны 7,62 мм.'},
    rifle:{name:'Тяжёлая винтовка · 12,7 мм',price:560,damage:175,interval:.7,speed:.72,mag:6,reload:2.2,pellets:1,spread:.008,range:1500,ammo:'heavy',description:'Пробивает броню. Замедляет бойца на 28%.'},
    shotgun:{name:'Дробовик · 12 калибр',price:380,damage:40,interval:.75,speed:.93,mag:8,reload:2,pellets:8,spread:.19,range:470,ammo:'shell',description:'8 дробин по 40 урона. До 320 в упор: обычный мутант падает с одного выстрела.'},
    flame:{name:'Огнемёт «Факел»',price:620,damage:10,interval:.08,speed:.9,mag:0,reload:0,pellets:0,spread:.32,range:370,ammo:'fuel',description:'Длинная струя огня. Поджигает мутантов. Нужно топливо.'},
    hmg:{name:'Крупнокалиберный пулемёт «Гром»',price:1400,damage:68,interval:.06,speed:.43,mag:80,reload:3.4,pellets:1,spread:.125,range:1280,ammo:'belt',description:'Быстрый огонь, большой урон и разброс. Скорость −57%. Дорогие ленты 12,7 мм.'},
    smg:{name:'Пистолет-пулемёт «Вектор»',price:380,damage:25,interval:.062,speed:1.1,mag:40,reload:1.4,pellets:1,spread:.07,range:780,ammo:'light',description:'Манёвренность и скорострельность. Отдельные патроны 9×19 для ПП.'},
    dmr:{name:'Карабин «Сокол»',price:460,damage:87,interval:.32,speed:.9,mag:16,reload:1.8,pellets:1,spread:.012,range:1380,ammo:'rifle',description:'Точный полуавтоматический карабин с оптикой. Боезапас 7,62 мм.'},
    superShotgun:{name:'Дробовик «Цербер» · 12 калибр',price:1150,damage:48,interval:.95,speed:.82,mag:6,reload:2.5,pellets:14,spread:.23,range:560,ammo:'shell',description:'14 дробин по 48 урона. До 672 урона в упор. Тяжёлый штурмовой дробовик.'},
    hammer:{name:'Полевой молоток',price:85,damage:12,interval:.45,speed:1.08,mag:0,reload:0,pellets:0,spread:.8,range:102,ammo:null,description:'ЛКМ: улучшение или удар. ПКМ: ремонт. 35 использований.'}
  };
  const AMMO={light:{name:'9×19 ПП',pickup:'ammoLight',amount:60,cap:480,color:'#e4bd70'},belt:{name:'Лента 12,7 мм',pickup:'ammoBelt',amount:80,cap:480,color:'#d6aeee'},rifle:{name:'7,62 мм',pickup:'ammoRifle',amount:50,cap:420,color:'#a4d477'},heavy:{name:'12,7 мм',pickup:'ammoHeavy',amount:12,cap:120,color:'#c3b3f1'},shell:{name:'12 калибр',pickup:'ammoShell',amount:16,cap:160,color:'#f69a77'}};
  const GRENADES={flash:{name:'Флешка',weight:14,price:30,color:'#bde5f5'},frag:{name:'Осколочная',weight:7,price:45,color:'#cab779'},molotov:{name:'Молотов',weight:5,price:50,color:'#fb9858'},shock:{name:'Тесла',weight:2,price:95,color:'#85d9ff'}};
  const GOODS={shuriken:{name:'Сюрикены ×5',price:35,description:'Метательные звёзды. 125 урона, пробивают до трёх целей и дважды отскакивают от стен.'},boards:{name:'Доски · 800 HP',price:40,description:'Стреляй сквозь них. Пять уровней: от дерева до композита. Улучшай молотком.'},door:{name:'Дверь · 1100 HP',price:75,description:'Бойцы проходят, мутанты ломают. Доступны улучшения.'},vest:{name:'Бронежилет · 100 HP',price:110,description:'Отдельная броня. Поглощает урон, снижая его на 35%.'},fuel:{name:'Топливо ×60',price:40,description:'Для огнемёта «Факел».'},med:{name:'Аптечка +30',price:45,description:'Восстанавливает здоровье бойца.'}};
  const BUILD_ITEMS=[{id:'boards',stock:'boards',name:'Доски',max:8},{id:'door',stock:'doors',name:'Дверь',max:6},{id:'turret',stock:'turrets',name:'Страж',max:4},{id:'turretHeavy',stock:'heavyTurrets',name:'Бастион',max:3}];
  const ENEMY_ORDER=['walker','runner','spitter','medic','exploder','tank','splitter','armored','stalker','toxic','leaper','screamer','healer','giant','robot'];
  const MODES={
    easy:{name:'Лёгкий',hp:.8,speed:.9,damage:.8,enemies:['walker','runner','spitter','medic','exploder','tank','splitter','armored','leaper','toxic'],bosses:['hook','charge','leap','brood'],description:'10 видов мутантов, 4 вида боссов. Урон и здоровье врагов ниже.'},
    normal:{name:'Средний',hp:1,speed:1,damage:1,enemies:ENEMY_ORDER.slice(0,13),bosses:['hook','charge','leap','storm','brood','necromancer'],description:'13 видов мутантов, 6 видов боссов. Обычный баланс боя.'},
    hard:{name:'Сложный',hp:1.35,speed:1.14,damage:1.25,enemies:ENEMY_ORDER,bosses:['hook','charge','leap','storm','brood','necromancer','burrower','arachnid'],description:'Все 15 видов, роботы и гиганты. Все 8 боссов, усиленные враги.'}
  };
  for(const [key,a]of Object.entries(AMMO))GOODS[a.pickup]={name:`${a.name} ×${a.amount}`,price:key==='belt'?180:key==='heavy'?70:40,description:'Отдельный боезапас. Подбирай такие же пачки на карте.'};
  for(const [key,g]of Object.entries(GRENADES))GOODS[key]={name:g.name+' ×1',price:g.price,description:key==='shock'?'Цепная молния до 8 мутантов: 180 урона, роботам ×3,5.':key==='flash'?'Заморозка ближайших мутантов на 2 секунды.':key==='molotov'?'Горящее пятно на 6 секунд.':'Взрыв с уроном по площади.'};
  const STATS={
    walker:{name:'Бродяга',hp:75,r:19,speed:76,damage:12,color:'#839f79'},runner:{name:'Бегун',hp:48,r:15,speed:138,damage:9,color:'#b3917c'},tank:{name:'Громила',hp:235,r:29,speed:58,damage:24,color:'#879363'},spitter:{name:'Плевун',hp:95,r:19,speed:66,damage:11,color:'#aeb665'},exploder:{name:'Вздувшийся',hp:65,r:22,speed:104,damage:30,color:'#c18b60'},armored:{name:'Панцирник',hp:175,r:24,speed:73,damage:17,color:'#91a6a5'},
    splitter:{name:'Носитель',hp:140,r:25,speed:75,damage:15,color:'#b77d8e'},larva:{name:'Паразит',hp:38,r:11,speed:205,damage:8,color:'#de93a2'},giant:{name:'Скоростной гигант',hp:330,r:36,speed:148,damage:28,color:'#a39770'},robot:{name:'Сторожевой автомат',hp:155,r:24,speed:98,damage:19,color:'#899da8',armor:190},
    stalker:{name:'Тень',hp:70,r:17,speed:160,damage:14,color:'#768894'},screamer:{name:'Глашатай',hp:130,r:23,speed:80,damage:13,color:'#b6a1c3'},healer:{name:'Регенератор',hp:160,r:24,speed:69,damage:14,color:'#7cae91'},leaper:{name:'Прыгун',hp:110,r:20,speed:106,damage:21,color:'#b5a07b'},toxic:{name:'Чумной',hp:120,r:23,speed:88,damage:15,color:'#adc16a'},boss:{name:'Босс',hp:1450,r:45,speed:70,damage:33,color:'#ad7f6f'}
  };
  STATS.medic={name:'Санитар',hp:105,r:21,speed:83,damage:10,color:'#79b9a6'};
  STATS.spider={name:'Паучонок',hp:24,r:10,speed:173,damage:5,color:'#b8a0be'};
  const BOSSES=[{name:'Крюк — Собиратель',ability:'hook',color:'#8f9fb7'},{name:'Разгон — Крушитель',ability:'charge',color:'#bd7659'},{name:'Кратер — Прыгун',ability:'leap',color:'#a194bc'},{name:'Гроза — Проводник',ability:'storm',color:'#70b2bb'},{name:'Матка — Пожиратель',ability:'brood',color:'#bd88a4'},{name:'Мортис — Некромант',ability:'necromancer',color:'#87c9a3'},{name:'Могильщик — Метатель',ability:'burrower',color:'#c5a277'},{name:'Арахна — Королева пауков',ability:'arachnid',color:'#ba9ec8'}];

  const TURRETS={turret:{name:'Страж',hp:2200,damage:24,interval:.3,range:550,barrels:1,limit:10},turretHeavy:{name:'Бастион',hp:5000,damage:40,interval:.6,range:780,barrels:2,limit:5},turretFlame:{name:'Пекло',hp:3500,damage:13,interval:.2,range:410,barrels:1,limit:5}};
  const BARRICADE_TIERS=[{name:'Дерево',hp:1,cost:0},{name:'Камень',hp:2.5,cost:120},{name:'Железо',hp:5,cost:240},{name:'Сталь',hp:8,cost:450},{name:'Композит',hp:12,cost:800}];
  GOODS.turret={name:'Турель «Страж» · 2200 HP',price:2600,description:'Лимит 10 на отряд. 24 урона, дальность 550. Улучшается и получает броню через своё меню.'};
  GOODS.turretHeavy={name:'Турель «Бастион» · 5000 HP',price:6200,description:'Два ствола по 40 урона. Лимит 5 на отряд. Боссы устойчивы к огню турелей.'};
  GOODS.turretFlame={name:'Огнемётная турель «Пекло»',price:3900,description:'3500 HP. Поджигает группу врагов на 410 единиц. Лимит 5 на отряд.'};
  GOODS.spikes={name:'Шипы · 1200 HP',price:160,description:'Блокируют мутантов и ранят их при ударе. Пять уровней прочности.'};
  GOODS.wire={name:'Колючая ограда · 950 HP',price:130,description:'Замедляет ближайших мутантов и наносит ответный урон. Стреляй сквозь неё.'};
  GOODS.flashlight={name:'Тактический фонарик',price:140,description:'Световой конус ночью. Не расходуется. Включение назначается в управлении.'};
  GOODS.nvg={name:'Прибор ночного видения',price:650,description:'180 секунд работы. Таймер расходуется только при включении, даже днём. Можно выключать.'};
  BUILD_ITEMS.find(b=>b.id==='turret').max=10;BUILD_ITEMS.find(b=>b.id==='turretHeavy').max=5;
  BUILD_ITEMS.push({id:'turretFlame',stock:'flameTurrets',name:'Пекло',max:5},{id:'spikes',stock:'spikes',name:'Шипы',max:8},{id:'wire',stock:'wire',name:'Колючая ограда',max:8});
  STATS.hellwalker={name:'Угольник',hp:240,r:25,speed:104,damage:20,color:'#d07347'};
  STATS.lavspitter={name:'Лавоплюй',hp:280,r:27,speed:84,damage:21,color:'#ef9b43'};
  STATS.lavatrail={name:'Пепельный след',hp:310,r:28,speed:110,damage:19,color:'#b85b44'};
  STATS.totemist={name:'Адский тотемщик',hp:550,r:30,speed:115,damage:27,color:'#ad6687'};
  STATS.nightstalker={name:'Ночной охотник',hp:190,r:21,speed:195,damage:25,color:'#8191cf'};
  STATS.nightbrute={name:'Ночной потрошитель',hp:420,r:32,speed:140,damage:32,color:'#7f679b'};
  STATS.nightnecro={name:'Ночной некромант',hp:300,r:25,speed:106,damage:18,color:'#7fd5c4'};
  MODES.easy.enemies.push('hellwalker');MODES.normal.enemies.push('hellwalker','lavspitter','lavatrail','totemist');MODES.hard.enemies.push('hellwalker','lavspitter','lavatrail','totemist');
  MODES.easy.description='11 видов, 4 босса. Урон и здоровье врагов ниже. Ночью появляются охотники.';
  MODES.normal.description='17 видов, 6 боссов. Адские мутанты и ночные некроманты.';
  MODES.hard.description='19 видов, все 8 боссов. Роботы, адские и усиленные ночные мутанты.';

  const api={TURRETS,BARRICADE_TIERS,VERSION,WORLD,OBSTACLES,WEAPONS,AMMO,GRENADES,GOODS,STATS,BOSSES,MODES,BUILD_ITEMS};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GameContent=api;
})(typeof window!=='undefined'?window:globalThis);
