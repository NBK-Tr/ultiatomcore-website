(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt = n => Number(n || 0).toLocaleString('tr-TR');
  const cacheBust = () => '_uac_t=' + Date.now() + '_' + Math.random().toString(36).slice(2);
  let currentQuestion = null;
  let lastRenderedQuestionId = '';
  let soundOn = localStorage.getItem('uac_daily_sound') !== 'off';
  let dailyVolRaw = parseInt(localStorage.getItem('uac_daily_volume') || '70', 10);
  if (isNaN(dailyVolRaw) || dailyVolRaw < 0 || dailyVolRaw > 100) dailyVolRaw = 70;
  if (soundOn && dailyVolRaw === 0) dailyVolRaw = 70;
  let dailyVolume = soundOn ? dailyVolRaw : 0;
  let lastDailyVol = dailyVolRaw > 0 ? dailyVolRaw : 70;
  let audioCtx = null;

  const DAILY_AUDIO_URLS = {
    click: 'https://ultiatomcore.com/wp-content/uploads/2026/04/hit.mp3',
    win: 'https://ultiatomcore.com/wp-content/uploads/2026/04/driken5482-retro-laser-1-236669.mp3',
    fail: 'https://ultiatomcore.com/wp-content/uploads/2026/04/freesound_community-explosion-bomb-39205.mp3'
  };
  const DAILY_AUDIO_FALLBACKS = {
    click: 'assets/audio/hit.mp3',
    win: 'assets/audio/driken5482-retro-laser-1-236669.mp3',
    fail: 'assets/audio/freesound_community-explosion-bomb-39205.mp3'
  };
  const dailySfx = {};
  Object.keys(DAILY_AUDIO_URLS).forEach(k => {
    const a = new Audio(DAILY_AUDIO_URLS[k]);
    a.preload = 'auto';
    let fb = false;
    a.addEventListener('error', () => {
      if (!fb && DAILY_AUDIO_FALLBACKS[k]) {
        fb = true;
        a.src = DAILY_AUDIO_FALLBACKS[k];
        try { a.load(); } catch (e) {}
      }
    });
    dailySfx[k] = a;
  });

  function deviceKey() {
    let key = localStorage.getItem('uac_daily_device_key') || '';
    if (!key) {
      key = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
      localStorage.setItem('uac_daily_device_key', key);
    }
    return key;
  }
  function nameValue() { return ($('#uacDailyName')?.value || '').trim(); }
  function pinValue() { return ($('#uacDailyPin')?.value || localStorage.getItem('uac_player_pin') || '').trim(); }
  function validPin(pin) { return /^[a-zA-Z0-9_-]{4,12}$/.test(String(pin || '')); }
  function normalizeNameForCheck(name) { return String(name || '').toLocaleLowerCase('tr-TR').replace(/[^a-z0-9ığüşöç]/gi, '').replace(/[ığ]/g,'i').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c'); }
  function isReservedName(name) {
    if (window.UACLocal?.util?.isAdminSession?.()) return false;
    if (window.UACLocal?.util?.isAdminReservedName) return window.UACLocal.util.isAdminReservedName(name);
    return ['admin','administrator','yonetici','yönetici','moderator','mod','root','system','sistem','support','destek','owner','kurucu','yetkili'].includes(normalizeNameForCheck(name));
  }
  function clearStoredReservedName() { ['playerName','km_player_name','uacss5_name'].forEach(k => { if (isReservedName(localStorage.getItem(k) || '')) localStorage.removeItem(k); }); }

  function normBoardName(value) {
    return String(value || '')
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[ı]/g, 'i')
      .replace(/[ğ]/g, 'g')
      .replace(/[ü]/g, 'u')
      .replace(/[ş]/g, 's')
      .replace(/[ö]/g, 'o')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]/g, '');
  }
  function uniqueBoardEntries(entries) {
    const map = new Map();
    (Array.isArray(entries) ? entries : []).forEach(item => {
      const name = String(item?.name || 'Oyuncu').trim() || 'Oyuncu';
      const key = normBoardName(name) || name.toLocaleLowerCase('tr-TR');
      const score = Number(item?.score || 0);
      const old = map.get(key);
      if (!old || score > Number(old.score || 0)) map.set(key, { ...item, name, score });
    });
    return [...map.values()]
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }
  function storeValidName(name) { if (!isReservedName(name)) { localStorage.setItem('playerName', name); localStorage.setItem('km_player_name', name); localStorage.setItem('uacss5_name', name); } }
  function storeValidPin(pin) { if (validPin(pin)) localStorage.setItem('uac_player_pin', pin); }
  function status(text) { const el = $('#uacDailyStatus'); if (el) el.textContent = text; }
  function unlockAudioCtx() {
    if (!soundOn || dailyVolume <= 0) return null;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    } catch (e) {}
    return audioCtx;
  }
  function playDailySfx(key) {
    if (!soundOn || dailyVolume <= 0) return;
    const a = dailySfx[key];
    if (!a) return;
    try {
      a.volume = Math.max(0, Math.min(1, dailyVolume / 100));
      a.muted = false;
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch (e) {}
  }
  function tone(freq, dur = 0.12, type = 'sine') {
    if (!soundOn || dailyVolume <= 0) return;
    try {
      const ctx = unlockAudioCtx();
      if (!ctx) return;
      const maxGain = Math.max(0.005, (dailyVolume / 100) * 0.12);
      const playOsc = () => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = type; osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(maxGain, ctx.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
          osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + dur);
        } catch (err) {}
      };
      if (ctx.state === 'suspended') {
        ctx.resume().then(playOsc).catch(() => {});
      } else {
        playOsc();
      }
    } catch(e) {}
  }
  function successSound() { playDailySfx('win'); tone(420,.1,'triangle'); setTimeout(()=>tone(620,.12,'triangle'),90); setTimeout(()=>tone(880,.18,'triangle'),180); }
  function closeSound() { playDailySfx('click'); tone(360,.08,'triangle'); setTimeout(()=>tone(460,.12,'triangle'),90); }
  function failSound() { playDailySfx('fail'); tone(160,.16,'sawtooth'); setTimeout(()=>tone(110,.18,'sawtooth'),120); }

  function renderProfile(p, library) {
    if (!p) return;
    if ($('#uacDailyScore')) $('#uacDailyScore').textContent = fmt(p.score);
    if ($('#uacDailyStreak')) $('#uacDailyStreak').textContent = fmt(p.streak);
    if ($('#uacDailyAnswered')) $('#uacDailyAnswered').textContent = fmt(p.answered);
    const day = Math.max(1, Math.min(7, Number(p.current_day || 1)));
    const pct = Math.round((day / 7) * 100);
    if ($('#uacDailyMeter')) $('#uacDailyMeter').style.width = pct + '%';
    if ($('#uacSecretLibraryInfo')) {
      const total = Number(library?.total_questions || 0);
      const seen = Number(p.seen_questions || 0);
      const packs = Number(library?.total_packs || 0);
      $('#uacSecretLibraryInfo').textContent = total ? `Kütüphane: ${seen}/${total} soru görüldü · ${packs} paket · ${Number(library?.total_categories || 0)} kategori.` : 'Kütüphane bilgisi yüklenmedi.';
    }
  }
  function renderBoard(entries) {
    const el = $('#uacDailyBoard');
    if (!el) return;
    entries = uniqueBoardEntries(entries);
    if (!entries || !entries.length) { el.innerHTML = '<p class="uac-empty-note">Henüz sıralama yok.</p>'; return; }
    el.innerHTML = entries.slice(0,10).map(x => `<div class="uac-board-row"><span>#${esc(x.rank)}</span><span>${esc(x.name || 'Oyuncu')}</span><b>${fmt(x.score)}</b></div>`).join('');
  }
  function renderQuestion(data) {
    currentQuestion = data.question || null;
    const profile = data.profile || {};
    const library = data.library || {};
    if (data.season_completed || !currentQuestion) {
      $('#uacDailyQuestion').textContent = 'Bu oyuncu sır kütüphanesini bitirdi.';
      $('#uacDailyTheme').textContent = 'Sezon tamamlandı';
      $('#uacSecretPack').textContent = 'Yeni paket bekleniyor';
      $('#uacSecretDay').textContent = 'Tamamlandı';
      $('#uacDailySymbol').textContent = '✓';
      $('#uacDailyLore').textContent = 'Yeni paket eklenene kadar aynı soru tekrar verilmeyecek.';
      status('Yeni sorular eklenene kadar aynı soru tekrar verilmeyecek.');
      renderProfile(profile, library); renderBoard(data.leaderboard); return;
    }
    if (currentQuestion.id && currentQuestion.id !== lastRenderedQuestionId) {
      const answerInput = $('#uacDailyAnswer');
      if (answerInput) answerInput.value = '';
      lastRenderedQuestionId = currentQuestion.id;
    }
    $('#uacDailyQuestion').textContent = currentQuestion.text;
    $('#uacDailyTheme').textContent = `${currentQuestion.theme || 'gizem'} · ${data.day_key || ''}`;
    $('#uacSecretPack').textContent = currentQuestion.pack_title || 'Soru Paketi';
    const letters = currentQuestion.letter_count ? ` · ${currentQuestion.letter_count} harf` : '';
    const cat = currentQuestion.category ? `${currentQuestion.category}` : 'genel';
    $('#uacSecretDay').textContent = `Gün ${currentQuestion.day_no || profile.current_day || '-'}/7 · ${cat}${letters}`;
    $('#uacDailySymbol').textContent = currentQuestion.symbol || '◆';
    $('#uacDailyLore').textContent = currentQuestion.lore || 'Sır parçası açıldı.';
    $('#uacDailyHint').textContent = profile.today_done
      ? 'Bugünün sırrı tamamlandı.'
      : (currentQuestion.unlocked_hint ? 'İpucu: ' + currentQuestion.unlocked_hint : 'İpucu istersen puan kırılır. Harf sayısı ve kategori yardımcı olur.');
    renderProfile(profile, library);
    renderBoard(data.leaderboard);
    status(profile.today_done ? 'Bugünkü sır tamamlandı. Yarın tekrar gel.' : 'Cevabını yaz. Alternatif cevaplar ve küçük yazım hataları tolere edilir.');
  }
  async function loadQuestion() {
    unlockAudioCtx();
    const name = nameValue();
    if (!name) { status('Önce oyuncu adını yaz.'); $('#uacDailyName')?.focus(); return; }
    if (isReservedName(name)) { clearStoredReservedName(); if ($('#uacDailyName')) $('#uacDailyName').value = ''; status('Bu isim sistem/yönetici adı olarak ayrılmıştır. Lütfen farklı oyuncu adı yaz.'); $('#uacDailyName')?.focus(); return; }
    const pin = pinValue();
    if (!validPin(pin)) { status('PIN 4-12 karakter olmalı. Harf/rakam kullan.'); $('#uacDailyPin')?.focus(); return; }
    status('Sır alınıyor...');
    try {
      const url = `/wp-json/uac-secret/v2/today?name=${encodeURIComponent(name)}&player_pin=${encodeURIComponent(pin)}&device_key=${encodeURIComponent(deviceKey())}&${cacheBust()}`;
      const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Sır alınamadı.');
      storeValidName(name);
      storeValidPin(pin);
      renderQuestion(data);
      tone(260,.08,'triangle');
    } catch (err) { status(err.message || 'Sır alınamadı.'); }
  }
  async function requestHint() {
    unlockAudioCtx();
    const name = nameValue();
    if (!name) return status('Önce oyuncu adını yaz.');
    if (isReservedName(name)) { clearStoredReservedName(); if ($('#uacDailyName')) $('#uacDailyName').value = ''; return status('Bu isim ayrılmıştır. Farklı oyuncu adı yaz.'); }
    const pin = pinValue();
    if (!validPin(pin)) return status('PIN 4-12 karakter olmalı.');
    if (!currentQuestion) await loadQuestion();
    if (!currentQuestion) return;
    try {
      const res = await fetch('/wp-json/uac-secret/v2/hint?' + cacheBust(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', cache: 'no-store',
        body: JSON.stringify({ name, player_pin: pin, device_key: deviceKey(), question_id: currentQuestion?.id || '' })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'İpucu alınamadı.');
      $('#uacDailyHint').textContent = 'İpucu: ' + (data.hint || 'Daha dikkatli bak.');
      status(`İpucu açıldı. Puan kırılması: -${Number(data.penalty || 0)}`);
      renderProfile(data.profile, data.library);
      tone(300,.08,'triangle');
    } catch (err) { status(err.message || 'İpucu alınamadı.'); }
  }
  async function sendAnswer() {
    unlockAudioCtx();
    const name = nameValue();
    const answer = ($('#uacDailyAnswer')?.value || '').trim();
    if (!name) return status('Önce oyuncu adını yaz.');
    if (isReservedName(name)) { clearStoredReservedName(); if ($('#uacDailyName')) $('#uacDailyName').value = ''; return status('Bu isim ayrılmıştır. Farklı oyuncu adı yaz.'); }
    const pin = pinValue();
    if (!validPin(pin)) return status('PIN 4-12 karakter olmalı.');
    if (!currentQuestion) await loadQuestion();
    if (!currentQuestion) return;
    if (!answer) return status('Cevap boş olamaz.');
    status('Cevap kontrol ediliyor...');
    try {
      const res = await fetch('/wp-json/uac-secret/v2/answer?' + cacheBust(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', cache: 'no-store',
        body: JSON.stringify({ name, player_pin: pin, device_key: deviceKey(), answer, question_id: currentQuestion?.id || '' })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data && data.code === 'question_expired') {
          renderQuestion(data);
          return status(data.message || 'Soru yenilendi. Yeni soruyu açtım.');
        }
        throw new Error(data.message || 'Cevap kontrol edilemedi.');
      }
      renderProfile(data.profile, data.library);
      if (data.leaderboard) renderBoard(data.leaderboard);
      if (data.correct) {
        if (data.result === 'close') closeSound(); else successSound();
        $('#uacDailyAnswer').value = '';
        $('#uacDailyHint').textContent = data.result === 'close' ? 'Yakın cevap kabul edildi. Daha net cevap daha fazla puan getirirdi.' : 'Doğru cevap. Seri işlendi.';
        status(data.already_done ? 'Bugünü zaten tamamlamıştın.' : `${data.message} +${fmt(data.earned_score)} puan`);
      } else {
        failSound();
        $('#uacDailyHint').textContent = 'İpucu: ' + (data.hint || currentQuestion.hint || 'Daha dikkatli bak.');
        status(data.message + (data.tries_left !== undefined ? ` Kalan kolay deneme: ${data.tries_left}` : ''));
      }
    } catch (err) { status(err.message || 'Cevap gönderilemedi.'); }
  }
  function initCanvas() {
    const canvas = $('#uac-daily-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dots = [];
    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.width = Math.floor(canvas.clientWidth * dpr);
      h = canvas.height = Math.floor(canvas.clientHeight * dpr);
      const maxDots = window.matchMedia('(max-width: 640px)').matches ? 42 : 90;
      dots = Array.from({ length: maxDots }, () => ({ x: Math.random()*w, y: Math.random()*h, r: Math.random()*2+0.7, vx:(Math.random()-.5)*0.30, vy:(Math.random()-.5)*0.30 }));
    }
    function draw() {
      ctx.clearRect(0,0,w,h);
      const grd = ctx.createRadialGradient(w*.68,h*.28,20,w*.68,h*.28,Math.max(w,h)*.72);
      grd.addColorStop(0,'rgba(0,255,204,.20)'); grd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = grd; ctx.fillRect(0,0,w,h);
      ctx.strokeStyle = 'rgba(0,255,204,.08)'; ctx.lineWidth = 1;
      for (let i=0;i<dots.length;i++) {
        const a = dots[i]; a.x+=a.vx; a.y+=a.vy;
        if(a.x<0||a.x>w) a.vx*=-1; if(a.y<0||a.y>h) a.vy*=-1;
        ctx.beginPath(); ctx.arc(a.x,a.y,a.r,0,Math.PI*2); ctx.fillStyle='rgba(220,255,255,.56)'; ctx.fill();
        for(let j=i+1;j<dots.length;j++){ const b=dots[j], dx=a.x-b.x, dy=a.y-b.y, d=Math.hypot(dx,dy); if(d<100){ ctx.globalAlpha=(1-d/100)*.18; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.globalAlpha=1; } }
      }
      requestAnimationFrame(draw);
    }
    resize(); addEventListener('resize', resize, { passive:true }); draw();
  }
  document.addEventListener('DOMContentLoaded', () => {
    clearStoredReservedName();
    const n = $('#uacDailyName');
    if (n) n.value = localStorage.getItem('playerName') || localStorage.getItem('km_player_name') || localStorage.getItem('uacss5_name') || '';
    const pinInput = $('#uacDailyPin');
    if (pinInput) pinInput.value = localStorage.getItem('uac_player_pin') || '';
    $('#uacDailyLoad')?.addEventListener('click', loadQuestion);
    $('#uacDailySend')?.addEventListener('click', sendAnswer);
    $('#uacDailyAnswer')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendAnswer(); });
    $('#uacDailyHintBtn')?.addEventListener('click', requestHint);

    const soundBtn = $('#uacDailySound');
    if (soundBtn) {
      let volSlider = $('#uacDailyVolume');
      if (!volSlider) {
        const wrap = document.createElement('div');
        wrap.className = 'uac-sound-control-pill';
        soundBtn.parentNode.insertBefore(wrap, soundBtn);
        wrap.appendChild(soundBtn);
        volSlider = document.createElement('input');
        volSlider.type = 'range';
        volSlider.id = 'uacDailyVolume';
        volSlider.className = 'uac-volume-slider';
        volSlider.min = '0';
        volSlider.max = '100';
        volSlider.value = String(soundOn ? dailyVolume : 0);
        volSlider.setAttribute('aria-label', 'Günün Sırrı ses seviyesi');
        wrap.appendChild(volSlider);
      }

      const syncDailySoundUI = () => {
        const eff = soundOn ? dailyVolume : 0;
        soundBtn.textContent = (soundOn && eff > 0) ? `🔊 Ses: %${eff}` : '🔇 Ses: Kapalı';
        if (volSlider && Number(volSlider.value) !== eff) {
          volSlider.value = String(eff);
        }
        Object.values(dailySfx).forEach(a => {
          try { a.volume = Math.max(0, Math.min(1, eff / 100)); a.muted = !soundOn || eff <= 0; } catch (e) {}
        });
      };

      soundBtn.addEventListener('click', () => {
        if (soundOn && dailyVolume > 0) {
          lastDailyVol = dailyVolume;
          soundOn = false;
          localStorage.setItem('uac_daily_sound', 'off');
        } else {
          soundOn = true;
          dailyVolume = lastDailyVol > 0 ? lastDailyVol : 70;
          localStorage.setItem('uac_daily_sound', 'on');
          localStorage.setItem('uac_daily_volume', String(dailyVolume));
          playDailySfx('click');
          tone(520, .08);
        }
        syncDailySoundUI();
      });

      const onVolInput = (e) => {
        e.stopPropagation();
        const raw = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
        dailyVolume = raw;
        if (raw > 0) {
          lastDailyVol = raw;
          soundOn = true;
          localStorage.setItem('uac_daily_sound', 'on');
          localStorage.setItem('uac_daily_volume', String(raw));
        } else {
          soundOn = false;
          localStorage.setItem('uac_daily_sound', 'off');
        }
        syncDailySoundUI();
      };
      volSlider.addEventListener('input', onVolInput);
      volSlider.addEventListener('change', onVolInput);
      syncDailySoundUI();
    }
    initCanvas();
    if (n?.value.trim()) loadQuestion();
  });
})();
