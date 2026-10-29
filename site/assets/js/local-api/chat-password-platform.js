/*
 * UltiAtomCore - Yerel API: Password Challenge + Sohbet + Platform (home/profile)
 * Rotalar: password-game/v1 (save, list, chat-*), uac-platform/v1 (home, profile)
 */
(function () {
  'use strict';
  if (!window.UACLocal) return;
  const L = window.UACLocal;
  const db = L.db;
  const U = L.util;
  const err = L.err;

  /* ---------- yardimcilar ---------- */
  const strlen = (s) => Array.from(String(s == null ? '' : s)).length;
  const lowerTr = (s) => String(s == null ? '' : s).toLocaleLowerCase('tr-TR');
  const num = (v) => { const n = parseInt(v, 10); return isFinite(n) ? n : 0; };
  const sanitizeKey = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9_\-]/g, '');
  const nowSec = () => Math.floor(Date.now() / 1000);
  const pad2 = (n) => String(n).padStart(2, '0');

  function isPrime(n) {
    n = num(n);
    if (n <= 1) return false;
    if (n <= 3) return true;
    for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
    return true;
  }
  function matchAll(re, s) { return String(s).match(re) || []; }
  function uniqCount(arr) { return new Set(arr).size; }

  /* ---------- Password kurallari (46) ---------- */
  const CITY_REGEX = /istanbul|ankara|izmir|bursa|antalya|balıkesir|muğla|muş|adana|adıyaman|afyonkarahisar|ağrı|aksaray|amasya|ardahan|artvin|aydın|bartın|batman|bayburt|bilecik|bingöl|bitlis|bolu|burdur|çanakkale|çankırı|çorum|denizli|diyarbakır|düzce|edirne|elazığ|erzincan|erzurum|eskişehir|gaziantep|giresun|gümüşhane|hakkari|hatay|ığdır|ısparta|kahramanmaraş|karabük|karaman|kars|kastamonu|kayseri|kilis|kırkkale|kırklareli|kırşehir|kocaeli|konya|kütahya|malatya|manisa|mardin|mersin|nevşehir|niğde|ordu|osmaniye|rize|sakarya|samsun|şanlıurfa|siirt|sinop|şırnak|sivas|tekirdağ|tokat|trabzon|tunceli|uşak|van|yalova|yozgat|zonguldak/iu;
  const ROMAN_FULL = /^(M{0,3})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/iu;

  const RULES = [
    ['En az 8 karakter olmalı', (p) => strlen(p) >= 8],
    ['Büyük harf içermeli', (p) => /[A-Z]/u.test(p)],
    ["Çözüm 'abc' içermeli", (p) => lowerTr(p).indexOf('abc') !== -1],
    ['İçinde en az 2 basamaklı bir sayı olmalı', (p) => /\d{2,}/u.test(p)],
    ['İçinde en az bir tek sayı olmalı', (p) => /[13579]/u.test(p)],
    ['En az 1 özel karakter olmalı (!@#$)', (p) => /[!@#$]/u.test(p)],
    ['Sayı ile başlamamalı ama sayı içermeli', (p) => !/^\d/u.test(p) && /\d/u.test(p)],
    ['Aynı karakter 3 kez tekrar edemez', (p) => !/(.)\1\1/u.test(p)],
    ['Uzunluğu asal olmalı', (p) => isPrime(strlen(p))],
    ['Rakamların toplamı 10-65 arasında olmalı', (p) => {
      const m = matchAll(/\d/gu, p);
      if (!m.length) return false;
      const sum = m.reduce((a, d) => a + parseInt(d, 10), 0);
      return sum >= 10 && sum <= 65;
    }],
    ['Geçerli Roma rakamı içermeli', (p) => {
      const runs = matchAll(/[IVXLCDM]+/giu, p);
      for (const r of runs) if (ROMAN_FULL.test(r)) return true;
      return false;
    }],
    ['Her büyük harften sonra küçük harf gelmeli', (p) => {
      const ch = Array.from(p);
      for (let i = 0; i < ch.length; i++) {
        if (/^[A-Z]$/.test(ch[i]) && !/^[a-z]$/.test(ch[i + 1] || '')) return false;
      }
      return true;
    }],
    ['Büyük Türkçe harf içermemeli', (p) => !/[İĞÜŞÖÇ]/u.test(p)],
    ['Harf sayısı rakam sayısının 2 katından fazla olamaz', (p) => {
      const h = matchAll(/[a-zA-ZğüşıöçĞÜŞİÖÇ]/gu, p).length;
      const r = matchAll(/\d/gu, p).length;
      return r > 0 && h <= r * 2;
    }],
    ['En az 2 farklı noktalama işareti içermeli', (p) => uniqCount(matchAll(/[.,;:?!]/gu, p)) >= 2],
    ['Yan yana 2 büyük harf olamaz', (p) => !/[A-Z]{2}/u.test(p)],
    ['Ünlü harflerin sayısı çift olmalı', (p) => matchAll(/[aeıioöuüAEIİOÖUÜ]/gu, p).length % 2 === 0],
    ['İlk yarısında en az 1 büyük harf olmalı', (p) => /[A-Z]/u.test(Array.from(p).slice(0, Math.floor(strlen(p) / 2)).join(''))],
    ['En az 3 farklı özel karakter türü içermeli', (p) => uniqCount(matchAll(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/gu, p)) >= 3],
    ['Boşluk içermemeli', (p) => !/\s/u.test(p)],
    ["'dağ' kelimesini içermeli", (p) => lowerTr(p).indexOf('dağ') !== -1],
    ['En az 1 çift tırnak veya tek tırnak olmalı', (p) => /['"]/u.test(p)],
    ['Bu kural önemli değil gibi duruyor...', () => true],
    ['İçindeki sayıların çarpımı 3’e bölünebilmeli', (p) => {
      const m = matchAll(/\d/gu, p);
      if (!m.length) return false;
      return m.some((d) => parseInt(d, 10) % 3 === 0);
    }],
    ["'su' kelimesini içermemeli", (p) => lowerTr(p).indexOf('su') === -1],
    ['En az 2 farklı sayı içermeli', (p) => uniqCount(matchAll(/\d/gu, p)) >= 2],
    ['En az 1 matematiksel işlem olmalı', (p) => /[+\-*\/]/u.test(p)],
    ["İçinde 'X' varsa yanında sayı olmalı", (p) => {
      const ch = Array.from(p);
      for (let i = 0; i < ch.length; i++) {
        if (ch[i] === 'X' && !(/\d/.test(ch[i - 1] || '') || /\d/.test(ch[i + 1] || ''))) return false;
      }
      return true;
    }],
    ['Bir gün adı içermeli', (p) => /pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar/iu.test(p)],
    ['Koordinat formatı içermeli', (p) => /\d{2,3}\.\d+,\d{2,3}\.\d+/u.test(p)],
    ['Bir şehir adı içermeli', (p) => CITY_REGEX.test(p)],
    ['HEX renk kodu içermeli', (p) => /#[0-9a-fA-F]{6}/u.test(p)],
    ['En az 1 asal uzunlukta kelime olmalı', (p) => {
      const words = String(p).split(/[^a-zA-Z]+/);
      for (const w of words) if (w !== '' && isPrime(w.length)) return true;
      return false;
    }],
    ['Tersiyle aynı olan 3 karakterlik parça olmalı', (p) => {
      const c = Array.from(p);
      for (let i = 0; i < c.length - 2; i++) if (c[i] === c[i + 2]) return true;
      return false;
    }],
    ['Artan 3 sayı içermeli', (p) => /123|234|345|456|567|678|789/u.test(p)],
    ["İçinde 'js' geçmeli", (p) => String(p).toLowerCase().indexOf('js') !== -1],
    ["'2026' ile bitmeli", (p) => String(p).slice(-4) === '2026'],
    ['En az 1 noktalama işareti içermeli', (p) => /[.,:;?]/u.test(p)],
    ['En az 1 Fibonacci sayısı geçmeli', (p) => /13|21|34|55|89/u.test(p)],
  ];

  function validateSolution(solution) {
    const errors = [];
    RULES.forEach((rule, index) => {
      let okk = false;
      try { okk = !!rule[1](solution); } catch (e) { okk = false; }
      if (!okk) errors.push({ index, text: rule[0] });
    });
    return [errors.length === 0, errors];
  }

  /* ---------- veri erisimi ---------- */
  const KEY_SOLUTIONS = 'pg_solutions';
  const KEY_CHAT = 'chat_messages';
  const KEY_BANNED = 'uac_banned_names';
  const KEY_ONLINE = 'chat_online_users';

  function solutions() { const a = db.get(KEY_SOLUTIONS, []); return Array.isArray(a) ? a : []; }
  function chatMessages() { const a = db.get(KEY_CHAT, []); return Array.isArray(a) ? a : []; }

  function asList(board) {
    if (!board) return [];
    if (Array.isArray(board)) return board.filter((e) => e && typeof e === 'object');
    if (typeof board === 'object') return Object.keys(board).map((k) => {
      const e = board[k];
      if (e && typeof e === 'object' && e.name_key === undefined && e.__key === undefined) {
        return Object.assign({}, e, { __key: k });
      }
      return e;
    }).filter((e) => e && typeof e === 'object');
    return [];
  }
  function entryMatchesName(e, name) {
    const want = U.playerKey(name);
    const lw = sanitizeKey(String(name).toLowerCase());
    const k = e.__key !== undefined ? String(e.__key) : '';
    if (k && (k === want || k === lw)) return true;
    const en = String(e.name || '');
    return en !== '' && (U.playerKey(en) === want || sanitizeKey(en.toLowerCase()) === lw);
  }
  function sortByScore(list) {
    return list.slice().sort((a, b) => num(b.score) - num(a.score));
  }
  function kmBoard(period) {
    if (window.UACLocalKS && typeof window.UACLocalKS.kmBoard === 'function') {
      return window.UACLocalKS.kmBoard(period || 'all');
    }
    return db.get('km_board_' + (period || 'all')) || {};
  }
  function findRank(board, name) {
    const list = sortByScore(asList(board));
    for (let i = 0; i < list.length; i++) if (entryMatchesName(list[i], name)) return i + 1;
    return null;
  }
  function entriesFromBoard(board, limit) {
    const list = sortByScore(asList(board)).slice(0, limit);
    return list.map((e, i) => ({
      rank: i + 1,
      name: U.sanitizeText(e.name || ''),
      score: num(e.score),
      level: num(e.level),
      duration: num(e.duration),
      date: U.sanitizeText(e.date || ''),
    }));
  }
  function kmProfile(name) {
    const cands = [U.playerKey(name), sanitizeKey(String(name).toLowerCase())];
    for (const c of cands) {
      const p = db.get('km_profile_' + c);
      if (p && typeof p === 'object') return p;
    }
    return null;
  }
  function secretProfile(name) {
    const want = U.playerKey(name);
    const direct = ['secret_profile_name_' + want, 'secret_profile_' + want];
    for (const k of direct) {
      const p = db.get(k);
      if (p && typeof p === 'object' && !Array.isArray(p)) return p;
    }
    const keys = db.keys('secret_profile_');
    for (const k of keys) {
      const p = db.get(k);
      if (p && typeof p === 'object' && p.name && U.playerKey(p.name) === want) return p;
    }
    return null;
  }
  function secretBoard() {
    const b = db.get('secret_rank');
    return b || [];
  }
  function compactSecretBoard(board) {
    const out = {};
    asList(board).forEach((row) => {
      const name = U.sanitizeText(row.name || '');
      if (name === '') return;
      const key = U.playerKey(name);
      const score = num(row.score);
      const answered = num(row.answered);
      const cur = out[key];
      if (!cur || score > num(cur.score) || (score === num(cur.score) && answered > num(cur.answered))) {
        out[key] = Object.assign({}, row, { name, score, answered });
      }
    });
    return Object.keys(out).map((k) => out[k]).sort((a, b) => {
      const d = num(b.score) - num(a.score);
      return d !== 0 ? d : num(b.answered) - num(a.answered);
    });
  }
  function sonBoard() {
    if (window.UACLocalKS && typeof window.UACLocalKS.ssBoard === 'function') {
      return window.UACLocalKS.ssBoard('all');
    }
    return db.get('ss_board_all') || {};
  }

  /* ---------- tamamlanma kontrolleri ---------- */
  function completedByPassword(name) {
    const w = U.playerKey(name);
    return solutions().some((s) => U.playerKey(s.name || '') === w);
  }
  function passwordRecord(name) {
    const w = U.playerKey(name);
    return solutions().find((s) => U.playerKey(s.name || '') === w) || null;
  }
  function completedByKm(name) {
    const p = kmProfile(name);
    if (p && (num(p.total_games) > 0 || num(p.best_score) > 0)) return true;
    for (const b of [kmBoard('all'), kmBoard('week'), kmBoard('day')]) {
      if (asList(b).some((e) => entryMatchesName(e, name))) return true;
    }
    return false;
  }
  function completedByDaily(name) {
    const p = secretProfile(name);
    if (p && (num(p.answered) > 0 || num(p.score) > 0)) return true;
    return asList(secretBoard()).some((e) => entryMatchesName(e, name));
  }

  function lastUnlockGame(name) {
    const d = db.get('chat_unlock_' + U.playerKey(name));
    if (!d || !d.games) return 'game';
    let best = 'game', bt = '';
    Object.keys(d.games).forEach((g) => { if (String(d.games[g]) >= bt) { bt = String(d.games[g]); best = g; } });
    return best;
  }
  function lockedMessage() {
    return 'Sohbete yazmak için önce aynı oyuncu adı ve PIN ile herhangi bir oyunu tamamlayıp skor/kayıt oluşturmalısın. Klavye Muharebesi, Password Challenge veya Günün Sırrı yeterli.';
  }
  function playerCanSend(name) {
    if (U.chatIsUnlocked(name)) return [true, lastUnlockGame(name)];
    if (completedByKm(name)) { U.chatUnlock(name, 'klavye_muharebesi'); return [true, 'klavye_muharebesi']; }
    if (completedByPassword(name)) { U.chatUnlock(name, 'password_challenge'); return [true, 'password_challenge']; }
    if (completedByDaily(name)) { U.chatUnlock(name, 'gunun_sirri'); return [true, 'gunun_sirri']; }
    return [false, ''];
  }
  function verifyPinOrClaimIfCompleted(name, pin) {
    const v = U.validatePin(pin);
    if (!v[0]) return [false, v[1], 'pin_required'];
    const r = U.pinVerifyOnly(name, v[1]);
    if (r[0] === true) return [true, '', 'pin_ok'];
    if (r[0] === false) return [false, r[1], r[2]];
    if (completedByKm(name) || completedByPassword(name) || completedByDaily(name)) {
      return U.pinClaimOrVerify(name, v[1], 'legacy_claim');
    }
    return [false, lockedMessage(), 'game_required'];
  }

  /* ---------- sohbet metin filtreleri ---------- */
  function cleanMessage(message) {
    let m = U.sanitizeText(message);
    m = m.replace(/\s+/gu, ' ').trim();
    m = m.replace(/\s+\[[a-z0-9]{2,5}\]$/iu, '');
    return m.trim();
  }
  function compactText(text) {
    let t = String(text == null ? '' : text).toLowerCase();
    const map = { 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c', 'İ': 'i', 'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'Ö': 'o', 'Ç': 'c' };
    t = Array.from(t).map((c) => (map[c] !== undefined ? map[c] : c)).join('');
    return t.replace(/[^a-z0-9]/gu, '');
  }
  const SHORT_ALLOW = ['as','sa','slm','mrb','mrh','ii','iyi','ok','oki','tm','tmm','gg','wp','xd','lol','brb','afk','np','ty','thx','hi','hey','yo','no','yes','gl','hf','ez','wb','gm','gn','bb','by','js','php','css','html','sql','api','fps','lag','bug','fix','mod','bot','ai','pc','dc','yt','ig','hmm','hm','tsk','aq'];
  function isLowQuality(text) {
    const c = compactText(text);
    if (c === '') return [false, ''];
    if (SHORT_ALLOW.indexOf(c) !== -1) return [false, ''];
    const len = Array.from(c).length;
    if (len === 1) return [true, 'Tek harflik mesajlar spam gibi görünüyor.'];
    if (len <= 2) return [true, 'Mesaj çok kısa ve anlamsız görünüyor.'];
    if (/^(.)\1{2,}$/u.test(c)) return [true, 'Aynı karakter tekrarı spam gibi görünüyor.'];
    if (/^(.{1,2})\1{2,}$/u.test(c)) return [true, 'Tekrarlı harf dizisi spam gibi görünüyor.'];
    if (!/[aeiou]/u.test(c) && len <= 6) return [true, 'Mesaj rastgele harf dizisi gibi görünüyor.'];
    if (len >= 4 && /^(asdf|sdfg|dfgh|fghj|qwer|wert|zxcv|xcvb|cvbn|hjkl)/u.test(c)) return [true, 'Klavye karışık harfleri spam gibi görünüyor.'];
    return [false, ''];
  }

  function nameBanKeys(name) {
    return [U.hash(U.normalizeText(name)), sanitizeKey(String(name).toLowerCase())].filter(Boolean);
  }
  function bannedNames() { const a = db.get(KEY_BANNED, []); return Array.isArray(a) ? a : []; }

  // cooldown (sadece kisa spam beklemesi)
  const lastSend = {};
  const COOLDOWN_SEC = 3;

  /* ---------- online kullanicilar ---------- */
  function touchOnline(user) {
    let o = db.get(KEY_ONLINE, {});
    if (!o || typeof o !== 'object' || Array.isArray(o)) o = {};
    const now = nowSec();
    if (user !== '' && Array.from(user).length <= 20) o[user] = now;
    Object.keys(o).forEach((k) => { if (now - num(o[k]) > 15) delete o[k]; });
    db.set(KEY_ONLINE, o);
    return Object.keys(o).length;
  }
  function onlineCount() {
    const o = db.get(KEY_ONLINE, {});
    if (!o || typeof o !== 'object' || Array.isArray(o)) return 0;
    const now = nowSec();
    return Object.keys(o).filter((k) => now - num(o[k]) <= 15).length;
  }

  /* ---------- rotalar: password ---------- */
  L.register('POST', '/password-game/v1/save', (req) => {
    const p = req.params;
    let name = U.sanitizeText(p.name);
    let solution = String(p.solution == null ? '' : p.solution);
    if (solution === '') solution = String(p.password == null ? '' : p.password);
    solution = U.sanitizeText(solution);

    const vn = U.validateName(name, 30);
    if (!vn[0]) return err(vn[1], 'invalid_name', 400);
    name = vn[1];

    const pr = U.pinClaimOrVerify(name, U.pinFromParams(p), 'password_challenge');
    if (!pr[0]) return err(pr[1], pr[2], 403);

    if (strlen(solution) < 8 || strlen(solution) > 500) return err('Çözüm 8-500 karakter arasında olmalıdır.', 'invalid_solution', 400);
    if (U.containsBadWords(solution)) return err('Uygunsuz kelime kullanımı tespit edildi.', 'bad_word', 400);

    const vs = validateSolution(solution);
    if (!vs[0]) return err('Çözüm tüm kuralları sağlamıyor.', 'rules_failed', 400, { rule_errors: vs[1] });

    const list = solutions();
    const w = U.playerKey(name);
    const rec = { name, player_id: U.unifiedPlayerId ? U.unifiedPlayerId(name) : '', solution, length: strlen(solution), rule_version: '4.0.0', date: U.mysqlNow() };
    const idx = list.findIndex((s) => U.playerKey(s.name || '') === w);
    if (idx >= 0) list[idx] = rec; else list.push(rec);
    db.set(KEY_SOLUTIONS, list);
    U.chatUnlock(name, 'password_challenge');
    return { ok: true, message: 'Kaydedildi.' };
  });

  L.register('GET', '/password-game/v1/list', (req) => {
    if (req.params.completed !== 'yes') return err('Liste sadece oyunu tamamlayanlara gösterilir.', 'not_completed', 403);
    const entries = solutions()
      .map((s, i) => ({ s, i }))
      .sort((a, b) => (num(a.s.length) - num(b.s.length)) || (a.i - b.i))
      .slice(0, 30)
      .map((o) => ({
        name: U.sanitizeText(o.s.name || ''),
        solution: U.sanitizeText(o.s.solution || ''),
        length: num(o.s.length),
      }));
    return { ok: true, entries };
  });

  /* ---------- rotalar: sohbet ---------- */
  L.register('GET', '/password-game/v1/chat-status', (req) => {
    if (U.isAdminSession && U.isAdminSession()) {
      return { ok: true, can_chat: true, is_admin: true, source: 'admin', message: 'Kurucu / Admin oturumu açık.' };
    }
    const p = req.params;
    const name = U.sanitizeText(p.name);
    const vn = U.validateName(name, 20);
    if (!vn[0]) {
      return { ok: true, can_chat: false, source: '', message: vn[1] || 'Sohbet için önce geçerli bir oyuncu adı yazmalısın.' };
    }
    const pr = verifyPinOrClaimIfCompleted(vn[1], U.pinFromParams(p));
    if (!pr[0]) return { ok: true, can_chat: false, source: '', code: pr[2], message: pr[1] };
    const cs = playerCanSend(vn[1]);
    return { ok: true, can_chat: !!cs[0], source: cs[1], message: cs[0] ? 'Sohbet yazma iznin açık.' : lockedMessage() };
  });

  L.register('POST', '/password-game/v1/chat-send', (req) => {
    const p = req.params;
    const honeypot = U.sanitizeText(p.website);
    if (honeypot !== '') return err('Spam algılandı.', 'spam_detected', 403);

    const isAdmin = !!(U.isAdminSession && U.isAdminSession());
    let name = U.sanitizeText(p.name);
    const message = cleanMessage(p.message);

    const vn = U.validateName(name, 20);
    if (!vn[0]) return err(vn[1], 'invalid_name', 400);
    name = vn[1];

    const banned = bannedNames();
    if (!isAdmin && nameBanKeys(name).some((k) => banned.indexOf(k) !== -1)) return err('Bu isim sohbetten engellenmiştir.', 'name_banned', 403);

    if (!isAdmin) {
      const pr = verifyPinOrClaimIfCompleted(name, U.pinFromParams(p));
      if (!pr[0]) return err(pr[1], pr[2], 403);

      const cs = playerCanSend(name);
      if (!cs[0]) return err(lockedMessage(), 'game_required', 403);
    }

    if (strlen(message) < 1 || strlen(message) > 120) return err('Mesaj 1-120 karakter olmalıdır.', 'invalid_message', 400);

    if (/(https?:\/\/|www\.|\.com|\.net|\.org|\.xyz|\.io|\.gg|\.tr|discord\.gg|t\.me)/i.test(message)) {
      return err('Sohbette link paylaşımı kapalı.', 'link_blocked', 400);
    }

    const lq = isLowQuality(message);
    if (lq[0]) return err(lq[1] || 'Mesaj spam gibi görünüyor.', 'low_quality', 400);

    const nq = isLowQuality(name);
    if (nq[0] && strlen(name) >= 4) return err('Oyuncu adı rastgele harf dizisi gibi görünüyor.', 'low_quality_name', 400);

    if (U.containsBadWords(name) || U.containsBadWords(message)) return err('Uygunsuz kelime kullanımı tespit edildi.', 'bad_word', 400);

    const nkey = U.playerKey(name);
    const normalizedMsg = message.replace(/\s+/gu, ' ').trim().toLowerCase();
    const prev = lastSend[nkey] || db.get('chat_last_' + nkey);
    if (prev && prev.msg === normalizedMsg && nowSec() - num(prev.t) < 300) {
      return err('Aynı mesajı üst üste gönderemezsiniz.', 'duplicate_message', 400);
    }
    if (prev && nowSec() - num(prev.t) < COOLDOWN_SEC) {
      return err('Çok hızlı gönderdin. Birkaç saniye bekle.', 'chat_cooldown', 429, { retry_after: Math.max(1, COOLDOWN_SEC - (nowSec() - num(prev.t))) });
    }

    const list = chatMessages();
    const maxId = list.reduce((m, x) => Math.max(m, num(x.id)), 0);
    list.push({ id: maxId + 1, name, is_admin: isAdmin, message, ts: Date.now() });
    db.set(KEY_CHAT, list.slice(-300));
    const rec = { msg: normalizedMsg, t: nowSec() };
    lastSend[nkey] = rec;
    db.set('chat_last_' + nkey, rec);
    return { ok: true };
  });

  function fmtDate(ts, withDate) {
    const d = new Date(ts);
    const t = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    if (!withDate) return t;
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + t;
  }

  L.register('GET', '/password-game/v1/chat-list', (req) => {
    const user = U.sanitizeText(req.params.user);
    const count = touchOnline(user);
    const weekBoard = kmBoard('week');
    const messages = chatMessages().slice(-40).map((m) => {
      const prof = kmProfile(m.name);
      let best = 0, rankWeek = null;
      if (prof) {
        best = num(prof.best_score);
        rankWeek = findRank(weekBoard, m.name);
      }
      return {
        id: num(m.id),
        name: U.sanitizeText(m.name || ''),
        is_admin: !!m.is_admin,
        message: U.sanitizeText(m.message || ''),
        time: fmtDate(m.ts, false),
        date: fmtDate(m.ts, true),
        km_best_score: best,
        km_rank_week: rankWeek,
      };
    });
    return { ok: true, online_count: Math.max(0, count), messages };
  });

  /* ---------- rotalar: sohbet admin (sadece Admin oturumuna acik) ---------- */
  L.register('GET', '/password-game/v1/chat-admin-list', (req) => {
    if (!U.isAdminSession || !U.isAdminSession()) return err('Yetkisiz erişim. Admin oturumu gerekli.', 'forbidden', 403);
    const limit = Math.min(120, Math.max(10, num(req.params.limit) || 80));
    const items = chatMessages().slice().reverse().slice(0, limit).map((m) => ({
      id: num(m.id),
      name: U.sanitizeText(m.name || ''),
      message: U.sanitizeText(m.message || ''),
      date: fmtDate(m.ts, true),
      ip_hash: '',
    }));
    return { ok: true, items, banned_names: bannedNames().slice() };
  });

  L.register('POST', '/password-game/v1/chat-delete', (req) => {
    if (!U.isAdminSession || !U.isAdminSession()) return err('Yetkisiz erişim.', 'forbidden', 403);
    const id = Math.abs(num(req.params.id));
    if (!id) return err('Mesaj ID gerekli.', 'missing_id', 400);
    const list = chatMessages();
    if (!list.some((m) => num(m.id) === id)) return err('Bu kayıt sohbet mesajı değil.', 'invalid_message', 400);
    db.set(KEY_CHAT, list.filter((m) => num(m.id) !== id));
    return { ok: true, message: 'Mesaj silindi.' };
  });

  L.register('POST', '/password-game/v1/chat-clear', () => {
    if (!U.isAdminSession || !U.isAdminSession()) return err('Yetkisiz erişim.', 'forbidden', 403);
    const n = Math.min(300, chatMessages().length);
    db.set(KEY_CHAT, []);
    return { ok: true, deleted: n };
  });

  L.register('POST', '/password-game/v1/chat-ban-name', (req) => {
    if (!U.isAdminSession || !U.isAdminSession()) return err('Yetkisiz erişim.', 'forbidden', 403);
    const rawName = U.sanitizeText(req.params.name);
    if (!rawName) return err('İsim gerekli.', 'invalid_name', 400);
    const key = U.hash(U.normalizeText(rawName));
    const banned = bannedNames();
    nameBanKeys(rawName).forEach((k) => { if (banned.indexOf(k) === -1) banned.push(k); });
    db.set(KEY_BANNED, banned);
    return { ok: true, message: 'İsim engellendi.', name_key: key };
  });

  L.register('POST', '/password-game/v1/chat-unban-name', (req) => {
    if (!U.isAdminSession || !U.isAdminSession()) return err('Yetkisiz erişim.', 'forbidden', 403);
    const name = U.sanitizeText(req.params.name);
    const keys = nameBanKeys(name);
    db.set(KEY_BANNED, bannedNames().filter((k) => keys.indexOf(k) === -1));
    return { ok: true, message: 'İsim engeli kaldırıldı.' };
  });

  /* ---------- rotalar: platform ---------- */
  L.register('GET', '/uac-platform/v1/home', () => {
    const daily = compactSecretBoard(secretBoard());
    const dailyOut = daily.slice(0, 6).map((r, i) => ({
      rank: i + 1, name: U.sanitizeText(r.name || ''), score: num(r.score), answered: num(r.answered),
    }));
    return {
      ok: true,
      online_count: onlineCount(),
      counts: {
        password_winners: solutions().length,
        chat_messages: chatMessages().length,
        daily_players: daily.length,
      },
      leaderboards: {
        km_all: entriesFromBoard(kmBoard('all'), 6),
        km_week: entriesFromBoard(kmBoard('week'), 6),
        km_day: entriesFromBoard(kmBoard('day'), 6),
        daily_all: dailyOut,
        son_all: entriesFromBoard(sonBoard(), 6),
      },
    };
  });

  function secretPublic(p) {
    const arrLen = (v) => (Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : 0));
    let packTitle = U.sanitizeText(p.active_pack_title || '');
    if (!packTitle && p.active_pack_id && Array.isArray(window.UAC_DAILY_LIBRARY)) {
      const pk = window.UAC_DAILY_LIBRARY.find((x) => x && x.pack_id === p.active_pack_id);
      if (pk && pk.title) packTitle = U.sanitizeText(pk.title);
    }
    return {
      name: U.sanitizeText(p.name || ''),
      score: num(p.score),
      answered: num(p.answered),
      streak: num(p.streak),
      best_streak: num(p.best_streak),
      current_day: p.current_day === undefined ? 1 : num(p.current_day),
      active_pack_id: U.sanitizeText(p.active_pack_id || ''),
      active_pack_title: packTitle,
      completed_packs: arrLen(p.completed_packs),
      seen_questions: arrLen(p.seen_questions),
      seen_concepts: arrLen(p.seen_concepts),
      today_done: !!p.today_done,
      today_hints: num(p.today_hints),
      last_correct_day_key: U.sanitizeText(p.last_correct_day_key || ''),
    };
  }

  L.register('POST', '/uac-platform/v1/auth-login', (req) => {
    const p = req.params || {};
    const vn = U.validateName(p.name, 20);
    if (!vn[0]) return err(vn[1], 'invalid_name', 400);
    const res = U.pinClaimOrVerify(vn[1], U.pinFromParams(p), 'profile_login');
    if (!res[0]) return err(res[1], res[2], 403);
    const acc = U.getPlayerAccount(vn[1]);
    return { ok: true, status: res[2], message: res[1], account: acc };
  });

  L.register('POST', '/uac-platform/v1/admin-login', (req) => {
    const p = req.params || {};
    const res = U.loginAdmin(p.admin_key || '', p.new_admin_key || '');
    if (!res[0]) return err(res[1], 'admin_denied', 403);
    return { ok: true, message: res[1], token: res[2] };
  });

  L.register('POST', '/uac-platform/v1/admin-logout', () => {
    if (U.logoutAdmin) U.logoutAdmin();
    return { ok: true, message: 'Admin oturumu kapatıldı.' };
  });

  L.register('GET', '/uac-platform/v1/profile', (req) => {
    const rawName = U.sanitizeText(req.params.name);
    if (!rawName || Array.from(rawName).length < 2) return { ok: true, found: false, message: 'Oyuncu bulunamadı.' };
    const name = rawName.slice(0, 20);
    const km = kmProfile(name);
    const sp = secretProfile(name);
    const pw = passwordRecord(name);
    const daily = sp ? secretPublic(sp) : null;
    const acc = U.getPlayerAccount ? U.getPlayerAccount(name) : { player_id: U.unifiedPlayerId ? U.unifiedPlayerId(name) : '', registered: false, sources: {} };
    const games = km ? num(km.total_games) : 0;
    return {
      ok: true,
      found: !!km || !!daily || !!pw || !!acc.registered,
      name: acc.name || name,
      account: acc,
      password: pw ? {
        completed: true,
        length: num(pw.length),
        date: U.sanitizeText(pw.date || ''),
      } : null,
      km: km ? {
        total_games: games,
        total_score: num(km.total_score),
        best_score: num(km.best_score),
        best_level: num(km.best_level),
        total_words: num(km.total_words),
        total_time: num(km.total_time),
        avg_score: games > 0 ? Math.round(num(km.total_score) / games) : 0,
        rank_all: findRank(kmBoard('all'), name),
        rank_week: findRank(kmBoard('week'), name),
        last_played: U.sanitizeText(km.last_played || ''),
      } : null,
      daily,
    };
  });
})();
