(function(){
'use strict';

const DATA = window.UACSSWP_DATA || {};
const SCRIPT_ASSET = (()=>{try{const s=[...document.scripts].find(x=>x.src&&x.src.indexOf('uac-son-siginak-wp.js')>-1); return s?s.src.replace(/assets\/js\/uac-son-siginak-wp\.js.*$/,'assets/'):'';}catch(e){return ''}})();
const ASSET = String(DATA.assetBase || SCRIPT_ASSET || './assets/').replace(/\/?$/, '/');
const REST = DATA.rest || '/wp-json/uac-son-siginak/wp';

const $ = (id)=>document.getElementById(id);
const shell=$('uacss5-shell'), canvas=$('uacss5-canvas');
if(!shell || !canvas) return;
const ctx=canvas.getContext('2d',{alpha:false});

const ui={
  hp:$('uacss5-hp'), hpbar:$('uacss5-hpbar'), score:$('uacss5-score'), time:$('uacss5-time'), bossTime:$('uacss5-boss-time'), kills:$('uacss5-kills'), bosses:$('uacss5-bosses'), chests:$('uacss5-chests'), level:$('uacss5-level'), weapon:$('uacss5-weapon'),
  sound:$('uacss5-sound'), toast:$('uacss5-toast'), hint:$('uacss5-hint'), start:$('uacss5-start'), gameover:$('uacss5-gameover'), result:$('uacss5-result'), leaderboard:$('uacss5-leaderboard'), restart:$('uacss5-restart'), startBtn:$('uacss5-start-btn'), name:$('uacss5-name'), stick:$('uacss5-stick'), action:$('uacss5-action'), fullscreen:$('uacss5-fullscreen'), tactical:$('uacss5-tactical'), task:$('uacss5-task'), rotate:$('uacss5-rotate'), profile:$('uacss5-profile'), perf:$('uacss5-perf')
};

const paths={
  tiles:{grass:'img/tiles/ground_grass.png',dirt:'img/tiles/ground_dirt.png',asphalt:'img/tiles/ground_asphalt.png',rubble:'img/tiles/ground_rubble.png',dark:'img/tiles/ground_dark.png',roadH:'img/tiles/road_horizontal.png',roadV:'img/tiles/road_vertical.png'},
  buildings:{house:'img/buildings/house.png',warehouse:'img/buildings/warehouse.png',market:'img/buildings/market.png',lab:'img/buildings/lab.png',bunker:'img/buildings/bunker.png',tower:'img/buildings/tower.png'},
  players:['img/characters/player_0.png','img/characters/player_1.png','img/characters/player_2.png','img/characters/player_3.png'],
  enemies:{walker:'img/enemies/walker.png',crawler:'img/enemies/crawler.png',brute:'img/enemies/brute.png',hound:'img/enemies/hound.png'},
  bosses:{reactor:'img/bosses/reactor.png',machine:'img/bosses/machine.png',butcher:'img/bosses/butcher.png',plague:'img/bosses/plague.png',colossus:'img/bosses/colossus.png',queen:'img/bosses/queen.png',phantom:'img/bosses/phantom.png'},
  items:{pulse:'img/items/pulse.png',scatter:'img/items/scatter.png',arc:'img/items/arc.png',bolt:'img/items/bolt.png',smg:'img/items/smg.png',sniper:'img/items/sniper.png',plasma:'img/items/plasma.png',frost:'img/items/frost.png',flame:'img/items/flame.png',mine:'img/items/mine.png',grenade:'img/items/grenade.png',minigun:'img/items/minigun.png',medkit:'img/items/medkit.png',chest:'img/items/chest.png',shield:'img/items/shield.png',helmet:'img/items/helmet.png',bag:'img/items/bag.png',drink:'img/items/drink.png',drone:'img/items/drone.png'},
  props:{crate:'img/props/crate.png',barrel:'img/props/barrel.png',couch:'img/props/couch.png',table:'img/props/table.png',shelf:'img/props/shelf.png',bed:'img/props/bed.png',locker:'img/props/locker.png',computer:'img/props/computer.png',door:'img/props/door.png'}
};
const imgs={};
let assetsReady=false, loadingPromise=null;

function flatten(obj,prefix='',out=[]){
  if(Array.isArray(obj)){obj.forEach((v,i)=>out.push([prefix+i,v])); return out;}
  Object.keys(obj).forEach(k=>{
    const v=obj[k];
    if(typeof v==='string') out.push([prefix+k,v]);
    else flatten(v,prefix+k+'.',out);
  });
  return out;
}
function setPath(target,key,img){
  const parts=key.split('.'); let ref=target;
  for(let i=0;i<parts.length-1;i++){ if(!ref[parts[i]]) ref[parts[i]]=isFinite(parts[i+1])?[]:{}; ref=ref[parts[i]]; }
  ref[parts[parts.length-1]]=img;
}
function loadAssets(){
  if(assetsReady) return Promise.resolve();
  if(loadingPromise) return loadingPromise;
  const files=flatten(paths);
  let failed=0;
  loadingPromise=Promise.all(files.map(([k,p])=>new Promise(resolve=>{
    const im=new Image(); im.decoding='async'; im.loading='eager';
    let triedFallback=false;
    im.onload=()=>{setPath(imgs,k,im); resolve();};
    im.onerror=()=>{
      if(!triedFallback && SCRIPT_ASSET && SCRIPT_ASSET!==ASSET){triedFallback=true; im.src=SCRIPT_ASSET+p+'?v='+(DATA.version||'5.4.0'); return;}
      failed++; console.warn('Son Sığınak asset yüklenemedi:',p,'base:',ASSET); resolve();
    };
    im.src=ASSET+p+'?v='+(DATA.version||'5.4.0');
  }))).then(()=>{assetsReady=true; if(failed>0)console.warn('Son Sığınak: '+failed+' görsel yüklenemedi. Eklenti/cache yolunu kontrol et.');});
  return loadingPromise;
}

const WP_MP3_FALLBACKS={
  shoot:'https://ultiatomcore.com/wp-content/uploads/2026/04/driken5482-retro-laser-1-236669.mp3',
  shotgun:'https://ultiatomcore.com/wp-content/uploads/2026/04/driken5482-retro-laser-1-236669.mp3',
  hit:'https://ultiatomcore.com/wp-content/uploads/2026/04/hit.mp3',
  hurt:'https://ultiatomcore.com/wp-content/uploads/2026/04/hit.mp3',
  pickup:'https://ultiatomcore.com/wp-content/uploads/2026/04/hit.mp3',
  chest:'https://ultiatomcore.com/wp-content/uploads/2026/04/hit.mp3',
  door:'https://ultiatomcore.com/wp-content/uploads/2026/04/hit.mp3',
  start:'https://ultiatomcore.com/wp-content/uploads/2026/04/driken5482-retro-laser-1-236669.mp3',
  gameover:'https://ultiatomcore.com/wp-content/uploads/2026/04/freesound_community-explosion-bomb-39205.mp3',
  boss_spawn:'https://ultiatomcore.com/wp-content/uploads/2026/04/freesound_community-explosion-bomb-39205.mp3',
  world_loop:'https://ultiatomcore.com/wp-content/uploads/2026/04/idoberg-deep-space-loop-401165.mp3',
  interior_loop:'https://ultiatomcore.com/wp-content/uploads/2026/04/idoberg-deep-space-loop-401165.mp3',
  boss_loop:'https://ultiatomcore.com/wp-content/uploads/2026/04/idoberg-deep-space-loop-401165.mp3'
};
let ssVolRaw=parseInt(localStorage.getItem('uacss5_volume')||'70',10);
if(isNaN(ssVolRaw)||ssVolRaw<0||ssVolRaw>100) ssVolRaw=70;
let ssMuted=localStorage.getItem('uacss5_muted')==='true';
if(!ssMuted&&ssVolRaw===0) ssVolRaw=70;
const audio={
  muted:ssMuted,
  vol:ssMuted?0:ssVolRaw,
  lastVol:ssVolRaw>0?ssVolRaw:70,
  current:null,
  els:{},
  baseVol(n){return n.includes('boss')?.58:(n.includes('loop')?.48:.65);},
  effVol(n){return this.muted?0:Math.max(0,Math.min(1,(this.vol/100)*this.baseVol(n)));},
  init(){
    const list=['shoot','shotgun','hit','hurt','pickup','chest','door','gameover','start','boss_spawn','world_loop','interior_loop','boss_loop'];
    list.forEach(n=>{
      const a=new Audio(ASSET+'audio/'+n+'.wav');
      a.preload='auto';
      if(n.includes('loop')) a.loop=true;
      a.volume=this.effVol(n);
      a.muted=this.muted||this.vol<=0;
      let triedFb=false;
      a.addEventListener('error',()=>{
        if(!triedFb&&WP_MP3_FALLBACKS[n]){
          triedFb=true;
          a.src=WP_MP3_FALLBACKS[n];
          try{a.load();}catch(e){}
        }
      });
      this.els[n]=a;
    });
  },
  applyVolume(){
    Object.keys(this.els).forEach(n=>{
      const a=this.els[n];
      if(!a) return;
      try{
        a.volume=this.effVol(n);
        a.muted=this.muted||this.vol<=0;
      }catch(e){}
    });
  },
  unlock(){this.applyVolume(); Object.values(this.els).forEach(a=>{try{if(a.readyState===0)a.load();}catch(e){}});},
  play(n){if(this.muted||this.vol<=0||!this.els[n])return; try{const a=this.els[n]; a.volume=this.effVol(n); a.muted=false; a.currentTime=0; a.play().catch(()=>{});}catch(e){}},
  music(n){if(this.muted||this.vol<=0)return; const a=this.els[n]; if(!a)return; if(this.current&&this.current!==a){try{this.current.pause();}catch(e){}} this.current=a; try{a.volume=this.effVol(n); a.muted=false; if(a.paused){a.currentTime=0; a.play().catch(()=>{});}}catch(e){}},
  stop(){if(this.current){try{this.current.pause();}catch(e){}} this.current=null;}
};
audio.init();

const weapons={
  pulse:{name:'Pulse Tabancası',img:'pulse',rate:.26,range:395,speed:760,damage:15,spread:0,shots:1,color:'#00f5ff',evolve:'dualPulse'},
  dualPulse:{name:'Çift Pulse',img:'pulse',rate:.22,range:410,speed:800,damage:17,spread:.09,shots:2,color:'#00f5ff',evolve:'chainPulse'},
  chainPulse:{name:'Zincir Pulse',img:'pulse',rate:.20,range:430,speed:830,damage:20,spread:.06,shots:2,color:'#7dd3fc',chain:1},
  smg:{name:'Seri SMG',img:'smg',rate:.115,range:335,speed:820,damage:7,spread:.10,shots:1,color:'#67e8f9',evolve:'stormSmg'},
  stormSmg:{name:'Fırtına SMG',img:'smg',rate:.085,range:355,speed:860,damage:9,spread:.13,shots:1,color:'#67e8f9'},
  minigun:{name:'Minigun',img:'minigun',rate:.105,range:360,speed:850,damage:5.2,spread:.18,shots:2,color:'#f8fafc',xpScale:2.25,levelBonus:.09,levelCap:1.15,evolve:'warMinigun'},
  warMinigun:{name:'Savaş Minigun',img:'minigun',rate:.082,range:395,speed:900,damage:6.4,spread:.20,shots:3,color:'#ffe600',xpScale:2.65,levelBonus:.105,levelCap:1.35},
  scatter:{name:'Scatter Tüfek',img:'scatter',rate:.62,range:300,speed:675,damage:11,spread:.34,shots:5,color:'#ffe600',evolve:'wideScatter'},
  wideScatter:{name:'Geniş Scatter',img:'scatter',rate:.58,range:320,speed:700,damage:12,spread:.42,shots:6,color:'#ffe600'},
  sniper:{name:'Keskin Nişancı',img:'sniper',rate:1.05,range:650,speed:1080,damage:58,spread:0,shots:1,color:'#f8fafc',pierce:2,evolve:'railSniper'},
  railSniper:{name:'Ray Keskin',img:'sniper',rate:.98,range:720,speed:1180,damage:76,spread:0,shots:1,color:'#e0f2fe',pierce:3},
  arc:{name:'Arc Işını',img:'arc',rate:.42,range:380,speed:745,damage:18,spread:.07,shots:2,color:'#aa00ff',evolve:'arcStorm'},
  arcStorm:{name:'Arc Fırtınası',img:'arc',rate:.38,range:410,speed:790,damage:21,spread:.11,shots:3,color:'#c084fc',chain:1},
  plasma:{name:'Plazma Topu',img:'plasma',rate:.85,range:420,speed:610,damage:28,spread:.02,shots:1,color:'#c026d3',aoe:58,evolve:'novaPlasma'},
  novaPlasma:{name:'Nova Plazma',img:'plasma',rate:.80,range:455,speed:640,damage:35,spread:.02,shots:1,color:'#e879f9',aoe:76},
  frost:{name:'Buz Işını',img:'frost',rate:.34,range:380,speed:710,damage:10,spread:.04,shots:2,color:'#7dd3fc',slow:.42,evolve:'cryoBeam'},
  cryoBeam:{name:'Kriyo Işın',img:'frost',rate:.30,range:420,speed:745,damage:13,spread:.05,shots:2,color:'#bae6fd',slow:.62},
  flame:{name:'Alev Püskürtücü',img:'flame',rate:.24,range:225,speed:500,damage:8,spread:.24,shots:4,color:'#fb923c',burn:.55,evolve:'inferno'},
  inferno:{name:'Inferno',img:'flame',rate:.22,range:245,speed:520,damage:10,spread:.28,shots:5,color:'#fdba74',burn:.8},
  bolt:{name:'Bio Bolt',img:'bolt',rate:.76,range:500,speed:890,damage:42,spread:0,shots:1,color:'#00ff88',evolve:'toxicBolt'},
  toxicBolt:{name:'Toksik Bolt',img:'bolt',rate:.70,range:530,speed:930,damage:50,spread:0,shots:1,color:'#86efac',poison:.85}
};
const enemyDefs={
  walker:{hp:64,speed:76,damage:9,r:18,score:16,img:'walker'}, crawler:{hp:48,speed:126,damage:8,r:16,score:20,img:'crawler'}, brute:{hp:155,speed:50,damage:15,r:26,score:42,img:'brute'}, hound:{hp:58,speed:146,damage:10,r:17,score:22,img:'hound'}
};
const bossDefs={reactor:{hp:2800,speed:45,damage:24,r:48,img:'reactor'},machine:{hp:2450,speed:52,damage:21,r:45,img:'machine'},butcher:{hp:3200,speed:40,damage:27,r:54,img:'butcher'},plague:{hp:2700,speed:48,damage:19,r:46,img:'plague'},colossus:{hp:3650,speed:35,damage:29,r:60,img:'colossus'},queen:{hp:2950,speed:54,damage:22,r:50,img:'queen'},phantom:{hp:2380,speed:66,damage:20,r:44,img:'phantom'}};
Object.assign(weapons.pulse,{rate:.34,damage:9,range:360});
Object.assign(weapons.dualPulse,{rate:.32,damage:9,range:370});
Object.assign(weapons.chainPulse,{rate:.30,damage:10,range:385});
Object.assign(weapons.smg,{rate:.135,damage:4.6,range:300,spread:.13});
Object.assign(weapons.stormSmg,{rate:.12,damage:5.2,range:320,spread:.15});
Object.assign(weapons.scatter,{rate:.74,damage:5.4,range:250,spread:.38,shots:5});
Object.assign(weapons.wideScatter,{rate:.72,damage:5.5,range:270,spread:.46,shots:6});
Object.assign(weapons.sniper,{rate:1.25,damage:38,range:570,pierce:1});
Object.assign(weapons.railSniper,{rate:1.18,damage:48,range:650,pierce:2});
Object.assign(weapons.arc,{rate:.54,damage:10.5,range:350,shots:2});
Object.assign(weapons.arcStorm,{rate:.50,damage:11,range:370,shots:3});
Object.assign(weapons.plasma,{rate:1.08,damage:18,range:390,aoe:46});
Object.assign(weapons.novaPlasma,{rate:1.02,damage:23,range:420,aoe:58});
Object.assign(weapons.frost,{rate:.48,damage:7,range:345,shots:2});
Object.assign(weapons.cryoBeam,{rate:.44,damage:8.5,range:370,shots:2});
Object.assign(weapons.flame,{rate:.32,damage:3.8,range:190,shots:4});
Object.assign(weapons.inferno,{rate:.30,damage:4.4,range:210,shots:5});
Object.assign(weapons.bolt,{rate:.92,damage:28,range:450});
Object.assign(weapons.toxicBolt,{rate:.86,damage:34,range:480});
const buildingDefs={house:{name:'Ev',w:245,h:180,doorY:.54},warehouse:{name:'Depo',w:310,h:220,doorY:.58},market:{name:'Market',w:300,h:205,doorY:.60},lab:{name:'Laboratuvar',w:300,h:205,doorY:.58},bunker:{name:'Bunker',w:290,h:210,doorY:.56},tower:{name:'Kule',w:215,h:190,doorY:.60}};
const classDefs={
  survivor:{name:'Hayatta Kalan',variant:0,maxHp:105,speed:190,heal:1.05,loot:1.05,damage:1.04},
  scout:{name:'Gezgin',variant:1,maxHp:86,speed:230,heal:.95,loot:1.08,damage:.96},
  engineer:{name:'Mühendis',variant:2,maxHp:96,speed:178,heal:1,loot:1.34,damage:1},
  medic:{name:'Sıhhiyeci',variant:3,maxHp:112,speed:176,heal:1.38,loot:.96,damage:.94}
};
const taskTemplates=[
  {kind:'kills',target:30,text:'30 düşman temizle',reward:'armor'},
  {kind:'chests',target:2,text:'2 sandık aç',reward:'rare'},
  {kind:'enter',target:1,text:'Bir binaya gir',reward:'bag'},
  {kind:'clearRoom',target:1,text:'Bir binayı tamamen temizle',reward:'armor'},
  {kind:'weaponVariety',target:3,text:'3 farklı silahla düşman öldür',reward:'legendary'},
  {kind:'noHealSurvive',target:90,text:'90 sn can eşyası kullanmadan dayan',reward:'helmet'},
  {kind:'boss',target:1,text:'1 boss indir',reward:'rare'},
  {kind:'rareOpened',target:1,text:'Nadir sandık aç',reward:'legendary'},
  {kind:'interiorChests',target:2,text:'İç mekânda 2 sandık aç',reward:'bag'},
  {kind:'survive',target:120,text:'120 saniye hayatta kal',reward:'armor'}
];
const equipNames={armor:'Zırh',helmet:'Kask',bag:'Çanta'};
const DRONE_LIMIT=4;
const FIRST_BOSS_TIME=80;
const BOSS_INTERVAL=45;
const bossNames={reactor:'Reaktör Mutantı',machine:'Kule Muhafızı',butcher:'Et Kasabı',plague:'Zehir Doktoru',colossus:'Demir Koloss',queen:'Sürü Kraliçesi',phantom:'Gölge Avcı'};
const BALANCE={enemyDropGear:.018,enemyDropUtility:.050,bossDropCount:1,maxWorldEnemies:74,droneDamage:3.8,droneCooldown:.95,weaponDamagePerLevel:.032,weaponDamageCap:.42,manualPickupRange:58,maxParticles:210,maxLiveMines:10,maxLiveGrenades:4};

let cw=1280,ch=720,dpr=1,last=0,raf=0;
const keys=new Set();
const pointer={active:false,id:null,x:0,y:0,dx:0,dy:0};
const map={chunks:new Map(),rooms:new Map(),seed:Date.now()&0xfffffff,tile:128,chunk:1024};
const state={started:false,gameOver:false,mode:'world',session:'',name:'Misafir',baseName:'Misafir',playerKey:'',selectedClass:'survivor',elapsed:0,score:0,kills:0,bosses:0,chests:0,level:1,lastSpawn:0,lastBoss:0,nextBoss:FIRST_BOSS_TIME,fireCooldown:0,droneCooldown:0,grenadeCooldown:0,doorCooldown:0,contactCooldown:0,lootStep:0,near:null,worldEnemies:[],bullets:[],particles:[],drops:[],hazards:[],camera:{x:0,y:0,zoom:1}, task:null, taskIndex:0, enteredBuildings:0, lastLevel:1, weaponXp:{}, weaponLevel:{}, equip:{armor:0,helmet:0,bag:0}, rewardGiven:false,player:null,currentRoom:null,currentBuilding:null,region:'Güvenli Bölge',phase:'day',phaseAnnounced:'day',lastBossTypes:[],perfMode:false,stats:{heals:0,roomClears:0,interiorChests:0,rareOpened:0,weaponKills:{},achievements:{},riskyChests:0,visitedRegions:{}}};

function resize(){
  const r=shell.getBoundingClientRect(); cw=Math.max(320,Math.floor(r.width)); ch=Math.max(320,Math.floor(r.height)); dpr=Math.min(state.perfMode?1.25:2,window.devicePixelRatio||1);
  canvas.width=Math.floor(cw*dpr); canvas.height=Math.floor(ch*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
}
window.addEventListener('resize',resize,{passive:true}); resize();
function cameraZoom(){const mobile=window.matchMedia&&window.matchMedia('(max-width: 900px)').matches; const portrait=cw<ch; let z=mobile?(portrait?1.34:1.16):1; if(cw<520)z=1.48; if(document.fullscreenElement===shell)z=portrait?1.18:1.06; return z;}

function randHash(a,b,c=0){let x=(a*374761393+b*668265263+c*1442695041)>>>0; x=(x^(x>>>13))*1274126177; return (x^(x>>>16))>>>0;}
function rng(seed){return function(){seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296;};}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function dist(a,b,c,d){return Math.hypot(a-c,b-d);}
function fmtTime(s){s=Math.max(0,Math.floor(s)); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function osc(seed=0,speed=1){return Math.sin(state.elapsed*speed+seed);}
function enemyHitRadius(e){return Math.max(10,(e.r||18)*(e.kind==='boss'?0.76:0.82));}
function playerHitRadius(){return Math.max(10,(state.player?.r||14)*0.88);}
function bulletEnemyRadius(e,b){return enemyHitRadius(e)+(b.r||3)*0.9;}
function toast(t){ui.toast.textContent=t; ui.toast.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>ui.toast.classList.remove('show'),1800);}
function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function circleRect(cx,cy,r,rect){const x=clamp(cx,rect.x,rect.x+rect.w), y=clamp(cy,rect.y,rect.y+rect.h); return Math.hypot(cx-x,cy-y)<r;}

function getChunk(cx,cy){
  const key=cx+','+cy; if(map.chunks.has(key)) return map.chunks.get(key);
  const rnd=rng(randHash(cx,cy,map.seed)); const chunk={buildings:[],props:[],decor:[]};
  const baseX=cx*map.chunk, baseY=cy*map.chunk;
  const nearOrigin=Math.abs(cx)<=1&&Math.abs(cy)<=1;
  const bCount=nearOrigin? (cx===0&&cy===0?1:Math.floor(rnd()*2)) : Math.floor(rnd()*3);
  for(let i=0;i<bCount;i++){
    const types=Object.keys(buildingDefs); const type=(cx===0&&cy===0&&i===0)?'house':types[Math.floor(rnd()*types.length)]; const def=buildingDefs[type];
    const x=baseX+180+rnd()*(map.chunk-360), y=baseY+190+rnd()*(map.chunk-380);
    if(Math.hypot(x,y)<330) continue;
    const id=`${cx}:${cy}:${i}:${type}`;
    chunk.buildings.push({id,type,name:def.name,x,y,w:def.w,h:def.h,door:{x:x,y:y+def.h*def.doorY},foot:{x:x-def.w*.26,y:y+def.h*.16,w:def.w*.52,h:def.h*.22}});
  }
  const propTypes=['crate','barrel'];
  const propCount=5+Math.floor(rnd()*7);
  for(let i=0;i<propCount;i++){
    const type=propTypes[Math.floor(rnd()*propTypes.length)]; const x=baseX+rnd()*map.chunk, y=baseY+rnd()*map.chunk;
    if(Math.hypot(x,y)<250) continue;
    chunk.props.push({type,x,y,w:50,h:50,solid:type==='barrel'&&rnd()<.35});
  }
  const dropCount=(rnd()<.35?1:0)+(rnd()<.08?1:0);
  for(let i=0;i<dropCount;i++){
    const roll=rnd();
    const t=roll<.18?'medkit':(roll<.50?'drink':(roll<.78?'shield':'armor'));
    const x=baseX+rnd()*map.chunk, y=baseY+rnd()*map.chunk;
    chunk.decor.push({type:t,x,y,taken:false});
  }
  if(rnd()<.075){
    const x=baseX+140+rnd()*(map.chunk-280), y=baseY+140+rnd()*(map.chunk-280);
    if(Math.hypot(x,y)>360) chunk.decor.push({type:'rareChest',x,y,taken:false,rare:true});
  }
  map.chunks.set(key,chunk); return chunk;
}
function visibleChunks(buffer=1){
  const z=state.camera.zoom||1;
  const minX=Math.floor((state.camera.x-cw/(2*z)-buffer*map.chunk)/map.chunk), maxX=Math.floor((state.camera.x+cw/(2*z)+buffer*map.chunk)/map.chunk);
  const minY=Math.floor((state.camera.y-ch/(2*z)-buffer*map.chunk)/map.chunk), maxY=Math.floor((state.camera.y+ch/(2*z)+buffer*map.chunk)/map.chunk);
  const arr=[]; for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)arr.push(getChunk(x,y)); return arr;
}
function allBuildings(){return visibleChunks(1).flatMap(c=>c.buildings);}
function worldCollides(x,y,r){
  const rr=Math.max(8,r*.72);
  for(const c of visibleChunks(1)){
    for(const b of c.buildings){ if(circleRect(x,y,rr,b.foot)) return true; }
    for(const p of c.props){
      if(!p.solid) continue;
      const pad=12;
      if(circleRect(x,y,rr,{x:p.x-p.w/2+pad,y:p.y-p.h/2+pad,w:p.w-pad*2,h:p.h-pad*2})) return true;
    }
  }
  return false;
}
function findClearWorldSpot(cx,cy,r,preferredAngle=0,minDist=0){
  const rr=Math.max(18,r||22);
  const tries=[0,18,-18,34,-34,52,-52,75,-75,110,-110,145,-145,180];
  const rings=[minDist||0,70,110,150,195,245,310];
  for(const ring of rings){
    for(const off of tries){
      const a=preferredAngle+off*Math.PI/180;
      const x=cx+Math.cos(a)*ring;
      const y=cy+Math.sin(a)*ring;
      if(!worldCollides(x,y,rr)) return {x,y};
    }
  }
  for(let ring=70; ring<=420; ring+=35){
    const steps=Math.max(12,Math.ceil(ring/22));
    for(let i=0;i<steps;i++){
      const a=preferredAngle+(i/steps)*Math.PI*2;
      const x=cx+Math.cos(a)*ring;
      const y=cy+Math.sin(a)*ring;
      if(!worldCollides(x,y,rr)) return {x,y};
    }
  }
  return {x:cx,y:cy};
}
function roomColliderFor(room,x,y,r){if(!room)return false; const rr=Math.max(8,r*.68); if(x<52+rr||y<60+rr||x>room.w-52-rr||y>room.h-60-rr)return true; for(const o of room.props){if(o.solid){const pad=16;if(circleRect(x,y,rr,{x:o.x-o.w/2+pad,y:o.y-o.h/2+pad,w:o.w-pad*2,h:o.h-pad*2}))return true;}} return false;}
function findClearRoomSpot(cx,cy,r,roomRef){
  const room=roomRef||state.currentRoom;
  const rr=Math.max(18,r||22);
  if(!roomColliderFor(room,cx,cy,rr)) return {x:cx,y:cy};
  for(let ring=35; ring<=220; ring+=25){
    const steps=18;
    for(let i=0;i<steps;i++){
      const a=(i/steps)*Math.PI*2;
      const x=cx+Math.cos(a)*ring;
      const y=cy+Math.sin(a)*ring;
      if(!roomColliderFor(room,x,y,rr)) return {x,y};
    }
  }
  return room?{x:room.w/2,y:room.h/2}:{x:cx,y:cy};
}
function resolvePlayerStuck(){
  const p=state.player; if(!p)return;
  if(state.mode==='world'){
    if(!worldCollides(p.x,p.y,p.r))return;
    const safe=findClearWorldSpot(p.x,p.y,p.r,p.face||0,40);
    p.x=safe.x; p.y=safe.y; state.camera.x=p.x; state.camera.y=p.y; p.invuln=Math.max(p.invuln||0,.9); toast('Sıkışma düzeltildi: güvenli noktaya taşındın.');
  } else if(state.currentRoom&&roomCollider(p.x,p.y,p.r)){
    const safe=findClearRoomSpot(p.x,p.y,p.r);
    p.x=safe.x; p.y=safe.y; p.invuln=Math.max(p.invuln||0,.7); toast('Sıkışma düzeltildi.');
  }
}
function clearExitDanger(x,y){
  state.hazards=state.hazards.filter(h=>dist(h.x,h.y,x,y)>185);
  for(const e of state.worldEnemies){
    const d=dist(e.x,e.y,x,y);
    if(d<135){const a=Math.atan2(e.y-y,e.x-x)||Math.random()*Math.PI*2; e.x=x+Math.cos(a)*150; e.y=y+Math.sin(a)*150;}
  }
}
function tryMove(obj,dx,dy,r,collider){
  if(!collider(obj.x+dx,obj.y,r)) obj.x+=dx; else if(!collider(obj.x+dx*.35,obj.y,r)) obj.x+=dx*.35;
  if(!collider(obj.x,obj.y+dy,r)) obj.y+=dy; else if(!collider(obj.x,obj.y+dy*.35,r)) obj.y+=dy*.35;
}

function todayKey(){const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function localProfile(){try{return JSON.parse(localStorage.getItem('uacss5_profile')||'{}')||{};}catch(e){return {};}}
function getCookie(name){const m=document.cookie.match(new RegExp('(?:^|; )'+name.replace(/[.$?*|{}()\[\]\\/+^]/g,'\\$&')+'=([^;]*)')); return m?decodeURIComponent(m[1]):'';}
function setCookie(name,value){try{document.cookie=name+'='+encodeURIComponent(value)+'; max-age=31536000; path=/; SameSite=Lax';}catch(e){}}
function getPlayerKey(){const cname=(DATA.identityCookie||'uacss5_player_key'); let k=localStorage.getItem('uacss5_player_key')||getCookie(cname)||''; if(!k){k=(window.crypto&&window.crypto.randomUUID?window.crypto.randomUUID():(Date.now().toString(36)+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)));} localStorage.setItem('uacss5_player_key',k); setCookie(cname,k); return k;}
function unlockAchievement(id,text){const p=localProfile(); p.achievements=p.achievements||{}; if(p.achievements[id])return; p.achievements[id]=todayKey(); localStorage.setItem('uacss5_profile',JSON.stringify(p)); state.stats.achievements[id]=1; toast('Başarım: '+text);}
function saveLocalProfile(){const p=localProfile(); p.games=(p.games||0)+1; p.bestScore=Math.max(p.bestScore||0,state.score||0); p.bestTime=Math.max(p.bestTime||0,Math.floor(state.elapsed||0)); p.bestKills=Math.max(p.bestKills||0,state.kills||0); p.totalKills=(p.totalKills||0)+state.kills; p.totalBosses=(p.totalBosses||0)+state.bosses; p.totalChests=(p.totalChests||0)+state.chests; p.last=todayKey(); p.achievements={...(p.achievements||{}),...(state.stats.achievements||{})}; localStorage.setItem('uacss5_profile',JSON.stringify(p)); renderProfileCard();}
function renderProfileCard(){if(!ui.profile)return; const p=localProfile(); const ach=Object.keys(p.achievements||{}).length; if(!p.games){ui.profile.innerHTML='İlk oyun: adın artık güvenli kimlik etiketiyle korunur. Aynı isimlerde #etiket kullanılır.';return;} ui.profile.innerHTML=`Profil: <b>${p.games}</b> oyun · En iyi skor: <b>${p.bestScore||0}</b> · En uzun süre: <b>${fmtTime(p.bestTime||0)}</b> · Başarım: <b>${ach}</b>`;}
function grantDailyReward(){const key='uacss5_daily_'+todayKey(); if(localStorage.getItem(key))return; localStorage.setItem(key,'1'); state.player.hp=clamp(state.player.hp+16,0,state.player.maxHp); state.equip.armor=clamp((state.equip.armor||0)+1,0,3); toast('Günlük ödül: az can ve zırh desteği!');}
function startTask(){const base=taskTemplates[state.taskIndex%taskTemplates.length]; const round=Math.floor(state.taskIndex/taskTemplates.length); const add=base.kind==='survive'||base.kind==='noHealSurvive'?45:base.kind==='kills'?14:base.kind==='weaponVariety'?0:base.kind==='clearRoom'?1:1; state.task={...base,target:base.target+round*add,taskWeapons:{},start:{kills:state.kills,chests:state.chests,bosses:state.bosses,elapsed:state.elapsed,entered:state.enteredBuildings,roomClears:state.stats.roomClears,weaponKinds:Object.keys(state.stats.weaponKills).length,heals:state.stats.heals,rareOpened:state.stats.rareOpened,interiorChests:state.stats.interiorChests}}; state.taskIndex++; updateTask(true);}
function taskProgress(){const t=state.task;if(!t)return 0; if(t.kind==='kills')return state.kills-t.start.kills; if(t.kind==='chests')return state.chests-t.start.chests; if(t.kind==='survive')return Math.floor(state.elapsed-t.start.elapsed); if(t.kind==='enter')return state.enteredBuildings-t.start.entered; if(t.kind==='boss')return state.bosses-t.start.bosses; if(t.kind==='clearRoom')return state.stats.roomClears-t.start.roomClears; if(t.kind==='weaponVariety')return Object.keys(t.taskWeapons||{}).length; if(t.kind==='noHealSurvive'){if(state.stats.heals!==t.start.heals){t.start.heals=state.stats.heals;t.start.elapsed=state.elapsed;return 0;} return Math.floor(state.elapsed-t.start.elapsed);} if(t.kind==='rareOpened')return state.stats.rareOpened-t.start.rareOpened; if(t.kind==='interiorChests')return state.stats.interiorChests-t.start.interiorChests; return 0;}
function giveTaskReward(reward){let rewardType=reward; if(reward==='rare')rewardType='rareChest'; else if(reward==='legendary')rewardType=chooseFrom(['plasma','flame','frost','bolt','sniper'],'plasma'); rewardType=normalizeLoot(rewardType,'armor'); dropAtPlayer(rewardType); toast('Görev ödülü yere düştü: '+lootName(rewardType)+'. E ile al.');}
function updateTask(force=false){if(!state.task)return; const t=state.task, pr=clamp(taskProgress(),0,t.target); if(ui.task)ui.task.innerHTML='<span>'+state.region+' · '+phaseName()+'</span><b>'+t.text+' · '+pr+'/'+t.target+'</b>'; if(pr>=t.target){toast('Görev tamamlandı: '+lootName(t.reward)); giveTaskReward(t.reward); startTask();}}
function updateProgression(){
  if(state.level>state.lastLevel){
    state.lastLevel=state.level;
    toast('Seviye '+state.level+'! Hasar yalnızca silah Lv ile artar.');
  }
}
function weaponLvl(type){return state.weaponLevel[type]||1;}
function addWeaponXp(xp){const w=state.player.weapon; state.weaponXp[w]=(state.weaponXp[w]||0)+xp; const lvl=state.weaponLevel[w]||1; const def=weapons[w]||{}; const need=Math.round((lvl*70+Math.max(0,lvl-3)*lvl*12)*(def.xpScale||1)); if(state.weaponXp[w]>=need){state.weaponXp[w]-=need; state.weaponLevel[w]=lvl+1; const nw=weapons[w]; if(nw&&nw.evolve&&state.weaponLevel[w]>=4){state.player.weapon=nw.evolve; state.weaponLevel[nw.evolve]=Math.max(state.weaponLevel[nw.evolve]||1,1); state.weaponXp[nw.evolve]=state.weaponXp[nw.evolve]||0; toast(nw.name+' evrildi: '+weapons[nw.evolve].name); unlockAchievement('evolve','İlk silah evrimi');} else toast(weapons[w].name+' Lv.'+state.weaponLevel[w]);}}
function effectiveDamage(w){const lvl=weaponLvl(state.player.weapon); const per=w.levelBonus||BALANCE.weaponDamagePerLevel; const cap=w.levelCap||BALANCE.weaponDamageCap; const bonus=Math.min(cap,(lvl-1)*per); const cls=classDefs[state.selectedClass]||{}; return Math.max(1,w.damage*(1+bonus)*(cls.damage||1));}
function currentRoomId(){return state.mode==='interior'&&state.currentRoom?state.currentRoom.id:null;}
function dropMeta(extra={}){const meta={mode:state.mode,...extra}; const rid=currentRoomId(); if(rid)meta.roomId=rid; return meta;}
function isLiveTactical(d){return d&&(d.type==='mine-live'||d.type==='grenade-live');}
function clearLiveTactical(){state.drops=state.drops.filter(d=>!isLiveTactical(d));}
function isDropInCurrentPlace(d){if(!d)return false; if(d.mode&&d.mode!==state.mode)return false; if(state.mode==='interior'){const rid=currentRoomId(); if(d.roomId!==rid)return false;} return true;}
function addDrop(type,x,y,extra={}){state.drops.push({type,x,y,taken:false,...dropMeta(extra)}); return state.drops[state.drops.length-1];}
function dropAtPlayer(type){const p=state.player; addDrop(type,p.x+Math.random()*80-40,p.y+Math.random()*80-40,{rare:type==='rareChest'});}
function updateHint(){if(!ui.hint)return; if(!state.near){ui.hint.style.display='none'; if(ui.action){ui.action.textContent='E'; ui.action.removeAttribute('data-item'); ui.action.title='Etkileşim';} return;} let text='E / Dokun: Etkileşim', item=''; if(state.near.kind==='door') text='E / Dokun: Binaya gir'; else if(state.near.kind==='exit') text='E / Dokun: Dışarı çık'; else if(state.near.kind==='chest') text='E / Dokun: Sandığı aç'; else if(state.near.kind==='drop'){item=lootName(state.near.drop.type); text='E / Dokun: '+item+' al';} ui.hint.textContent=text; ui.hint.style.display='block'; if(ui.action){ui.action.textContent='E'; ui.action.title=text; if(item) ui.action.setAttribute('data-item',item); else ui.action.removeAttribute('data-item');}}
function phase(){if(state.elapsed>=300)return 'night'; if(state.elapsed>=150)return 'dusk'; return 'day';}
function phaseName(){return ({day:'Gündüz',dusk:'Akşam',night:'Gece Alarmı'}[state.phase]||'Gündüz');}
function updatePhase(){const ph=phase(); if(ph!==state.phase){state.phase=ph; if(ph!==state.phaseAnnounced){state.phaseAnnounced=ph; toast(ph==='night'?'Gece alarmı başladı! Düşmanlar güçlendi.':'Akşam oldu. Risk ve ödül artıyor.');}}}
function determineRegion(x,y){const cx=Math.floor(x/1024), cy=Math.floor(y/1024); const h=randHash(cx,cy,map.seed)%100; if(Math.abs(cx)<=1&&Math.abs(cy)<=1)return 'Güvenli Bölge'; if(h<18)return 'Sanayi Bölgesi'; if(h<34)return 'Market Bölgesi'; if(h<50)return 'Laboratuvar Alanı'; if(h<66)return 'Bunker Çevresi'; if(h<82)return 'Terk Mahalle'; return 'Boss Bölgesi';}
function updateRegion(){const r=determineRegion(state.player.x,state.player.y); if(r!==state.region){state.region=r; state.stats.visitedRegions[r]=1; toast('Bölge: '+r); if(Object.keys(state.stats.visitedRegions).length>=4)unlockAchievement('gezgin','4 farklı bölge keşfedildi');}}
function checkAchievements(){if(state.kills>=1)unlockAchievement('ilkkan','İlk düşman öldürüldü'); if(state.bosses>=1)unlockAchievement('bossavcisi','İlk boss indirildi'); if(state.chests>=10)unlockAchievement('yagmaci','10 sandık açıldı'); if(state.elapsed>=300)unlockAchievement('gececi','5 dakika hayatta kaldın'); if(state.kills>=250)unlockAchievement('temizlikci','250 düşman temizlendi'); if(state.stats.riskyChests>=1)unlockAchievement('riskli','Riskli sandık açıldı'); if(Object.keys(state.stats.weaponKills).length>=5)unlockAchievement('cephanelik','5 farklı silahla kill aldın');}
function setPerfMode(on){state.perfMode=!!on; localStorage.setItem('uacss5_perf',state.perfMode?'1':'0'); if(ui.perf)ui.perf.textContent=state.perfMode?'PERFORMANS: AÇIK':'PERFORMANS: KAPALI'; resize();}
function startSession(){
  const base=(ui.name.value||localStorage.getItem('uacss5_name')||localStorage.getItem('playerName')||localStorage.getItem('km_player_name')||'Misafir').trim().slice(0,20)||'Misafir';
  state.playerKey=getPlayerKey();
  const savedPin=(localStorage.getItem('uac_player_pin')||'').trim();
  return fetch(REST+'/session-start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:base,player_key:state.playerKey,player_pin:savedPin})}).then(r=>r.json()).then(d=>{if(!d.ok)throw new Error(d.message||'Oturum alınamadı'); state.session=d.session; state.name=d.identity||base; state.baseName=d.base_name||base; localStorage.setItem('uacss5_name',state.baseName); localStorage.setItem('playerName',state.baseName); if(d.identity&&d.identity!==base)toast('Oyuncu kimliğin: '+d.identity);});
}
function resetGame(){
  map.chunks.clear(); map.rooms.clear(); map.seed=(Date.now()&0xfffffff); state.mode='world'; state.started=true; state.gameOver=false; state.elapsed=0; state.score=0; state.kills=0; state.bosses=0; state.chests=0; state.level=1; state.lastSpawn=0; state.lastBoss=0; state.nextBoss=FIRST_BOSS_TIME; state.fireCooldown=0; state.droneCooldown=0; state.grenadeCooldown=0; state.doorCooldown=0; state.contactCooldown=0; state.lootStep=0; state.near=null; state.worldEnemies=[]; state.bullets=[]; state.particles=[]; state.drops=[]; state.hazards=[]; state.hazardHitCooldown=0; state.currentRoom=null; state.currentBuilding=null; state.task=null; state.taskIndex=0; state.enteredBuildings=0; state.lastLevel=1; state.weaponXp={}; state.weaponLevel={}; state.equip={armor:0,helmet:0,bag:0,mines:0,grenades:0}; state.rewardGiven=false; state.region='Güvenli Bölge'; state.phase='day'; state.phaseAnnounced='day'; state.lastBossTypes=[]; state.stats={heals:0,roomClears:0,interiorChests:0,rareOpened:0,weaponKills:{},achievements:{},riskyChests:0,visitedRegions:{'Güvenli Bölge':1}};
  const cls=classDefs[state.selectedClass]; state.player={x:0,y:0,r:14,hp:cls.maxHp,maxHp:cls.maxHp,baseSpeed:cls.speed,speed:cls.speed,energyBoostUntil:0,weapon:'pulse',variant:cls.variant,face:0,flip:false,invuln:0,drones:0}; state.camera.x=0; state.camera.y=0; state.camera.zoom=cameraZoom(); ui.start.hidden=true; ui.gameover.hidden=true; clearControls(); audio.play('start'); audio.music('world_loop'); grantDailyReward(); startTask(); toast('Harita yenilendi. Kapılara yaklaşınca E ile gir.');
}

function isEditableTarget(target){
  if(!target) return false;
  const tag=(target.tagName||'').toLowerCase();
  return tag==='input'||tag==='textarea'||tag==='select'||target.isContentEditable||!!(target.closest&&target.closest('[contenteditable="true"]'));
}
function isTypingNow(target){
  const active=document.activeElement;
  return isEditableTarget(target)||isEditableTarget(active)||shell.classList.contains('typing')||(ui.name&&(active===ui.name||target===ui.name));
}
function clearControls(){
  keys.clear();
  pointer.active=false; pointer.id=null; pointer.dx=0; pointer.dy=0;
  if(ui.stick&&ui.stick.firstElementChild) ui.stick.firstElementChild.style.transform='translate(0,0)';
}
ui.startBtn.addEventListener('click',()=>{if(ui.name)ui.name.blur(); clearControls(); audio.unlock(); ui.startBtn.disabled=true; ui.startBtn.textContent='YÜKLENİYOR...'; loadAssets().then(startSession).then(()=>{resetGame(); last=performance.now(); cancelAnimationFrame(raf); raf=requestAnimationFrame(loop);}).catch(e=>{toast(e.message||'Başlatılamadı');}).finally(()=>{ui.startBtn.disabled=false; ui.startBtn.textContent='OYUNA BAŞLA';});});
ui.restart.addEventListener('click',()=>{clearControls(); ui.gameover.hidden=true; ui.start.hidden=false; if(ui.name) setTimeout(()=>ui.name.focus(),60);});
if(ui.name){
  ui.name.value=localStorage.getItem('uacss5_name')||localStorage.getItem('playerName')||localStorage.getItem('km_player_name')||'';
  ui.name.addEventListener('focus',()=>{shell.classList.add('typing'); clearControls();});
  ui.name.addEventListener('blur',()=>{shell.classList.remove('typing'); clearControls();});
  ['keydown','keyup','keypress'].forEach(type=>ui.name.addEventListener(type,e=>{
    clearControls();
    if(e.code==='Enter'&&type==='keydown'&&!ui.start.hidden){e.preventDefault(); ui.startBtn.click();}
    e.stopPropagation();
  }, true));
  ['input','compositionstart','compositionupdate','compositionend','beforeinput','paste'].forEach(type=>ui.name.addEventListener(type,()=>clearControls(), true));
}
document.querySelectorAll('.uacss5-class-grid button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.uacss5-class-grid button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); state.selectedClass=b.dataset.class||'survivor';}));
if(ui.sound){
  let ssSlider=document.getElementById('uacss5-volume');
  if(!ssSlider){
    const bar=document.createElement('div');
    bar.className='uacss5-sound-bar';
    ui.sound.parentNode.insertBefore(bar,ui.sound);
    bar.appendChild(ui.sound);
    ssSlider=document.createElement('input');
    ssSlider.type='range';
    ssSlider.id='uacss5-volume';
    ssSlider.className='uac-volume-slider uacss5-volume-slider';
    ssSlider.min='0';
    ssSlider.max='100';
    ssSlider.value=String(audio.muted?0:audio.vol);
    ssSlider.setAttribute('aria-label','Son Sığınak ses seviyesi');
    bar.appendChild(ssSlider);
    ['click','mousedown','mouseup','pointerdown','pointerup','touchstart','touchmove','touchend'].forEach(evName=>{
      bar.addEventListener(evName,e=>e.stopPropagation(),{passive:true});
      ssSlider.addEventListener(evName,e=>e.stopPropagation(),{passive:true});
    });
  }
  const syncSsSoundUI=()=>{
    const eff=audio.muted?0:audio.vol;
    ui.sound.textContent=(audio.muted||eff<=0)?'🔇 SES: KAPALI':`🔊 SES: %${eff}`;
    if(ssSlider&&Number(ssSlider.value)!==eff) ssSlider.value=String(eff);
    audio.applyVolume();
    if(audio.muted||eff<=0) audio.stop();
    else if(state.started&&!state.gameOver) audio.music(state.mode==='world'?(hasActiveBoss()?'boss_loop':'world_loop'):'interior_loop');
  };
  ui.sound.addEventListener('click',e=>{
    e.stopPropagation();
    if(!audio.muted&&audio.vol>0){
      audio.lastVol=audio.vol;
      audio.muted=true;
      localStorage.setItem('uacss5_muted','true');
    }else{
      audio.muted=false;
      audio.vol=audio.lastVol>0?audio.lastVol:70;
      localStorage.setItem('uacss5_muted','false');
      localStorage.setItem('uacss5_volume',String(audio.vol));
      audio.unlock();
    }
    syncSsSoundUI();
  });
  const onSsVol=(e)=>{
    e.stopPropagation();
    const raw=Math.max(0,Math.min(100,parseInt(e.target.value,10)||0));
    audio.vol=raw;
    if(raw>0){
      audio.lastVol=raw;
      audio.muted=false;
      localStorage.setItem('uacss5_muted','false');
      localStorage.setItem('uacss5_volume',String(raw));
      audio.unlock();
    }else{
      audio.muted=true;
      localStorage.setItem('uacss5_muted','true');
    }
    syncSsSoundUI();
  };
  ssSlider.addEventListener('input',onSsVol);
  ssSlider.addEventListener('change',onSsVol);
  syncSsSoundUI();
}
if(ui.perf){const mobilePerf=(window.matchMedia&&window.matchMedia('(max-width: 900px)').matches)||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); ui.perf.addEventListener('click',()=>setPerfMode(!state.perfMode)); setPerfMode(mobilePerf ? localStorage.getItem('uacss5_perf')!=='0' : false);}
ui.action.addEventListener('click',interact);
let lastActionTouch=0;
ui.action.addEventListener('pointerdown',e=>{e.preventDefault(); e.stopPropagation(); const now=performance.now(); if(now-lastActionTouch>80){lastActionTouch=now; interact();}});
ui.action.addEventListener('touchstart',e=>{e.preventDefault(); e.stopPropagation(); const now=performance.now(); if(now-lastActionTouch>80){lastActionTouch=now; interact();}},{passive:false});
if(ui.hint){
  ui.hint.addEventListener('click',interact);
  ui.hint.addEventListener('pointerdown',e=>{e.preventDefault(); e.stopPropagation(); const now=performance.now(); if(now-lastActionTouch>80){lastActionTouch=now; interact();}});
}
let lastTacticalTouch=0;
if(ui.tactical){
  ui.tactical.addEventListener('click',useTactical);
  ui.tactical.addEventListener('pointerdown',e=>{e.preventDefault(); e.stopPropagation(); const now=performance.now(); if(now-lastTacticalTouch>80){lastTacticalTouch=now; useTactical();}});
  ui.tactical.addEventListener('touchstart',e=>{e.preventDefault(); e.stopPropagation(); const now=performance.now(); if(now-lastTacticalTouch>80){lastTacticalTouch=now; useTactical();}},{passive:false});
}
if(ui.fullscreen) ui.fullscreen.addEventListener('click',()=>{try{if(!document.fullscreenElement) shell.requestFullscreen && shell.requestFullscreen(); else document.exitFullscreen && document.exitFullscreen();}catch(e){}});
function syncTouchClass(){
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(max-width: 1024px), (hover: none), (pointer: coarse)').matches);
  shell.classList.toggle('is-touch', !!isTouch);
}
syncTouchClass();
window.addEventListener('resize',syncTouchClass,{passive:true});
const controlKeys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'];
window.addEventListener('keydown',e=>{
  if(isTypingNow(e.target)){
    clearControls();
    if(e.code==='Enter' && document.activeElement===ui.name && !ui.start.hidden){e.preventDefault(); ui.startBtn.click();}
    return;
  }
  if(controlKeys.includes(e.code)){e.preventDefault(); keys.add(e.code); return;}
  if(e.code==='KeyE'){e.preventDefault(); interact();}
  if(e.code==='KeyF'){e.preventDefault(); useTactical();}
});
window.addEventListener('keyup',e=>{if(isTypingNow(e.target)){clearControls(); return;} keys.delete(e.code);});
window.addEventListener('blur',clearControls);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearControls();});
document.addEventListener('fullscreenchange',clearControls);
shell.addEventListener('contextmenu',e=>e.preventDefault());

function applyStickDelta(dxPx, dyPx){
  const m=Math.min(42,Math.hypot(dxPx,dyPx)), a=Math.atan2(dyPx,dxPx);
  pointer.dx=Math.cos(a)*(m/42);
  pointer.dy=Math.sin(a)*(m/42);
  if(ui.stick&&ui.stick.firstElementChild) ui.stick.firstElementChild.style.transform=`translate(${Math.cos(a)*m}px,${Math.sin(a)*m}px)`;
}
function updateStick(e){
  const r=ui.stick.getBoundingClientRect();
  const cx=pointer.originX!=null?pointer.originX:(r.left+r.width/2);
  const cy=pointer.originY!=null?pointer.originY:(r.top+r.height/2);
  applyStickDelta(e.clientX-cx, e.clientY-cy);
}
function clearStick(){pointer.active=false; pointer.id=null; pointer.originX=null; pointer.originY=null; pointer.dx=0; pointer.dy=0; if(ui.stick&&ui.stick.firstElementChild) ui.stick.firstElementChild.style.transform='translate(0,0)';}
ui.stick.addEventListener('pointerdown',e=>{e.preventDefault(); pointer.active=true; pointer.id=e.pointerId; pointer.originX=null; pointer.originY=null; try{ui.stick.setPointerCapture(e.pointerId);}catch(err){} updateStick(e);});
ui.stick.addEventListener('pointermove',e=>{if(pointer.active&&e.pointerId===pointer.id)updateStick(e);});
ui.stick.addEventListener('pointerup',e=>{if(e.pointerId===pointer.id)clearStick();});
ui.stick.addEventListener('pointercancel',e=>{if(e.pointerId===pointer.id)clearStick();});
/* Canvas uzerinde sol yarida dokun-surukle ile dinamik joystick + sag yarida etkilesim destegi */
canvas.addEventListener('pointerdown',e=>{
  if(!state.started||state.gameOver||!ui.start.hidden||!ui.gameover.hidden) return;
  const r=canvas.getBoundingClientRect();
  const relX=e.clientX-r.left;
  if(relX <= r.width*0.68 && !pointer.active){
    pointer.active=true; pointer.id=e.pointerId; pointer.originX=e.clientX; pointer.originY=e.clientY;
    try{canvas.setPointerCapture(e.pointerId);}catch(err){}
    applyStickDelta(0,0);
  } else if(state.near){
    interact();
  }
});
canvas.addEventListener('pointermove',e=>{
  if(pointer.active&&e.pointerId===pointer.id) updateStick(e);
});
window.addEventListener('pointerup',e=>{if(pointer.active&&e.pointerId===pointer.id)clearStick();},{passive:true});
window.addEventListener('pointercancel',e=>{if(pointer.active&&e.pointerId===pointer.id)clearStick();},{passive:true});

function inputVec(){let x=0,y=0; if(keys.has('KeyA')||keys.has('ArrowLeft'))x--; if(keys.has('KeyD')||keys.has('ArrowRight'))x++; if(keys.has('KeyW')||keys.has('ArrowUp'))y--; if(keys.has('KeyS')||keys.has('ArrowDown'))y++; x+=pointer.dx; y+=pointer.dy; const l=Math.hypot(x,y); if(l>1){x/=l;y/=l;} return {x,y};}
function updateScore(){state.level=1+Math.floor((state.kills+state.bosses*5)/15); state.score=Math.floor(state.elapsed*10)+state.kills*14+state.bosses*260+state.chests*35+state.level*60;}

function loop(now){const dt=Math.min(.05,(now-last)/1000||0); last=now; if(state.started&&!state.gameOver){update(dt); draw(); raf=requestAnimationFrame(loop);}}
function update(dt){
  const p=state.player; p.invuln=Math.max(0,p.invuln-dt); state.elapsed+=dt; if(p.energyBoostUntil&&state.elapsed>=p.energyBoostUntil){p.speed=p.baseSpeed||classDefs[state.selectedClass].speed; p.energyBoostUntil=0;} updatePhase(); updateRegion(); updateScore(); updateProgression(); updateTask(); checkAchievements();
  const v=inputVec(); const sp=p.speed*(state.mode==='interior'?0.92:1); p.moving=!!(v.x||v.y); p.animTime=(p.animTime||0)+dt*(p.moving?10:3); if(v.x||v.y){p.face=Math.atan2(v.y,v.x); if(Math.abs(v.x)>.08)p.flip=v.x<0;}
  if(state.mode==='world') updateWorld(dt,v,sp); else updateInterior(dt,v,sp);
  updateBullets(dt); updateEnemies(dt); updateHazards(dt); updateParticles(dt); updateDrops(dt); autoFire(dt); updateDrones(dt); state.grenadeCooldown=Math.max(0,(state.grenadeCooldown||0)-dt); state.doorCooldown=Math.max(0,(state.doorCooldown||0)-dt); resolvePlayerStuck(); contactDamage(dt); updateUi();
}
function updateWorld(dt,v,sp){
  const p=state.player; tryMove(p,v.x*sp*dt,v.y*sp*dt,p.r,worldCollides); state.camera.x += (p.x-state.camera.x)*Math.min(1,dt*6); state.camera.y += (p.y-state.camera.y)*Math.min(1,dt*6); state.camera.zoom += (cameraZoom()-state.camera.zoom)*Math.min(1,dt*5);
  state.lastSpawn+=dt; let interval=Math.max(.72,1.55-state.elapsed*.0020); if(state.phase==='dusk')interval*=.92; if(state.phase==='night')interval*=.82; if(state.perfMode)interval*=1.34; if(state.worldEnemies.length>spawnBudget()) interval*=1.75; if(state.lastSpawn>interval){state.lastSpawn=0; spawnEnemy();}
  if(state.elapsed>=state.nextBoss){ if(hasActiveBoss()){state.nextBoss=state.elapsed+12;} else {state.nextBoss+=BOSS_INTERVAL; spawnBoss();} }
  state.near=null; let best=9999;
  if((state.doorCooldown||0)<=0){for(const b of allBuildings()){const d=dist(p.x,p.y,b.door.x,b.door.y); if(d<80&&d<best){best=d; state.near={kind:'door',building:b};}}}
  for(const c of visibleChunks(1)){for(const d of c.decor){if(d.taken)continue; const dd=dist(p.x,p.y,d.x,d.y); if(dd<52&&dd<best){best=dd; state.near={kind:'drop',drop:d};}}}
  for(const d of state.drops){if(d.taken||isLiveTactical(d)||!isDropInCurrentPlace(d))continue; const dd=dist(p.x,p.y,d.x,d.y); if(dd<BALANCE.manualPickupRange&&dd<best){best=dd; state.near={kind:'drop',drop:d};}}
  updateHint();
}
function roomCollider(x,y,r){const room=state.currentRoom; if(!room)return false; const rr=Math.max(8,r*.68); if(x<52+rr||y<60+rr||x>room.w-52-rr||y>room.h-60-rr)return true; for(const o of room.props){if(o.solid){const pad=16;if(circleRect(x,y,rr,{x:o.x-o.w/2+pad,y:o.y-o.h/2+pad,w:o.w-pad*2,h:o.h-pad*2}))return true;}} return false;}
function updateInterior(dt,v,sp){
  const p=state.player, room=state.currentRoom; tryMove(p,v.x*sp*dt,v.y*sp*dt,p.r,roomCollider); state.camera.x=p.x; state.camera.y=p.y;
  state.near=null; let best=9999; const exitD=dist(p.x,p.y,room.exit.x,room.exit.y); if((state.doorCooldown||0)<=0&&exitD<62){best=exitD; state.near={kind:'exit'};}
  for(const c of room.chests){const cd=dist(p.x,p.y,c.x,c.y); if(!c.open&&cd<54&&cd<best){best=cd; state.near={kind:'chest',chest:c};}}
  for(const d of state.drops){if(d.taken||isLiveTactical(d)||!isDropInCurrentPlace(d))continue; const dd=dist(p.x,p.y,d.x,d.y); if(dd<BALANCE.manualPickupRange&&dd<best){best=dd; state.near={kind:'drop',drop:d};}}
  if(room.enemies.length===0&&!room.cleared){room.cleared=true; state.stats.roomClears++; toast('Bina temizlendi!'); unlockAchievement('temizbina','İlk bina tamamen temizlendi');}
  updateHint();
}
function interact(){
  if(!state.started||state.gameOver||!state.near)return;
  if(state.near.kind==='door') enterBuilding(state.near.building);
  else if(state.near.kind==='exit') exitBuilding();
  else if(state.near.kind==='chest') openChest(state.near.chest);
  else if(state.near.kind==='drop') takeDrop(state.near.drop);
}
function takeDrop(d){if(!d||d.taken||isLiveTactical(d)||!isDropInCurrentPlace(d))return; if(d.type==='rareChest'){openRareChest(d);state.near=null;updateHint();return;} const item=d.type; const ok=applyItem(item); if(!ok)return; d.taken=true; state.near=null; updateHint(); audio.play('pickup'); toast('Alındı: '+lootName(item));}
function openRareChest(d){d.taken=true; state.chests++; state.stats.rareOpened++; audio.play('chest'); const rewards=['plasma','frost','flame','bolt','armor','helmet','bag','sniper','minigun','grenade','drone']; const a=chooseFrom(rewards,'armor'), b=chooseFrom(rewards,'helmet'); addDrop(a,d.x,d.y-28,{rare:true}); if(Math.random()<.35)addDrop(b,d.x+38,d.y-12,{rare:true}); toast('Nadir sandık açıldı: ödül düştü, E ile al.');}
function applyItem(type){
  type=normalizeLoot(type,'shield');
  const p=state.player, cls=classDefs[state.selectedClass];
  if(type==='medkit'){state.stats.heals++; p.hp=clamp(p.hp+26*cls.heal,0,p.maxHp); toast('Medkit: can yenilendi'); return true;}
  else if(type==='drink'){const base=p.baseSpeed||classDefs[state.selectedClass].speed; p.baseSpeed=base; if(!p.energyBoostUntil||state.elapsed>=p.energyBoostUntil)p.speed=base+16; p.energyBoostUntil=Math.max(p.energyBoostUntil||0,state.elapsed+7.5); toast('Enerji içeceği: sadece hız verir, silah vermez'); return true;}
  else if(type==='shield'){p.hp=clamp(p.hp+16,0,p.maxHp+18); toast('Zırh parçası: küçük geçici can'); return true;}
  else if(type==='armor'){state.equip.armor=clamp((state.equip.armor||0)+1,0,3); toast('Zırh geliştirildi Lv.'+state.equip.armor); return true;}
  else if(type==='helmet'){state.equip.helmet=clamp((state.equip.helmet||0)+1,0,3); toast('Kask geliştirildi Lv.'+state.equip.helmet); return true;}
  else if(type==='bag'){state.equip.bag=clamp((state.equip.bag||0)+1,0,3); toast('Çanta geliştirildi: loot şansı arttı'); return true;}
  else if(type==='grenade'){state.equip.grenades=clamp((state.equip.grenades||0)+2,0,9); toast('El bombası alındı: F ile kullan. Stok: '+state.equip.grenades); return true;}
  else if(type==='drone'){
    if((p.drones||0)>=DRONE_LIMIT){toast('Drone sınırı dolu: yerine zırh parçası'); p.hp=clamp(p.hp+12,0,p.maxHp+18); return true;}
    p.drones=clamp((p.drones||0)+1,0,DRONE_LIMIT); unlockAchievement('drone','Drone desteği kuruldu'); toast('Drone yardımcısı aktif! '+p.drones+'/'+DRONE_LIMIT); return true;
  }
  else if(type==='mine'){state.equip.mines=clamp((state.equip.mines||0)+3,0,12); toast('Mayın paketi alındı: F ile koy. Stok: '+state.equip.mines); return true;}
  else if(weapons[type]){p.weapon=type; state.weaponLevel[type]=Math.max(state.weaponLevel[type]||1,1); toast(weapons[type].name+' kuşanıldı'); return true;}
  toast('Bilinmeyen eşya alınamadı: '+String(type||'?'));
  return false;
}

function spawnMinePack(){for(let i=0;i<3;i++)placeMine();}
function enterBuilding(b){
  clearLiveTactical(); state.near=null; state.doorCooldown=.45; state.enteredBuildings++; state.currentBuilding=b; state.currentRoom=getRoom(b); state.mode='interior';
  const spawn=findClearRoomSpot(state.currentRoom.exit.x,state.currentRoom.exit.y-72,state.player.r);
  state.player.x=spawn.x; state.player.y=spawn.y; state.player.invuln=Math.max(state.player.invuln||0,.55);
  state.bullets=[]; audio.play('door'); audio.music('interior_loop'); toast(b.name+' içine girildi');
}
function exitBuilding(){
  clearLiveTactical(); state.near=null; const b=state.currentBuilding; if(!b){state.mode='world'; return;}
  state.mode='world';
  const outward=Math.atan2(b.door.y-(b.y+b.h*.38),b.door.x-(b.x));
  const safe=findClearWorldSpot(b.door.x,b.door.y,state.player.r,outward,128);
  state.player.x=safe.x; state.player.y=safe.y; state.player.invuln=Math.max(state.player.invuln||0,1.15);
  state.camera.x=safe.x; state.camera.y=safe.y; state.doorCooldown=.9; clearExitDanger(safe.x,safe.y);
  state.currentRoom=null; state.currentBuilding=null; state.bullets=[]; audio.play('door'); audio.music(hasActiveBoss()?'boss_loop':'world_loop');
}
function getRoom(b){if(map.rooms.has(b.id))return map.rooms.get(b.id); const rnd=rng(randHash(b.x|0,b.y|0,map.seed)); const room={id:b.id,type:b.type,w:1000,h:640,props:[],enemies:[],chests:[],exit:{x:500,y:596}}; const poolBy={house:['couch','table','shelf','bed','crate'],warehouse:['shelf','crate','barrel','locker'],market:['shelf','crate','barrel','table'],lab:['computer','locker','table','barrel'],bunker:['crate','locker','barrel','shelf'],tower:['crate','barrel','computer']}; const pool=poolBy[b.type]||poolBy.house;
  function addProp(type,x,y,w=62,h=62,solid=true){room.props.push({type,x,y,w,h,solid});}
  for(let i=0;i<7;i++) addProp(pool[i%pool.length],100+i*125,90+rnd()*18,70,60,true);
  for(let i=0;i<4;i++) addProp(pool[(i+2)%pool.length],85,180+i*90,70,60,true);
  for(let i=0;i<4;i++) addProp(pool[(i+3)%pool.length],915,180+i*92,70,60,true);
  const count=5+Math.floor(rnd()*7); let attempts=0; while(room.props.length<count+15&&attempts++<200){const type=pool[Math.floor(rnd()*pool.length)]; const x=160+rnd()*680,y=165+rnd()*330; const w=type==='couch'?95:70,h=type==='couch'?54:60; const rect={x:x-w/2,y:y-h/2,w,h}; const bad=dist(x,y,room.exit.x,room.exit.y)<160||room.props.some(p=>rectsOverlap(rect,{x:p.x-p.w/2-10,y:p.y-p.h/2-10,w:p.w+20,h:p.h+20})); if(!bad)addProp(type,x,y,w,h,true);}
  const chestCount=1+(b.type==='bunker'?2:0)+(b.type==='lab'?1:0)+(rnd()<.35?1:0); for(let i=0;i<chestCount;i++){const tier=(b.type==='bunker'||rnd()>.86)?'rare':(b.type==='lab'||rnd()>.72)?'risky':'normal'; const cSpot=findClearRoomSpot(220+rnd()*560,190+rnd()*280,24,room); room.chests.push({x:cSpot.x,y:cSpot.y,open:false,tier});}
  const eCount=2+Math.floor(rnd()*4)+(b.type==='lab'||b.type==='bunker'?2:0); for(let i=0;i<eCount;i++){const eSpot=findClearRoomSpot(180+rnd()*640,150+rnd()*330,22,room); room.enemies.push(makeEnemy(['walker','crawler','hound','brute'][Math.floor(rnd()*4)],eSpot.x,eSpot.y,true));}
  map.rooms.set(b.id,room); return room;}
function chooseChestLoot(tier='normal'){
  state.lootStep++;
  if(state.lootStep===1) return 'scatter';
  if(state.lootStep===2) return 'smg';
  if(state.lootStep===3) return 'arc';
  if(state.lootStep===4) return 'armor';
  if(state.lootStep===5) return 'sniper';
  const b=state.currentBuilding, bt=b&&b.type; const region=state.region; const cls=classDefs[state.selectedClass];
  let entries=[];
  if(bt==='market') entries=[['medkit',1.0],['drink',1.2],['shield',1.8],['bag',.55],['smg',.45],['grenade',.68],['mine',.28]];
  else if(bt==='warehouse') entries=[['scatter',1.0],['smg',1.0],['minigun',.35],['sniper',.45],['mine',1.15],['grenade',1.00],['armor',.75],['bag',.45],['drone',.28]];
  else if(bt==='lab') entries=[['plasma',.65],['frost',.8],['bolt',.55],['arc',.85],['helmet',.55],['shield',1.0]];
  else if(bt==='bunker') entries=[['plasma',.55],['flame',.6],['bolt',.55],['sniper',.65],['minigun',.38],['grenade',.82],['mine',.55],['armor',.75],['helmet',.75],['bag',.55],['rareChest',.26],['drone',.22]];
  else if(bt==='tower') entries=[['sniper',.85],['arc',.75],['helmet',.8],['bolt',.5],['drone',.35],['shield',1.0]];
  else entries=[['shield',1.5],['drink',.9],['medkit',.55],['scatter',.55],['smg',.55],['armor',.45]];
  if(region==='Sanayi Bölgesi') entries.push(['mine',1.05],['grenade',.82],['armor',.45],['smg',.35],['minigun',.18]);
  if(region==='Laboratuvar Alanı') entries.push(['plasma',.35],['frost',.45],['bolt',.28]);
  if(region==='Bunker Çevresi'||region==='Boss Bölgesi') entries.push(['rareChest',.16],['flame',.32],['sniper',.32]);
  let luck=(Math.random()*cls.loot*(1+(state.equip.bag||0)*.10));
  if(tier==='rare') luck+=.28;
  if(tier==='risky') luck+=.14;
  if(luck>.985) return chooseFrom(['plasma','frost','flame','bolt','minigun','grenade','mine','rareChest'],'armor');
  if(luck>.875) return chooseFrom(['sniper','smg','minigun','mine','grenade','grenade','armor','helmet','bag','drone'],'shield');
  return chooseWeighted(entries,'shield');
}
function lootName(type){return weapons[type]?.name||({drone:'Drone Yardımcısı',mine:'Mayın Paketi',grenade:'El Bombası',medkit:'Medkit',shield:'Zırh Parçası',drink:'Enerji İçeceği',armor:'Zırh',helmet:'Kask',bag:'Çanta',rareChest:'Nadir Sandık'}[type]||'Eşya');}
function droneAvailable(){return !state.player || (state.player.drones||0)<DRONE_LIMIT;}
function normalizeLoot(type,fallback='shield'){
  if(type==='drone'&&!droneAvailable()) return fallback;
  return type;
}
function chooseFrom(pool,fallback='shield'){
  const filtered=pool.map(x=>normalizeLoot(x,fallback)).filter(Boolean);
  return filtered[Math.floor(Math.random()*filtered.length)]||fallback;
}
function chooseWeighted(entries,fallback='shield'){
  const list=entries.map(e=>({type:normalizeLoot(e[0],fallback),w:e[1]})).filter(e=>e.type&&e.w>0);
  const total=list.reduce((a,e)=>a+e.w,0);
  let r=Math.random()*total;
  for(const e of list){r-=e.w;if(r<=0)return e.type;}
  return list[0]?.type||fallback;
}
function openChest(c){if(c.open)return; c.open=true; state.chests++; if(state.mode==='interior')state.stats.interiorChests++; audio.play('chest'); const tier=c.tier||'normal'; if(tier==='risky'){state.stats.riskyChests++; toast('Riskli sandık alarm verdi!'); for(let i=0;i<3;i++){const a=Math.random()*Math.PI*2; const sp=findClearRoomSpot(c.x+Math.cos(a)*120,c.y+Math.sin(a)*90,20); state.currentRoom.enemies.push(makeEnemy(['crawler','hound','walker'][Math.floor(Math.random()*3)],sp.x,sp.y,true));}} if(tier==='rare')state.stats.rareOpened++; const loot=chooseChestLoot(tier); c.loot=loot; const rawX=c.x+(Math.random()-.5)*42, rawY=c.y-52; const lSpot=state.mode==='interior'?findClearRoomSpot(rawX,rawY,16):{x:rawX,y:rawY}; addDrop(loot,lSpot.x,lSpot.y,{rare:tier==='rare',fromChest:true}); toast((tier==='rare'?'Nadir sandık':tier==='risky'?'Riskli sandık':'Sandık')+' açıldı: '+lootName(loot)+' çıktı. E ile al.');}

function difficultyFactor(){
  const time=clamp(state.elapsed/720,0,1.45);
  const kills=clamp(state.kills/420,0,.75);
  const boss=clamp(state.bosses*.065,0,.65);
  const levelPressure=clamp((state.level-8)/32,0,.55);
  const phaseBoost=state.phase==='night'?.32:state.phase==='dusk'?.14:0;
  return clamp(1+time*.78+kills*.42+boss+levelPressure*.72+phaseBoost,1,2.72);
}
function spawnBudget(){return state.perfMode?52:BALANCE.maxWorldEnemies;}
function hasActiveBoss(){return state.worldEnemies.some(e=>e.kind==='boss');}
function makeEnemy(type,x,y,inside=false){const d=enemyDefs[type]; const f=inside?clamp(difficultyFactor()*.88,1,2.45):difficultyFactor(); const hp=Math.round(d.hp*(1+(f-1)*1.05)); return {kind:'enemy',type,x,y,r:d.r,hp,maxHp:hp,speed:d.speed*(inside?.84:1)*(1+Math.min(.17,(f-1)*.08)),damage:Math.round(d.damage*(1+Math.min(.48,(f-1)*.27))),img:d.img,score:d.score,hit:0};}
function makeBoss(type,x,y){const d=bossDefs[type]; const f=difficultyFactor(); const hp=Math.round(d.hp*(.86+(f-1)*.86)); return {kind:'boss',type,x,y,r:d.r,hp,maxHp:hp,speed:d.speed*(1+Math.min(.11,(f-1)*.055)),damage:Math.round(d.damage*.88*(1+Math.min(.42,(f-1)*.22))),img:d.img,score:260,hit:0,special:9.5+Math.random()*3.0,threatReady:false};}
function spawnEnemy(){if(state.mode!=='world'||state.worldEnemies.length>=spawnBudget()+10)return; const types=state.elapsed>120?['walker','crawler','brute','hound']:state.elapsed>55?['walker','crawler','hound']:['walker','crawler']; const type=types[Math.floor(Math.random()*types.length)]; const p=state.player; let x,y,tries=0; do{const a=Math.random()*Math.PI*2, rr=Math.max(cw,ch)*.65+180+Math.random()*160; x=p.x+Math.cos(a)*rr; y=p.y+Math.sin(a)*rr; tries++;}while(worldCollides(x,y,28)&&tries<20); state.worldEnemies.push(makeEnemy(type,x,y,false));}
function spawnBoss(){if(state.mode!=='world'||hasActiveBoss())return; const keys=Object.keys(bossDefs); const recent=state.lastBossTypes||[]; const pool=keys.filter(k=>!recent.includes(k)); const pick=pool.length?pool:keys; const type=pick[Math.floor(Math.random()*pick.length)]; state.lastBossTypes=[...recent,type].slice(-3); const p=state.player; const a=Math.random()*Math.PI*2, rr=Math.max(cw,ch)*.65+260; state.worldEnemies.push(makeBoss(type,p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr)); audio.play('boss_spawn'); audio.music('boss_loop'); toast('Mini boss yaklaşıyor: '+(bossNames[type]||type)+'!');}
function getEnemies(){return state.mode==='world'?state.worldEnemies:state.currentRoom.enemies;}
function updateEnemies(dt){const arr=getEnemies(); const p=state.player; for(const e of arr){e.hit=Math.max(0,e.hit-dt); const dx=p.x-e.x,dy=p.y-e.y,l=Math.hypot(dx,dy)||1; e.slow=Math.max(0,(e.slow||0)-dt); e.burn=Math.max(0,(e.burn||0)-dt); if(e.burn>0){e.hp-=10*dt;} if(e.kind==='boss')updateBossSpecial(e,dt); const speed=e.speed*(e.hit>0?.55:1)*(e.slow>0?.55:1); const collider=state.mode==='world'?worldCollides:roomCollider; tryMove(e,dx/l*speed*dt,dy/l*speed*dt,e.r,collider);} for(let i=arr.length-1;i>=0;i--){if(arr[i].hp<=0){killEnemy(arr[i]); arr.splice(i,1);}} if(state.mode==='world' && !arr.some(e=>e.kind==='boss') && state.elapsed>70) audio.music('world_loop');}
function killEnemy(e){
  state.kills++; if(e.kind==='boss')state.bosses++; addWeaponXp(e.kind==='boss'?18:4); audio.play('hit'); state.stats.weaponKills[state.player.weapon]=1; if(state.task&&state.task.taskWeapons)state.task.taskWeapons[state.player.weapon]=1;
  for(let i=0;i<(state.perfMode?6:12);i++)state.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*135,vy:(Math.random()-.5)*135,t:.48,c:e.kind==='boss'?'#00ff88':'#ff6674'});
  if(e.kind==='enemy'&&e.type==='brute') explodeAt(e.x,e.y,{radius:112,damage:42,color:'#fb923c',hurtPlayer:true,playerDamage:5,particles:state.perfMode?8:14,label:'Şişman zombi patladı!'});
  const r=Math.random();
  if(e.kind==='boss'){
    if(state.player.hp/state.player.maxHp<.4)unlockAchievement('cesur','Can düşükken boss indirildi');
    const bossLoot=chooseFrom(['bolt','plasma','sniper','flame','frost','minigun','grenade','rareChest','armor','helmet','bag','drone'],'armor');
    addDrop(bossLoot,e.x,e.y,{rare:true});
    if(Math.random()<.16) addDrop(chooseFrom(['shield','drink','medkit'],'shield'),e.x+28,e.y+18);
  }
  else if(r<BALANCE.enemyDropGear) addDrop(chooseFrom(['scatter','arc','smg','minigun','frost','mine','mine','grenade','grenade','armor','helmet','bag','drone'],'shield'),e.x,e.y);
  else if(r<BALANCE.enemyDropUtility) addDrop(chooseWeighted([['shield',1.15],['drink',.72],['medkit',.42],['grenade',.45],['mine',.35]],'shield'),e.x,e.y);
}

function explodeAt(x,y,opts={}){
  const radius=opts.radius||110, damage=opts.damage||55, color=opts.color||'#ffe600';
  const enemies=getEnemies();
  for(const ee of enemies){
    const dd=dist(x,y,ee.x,ee.y);
    if(dd<radius){ee.hp-=Math.max(8,damage*(1-dd/radius*.42)); ee.hit=.22;}
  }
  if(opts.hurtPlayer){
    const p=state.player, dd=dist(x,y,p.x,p.y);
    if(dd<radius*.78&&p.invuln<=0){const red=clamp(1-(state.equip.armor||0)*.08-(state.equip.helmet||0)*.06,.35,1); p.hp-=Math.max(2,Math.round((opts.playerDamage||10)*red)); p.invuln=.38; audio.play('hurt'); if(p.hp<=0)endGame();}
  }
  const count=Math.min(opts.particles||12,state.perfMode?10:18);
  for(let k=0;k<count;k++)state.particles.push({x,y,vx:(Math.random()-.5)*220,vy:(Math.random()-.5)*220,t:.42,c:color});
  if(opts.label) toast(opts.label);
  audio.play('hit');
}
function nearestEnemy(range=640){const p=state.player; let target=null,bd=range; for(const e of getEnemies()){if(e.hp<=0)continue; const d=dist(p.x,p.y,e.x,e.y); if(d<bd){bd=d;target=e;}} return target;}
function placeMine(){const p=state.player; const a=p.face||0; const live=state.drops.filter(d=>d.type==='mine-live'&&isDropInCurrentPlace(d)); if(live.length>=BALANCE.maxLiveMines){const old=live[0]; const idx=state.drops.indexOf(old); if(idx>=0)state.drops.splice(idx,1);} addDrop('mine-live',p.x+Math.cos(a)*48,p.y+Math.sin(a)*48,{armed:true,t:26,trigger:72}); toast('Mayın yerleştirildi');}
function throwGrenade(){const p=state.player; const target=nearestEnemy(700); const a=target?Math.atan2(target.y-p.y,target.x-p.x):(p.face||0); const speed=target?520:430; const live=state.drops.filter(d=>d.type==='grenade-live'&&isDropInCurrentPlace(d)); if(live.length>=BALANCE.maxLiveGrenades){const old=live[0]; const idx=state.drops.indexOf(old); if(idx>=0)state.drops.splice(idx,1);} addDrop('grenade-live',p.x+Math.cos(a)*34,p.y+Math.sin(a)*34,{vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,t:.68,rare:true}); toast('El bombası atıldı');}
function useTactical(){if(!state.started||state.gameOver||!state.player)return; if((state.grenadeCooldown||0)>0)return; if((state.equip.grenades||0)>0&&nearestEnemy(720)){state.equip.grenades--; state.grenadeCooldown=.55; throwGrenade(); return;} if((state.equip.mines||0)>0){state.equip.mines--; state.grenadeCooldown=.35; placeMine(); return;} if((state.equip.grenades||0)>0){state.equip.grenades--; state.grenadeCooldown=.55; throwGrenade(); return;} toast('Mayın veya el bombası yok');}

function addHazard(x,y,opts={}){
  const p=state.player;
  let hx=x, hy=y;
  const minDist=opts.minDist||72;
  const d=dist(p.x,p.y,hx,hy);
  if(d<minDist){
    const a=Math.atan2(hy-p.y,hx-p.x)||Math.random()*Math.PI*2;
    hx=p.x+Math.cos(a)*minDist;
    hy=p.y+Math.sin(a)*minDist;
  }
  if(state.hazards.length>7) state.hazards.shift();
  state.hazards.push({
    x:hx,y:hy,
    r:opts.r||58,
    t:opts.t||4.2,
    maxT:opts.t||4.2,
    warn:opts.warn||1.15,
    color:opts.color||'#ff7a18',
    damage:opts.damage||5,
    label:opts.label||'TEHLİKE'
  });
}
function bossCanSpecial(e){
  if(!state.player) return false;
  const d=dist(state.player.x,state.player.y,e.x,e.y);
  if(d>540) return false;
  const s=state.mode==='world'?worldToScreen(e.x,e.y):roomToScreen(e.x,e.y);
  const pad=120;
  return s.x>-pad && s.x<cw+pad && s.y>-pad && s.y<ch+pad;
}
function updateBossSpecial(e,dt){
  const visibleThreat=bossCanSpecial(e);
  if(!visibleThreat){e.special=Math.max(e.special||0,1.8); return;}
  if(!e.threatReady){e.threatReady=true; e.special=Math.max(e.special||0,2.4); toast('Boss görüş alanına girdi!'); return;}
  e.special=(e.special||4.8)-dt; if(e.special>0)return; e.special=6.8+Math.random()*3.2; const p=state.player; const type=e.type;
  if(type==='machine'){
    for(let i=-1;i<=1;i++){const a=Math.atan2(p.y-e.y,p.x-e.x)+i*.11; state.bullets.push({owner:'boss',x:e.x,y:e.y,vx:Math.cos(a)*430,vy:Math.sin(a)*430,r:7,life:.9,damage:6,color:'#ff3344'});}
    if(dist(p.x,p.y,e.x,e.y)<430){const a=Math.random()*Math.PI*2; getEnemies().push(makeEnemy('crawler',e.x+Math.cos(a)*85,e.y+Math.sin(a)*85,state.mode==='interior'));}
    toast('Kule Muhafızı lazer hazırlıyor!');
  }
  else if(type==='butcher'){const a=Math.atan2(p.y-e.y,p.x-e.x); if(dist(p.x,p.y,e.x,e.y)<360){e.x+=Math.cos(a)*22; e.y+=Math.sin(a)*22;} addHazard(p.x,p.y,{r:54,t:3.7,warn:1.35,color:'#f59e0b',damage:4,label:'ZEHİR',minDist:88}); toast('Sarı alan: üstünde durma, hasar verir!');}
  else if(type==='plague'){
    addHazard(p.x+(Math.random()-.5)*70,p.y+(Math.random()-.5)*70,{r:62,t:4.4,warn:1.45,color:'#84cc16',damage:4,label:'ASİT',minDist:92});
    if(Math.random()<.55){const a=Math.atan2(p.y-e.y,p.x-e.x); state.bullets.push({owner:'boss',x:e.x,y:e.y,vx:Math.cos(a)*360,vy:Math.sin(a)*360,r:8,life:1.1,damage:5,color:'#a3e635'});}
    toast('Zehir Doktoru asit alanı attı!');
  }
  else if(type==='colossus'){
    const a=Math.atan2(p.y-e.y,p.x-e.x); if(dist(p.x,p.y,e.x,e.y)<430){e.x+=Math.cos(a)*16; e.y+=Math.sin(a)*16;}
    addHazard(p.x,p.y,{r:72,t:3.4,warn:1.55,color:'#ef4444',damage:5,label:'EZİLME',minDist:118});
    toast('Demir Koloss ağır darbe hazırlıyor!');
  }
  else if(type==='queen'){
    const enemies=getEnemies();
    if(enemies.length<BALANCE.maxWorldEnemies+8){for(let i=0;i<2;i++){const a=Math.random()*Math.PI*2; enemies.push(makeEnemy(Math.random()<.55?'hound':'crawler',e.x+Math.cos(a)*92,e.y+Math.sin(a)*92,state.mode==='interior'));}}
    addHazard(p.x+(Math.random()-.5)*80,p.y+(Math.random()-.5)*80,{r:48,t:3.2,warn:1.25,color:'#d946ef',damage:3,label:'SÜRÜ',minDist:84});
    toast('Sürü Kraliçesi yaratık çağırdı!');
  }
  else if(type==='phantom'){
    const base=Math.atan2(p.y-e.y,p.x-e.x); for(let i=-2;i<=2;i++){const a=base+i*.16; state.bullets.push({owner:'boss',x:e.x,y:e.y,vx:Math.cos(a)*470,vy:Math.sin(a)*470,r:6,life:.82,damage:5,color:'#a78bfa'});}
    if(dist(p.x,p.y,e.x,e.y)<380){const back=base+Math.PI; e.x+=Math.cos(back)*26; e.y+=Math.sin(back)*26;}
    toast('Gölge Avcı hayalet mermiler saçtı!');
  }
  else {for(let k=0;k<1;k++)addHazard(p.x+(Math.random()-.5)*105,p.y+(Math.random()-.5)*105,{r:50,t:3.5,warn:1.25,color:'#22c55e',damage:3,label:'RADYASYON',minDist:82}); toast('Yeşil alan: radyasyon! Dışına çık.');}}
function updateHazards(dt){const p=state.player; state.hazardHitCooldown=Math.max(0,(state.hazardHitCooldown||0)-dt); for(const h of state.hazards){h.t-=dt; h.warn=Math.max(0,(h.warn||0)-dt); if(h.warn<=0 && dist(p.x,p.y,h.x,h.y)<h.r && state.hazardHitCooldown<=0){const red=clamp(1-(state.equip.armor||0)*.08-(state.equip.helmet||0)*.05,.35,1); p.hp-=Math.max(1,Math.round(h.damage*red)); p.invuln=.32; state.hazardHitCooldown=.78; audio.play('hurt'); if(p.hp<=0)endGame();}} state.hazards=state.hazards.filter(h=>h.t>0);}
function drawHazards(){for(const h of state.hazards){const s=state.mode==='world'?worldToScreen(h.x,h.y):roomToScreen(h.x,h.y); const sc=s.s||1; const active=(h.warn||0)<=0; const pulse=.78+.22*Math.sin(performance.now()/115); ctx.save(); ctx.lineWidth=Math.max(2,3*sc); ctx.shadowBlur=active?18:10; ctx.shadowColor=h.color; if(!active){ctx.globalAlpha=.65*pulse; ctx.strokeStyle=h.color; ctx.setLineDash([10*sc,7*sc]); ctx.beginPath();ctx.ellipse(s.x,s.y,h.r*sc,h.r*.46*sc,0,0,Math.PI*2);ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle='rgba(0,0,0,.72)'; ctx.fillRect(s.x-36*sc,s.y-9*sc,72*sc,18*sc); ctx.fillStyle='#ffe600'; ctx.font='bold '+Math.max(10,11*sc)+'px Share Tech Mono,monospace'; ctx.textAlign='center'; ctx.fillText('KAÇ',s.x,s.y+4*sc);}
    else{ctx.globalAlpha=clamp(h.t/(h.maxT||4),.18,.34); ctx.fillStyle=h.color; ctx.beginPath();ctx.ellipse(s.x,s.y,h.r*sc,h.r*.46*sc,0,0,Math.PI*2);ctx.fill(); ctx.globalAlpha=.74; ctx.strokeStyle=h.color; ctx.beginPath();ctx.ellipse(s.x,s.y,h.r*sc,h.r*.46*sc,0,0,Math.PI*2);ctx.stroke();}
    ctx.restore();}}

function contactDamage(dt){state.contactCooldown-=dt; if(state.contactCooldown>0)return; const p=state.player; if(p.invuln>0)return; const pr=playerHitRadius(); for(const e of getEnemies()){if(dist(p.x,p.y,e.x,e.y)<pr+enemyHitRadius(e)){let dmg=e.damage*(1-(state.equip.armor||0)*.10-(state.equip.helmet||0)*.05); if(e.kind==='boss')dmg*=.82*(1-(state.equip.helmet||0)*.08); p.hp-=Math.max(2,Math.round(dmg)); p.invuln=.35; state.contactCooldown=.72; audio.play('hit'); if(p.hp<=0){endGame();} break;}}
}
function autoFire(dt){
  state.fireCooldown-=dt; if(state.fireCooldown>0)return;
  const p=state.player,w=weapons[p.weapon]; let target=null,bd=w.range;
  for(const e of getEnemies()){if(e.hp<=0)continue; const d=dist(p.x,p.y,e.x,e.y); if(d<bd){bd=d; target=e;}}
  if(!target)return; state.fireCooldown=w.rate; const base=Math.atan2(target.y-p.y,target.x-p.x); p.face=base; if(Math.abs(Math.cos(base))>.15)p.flip=Math.cos(base)<0;
  for(let i=0;i<w.shots;i++){const off=(i-(w.shots-1)/2)*w.spread+(Math.random()-.5)*w.spread*.35; state.bullets.push({owner:'player',x:p.x,y:p.y,vx:Math.cos(base+off)*w.speed,vy:Math.sin(base+off)*w.speed,r:w.aoe?7:5,life:w.range/w.speed,damage:effectiveDamage(w),color:w.color,pierce:w.pierce||0,aoe:w.aoe||0,slow:w.slow||0,burn:w.burn||0,chain:w.chain||0,poison:w.poison||0,hitEnemies:new Set()});}
  audio.play(p.weapon==='scatter'||p.weapon==='flame'?'shotgun':'shoot');
}
function updateDrones(dt){
  const p=state.player; if(!p.drones)return;
  state.droneCooldown-=dt; if(state.droneCooldown>0)return;
  let target=null,bd=360;
  for(const e of getEnemies()){if(e.hp<=0)continue; const d=dist(p.x,p.y,e.x,e.y); if(d<bd){bd=d; target=e;}}
  if(!target)return; state.droneCooldown=BALANCE.droneCooldown;
  for(let i=0;i<p.drones;i++){const a=performance.now()/520+i*Math.PI*2/p.drones; const ox=Math.cos(a)*42, oy=Math.sin(a)*30; const base=Math.atan2(target.y-(p.y+oy),target.x-(p.x+ox)); state.bullets.push({owner:'drone',x:p.x+ox,y:p.y+oy,vx:Math.cos(base)*720,vy:Math.sin(base)*720,r:4,life:.48,damage:BALANCE.droneDamage,color:'#ffe600'});}
}
function updateBullets(dt){
  for(const b of state.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;}
  const enemies=getEnemies(), p=state.player;
  for(let bi=state.bullets.length-1;bi>=0;bi--){
    const b=state.bullets[bi]; let remove=b.life<=0;
    if(!remove && b.owner==='boss'){
      if(p.invuln<=0 && dist(b.x,b.y,p.x,p.y)<playerHitRadius()+(b.r||3)*0.9){
        const red=clamp(1-(state.equip.armor||0)*.07-(state.equip.helmet||0)*.08,.35,1);
        p.hp-=Math.max(1,Math.round((b.damage||6)*red));
        p.invuln=.42; audio.play('hurt'); remove=true;
        if(p.hp<=0)endGame();
      }
    }
    if(!remove && b.owner!=='boss'){
      for(const e of enemies){
        if(e.hp<=0) continue;
        if(b.hitEnemies && b.hitEnemies.has(e)) continue;
        if(dist(b.x,b.y,e.x,e.y)<bulletEnemyRadius(e,b)){
          if(b.hitEnemies) b.hitEnemies.add(e);
          e.hp-=b.damage; e.hit=.12;
          if(b.slow)e.slow=Math.max(e.slow||0,b.slow);
          if(b.burn)e.burn=Math.max(e.burn||0,b.burn);
          if(b.poison)e.burn=Math.max(e.burn||0,b.poison);
          if(b.chain){let jumps=b.chain; for(const ee of enemies){if(jumps<=0)break; if(ee!==e && ee.hp>0 && dist(e.x,e.y,ee.x,ee.y)<155){ee.hp-=b.damage*.45; ee.hit=.12; jumps--;}}}
          if(b.aoe){
            for(const ee of enemies){ if(ee!==e && ee.hp>0 && dist(b.x,b.y,ee.x,ee.y)<b.aoe){ee.hp-=b.damage*.55; ee.hit=.12;} }
            for(let i=0;i<(state.perfMode?5:10);i++)state.particles.push({x:b.x,y:b.y,vx:(Math.random()-.5)*95,vy:(Math.random()-.5)*95,t:.32,c:b.color});
            remove=true;
          } else {
            state.particles.push({x:b.x,y:b.y,vx:0,vy:0,t:.18,c:b.color});
            if(b.pierce>0){b.pierce--; b.damage*=.82;} else remove=true;
          }
          break;
        }
      }
    }
    if(remove)state.bullets.splice(bi,1);
  }
}
function updateDrops(dt){
  const enemies=getEnemies();
  for(let i=state.drops.length-1;i>=0;i--){
    const d=state.drops[i];
    if(!isDropInCurrentPlace(d)) continue;
    if(d.type==='grenade-live'){
      d.t=(d.t||0)-dt; d.x+=(d.vx||0)*dt; d.y+=(d.vy||0)*dt; d.vx=(d.vx||0)*.94; d.vy=(d.vy||0)*.94;
      if(state.mode==='interior'&&state.currentRoom){const r=state.currentRoom; if(d.x<60||d.x>r.w-60){d.x=clamp(d.x,60,r.w-60); d.vx=-(d.vx||0)*.28;} if(d.y<70||d.y>r.h-70){d.y=clamp(d.y,70,r.h-70); d.vy=-(d.vy||0)*.28;}}
      if(d.t<=0){explodeAt(d.x,d.y,{radius:128,damage:74,color:'#f97316',hurtPlayer:true,playerDamage:8,particles:state.perfMode?8:15}); state.drops.splice(i,1);}
      continue;
    }
    if(d.type==='mine-live'){
      d.t=(d.t||0)-dt;
      let blown=false;
      for(const e of enemies){if(dist(d.x,d.y,e.x,e.y)<(d.trigger||66)+enemyHitRadius(e)*0.22){blown=true;break;}}
      if(blown){explodeAt(d.x,d.y,{radius:118,damage:68,color:'#ffe600',hurtPlayer:false,particles:state.perfMode?7:13}); state.drops.splice(i,1);}
      else if(d.t<=0){state.drops.splice(i,1);}
      continue;
    }
  }
  if(state.drops.length>95){state.drops=state.drops.filter(d=>isLiveTactical(d)||!d.taken).slice(-95);}
}

function updateParticles(dt){for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.t-=dt;} state.particles=state.particles.filter(p=>p.t>0); if(state.particles.length>BALANCE.maxParticles)state.particles.splice(0,state.particles.length-BALANCE.maxParticles);}
function updateUi(){ui.hp.textContent=Math.max(0,Math.ceil(state.player.hp))+'/'+state.player.maxHp; ui.hpbar.style.width=clamp(state.player.hp/state.player.maxHp*100,0,100)+'%'; ui.score.textContent=state.score; ui.time.textContent=fmtTime(state.elapsed); ui.bossTime.textContent=fmtTime(Math.max(0,state.nextBoss-state.elapsed)); ui.kills.textContent=state.kills; ui.bosses.textContent=state.bosses; ui.chests.textContent=state.chests; ui.level.textContent=state.level; ui.weapon.textContent=weapons[state.player.weapon].name+' Lv.'+weaponLvl(state.player.weapon)+(state.player.drones?' + Drone '+state.player.drones+'/'+DRONE_LIMIT:'')+(state.equip.armor?' Z'+state.equip.armor:'')+(state.equip.helmet?' K'+state.equip.helmet:'')+(state.equip.bag?' Ç'+state.equip.bag:'')+(state.equip.mines?' Mayın '+state.equip.mines:'')+(state.equip.grenades?' Bomba '+state.equip.grenades:''); if(ui.tactical)ui.tactical.textContent=(state.equip.grenades||0)>0?'💣':((state.equip.mines||0)>0?'M':'F');}
function endGame(){if(state.gameOver)return; state.gameOver=true; clearControls(); audio.stop(); audio.play('gameover'); saveLocalProfile(); showGameOver(); submitScore().then(()=>loadLeaderboard(currentLeaderboardPeriod)).catch(()=>{});}
function submitScore(){return fetch(REST+'/score-save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:state.name,player_key:state.playerKey,session:state.session,score:state.score,duration:Math.floor(state.elapsed),kills:state.kills,bosses:state.bosses,chests:state.chests,level:state.level,character:classDefs[state.selectedClass].name,achievements:Object.keys(state.stats.achievements||{})})}).catch(()=>{});}
let currentLeaderboardPeriod='all';
function showGameOver(){currentLeaderboardPeriod='all'; ui.result.innerHTML=`<div><span>SKOR</span><b>${state.score}</b></div><div><span>SÜRE</span><b>${fmtTime(state.elapsed)}</b></div><div><span>DÜŞMAN</span><b>${state.kills}</b></div><div><span>BOSS</span><b>${state.bosses}</b></div><div><span>SANDIK</span><b>${state.chests}</b></div><div><span>LVL</span><b>${state.level}</b></div>`; ui.gameover.hidden=false; loadLeaderboard('all');}
document.querySelectorAll('.uacss5-tabs button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.uacss5-tabs button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); loadLeaderboard(b.dataset.period||'all');}));
function loadLeaderboard(period){ui.leaderboard.innerHTML='<div class="uacss5-row"><span>#</span><span>Oyuncu</span><span>Skor</span><span>Süre</span><span class="hide-sm">Düş.</span><span class="hide-sm">Boss</span><span class="hide-sm">Lv</span></div>'; fetch(REST+'/leaderboard?period='+encodeURIComponent(period)+'&limit=10').then(r=>r.json()).then(d=>{if(!d.ok)return; if(!d.entries||!d.entries.length){const row=document.createElement('div'); row.className='uacss5-row'; row.innerHTML='<span>-</span><span>Henüz kayıt yok</span><span>0</span><span>00:00</span><span class="hide-sm">0</span><span class="hide-sm">0</span><span class="hide-sm">0</span>'; ui.leaderboard.appendChild(row); return;} d.entries.forEach(e=>{const row=document.createElement('div'); row.className='uacss5-row'; row.innerHTML=`<span>${e.rank}</span><span>${escapeHtml(e.name)}</span><span>${e.score}</span><span>${fmtTime(e.duration)}</span><span class="hide-sm">${e.kills}</span><span class="hide-sm">${e.bosses}</span><span class="hide-sm">${e.level}</span>`; ui.leaderboard.appendChild(row);});}).catch(()=>{const row=document.createElement('div'); row.className='uacss5-row'; row.innerHTML='<span>!</span><span>Liderlik yüklenemedi</span><span>0</span><span>00:00</span><span class="hide-sm">0</span><span class="hide-sm">0</span><span class="hide-sm">0</span>'; ui.leaderboard.appendChild(row);});}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

function nearPromptPoint(){if(!state.near)return null; if(state.near.kind==='drop'){const d=state.near.drop; const s=state.mode==='world'?worldToScreen(d.x,d.y):roomToScreen(d.x,d.y); return {x:s.x,y:s.y-48*(s.s||1),text:'E: '+lootName(d.type)+' al'};} if(state.near.kind==='chest'){const c=state.near.chest; const s=roomToScreen(c.x,c.y); return {x:s.x,y:s.y-54,text:'E: Sandığı aç'};} if(state.near.kind==='exit'){const r=state.currentRoom; const s=roomToScreen(r.exit.x,r.exit.y); return {x:s.x,y:s.y-48,text:'E: Dışarı çık'};} if(state.near.kind==='door'){const b=state.near.building; const s=worldToScreen(b.door.x,b.door.y); return {x:s.x,y:s.y-42*(s.s||1),text:'E: '+b.name+' içine gir'};} return null;}
function drawNearPrompt(){const p=nearPromptPoint(); if(!p)return; ctx.save(); ctx.font='900 13px Share Tech Mono,monospace'; ctx.textAlign='center'; const w=Math.min(260,Math.max(120,ctx.measureText(p.text).width+26)); ctx.fillStyle='rgba(0,0,0,.78)'; ctx.strokeStyle='rgba(255,230,0,.78)'; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(p.x-w/2,p.y-16,w,26,10); ctx.fill(); ctx.stroke(); ctx.fillStyle='#ffe600'; ctx.fillText(p.text,p.x,p.y+2); ctx.restore();}
function draw(){ctx.clearRect(0,0,cw,ch); if(state.mode==='world')drawWorld(); else drawInterior(); drawHazards(); drawActiveDrops(); drawEntities(); drawFx(); drawNearPrompt(); drawPhaseOverlay();}
function drawPhaseOverlay(){if(state.phase==='day')return; ctx.save(); ctx.fillStyle=state.phase==='night'?'rgba(0,0,0,.24)':'rgba(50,20,70,.12)'; ctx.fillRect(0,0,cw,ch); ctx.restore();}
function worldToScreen(x,y){const z=state.camera.zoom||1; return {x:(x-state.camera.x)*z+cw/2,y:(y-state.camera.y)*z+ch/2,s:z};}
function drawWorld(){
  const z=state.camera.zoom||1, tile=map.tile, startX=Math.floor((state.camera.x-cw/(2*z))/tile)-1, endX=Math.floor((state.camera.x+cw/(2*z))/tile)+1, startY=Math.floor((state.camera.y-ch/(2*z))/tile)-1, endY=Math.floor((state.camera.y+ch/(2*z))/tile)+1;
  for(let ty=startY;ty<=endY;ty++)for(let tx=startX;tx<=endX;tx++){const h=randHash(tx,ty,map.seed)%100; let key=h<14?'asphalt':h<28?'dirt':h<44?'rubble':'grass'; if(Math.abs(ty)%9===0)key='roadH'; if(Math.abs(tx)%11===0)key='roadV'; const im=imgs.tiles&&imgs.tiles[key]; const sx=(tx*tile-state.camera.x)*z+cw/2, sy=(ty*tile-state.camera.y)*z+ch/2; if(im)ctx.drawImage(im,sx,sy,tile*z+1,tile*z+1); else{ctx.fillStyle='#132025';ctx.fillRect(sx,sy,tile*z+1,tile*z+1);} }
  if(!state.perfMode){ctx.save(); ctx.globalAlpha=.08; ctx.strokeStyle='#00f5ff'; ctx.lineWidth=1; for(let x=((-state.camera.x*z)%128)+cw/2%128;x<cw;x+=128){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,ch);ctx.stroke();} for(let y=((-state.camera.y*z)%128)+ch/2%128;y<ch;y+=128){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cw,y);ctx.stroke();} ctx.restore();}
  const drawables=[]; for(const c of visibleChunks(1)){for(const d of c.decor){if(!d.taken)drawables.push({kind:'drop',obj:d,y:d.y});} for(const p of c.props)drawables.push({kind:'prop',obj:p,y:p.y+p.h/2}); for(const b of c.buildings)drawables.push({kind:'building',obj:b,y:b.y+b.h/2});}
  drawables.sort((a,b)=>a.y-b.y).forEach(d=>{if(d.kind==='building')drawBuilding(d.obj); else if(d.kind==='prop')drawPropWorld(d.obj); else drawDrop(d.obj);});
}
function drawBuilding(b){
  const s=worldToScreen(b.x,b.y); const z=s.s||1; const im=imgs.buildings&&imgs.buildings[b.type];
  ctx.save(); ctx.globalAlpha=.86; ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(s.x,s.y+b.h*.28*z,b.w*.34*z,b.h*.13*z,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  if(im)ctx.drawImage(im,s.x-b.w*z/2,s.y-b.h*z/2,b.w*z,b.h*z); else{ctx.fillStyle='#555';ctx.fillRect(s.x-b.w*z/2,s.y-b.h*z/2,b.w*z,b.h*z);}
  if(state.near&&state.near.kind==='door'&&state.near.building.id===b.id){const d=worldToScreen(b.door.x,b.door.y); const dz=d.s||1; ctx.save(); ctx.strokeStyle='#ffe600'; ctx.fillStyle='rgba(255,230,0,.15)'; ctx.lineWidth=2; ctx.beginPath();ctx.ellipse(d.x,d.y,40*dz,16*dz,0,0,Math.PI*2);ctx.fill();ctx.stroke(); ctx.fillStyle='rgba(0,0,0,.78)';ctx.fillRect(d.x-36*dz,d.y-34*dz,72*dz,20*dz); ctx.fillStyle='#ffe600';ctx.font='bold '+Math.max(10,11*dz)+'px Share Tech Mono,monospace';ctx.textAlign='center';ctx.fillText('E  GİR',d.x,d.y-20*dz);ctx.restore();}
  const t=worldToScreen(b.x,b.y-b.h*.50); ctx.fillStyle='rgba(255,255,255,.88)'; ctx.font='bold '+Math.max(10,11*z)+'px Share Tech Mono,monospace'; ctx.textAlign='center'; ctx.fillText(b.name,t.x,t.y);
}
function drawPropWorld(p){const s=worldToScreen(p.x,p.y), z=s.s||1, im=imgs.props&&imgs.props[p.type]; if(im)ctx.drawImage(im,s.x-p.w*z/2,s.y-p.h*z/2,p.w*z,p.h*z);}
function drawActiveDrops(){for(const d of state.drops){if(d.taken)continue; if(!isDropInCurrentPlace(d))continue; drawDrop(d);}}
function drawDrop(d){const s=state.mode==='world'?worldToScreen(d.x,d.y):roomToScreen(d.x,d.y), sc=s.s||1; const icon=(d.type==='mine-live')?'mine':(d.type==='grenade-live'?'grenade':(d.type==='rareChest'?'chest':(d.type==='armor'?'shield':(d.type==='helmet'?'helmet':(d.type==='bag'?'bag':(weapons[d.type]?.img||d.type)))))); const im=imgs.items&&imgs.items[icon]; const seed=((d.x||0)+(d.y||0))*0.013; const floatY=osc(seed,2.6)*3.5*sc; const pulse=1+osc(seed,3.4)*0.035; ctx.save(); ctx.globalAlpha=.78+.22*Math.sin(performance.now()/140); ctx.fillStyle=d.type==='rareChest'?'rgba(255,230,0,.22)':d.type==='medkit'?'rgba(255,80,90,.18)':(d.type==='mine-live'||d.type==='grenade-live'?'rgba(255,230,0,.15)':'rgba(0,245,255,.16)'); ctx.beginPath();ctx.ellipse(s.x,s.y+12*sc,30*sc,11*sc,0,0,Math.PI*2);ctx.fill(); if(d.type==='rareChest'){ctx.strokeStyle='#ffe600';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(s.x,s.y+12*sc,34*sc,13*sc,0,0,Math.PI*2);ctx.stroke();} if(im){ctx.translate(s.x,s.y+floatY); ctx.scale(pulse,pulse); ctx.drawImage(im,-26*sc,-34*sc,52*sc,52*sc);} else if(d.type==='drone'){ctx.fillStyle='#ffe600';ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(s.x,s.y-10*sc+floatY,18*sc,11*sc,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#00f5ff';ctx.beginPath();ctx.arc(s.x+5*sc,s.y-12*sc+floatY,4*sc,0,Math.PI*2);ctx.fill();} ctx.restore();}

function interiorTransform(){const room=state.currentRoom; const scale=Math.min(cw/room.w,(ch-20)/room.h); return {s:scale,ox:(cw-room.w*scale)/2,oy:(ch-room.h*scale)/2};}
function roomToScreen(x,y){const t=interiorTransform(); return {x:t.ox+x*t.s,y:t.oy+y*t.s,s:t.s};}
function drawInterior(){const room=state.currentRoom,t=interiorTransform(); ctx.save(); ctx.translate(t.ox,t.oy); ctx.scale(t.s,t.s); ctx.fillStyle='#11151b'; ctx.fillRect(0,0,room.w,room.h); const floor=room.type==='lab'?'asphalt':room.type==='warehouse'?'rubble':room.type==='bunker'?'dark':'dirt'; const im=imgs.tiles&&imgs.tiles[floor]; for(let y=48;y<room.h-48;y+=128)for(let x=48;x<room.w-48;x+=128){if(im)ctx.drawImage(im,x,y,129,129);} ctx.fillStyle='rgba(18,22,25,.98)'; ctx.fillRect(0,0,room.w,54);ctx.fillRect(0,room.h-54,room.w,54);ctx.fillRect(0,0,48,room.h);ctx.fillRect(room.w-48,0,48,room.h); ctx.strokeStyle='rgba(0,255,204,.35)';ctx.lineWidth=3;ctx.strokeRect(48,54,room.w-96,room.h-108); const ex=room.exit; const door=imgs.props&&imgs.props.door; if(door)ctx.drawImage(door,ex.x-45,ex.y-28,90,60); ctx.fillStyle='rgba(255,230,0,.95)'; ctx.fillRect(ex.x-40,ex.y-3,80,20); ctx.fillStyle='#111';ctx.font='bold 14px Share Tech Mono,monospace';ctx.textAlign='center';ctx.fillText('ÇIKIŞ',ex.x,ex.y+12); for(const p of room.props){const im2=imgs.props&&imgs.props[p.type]; if(im2)ctx.drawImage(im2,p.x-p.w/2,p.y-p.h/2,p.w,p.h);} for(const c of room.chests){const im3=imgs.items&&imgs.items.chest; ctx.globalAlpha=c.open?.35:1; if(c.tier==='rare'||c.tier==='risky'){ctx.fillStyle=c.tier==='rare'?'rgba(255,230,0,.22)':'rgba(255,51,68,.18)';ctx.beginPath();ctx.ellipse(c.x,c.y+10,46,18,0,0,Math.PI*2);ctx.fill();} if(im3)ctx.drawImage(im3,c.x-34,c.y-30,68,58); ctx.globalAlpha=1;} ctx.restore();}
function drawEntities(){
  const arr=[]; for(const e of getEnemies())arr.push({kind:'enemy',obj:e,y:e.y+e.r}); arr.push({kind:'player',obj:state.player,y:state.player.y+state.player.r});
  arr.sort((a,b)=>a.y-b.y); arr.forEach(d=>d.kind==='player'?drawPlayer(d.obj):drawEnemy(d.obj));
  drawDrones();
  for(const b of state.bullets)drawBullet(b);
}
function drawPlayer(p){
  const s=state.mode==='world'?worldToScreen(p.x,p.y):roomToScreen(p.x,p.y); const sc=s.s||1; const im=imgs.players&&imgs.players[p.variant]; const bob=(p.moving?Math.sin(p.animTime||0):Math.sin((p.animTime||0)*.55))*3.2*sc; const lean=p.moving?Math.sin((p.animTime||0)*.5)*0.045:0;
  ctx.save(); if(p.invuln>0)ctx.globalAlpha=.65+.35*Math.sin(performance.now()/45);
  ctx.translate(s.x,s.y);
  ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0,22*sc,28*sc,10*sc,0,0,Math.PI*2); ctx.fill();
  ctx.translate(0,bob); ctx.rotate(lean*(p.flip?-1:1)); if(p.flip)ctx.scale(-1,1);
  if(im)ctx.drawImage(im,-42*sc,-65*sc,84*sc,106*sc); else{ctx.fillStyle='#00ffcc';ctx.beginPath();ctx.arc(0,0,20*sc,0,Math.PI*2);ctx.fill();}
  ctx.restore();
  ctx.save(); ctx.strokeStyle='rgba(255,230,0,.72)'; ctx.lineWidth=2; const ax=Math.cos(p.face)*28*sc, ay=Math.sin(p.face)*28*sc; ctx.beginPath();ctx.moveTo(s.x,s.y+bob*.25);ctx.lineTo(s.x+ax,s.y+ay+bob*.25);ctx.stroke();ctx.restore();
}
function drawDrones(){
  const p=state.player; if(!p||!p.drones)return; const s0=state.mode==='world'?worldToScreen(p.x,p.y):roomToScreen(p.x,p.y); const sc=s0.s||1;
  ctx.save(); for(let i=0;i<p.drones;i++){const a=performance.now()/520+i*Math.PI*2/p.drones; const x=s0.x+Math.cos(a)*42*sc, y=s0.y+Math.sin(a)*30*sc; ctx.shadowBlur=14;ctx.shadowColor='#ffe600';ctx.fillStyle='#111';ctx.strokeStyle='#ffe600';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,10*sc,7*sc,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#00f5ff';ctx.beginPath();ctx.arc(x+3*sc,y-1*sc,2.5*sc,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}
function drawEnemy(e){const s=state.mode==='world'?worldToScreen(e.x,e.y):roomToScreen(e.x,e.y); const sc=s.s||1; const set=e.kind==='boss'?imgs.bosses:imgs.enemies; const im=set&&set[e.img]; const size=(e.kind==='boss'?154:86)*sc; const seed=(e.x*0.011+e.y*0.017); const bob=osc(seed,e.kind==='boss'?1.6:4.8)*(e.kind==='boss'?4.5:2.4)*sc; const scale=1+(e.kind==='boss'?osc(seed,2.2)*0.03:Math.abs(osc(seed,6.2))*0.02); ctx.save(); if(e.hit>0)ctx.filter='brightness(1.8)'; ctx.translate(s.x,s.y+bob); ctx.scale(scale,scale); ctx.fillStyle='rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(0,(e.kind==='boss'?36:22)*sc,(e.kind==='boss'?40:26)*sc,(e.kind==='boss'?14:9)*sc,0,0,Math.PI*2); ctx.fill(); if(im){ctx.drawImage(im,-size/2,-size*.68,size,size);} else{ctx.fillStyle=e.kind==='boss'?'#ff3344':'#b55';ctx.beginPath();ctx.arc(0,0,e.r*sc,0,Math.PI*2);ctx.fill();} ctx.filter='none'; const bw=(e.kind==='boss'?82:48)*sc,bh=6*sc; ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(-bw/2,-size*.70-10*sc,bw,bh); ctx.fillStyle=e.kind==='boss'?'#ffe600':'#00ff88';ctx.fillRect(-bw/2,-size*.70-10*sc,bw*clamp(e.hp/e.maxHp,0,1),bh); ctx.restore();}
function drawBullet(b){const s=state.mode==='world'?worldToScreen(b.x,b.y):roomToScreen(b.x,b.y); const sc=s.s||1; ctx.save(); ctx.shadowBlur=14;ctx.shadowColor=b.color;ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(s.x,s.y,b.r*sc,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawFx(){for(const p of state.particles){const s=state.mode==='world'?worldToScreen(p.x,p.y):roomToScreen(p.x,p.y);ctx.save();ctx.globalAlpha=clamp(p.t*2,0,1);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(s.x,s.y,(4+10*(.45-p.t))* (s.s||1),0,Math.PI*2);ctx.fill();ctx.restore();}}

renderProfileCard(); loadAssets();
})();
