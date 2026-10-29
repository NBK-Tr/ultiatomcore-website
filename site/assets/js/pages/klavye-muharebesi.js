(function () {
const API_BASE = window.UAC_KM_API_BASE || '/wp-json/klavye-muharebesi/v1';
let gameSessionToken = '';

async function requestGameSession() {
  try {
    const res = await fetch(API_BASE + '/score-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerName || '', player_pin: playerPin || '' })
    });
    const data = await res.json();
    if (!data || !data.ok) {
      return { ok: false, message: (data && data.message) || 'Oturum başlatılamadı.' };
    }
    return { ok: true, session: data.session };
  } catch (e) {
    return { ok: false, message: 'Oturum hatası.' };
  }
}
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('z-game-wrapper');
const scoreEl = document.getElementById('z-score');
const levelEl = document.getElementById('z-level');
const bestEl = document.getElementById('z-best');
const mobileInput = document.getElementById('mobile-input');

function getTouchKbHeight() {
  const kb = document.getElementById('km-touch-keyboard');
  if (kb && wrapper && wrapper.classList.contains('km-touch-active') && kb.offsetHeight > 0) {
    return kb.offsetHeight;
  }
  return 0;
}
function lW() { return wrapper.clientWidth; }
function lH() { return Math.max(240, wrapper.clientHeight - getTouchKbHeight()); }

const AUDIO_URLS = {
  laser: 'https://ultiatomcore.com/wp-content/uploads/2026/04/driken5482-retro-laser-1-236669.mp3',
  explosion: 'https://ultiatomcore.com/wp-content/uploads/2026/04/freesound_community-explosion-bomb-39205.mp3',
  hit: 'https://ultiatomcore.com/wp-content/uploads/2026/04/hit.mp3',
  bgm: 'https://ultiatomcore.com/wp-content/uploads/2026/04/idoberg-deep-space-loop-401165.mp3'
};
const LOCAL_AUDIO_FALLBACKS = {
  laser: 'assets/audio/driken5482-retro-laser-1-236669.mp3',
  explosion: 'assets/audio/freesound_community-explosion-bomb-39205.mp3',
  hit: 'assets/audio/hit.mp3',
  bgm: 'assets/audio/idoberg-deep-space-loop-401165.mp3'
};

function createGameAudio(key, isLoop) {
  const primary = AUDIO_URLS[key];
  const fallback = LOCAL_AUDIO_FALLBACKS[key];
  const a = new Audio(primary);
  a.preload = 'auto';
  if (isLoop) a.loop = true;
  let triedFallback = false;
  a.addEventListener('error', () => {
    if (!triedFallback && fallback) {
      triedFallback = true;
      a.src = fallback;
      try { a.load(); } catch (e) {}
    }
  });
  return a;
}

const sounds = {
  laser: createGameAudio('laser', false),
  explosion: createGameAudio('explosion', false),
  hit: createGameAudio('hit', false),
  bgm: createGameAudio('bgm', true)
};

let savedVolRaw = parseInt(localStorage.getItem('km_volume') || '70', 10);
if (isNaN(savedVolRaw) || savedVolRaw < 0 || savedVolRaw > 100) savedVolRaw = 70;
let isMuted = localStorage.getItem('km_muted') === 'true';
if (!isMuted && savedVolRaw === 0) savedVolRaw = 70;
let currentVolume = isMuted ? 0 : savedVolRaw;
let lastNonZeroVolume = savedVolRaw > 0 ? savedVolRaw : 70;

let kmAudioCtx = null;
function ensureKmAudioCtx() {
  try {
    kmAudioCtx = kmAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (kmAudioCtx.state === 'suspended') kmAudioCtx.resume().catch(() => {});
  } catch (e) {}
  return kmAudioCtx;
}

function playSynthFallback(kind) {
  if (isMuted || currentVolume <= 0) return;
  const actx = ensureKmAudioCtx();
  if (!actx) return;
  try {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    const vol = Math.max(0.01, (currentVolume / 100) * 0.16);
    const now = actx.currentTime;
    if (kind === 'laser') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain); gain.connect(actx.destination);
      osc.start(now); osc.stop(now + 0.085);
    } else if (kind === 'explosion') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.22);
      gain.gain.setValueAtTime(vol * 1.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain); gain.connect(actx.destination);
      osc.start(now); osc.stop(now + 0.23);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.06);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain); gain.connect(actx.destination);
      osc.start(now); osc.stop(now + 0.065);
    }
  } catch (e) {}
}

function unlockGameAudio() {
  ensureKmAudioCtx();
  Object.values(sounds).forEach(a => {
    try {
      a.volume = Math.max(0, Math.min(1, currentVolume / 100));
      a.muted = isMuted || currentVolume <= 0;
      if (a.readyState === 0) a.load();
    } catch (e) {}
  });
}

function safePlay(a) {
  if (isMuted || currentVolume <= 0 || !a) return;
  const kind = a === sounds.laser ? 'laser' : (a === sounds.explosion ? 'explosion' : 'hit');
  try {
    a.volume = Math.max(0, Math.min(1, currentVolume / 100));
    a.muted = false;
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => playSynthFallback(kind));
    }
  } catch (e) {
    playSynthFallback(kind);
  }
}

const wordBank = {
  short: { words: ['VERİ','KOD','AĞ','BOT','WEB','CPU','RAM','GPU','DNS','USB','IP','LAN','WAN','PORT','SİTE','DOSYA','HIZ','SİS','SES','TUŞ','LOG','BYTE','PING','NODE','HOST','CACHE','STACK','ARRAY','LOOP','NULL','TRUE','FALSE','SET','GET','POST','PUT','KEY','VAL','MAP','OBJ','API','SDK','UI','UX','DB','OS','APP','DEV','BUG','FIX','RUN','SYS','NET','CMD','BIN','HEX','ID','TAG','ZIP','RAR'], points: 10 },
  medium: { words: ['YAZILIM','BİLİŞİM','SİSTEM','KLAVYE','DONANIM','BELLEK','SUNUCU','PLATFORM','ARAYÜZ','TASARIM','MODÜL','FONKSİYON','KÜTÜPHANE','GÜNCELLEME','BAĞLANTI','PROTOKOL','ŞİFRELEME','GÜVENLİK','DERLEYİCİ','OTOMASYON','ANALİZ','VERİSETİ','OPTİMİZASYON','YÜKLENİYOR','İŞLETİMSİSTEM','GERİBİLDİRİM','HATAAYIKLAMA','VERİAKIŞI','KODBLOĞU','KULLANICIADI','ŞİFREGİRİŞ','VERİTABANI','SUNUCUHATASI','BAĞLANTIHATASI','GÜVENLİKDUVARI','ERİŞİMİZNİ','KAYITSİSTEMİ','MESAJKUTUSU','BİLGİİŞLEM','VERİMERKEZİ','YAZILIMGÜNCEL','KODDÜZENLEME','İŞLEMBAŞLAT','VERİKONTROL','SİSTEMYÜKÜ','HIZTESTİ','AĞBAĞLANTI'], points: 30 },
  hard: { words: ['ALGORİTMA','VERİTABANI','PROGRAMLAMA','SİBERGÜVENLİK','YAPAYZEKA','MAKİNEÖĞRENMESİ','VERİMADENCİLİĞİ','BULUTBİLİŞİM','DAĞITIKSİSTEMLER','MİKROSERVİSLER','KRİPTOGRAFİ','PARALELİŞLEME','NESNEYÖNELİMİ','ASENKRONPROGRAMLAMA','MULTITHREADING','ŞİFREÇÖZÜMLEME','VERİYAPILARI','AĞPROTOKOLLERİ','OPTİMİZASYONTEKNİKLERİ','YÜKSEKPERFORMANS','GERÇEKZAMANLISİSTEM','DAĞITIKVERİTABANI','YAPAYSİNİRAĞLARI','DERİNÖĞRENME','BÜYÜKVERİANALİZİ','VERİGÖRSELLEŞTİRME','SİSTEMMİMARİSİ','KAPSÜLLEMEPRENSİBİ','SOYUTLAMAKATMANI','VERİTUTARLILIĞI','YÜKDENGETLEME','HATAKURTARMA','ÖLÇEKLENEBİLİRLİK','GÜVENLİKPOLİTİKASI','OTOMATİKDAĞITIM','SERVİSYÖNETİMİ','İLERİSEVİYEPROGRAMLAMA'], points:70 }
};

function typeBasedOnWord(word) {
  const upperWord = word.toLocaleUpperCase('tr-TR');
  if (wordBank.short.words.includes(upperWord)) return 'short';
  if (wordBank.medium.words.includes(upperWord)) return 'medium';
  if (wordBank.hard.words.includes(upperWord)) return 'hard';
  return 'short';
}

let selectedSkin = parseInt(localStorage.getItem('km_skin') || '0');

const SKINS = [
  { color: '#00ff88', glow: '#00ff88', draw: drawShipClassic },
  { color: '#00aaff', glow: '#00aaff', draw: drawShipSaucer },
  { color: '#ff5500', glow: '#ffaa00', draw: drawShipFlame },
  { color: '#aa00ff', glow: '#ff00ff', draw: drawShipCyber }
];

document.querySelectorAll('.skin-opt').forEach(el => {
  el.classList.toggle('selected', parseInt(el.dataset.skin) === selectedSkin);
  el.addEventListener('click', () => {
    selectedSkin = parseInt(el.dataset.skin);
    localStorage.setItem('km_skin', selectedSkin);
    document.querySelectorAll('.skin-opt').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
  });
});

let stars = [];
function initStars() {
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * lW(),
      y: Math.random() * lH(),
      r: Math.random() * 1.8 + 0.2,
      speed: Math.random() * 0.6 + 0.1,
      layer: Math.floor(Math.random() * 3),
      bright: Math.random() * 0.6 + 0.3
    });
  }
}

function drawStars() {
  stars.forEach(s => {
    s.y += s.speed * (s.layer + 1) * 0.5;
    if (s.y > lH() + 4) { s.y = -4; s.x = Math.random() * lW(); }
    ctx.save();
    ctx.globalAlpha = s.bright;
    ctx.fillStyle = ['#fff', '#adf', '#faf'][s.layer];
    ctx.shadowBlur = s.r > 1.2 ? 4 : 0;
    ctx.shadowColor = '#adf';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

let particles = [];

function spawnExplosion(x, y, color) {
  const count = 22;
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.4;
    const spd = Math.random() * 4 + 2;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 1,
      decay: Math.random() * 0.04 + 0.025,
      r: Math.random() * 4 + 2,
      color
    });
  }
  particles.push({ type: 'wave', x, y, r: 0, life: 1, color });
}

function updateParticles() {
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    if (p.type === 'wave') {
      p.r += 4;
      p.life -= 0.06;
      ctx.save();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = p.life * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= p.decay;
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

function drawShipClassic(ctx, skin) {
  ctx.strokeStyle = skin.color; ctx.lineWidth = 2.5;
  ctx.shadowBlur = 12; ctx.shadowColor = skin.glow;
  ctx.beginPath();
  ctx.moveTo(0, -18); ctx.lineTo(12, 10); ctx.lineTo(0, 4); ctx.lineTo(-12, 10);
  ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 10); ctx.stroke();
}

function drawShipSaucer(ctx, skin) {
  ctx.strokeStyle = skin.color; ctx.lineWidth = 2.5;
  ctx.shadowBlur = 12; ctx.shadowColor = skin.glow;
  ctx.beginPath(); ctx.ellipse(0, 0, 18, 8, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -4, 9, 5, 0, 0, Math.PI); ctx.stroke();
}

function drawShipFlame(ctx, skin) {
  ctx.strokeStyle = skin.color; ctx.lineWidth = 2.5;
  ctx.shadowBlur = 14; ctx.shadowColor = skin.glow;
  ctx.beginPath();
  ctx.moveTo(0, -20); ctx.lineTo(10, 8); ctx.lineTo(0, 2); ctx.lineTo(-10, 8);
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,80,0,0.3)'; ctx.fill();
  ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4, 2); ctx.lineTo(0, 14 + Math.random() * 4); ctx.lineTo(4, 2);
  ctx.stroke();
}

function drawShipCyber(ctx, skin) {
  ctx.strokeStyle = skin.color; ctx.lineWidth = 2;
  ctx.shadowBlur = 16; ctx.shadowColor = skin.glow;
  ctx.beginPath();
  ctx.moveTo(0, -20); ctx.lineTo(8, -6); ctx.lineTo(14, 10);
  ctx.lineTo(0, 4); ctx.lineTo(-14, 10); ctx.lineTo(-8, -6);
  ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 4); ctx.stroke();
}

let globalSpeedMultiplier = 1.0;
let score = 0, level = 1, lives = 3, gameActive = false, transitioning = false;
let enemies = [], laserLine = null, currentTarget = null;
let wordsSpawnedInLevel = 0, wordsDestroyed = 0;
let spawnTimer = null;
let gameStartTime = 0;
const ship = { x: 0, y: 0, angle: -Math.PI / 2 };
let playerName = localStorage.getItem('km_player_name') || localStorage.getItem('playerName') || localStorage.getItem('uacss5_name') || '';
let playerPin = localStorage.getItem('uac_player_pin') || '';
let recordCelebrated = false;
let levelHits = 0, levelMisses = 0, levelEscaped = 0;
let usedWordsThisLevel = new Set();
let comboCount = 0;
let bestCombo = 0;
let comboMultiplier = 1;

class Enemy {
  constructor(word, type) {
    this.word = word.toLocaleUpperCase('tr-TR');
    this.remaining = this.word;
    this.type = type;

    const fontSize = Math.round(lW() * 0.033);
    ctx.font = `bold ${fontSize}px 'Share Tech Mono', monospace`;
    const textWidth = ctx.measureText(this.word).width;
    const padding = 20;

    const maxAttempts = 12;
    let x = padding;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = Math.random() * (lW() - textWidth - padding * 2) + padding;
      const overlaps = enemies.some(en => {
        const enFont = `bold ${Math.round(lW() * 0.033)}px 'Share Tech Mono', monospace`;
        ctx.font = enFont;
        const enW = ctx.measureText(en.word).width;
        ctx.font = `bold ${fontSize}px 'Share Tech Mono', monospace`;
        return Math.abs(candidate - en.x) < Math.max(textWidth, enW) + 16;
      });
      x = candidate;
      if (!overlaps) break;
    }

    this.x = Math.max(padding, Math.min(lW() - textWidth - padding, x));
    this.y = 18;

    const lengthFactor = Math.max(0.70, 1 - (this.word.length * 0.015));
    const rawSpeed = Math.min(0.30 + (level * 0.03), 0.85);
    this.baseSpeed = rawSpeed * lengthFactor * globalSpeedMultiplier;
  }

  update(dtScale = 1) { this.y += this.baseSpeed * dtScale; }

  draw() {
    const isTarget = this === currentTarget;
    const fontSize = Math.round(lW() * 0.033);
    ctx.font = `bold ${fontSize}px 'Share Tech Mono', monospace`;

    const dangerRatio = this.y / (lH() - 80);
    const isDanger = dangerRatio > 0.70;

    ctx.shadowBlur = isDanger ? 16 : 8;
    ctx.shadowColor = isTarget ? '#ff00aa' : (isDanger ? '#ff4400' : '#00f5ff');

    const typed = this.word.substring(0, this.word.length - this.remaining.length);
    const rem = this.remaining;

    ctx.fillStyle = '#335';
    ctx.fillText(typed, this.x, this.y);

    const tw = ctx.measureText(typed).width;
    ctx.fillStyle = isTarget ? '#ff00aa' : (isDanger ? '#ff5500' : '#00f5ff');
    ctx.fillText(rem, this.x + tw, this.y);

    const totalW = ctx.measureText(this.word).width;
    const prog = 1 - this.remaining.length / this.word.length;
    ctx.fillStyle = 'rgba(255,0,170,0.12)';
    ctx.fillRect(this.x, this.y + 3, totalW, 4);
    ctx.fillStyle = isTarget ? '#ff00aa' : '#00f5ff';
    ctx.fillRect(this.x, this.y + 3, totalW * prog, 4);
    ctx.shadowBlur = 0;
  }
}

function spawnEnemy() {
  if (!gameActive || transitioning) return;
  if (wordsSpawnedInLevel >= 6) return;

  const type = level <= 3 ? 'short' : (level <= 7 ? 'medium' : 'hard');
  const pool = wordBank[type].words;
  const available = pool.filter(w => !usedWordsThisLevel.has(w));
  const wordPool = available.length > 0 ? available : pool;
  const word = wordPool[Math.floor(Math.random() * wordPool.length)];
  usedWordsThisLevel.add(word);

  enemies.push(new Enemy(word, type));
  wordsSpawnedInLevel++;

  const delay = Math.max(1200, 3000 - level * 150);
  if (wordsSpawnedInLevel < 6) spawnTimer = setTimeout(spawnEnemy, delay);
}

function charMatches(expectedChar, typedChar) {
  if (!expectedChar || !typedChar) return false;
  const exp = expectedChar.toLocaleUpperCase('tr-TR');
  const typ = typedChar.toLocaleUpperCase('tr-TR');
  if (exp === typ) return true;
  if ((exp === 'I' && typ === 'İ') || (exp === 'İ' && typ === 'I')) return true;
  return false;
}

function pickBestTarget(char, excludeEnemy) {
  const exactCandidates = enemies.filter(en =>
    en !== excludeEnemy &&
    en.y >= 8 &&
    en.remaining &&
    en.remaining[0] &&
    en.remaining[0].toLocaleUpperCase('tr-TR') === char
  );
  if (exactCandidates.length > 0) {
    exactCandidates.sort((a, b) => b.y - a.y);
    return exactCandidates[0];
  }
  const fallbackCandidates = enemies.filter(en =>
    en !== excludeEnemy &&
    en.y >= 8 &&
    en.remaining &&
    en.remaining[0] &&
    charMatches(en.remaining[0], char)
  );
  if (fallbackCandidates.length > 0) {
    fallbackCandidates.sort((a, b) => b.y - a.y);
    return fallbackCandidates[0];
  }
  return null;
}

function releaseCurrentTarget() {
  if (!currentTarget) return;
  currentTarget = null;
  showNotif('🎯 HEDEF KİLİDİ AÇILDI');
}

let lastWordCompletedAt = 0;
let lastCompletedChar = '';

function handleInput(key) {
  if (!gameActive || transitioning) return;
  const char = key.toLocaleUpperCase('tr-TR');
  const now = performance.now();

  // Bir kelimenin son harfini bitirirken yanlışlıkla aynı tuşun 90ms içinde
  // ikinci kez algılanıp yukarıdaki aynı harfle başlayan yeni kelimeye kilitlenmesini önle
  if (!currentTarget && char === lastCompletedChar && (now - lastWordCompletedAt) < 95) {
    return;
  }

  let hitDetected = false;

  if (currentTarget && !enemies.includes(currentTarget)) {
    currentTarget = null;
  }

  // Eğer kilitli hedefin sıradaki harfi uyuşmuyorsa ama aşağıda daha acil (gemimize daha yakın)
  // ve bu harfle başlayan bir kelime varsa, oyuncuyu yukarıdaki kelimeye mahkum etme; hedefi otomatik aşağıdakine geçir
  if (currentTarget && currentTarget.remaining && !charMatches(currentTarget.remaining[0], char)) {
    const urgentCandidate = pickBestTarget(char, currentTarget);
    const typedOnCurrent = currentTarget.word.length - currentTarget.remaining.length;
    if (urgentCandidate && (urgentCandidate.y > currentTarget.y + 18 || typedOnCurrent <= 1)) {
      if (typedOnCurrent <= 1) {
        currentTarget.remaining = currentTarget.word;
      }
      currentTarget = urgentCandidate;
      safePlay(sounds.hit);
      hitDetected = true;
    }
  }

  if (!currentTarget) {
    currentTarget = pickBestTarget(char, null);
    if (currentTarget) {
      safePlay(sounds.hit);
      hitDetected = true;
    }
  }

  if (currentTarget && currentTarget.remaining && currentTarget.remaining[0] && charMatches(currentTarget.remaining[0], char)) {
    safePlay(sounds.laser);
    hitDetected = true;

    const fontSize = Math.round(lW() * 0.033);
    ctx.font = "bold " + fontSize + "px 'Share Tech Mono', monospace";

    laserLine = {
      x1: ship.x,
      y1: ship.y,
      x2: currentTarget.x + ctx.measureText(currentTarget.word).width / 2,
      y2: currentTarget.y,
      life: 4
    };

    currentTarget.remaining = currentTarget.remaining.substring(1);

    ship.angle = Math.atan2(currentTarget.y - ship.y, currentTarget.x - ship.x);

    if (currentTarget.remaining.length === 0) {
      safePlay(sounds.explosion);
      const clr = wordBank[currentTarget.type].points >= 70 ? '#ff6600' : wordBank[currentTarget.type].points >= 30 ? '#ff00aa' : '#00f5ff';
      spawnExplosion(currentTarget.x + 40, currentTarget.y, clr);

      addCombo();
      const basePoints = wordBank[currentTarget.type].points;
      const gainedPoints = Math.round(basePoints * comboMultiplier);
      score += gainedPoints;
      wordsDestroyed++;
      scoreEl.innerText = score;
      updateBest();
      if (comboMultiplier > 1) showNotif('+' + gainedPoints + ' PUAN x' + comboMultiplier.toFixed(1));

      enemies.forEach(function(en) {
        if (en !== currentTarget) en.y = Math.max(18, en.y - 12);
      });

      const finishedTarget = currentTarget;
      enemies = enemies.filter(function(en) { return en !== finishedTarget; });
      currentTarget = null;
      lastWordCompletedAt = now;
      lastCompletedChar = char;
      checkLevelUp();
    }
  }

  if (hitDetected) {
    levelHits++;
  } else {
    levelMisses++;
    resetCombo('miss');
  }
}

function checkLevelUp() {
  if (enemies.length === 0 && wordsSpawnedInLevel >= 6 && !transitioning && gameActive) {
    clearTimeout(spawnTimer);
    spawnTimer = null;
    transitioning = true;
    gameActive = false;
    level++;
    levelEl.innerText = level;
    showLevelTransition();
  }
}

function showLevelTransition() {
  const lt = document.getElementById('level-transition');
  document.getElementById('lt-text').textContent = 'SEVİYE ' + level;
  document.getElementById('lt-sub').textContent = level > 10 ? '⚠️ KRİTİK TEHDİT!' : (level > 6 ? '🔴 TEHLİKE ARTIYOR' : '✅ DEVAM ET!');
  lt.classList.add('show');

  let flashes = 0;
  const intv = setInterval(() => {
    lt.style.opacity = lt.style.opacity === '0' ? '1' : '0';
    if (++flashes > 5) { clearInterval(intv); lt.style.opacity = '0'; lt.classList.remove('show'); }
  }, 300);

  setTimeout(() => {
    transitioning = false;
    gameActive = true;
    wordsSpawnedInLevel = 0;
    usedWordsThisLevel.clear();
    spawnEnemy();
  }, 2200);
}

function drawShip() {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle + Math.PI / 2);
  const skin = SKINS[selectedSkin];
  skin.draw(ctx, skin);
  ctx.restore();
}

let animId = null;
let lastFrameTime = 0;
function gameLoop(now) {
  animId = requestAnimationFrame(gameLoop);
  const ts = typeof now === 'number' ? now : performance.now();
  const dtScale = lastFrameTime ? Math.min(2.4, Math.max(0.25, (ts - lastFrameTime) / 16.667)) : 1;
  lastFrameTime = ts;

  ctx.fillStyle = 'rgba(4,6,15,0.55)';
  ctx.fillRect(0, 0, lW(), lH());
  drawStars();

  if (laserLine && laserLine.life > 0) {
    const grad = ctx.createLinearGradient(laserLine.x1, laserLine.y1, laserLine.x2, laserLine.y2);
    grad.addColorStop(0, '#ff00aa');
    grad.addColorStop(1, '#00f5ff');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2 + laserLine.life * 0.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff00aa';
    ctx.beginPath();
    ctx.moveTo(laserLine.x1, laserLine.y1);
    ctx.lineTo(laserLine.x2, laserLine.y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    laserLine.life--;
  }

  updateParticles();
  drawShip();

  if (gameActive) {
    const snapshot = [...enemies];
    snapshot.forEach(en => {
      if (!enemies.includes(en)) return;
      en.update(dtScale);
      en.draw();

      if (en.y > lH() - 40) {
        levelEscaped++;
        resetCombo('escaped');
        enemies = enemies.filter(e => e !== en);
        if (en === currentTarget) currentTarget = null;
        lives--;
        updateLivesUI();
        showNotif('💥 CAN KAYBEDİLDİ! ' + '❤️'.repeat(Math.max(0, lives)));
        safePlay(sounds.explosion);
        spawnExplosion(en.x + 30, lH() - 50, '#ff3344');

        if (lives <= 0) gameOver();
        else checkLevelUp();
      }
    });
  }
}

function updateLivesUI() {
  ['l1','l2','l3'].forEach((id, i) => {
    document.getElementById(id).classList.toggle('lost', i >= lives);
  });
}

let notifTO = null;
function showNotif(txt) {
  const n = document.getElementById('notif');
  n.textContent = txt;
  n.classList.add('show');
  clearTimeout(notifTO);
  notifTO = setTimeout(() => n.classList.remove('show'), 1600);
}
function getComboMultiplier(combo) {
  if (combo >= 15) return 2.5;
  if (combo >= 10) return 2.0;
  if (combo >= 5) return 1.5;
  if (combo >= 3) return 1.2;
  return 1;
}
function updateComboDisplay(forceHide) {
  const el = document.getElementById('combo-display');
  if (!el) return;
  comboMultiplier = getComboMultiplier(comboCount);
  if (forceHide || comboCount < 3) {
    el.classList.remove('show');
    el.innerHTML = '<span>COMBO</span><strong>x1</strong>';
    return;
  }
  el.innerHTML = '<span>' + comboCount + ' SERİ</span><strong>x' + comboMultiplier.toFixed(1) + '</strong>';
  el.classList.add('show');
}
function addCombo() {
  comboCount++;
  bestCombo = Math.max(bestCombo, comboCount);
  comboMultiplier = getComboMultiplier(comboCount);
  updateComboDisplay(false);
  if (comboCount === 3) showNotif('⚡ COMBO BAŞLADI');
  else if (comboCount === 5) showNotif('🔥 COMBO x1.5');
  else if (comboCount === 10) showNotif('🚀 COMBO x2');
  else if (comboCount === 15) showNotif('👑 COMBO x2.5');
}
function resetCombo(reason) {
  if (comboCount >= 5 && reason) showNotif('💥 COMBO BOZULDU');
  comboCount = 0;
  comboMultiplier = 1;
  updateComboDisplay(true);
}

function updateBest() {
  const b = parseInt(localStorage.getItem('km_best') || '0');
  if (score > b) {
    localStorage.setItem('km_best', score);
    if (b > 0 && !recordCelebrated) {
      recordCelebrated = true;
      showNotif('🏆 YENİ REKOR!');
      spawnExplosion(lW() / 2, lH() / 2, '#ffe600');
    }
  }
  bestEl.innerText = Math.max(score, b);
}

async function submitScore() {
  if (!playerName || score <= 0) return;
  const duration = Math.floor((Date.now() - gameStartTime) / 1000);
  try {
    const res = await fetch(API_BASE + '/score-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerName, player_pin: playerPin || '', score, level, duration, words: wordsDestroyed, session: gameSessionToken })
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.code === 'banned') showNotif('🚫 ERİŞİMİNİZ ENGELLENDİ');
      else if (data.code === 'cheat_detected') showNotif('⛔ GEÇERSİZ SKOR');
    }
  } catch (e) {}
}

async function fetchLeaderboard(period) {
  try {
    const res = await fetch(`${API_BASE}/leaderboard?period=${period}&limit=10`);
    const data = await res.json();
    return data.entries || [];
  } catch (e) { return []; }
}

async function fetchProfile(name) {
  try {
    const res = await fetch(`${API_BASE}/profile?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    return data;
  } catch (e) { return null; }
}

async function buildScoreTable(myScore) {
  const table = document.getElementById('score-table');
  let localScores = [];
  try { localScores = JSON.parse(localStorage.getItem('km_scores') || '[]'); } catch (e) {}
  localScores.push({ name: playerName || 'MİSAFİR', score: myScore, ts: Date.now() });
  localScores.sort((a, b) => b.score - a.score);
  localScores = localScores.slice(0, 10);
  localStorage.setItem('km_scores', JSON.stringify(localScores));

  table.innerHTML = '<div style="color:#558;font-size:10px;letter-spacing:2px;text-align:center;margin:4px 0">YÜKLENİYOR...</div>';
  const [lbAll, lbWeek, lbDay] = await Promise.all([fetchLeaderboard('all'), fetchLeaderboard('week'), fetchLeaderboard('day')]);
  const profData = playerName ? await fetchProfile(playerName) : null;

  let html = '';
  if (profData && profData.found) {
    const p = profData.profile;
    html += `<div class="profile-box"><div class="pb-title">👤 ${escHtml(p.name)}</div><div class="pb-stats"><span>🏆 En İyi: <b>${p.best_score}</b></span><span>🎮 Oyun: <b>${p.total_games}</b></span><span>🔤 Kelime: <b>${p.total_words}</b></span><span>📊 Ort: <b>${profData.avg_score}</b></span></div><div class="pb-rank">${profData.rank_all ? `Tüm Zamanlar: <b>#${profData.rank_all}</b>` : ''}${profData.rank_week ? `&nbsp;|&nbsp; Bu Hafta: <b>#${profData.rank_week}</b>` : ''}</div></div>`;
  }

  html += `<div class="lb-tabs"><button class="lb-tab active" data-period="all">TÜM ZAMANLAR</button><button class="lb-tab" data-period="week">HAFTALIK</button><button class="lb-tab" data-period="day">GÜNLÜK</button></div><div class="lb-panel" id="lb-all">${renderLbList(lbAll, myScore)}</div><div class="lb-panel" id="lb-week" style="display:none">${renderLbList(lbWeek, myScore)}</div><div class="lb-panel" id="lb-day" style="display:none">${renderLbList(lbDay, myScore)}</div>`;

  table.innerHTML = html;

  table.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      table.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      table.querySelectorAll('.lb-panel').forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      table.querySelector('#lb-' + tab.dataset.period).style.display = '';
    });
  });
}

function renderLbList(entries, myScore) {
  if (!entries.length) return '<div style="color:#446;padding:8px;text-align:center;">Henüz kayıt yok</div>';
  return entries.map(e => {
    const isMe = e.name === playerName;
    return `<div class="score-row ${isMe ? 'you' : ''}"><span class="rank">#${e.rank}</span><span class="sname">${escHtml(e.name)}</span><span class="sval">${e.score}</span></div>`;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

async function gameOver() {
  if (!gameActive) return;
  gameActive = false;
  clearTimeout(spawnTimer);
  if (wrapper) wrapper.classList.remove('km-touch-active');
  exitMobilePlayMode();
  const scoreToSave = score;
  const savePromise = submitScore();
  document.getElementById('final-score').textContent = scoreToSave;
  const finalComboEl = document.getElementById('final-combo');
  if (finalComboEl) finalComboEl.textContent = bestCombo;
  const go = document.getElementById('z-game-over');
  if (go) go.style.display = 'flex';
  const table = document.getElementById('score-table');
  if (table) table.innerHTML = '<div style="color:#558;font-size:10px;letter-spacing:2px;text-align:center;margin:4px 0">SKOR KAYDEDİLİYOR...</div>';
  await savePromise;
  await buildScoreTable(scoreToSave);
}

function resetGameState() {
  clearTimeout(spawnTimer);
  spawnTimer = null;
  score = 0; level = 1; lives = 3;
  enemies = []; wordsSpawnedInLevel = 0;
  wordsDestroyed = 0; transitioning = false;
  levelHits = 0; levelMisses = 0; levelEscaped = 0;
  comboCount = 0; bestCombo = 0; comboMultiplier = 1; updateComboDisplay(true);

  recordCelebrated = false;
  currentTarget = null;
  laserLine = null;
  lastWordCompletedAt = 0;
  lastCompletedChar = '';
  usedWordsThisLevel.clear();
  scoreEl.innerText = 0; levelEl.innerText = 1;
  updateLivesUI(); updateBest();
}

function isMobileGameDevice() {
  return (
    window.matchMedia('(max-width: 1024px)').matches ||
    window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
}

let useSystemKeyboard = false;

function ensureTouchKeyboard() {
  if (!wrapper || document.getElementById('km-touch-keyboard')) return;
  const kb = document.createElement('div');
  kb.id = 'km-touch-keyboard';
  kb.setAttribute('aria-label', 'Dokunmatik Türkçe Oyun Klavyesi');

  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', '⌫', '⌨️']
  ];

  rows.forEach(r => {
    const rowEl = document.createElement('div');
    rowEl.className = 'km-kb-row';
    r.forEach(k => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'km-kb-key';
      if (k === '⌫') {
        btn.className += ' km-kb-wide';
        btn.textContent = '⌫ BIRAK';
        btn.title = 'Mevcut kelime hedefini bırak';
      } else if (k === '⌨️') {
        btn.className += ' km-kb-mode';
        btn.textContent = '⌨️ CİHAZ';
        btn.title = 'Telefonun kendi klavyesini aç';
      } else {
        btn.textContent = k;
      }

      let lastTap = 0;
      const triggerKey = (ev) => {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        const now = performance.now();
        if (now - lastTap < 45) return;
        lastTap = now;
        btn.classList.add('is-pressed');
        setTimeout(() => btn.classList.remove('is-pressed'), 110);

        if (!gameActive || transitioning) return;
        if (k === '⌫') {
          releaseCurrentTarget();
        } else if (k === '⌨️') {
          useSystemKeyboard = true;
          wrapper.classList.remove('km-touch-active');
          focusMobileGameInput(true);
          init();
        } else {
          handleInput(k);
        }
      };

      btn.addEventListener('pointerdown', triggerKey);
      btn.addEventListener('touchstart', triggerKey, { passive: false });
      btn.addEventListener('click', triggerKey);
      rowEl.appendChild(btn);
    });
    kb.appendChild(rowEl);
  });

  wrapper.appendChild(kb);
}

ensureTouchKeyboard();

function updateMobileViewportHeight() {
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--km-vvh', Math.max(320, Math.floor(h)) + 'px');
}

function enterMobilePlayMode() {
  if (!isMobileGameDevice()) return;

  ensureTouchKeyboard();
  updateMobileViewportHeight();
  document.documentElement.classList.add('km-playing');
  document.body.classList.add('km-playing');

  if (!useSystemKeyboard && wrapper) {
    wrapper.classList.add('km-touch-active');
  }

  setTimeout(() => {
    updateMobileViewportHeight();
    init();
  }, 60);
}

function exitMobilePlayMode() {
  document.documentElement.classList.remove('km-playing');
  document.body.classList.remove('km-playing');
  if (wrapper) wrapper.classList.remove('km-touch-active');
  if (mobileInput) mobileInput.blur();

  setTimeout(() => {
    updateMobileViewportHeight();
    init();
  }, 60);
}

function focusMobileGameInput(forceSystem) {
  if (!mobileInput || !isMobileGameDevice()) return;
  if (!forceSystem && !useSystemKeyboard) {
    // Varsayilan olarak entegre dokunmatik oyun klavyesini goster
    if (wrapper) wrapper.classList.add('km-touch-active');
    init();
    return;
  }

  updateMobileViewportHeight();

  try {
    mobileInput.focus({ preventScroll: true });
  } catch (e) {
    mobileInput.focus();
  }

  setTimeout(() => {
    updateMobileViewportHeight();
    if (document.body.classList.contains('km-playing')) {
      init();
    }
  }, 120);
}

window.focusGameKeyboard = function () {
  if (!gameActive) return;
  if (wrapper && wrapper.classList.contains('km-touch-active')) {
    useSystemKeyboard = true;
    wrapper.classList.remove('km-touch-active');
    focusMobileGameInput(true);
  } else {
    useSystemKeyboard = false;
    if (mobileInput) mobileInput.blur();
    if (wrapper) wrapper.classList.add('km-touch-active');
  }
  init();
};

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    updateMobileViewportHeight();

    if (document.body.classList.contains('km-playing')) {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(init, 100);
    }
  });

  window.visualViewport.addEventListener('scroll', () => {
    updateMobileViewportHeight();
  });
}

window.startGame = async function () {
  // Mobil kullanici jestini kaybetmemek icin oyun modunu hemen senkron olarak ac
  if (isMobileGameDevice()) {
    enterMobilePlayMode();
    if (useSystemKeyboard) focusMobileGameInput(true);
  }

  unlockGameAudio();
  if (!isMuted) {
    try {
      sounds.bgm.currentTime = 0;
      sounds.bgm.play().catch(() => {});
    } catch (e) {}
  }

  if (playerName) {
    const sess = await requestGameSession();
    if (!sess.ok) {
      try { sounds.bgm.pause(); } catch (e) {}
      exitMobilePlayMode();
      window.changeName();
      showNameError(sess.message || 'İsim veya PIN doğrulanamadı.');
      return;
    }
    gameSessionToken = sess.session;
  } else {
    const sess = await requestGameSession();
    gameSessionToken = sess.ok ? sess.session : '';
  }

  document.getElementById('start-overlay').style.display = 'none';

  resetGameState();
  gameActive = true;
  gameStartTime = Date.now();

  enterMobilePlayMode();
  focusMobileGameInput();
  init();

  spawnEnemy();
  if (!isMuted && sounds.bgm.paused) {
    sounds.bgm.play().catch(() => {});
  }
};

window.restartGame = function () {
  document.getElementById('z-game-over').style.display = 'none';
  clearTimeout(spawnTimer);
  window.startGame();
};

window.showStartScreen = function () {
  document.getElementById('z-game-over').style.display = 'none';
  document.getElementById('start-overlay').style.display = 'flex';
  gameActive = false;
  exitMobilePlayMode();
};

window.setPlayerName = async function () {
  const input = document.getElementById('player-name-input');
  const pinInput = document.getElementById('player-pin-input');
  const name = (input?.value || '').trim();
  const pin = (pinInput?.value || '').trim();
  if (!name) { showNameError('İsim girin!'); return; }
  if (name.length < 2 || name.length > 20) { showNameError('2-20 karakter olmalı'); return; }
  if (!/^[a-zA-Z0-9_-]{4,12}$/.test(pin)) { showNameError('PIN 4-12 karakter olmalı. Harf/rakam kullan.'); return; }

  const btn = document.getElementById('name-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  try {
    const res = await fetch(API_BASE + '/check-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, player_pin: pin })
    });
    const data = await res.json();
    if (data.ok) {
      playerName = name;
      playerPin = pin;
      localStorage.setItem('uac_player_pin', pin);
      localStorage.setItem('km_player_name', name);
      localStorage.setItem('playerName', name);
      localStorage.setItem('uacss5_name', name);
      document.getElementById('name-step').style.display = 'none';
      document.getElementById('ready-step').style.display = 'flex';
      document.getElementById('display-name').textContent = name;
    } else {
      showNameError(data.message || 'Geçersiz isim');
    }
  } catch (e) {
    showNameError('İsim/PIN kontrol edilemedi.');
  }

  if (btn) { btn.disabled = false; btn.textContent = 'ONAYLA'; }
};

function showNameError(msg) {
  const err = document.getElementById('name-error');
  if (err) { err.textContent = msg; err.style.display = 'block'; }
}

window.skipName = function () {
  playerName = '';
  localStorage.removeItem('km_player_name');
  document.getElementById('name-step').style.display = 'none';
  document.getElementById('ready-step').style.display = 'flex';
  document.getElementById('display-name').textContent = 'MİSAFİR';
};

window.changeName = function () {
  document.getElementById('ready-step').style.display = 'none';
  document.getElementById('name-step').style.display = 'flex';
  localStorage.removeItem('km_player_name');
  playerName = '';
  const pinInput = document.getElementById('player-pin-input');
  if (pinInput && playerPin) pinInput.value = playerPin;
};

function syncAudioUI() {
  const effectiveVol = isMuted ? 0 : currentVolume;
  const normalizedVol = Math.max(0, Math.min(1, effectiveVol / 100));
  Object.values(sounds).forEach(s => {
    try {
      s.volume = normalizedVol;
      s.muted = isMuted || effectiveVol <= 0;
    } catch (e) {}
  });
  const iconEl = document.getElementById('mute-icon');
  if (iconEl) {
    iconEl.innerText = (isMuted || effectiveVol <= 0) ? '🔇' : (effectiveVol < 45 ? '🔉' : '🔊');
  }
  const muteHud = document.getElementById('mute-hud');
  if (muteHud) {
    muteHud.classList.toggle('muted', isMuted || effectiveVol <= 0);
  }
  const slider = document.getElementById('volume-slider');
  if (slider && Number(slider.value) !== effectiveVol) {
    slider.value = String(effectiveVol);
  }
  if (isMuted || effectiveVol <= 0) {
    try { sounds.bgm.pause(); } catch (e) {}
  } else if (gameActive && sounds.bgm.paused) {
    try { sounds.bgm.play().catch(() => {}); } catch (e) {}
  }
}

window.toggleMute = function (ev) {
  const target = (ev && ev.target) || (window.event && window.event.target);
  if (target && target.id === 'volume-slider') return;
  if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();

  if (isMuted || currentVolume <= 0) {
    isMuted = false;
    currentVolume = lastNonZeroVolume > 0 ? lastNonZeroVolume : 70;
    localStorage.setItem('km_muted', 'false');
    localStorage.setItem('km_volume', String(currentVolume));
    unlockGameAudio();
  } else {
    if (currentVolume > 0) lastNonZeroVolume = currentVolume;
    isMuted = true;
    localStorage.setItem('km_muted', 'true');
  }
  syncAudioUI();
};

const muteHudEl = document.getElementById('mute-hud');
if (muteHudEl) {
  // Canli WordPress sayfasinda kapsayicida onclick="toggleMute()" kalmissa slider'i bozmasini onle
  muteHudEl.onclick = null;
  muteHudEl.removeAttribute('onclick');
  const labelEl = muteHudEl.querySelector('.hud-label');
  if (labelEl) {
    labelEl.style.cursor = 'pointer';
    labelEl.addEventListener('click', (e) => window.toggleMute(e));
  }
}

const muteIconEl = document.getElementById('mute-icon');
if (muteIconEl) {
  muteIconEl.onclick = null;
  muteIconEl.removeAttribute('onclick');
  muteIconEl.style.cursor = 'pointer';
  muteIconEl.addEventListener('click', (e) => window.toggleMute(e));
}

const volumeSlider = document.getElementById('volume-slider');
if (volumeSlider) {
  const stopBubble = (e) => { e.stopPropagation(); };
  ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend'].forEach(evtName => {
    volumeSlider.addEventListener(evtName, stopBubble, { passive: true });
  });

  const handleVolumeChange = (e) => {
    e.stopPropagation();
    const raw = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
    currentVolume = raw;
    if (raw > 0) {
      lastNonZeroVolume = raw;
      isMuted = false;
      localStorage.setItem('km_muted', 'false');
      localStorage.setItem('km_volume', String(raw));
      unlockGameAudio();
    } else {
      isMuted = true;
      localStorage.setItem('km_muted', 'true');
    }
    syncAudioUI();
  };

  volumeSlider.addEventListener('input', handleVolumeChange);
  volumeSlider.addEventListener('change', handleVolumeChange);
}

syncAudioUI();

let lastPlayableHeight = 0;

function init() {
  const dpr = window.devicePixelRatio || 1;
  const newPlayableH = lH();
  if (gameActive && lastPlayableHeight > 0 && newPlayableH > 0 && Math.abs(newPlayableH - lastPlayableHeight) > 20) {
    const ratio = newPlayableH / lastPlayableHeight;
    enemies.forEach(en => {
      en.y = Math.min(en.y * ratio, newPlayableH - 95);
      en.x = Math.max(40, Math.min(lW() - 40, en.x));
    });
  }
  lastPlayableHeight = newPlayableH;

  canvas.width = wrapper.clientWidth * dpr;
  canvas.height = wrapper.clientHeight * dpr;
  canvas.style.width = wrapper.clientWidth + 'px';
  canvas.style.height = wrapper.clientHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ship.x = lW() / 2;
  ship.y = lH() - 55;
  initStars();

  if (animId) cancelAnimationFrame(animId);
  gameLoop();
}

let isComposing = false;
let lastPhysicalKeyAt = 0;

mobileInput.addEventListener('compositionstart', () => { isComposing = true; });
mobileInput.addEventListener('compositionend', e => {
  isComposing = false;
  if (performance.now() - lastPhysicalKeyAt < 65) {
    mobileInput.value = '';
    return;
  }
  const data = e.data || '';
  for (const c of data) { if (c && c.trim()) handleInput(c); }
  mobileInput.value = '';
});

mobileInput.addEventListener('input', e => {
  if (isComposing) return;
  if (performance.now() - lastPhysicalKeyAt < 65) {
    e.target.value = '';
    return;
  }
  const val = e.target.value;
  if (val) {
    for (const c of val) { if (c && c.trim()) handleInput(c); }
  }
  e.target.value = '';
});

window.addEventListener('keydown', e => {
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  const active = document.activeElement;
  if (active && active !== mobileInput && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
  if (!gameActive || transitioning) return;
  if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Tab') {
    e.preventDefault();
    releaseCurrentTarget();
    return;
  }
  if (e.key.length === 1) {
    e.preventDefault();
    lastPhysicalKeyAt = performance.now();
    if (mobileInput) mobileInput.value = '';
    handleInput(e.key);
  }
});

function isInteractiveOverlayTap(target) {
  if (!target || !target.closest) return false;
  return !!(
    target.closest('.overlay') ||
    target.closest('#z-hud') ||
    target.closest('#km-touch-keyboard') ||
    target.closest('button') ||
    target.closest('input') ||
    target.closest('.skin-opt')
  );
}

wrapper.addEventListener('click', (e) => {
  if (isInteractiveOverlayTap(e.target)) return;
  if (gameActive) {
    enterMobilePlayMode();
    focusMobileGameInput();
  }
});

wrapper.addEventListener('touchend', (e) => {
  if (isInteractiveOverlayTap(e.target)) return;
  if (gameActive) {
    enterMobilePlayMode();
    focusMobileGameInput();
  }
}, { passive: true });

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(init, 150);
});

bestEl.innerText = localStorage.getItem('km_best') || '0';
init();

const initialNameInput = document.getElementById('player-name-input');
const initialPinInput = document.getElementById('player-pin-input');
if (initialNameInput && playerName) initialNameInput.value = playerName;
if (initialPinInput && playerPin) initialPinInput.value = playerPin;

if (playerName && playerPin) {
  const nameStep = document.getElementById('name-step');
  const readyStep = document.getElementById('ready-step');
  const dispName = document.getElementById('display-name');
  if (nameStep && readyStep && dispName) {
    nameStep.style.display = 'none';
    readyStep.style.display = 'flex';
    dispName.textContent = playerName;
  }
}
})();
