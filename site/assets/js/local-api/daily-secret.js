/*
 * UltiAtomCore - Gunun Sirri (uac-secret/v2) yerel API
 * PHP: uac_secret_v2_* fonksiyonlarinin localStorage karsiligi.
 * Veri anahtarlari (UACLocal.db):
 *   secret_profile_<oyuncuAnahtari>  -> profil nesnesi
 *   secret_rank                      -> siralama dizisi [{rank_key,name,score,answered,level,date}] (skora gore azalan)
 *   daily_rank_all                   -> secret_rank ile ayni (PHP uac_daily_rank_all karsiligi)
 * Gerektirir: core.js, daily-library.js (window.UAC_DAILY_LIBRARY)
 */
(function () {
  'use strict';
  if (!window.UACLocal) { console.error('[daily-secret] UACLocal (core.js) yuklenmemis.'); return; }
  const L = window.UACLocal;
  const U = L.util;
  const NS = '/uac-secret/v2';

  /* ---------- zaman: Europe/Istanbul, 03:00 siniri ---------- */
  const TZ = 'Europe/Istanbul';
  function istParts(d) {
    d = d || new Date();
    let fmt;
    try {
      fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) { fmt = null; }
    if (!fmt) { // yedek: UTC+3
      const t = new Date(d.getTime() + 3 * 3600000);
      return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours() };
    }
    const o = {};
    fmt.formatToParts(d).forEach((p) => { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24 };
  }
  const p2 = (n) => String(n).padStart(2, '0');
  function ymd(y, m, d) { return y + '-' + p2(m) + '-' + p2(d); }
  function addDays(dateStr, n) {
    const a = dateStr.split('-').map(Number);
    const t = new Date(Date.UTC(a[0], a[1] - 1, a[2] + n));
    return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  function dayKey() {
    const p = istParts();
    const s = ymd(p.y, p.m, p.d);
    return p.h < 3 ? addDays(s, -1) : s;
  }
  function nextReset() {
    const p = istParts();
    let s = ymd(p.y, p.m, p.d);
    if (p.h >= 3) s = addDays(s, 1);
    return s + 'T03:00:00+03:00';
  }

  /* ---------- kutuphane ---------- */
  function library() {
    const lib = window.UAC_DAILY_LIBRARY;
    return Array.isArray(lib) ? lib : null;
  }
  let _flat = null, _flatSrc = null;
  function flatQuestions() {
    const lib = library();
    if (_flat && _flatSrc === lib) return _flat;
    const flat = {};
    (lib || []).forEach((pack) => (pack.questions || []).forEach((q) => {
      flat[q.id] = Object.assign({}, q, { pack_id: pack.pack_id, pack_title: pack.title, pack_theme: pack.theme });
    }));
    _flat = flat; _flatSrc = lib;
    return flat;
  }
  function libraryStats() {
    const lib = library() || [];
    let total = 0; const concepts = {}, cats = {};
    lib.forEach((p) => (p.questions || []).forEach((q) => {
      total++; concepts[q.concept_id] = true; cats[q.category || 'genel'] = true;
    }));
    return { total_packs: lib.length, total_questions: total, total_concepts: Object.keys(concepts).length, total_categories: Object.keys(cats).length };
  }
  const packById = (id) => (library() || []).find((p) => p.pack_id === id) || null;
  const questionById = (id) => (id ? flatQuestions()[id] || null : null);

  /* ---------- metin normalizasyonu / eslestirme ---------- */
  function normalize(text) {
    let t = String(text == null ? '' : text).toLocaleLowerCase('tr-TR').trim();
    t = t.replace(/^(bir|bu|şu|su|o)\s+/iu, '');
    const map = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i̇': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u', 'é': 'e' };
    t = Array.from(t).map((c) => (map[c] !== undefined ? map[c] : c)).join('');
    t = t.replace(/(.)\1{2,}/gu, '$1$1');
    t = t.replace(/[^a-z0-9]+/g, '');
    return t.trim();
  }
  function stems(norm) {
    const forms = [norm];
    const sfx = ['lar', 'ler', 'lari', 'leri', 'larda', 'lerde', 'lardan', 'lerden', 'im', 'in', 'um', 'un', 'dir', 'dur', 'tir', 'tur', 'lik', 'luk', 'ci', 'cu', 'de', 'da', 'den', 'dan', 'ye', 'ya', 'yi', 'yu', 'si', 'su', 'i', 'u'];
    sfx.forEach((s) => {
      if (norm.length > s.length + 3 && norm.endsWith(s)) forms.push(norm.slice(0, -s.length));
    });
    return Array.from(new Set(forms.filter((f) => f !== '' && f !== '0')));
  }
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = new Array(b.length + 1), cur = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
      }
      const tmp = prev; prev = cur; cur = tmp;
    }
    return prev[b.length];
  }
  function similarity(a, b) {
    if (a === '' || b === '') return 0;
    if (a === b) return 1;
    const max = Math.max(a.length, b.length);
    if (max < 4) return 0;
    return Math.max(0, 1 - levenshtein(a, b) / max);
  }
  function matchAnswer(answer, exact, close) {
    const forms = stems(normalize(answer));
    const ex = [].concat(exact || []).map(normalize);
    const cl = [].concat(close || []).map(normalize);
    for (const f of forms) {
      if (ex.indexOf(f) !== -1) return { result: 'exact', score_base: 100, matched: f };
      if (cl.indexOf(f) !== -1) return { result: 'close', score_base: 60, matched: f };
    }
    for (const f of forms) {
      if (f.length < 4) continue;
      for (const t of ex) if (t.length >= 4 && similarity(f, t) >= 0.87) return { result: 'exact', score_base: 90, matched: t };
      for (const t of cl) if (t.length >= 4 && similarity(f, t) >= 0.78) return { result: 'close', score_base: 55, matched: t };
    }
    return { result: 'fail', score_base: 0, matched: '' };
  }

  /* ---------- oyuncu / profil ---------- */
  function playerKey(name) { const n = normalize(name); return n !== '' ? n.replace(/[^a-z0-9_\-]/g, '') || 'oyuncu' : 'oyuncu'; }
  const profileDbKey = (name) => 'secret_profile_' + playerKey(name);

  function defaultProfile(name) {
    const now = U.mysqlNow();
    return {
      name, score: 0, answered: 0, streak: 0, best_streak: 0, active_pack_id: '', current_day: 1,
      completed_packs: [], seen_questions: [], seen_concepts: [], today_day_key: '', today_question_id: '',
      today_done: false, today_attempts: 0, today_hints: 0, last_correct_day_key: '', history: [],
      created: now, updated: now,
    };
  }
  const arr = (v) => (Array.isArray(v) ? v : []);

  function pickNewPack(profile) {
    const completed = arr(profile.completed_packs);
    for (const pack of library() || []) if (completed.indexOf(pack.pack_id) === -1) return pack;
    return null;
  }
  function questionForPackDay(pack, dayNo, profile) {
    const seenQ = arr(profile.seen_questions), seenC = arr(profile.seen_concepts);
    const same = (pack.questions || []).filter((q) => (+q.day_no | 0) === (dayNo | 0));
    for (const q of same) if (seenQ.indexOf(q.id) === -1 && seenC.indexOf(q.concept_id) === -1) return q;
    for (const q of same) if (seenQ.indexOf(q.id) === -1) return q;
    return same[0] || null;
  }
  function assignToday(profile, depth) {
    depth = depth || 0;
    const today = dayKey();
    if (profile.today_day_key === today && profile.today_question_id) return profile;
    let pack;
    if (!profile.active_pack_id) {
      pack = pickNewPack(profile);
      if (!pack) { profile.season_completed = true; profile.today_day_key = today; profile.today_question_id = ''; return profile; }
      profile.active_pack_id = pack.pack_id;
      profile.current_day = 1;
    } else {
      pack = packById(profile.active_pack_id);
      if (!pack) {
        profile.active_pack_id = '';
        if (depth > 5) return profile;
        return assignToday(profile, depth + 1);
      }
      if (profile.today_question_id) profile.current_day = Math.min(8, (+profile.current_day || 1) + 1);
      if ((+profile.current_day || 1) > 7) {
        const completed = arr(profile.completed_packs).slice();
        if (completed.indexOf(profile.active_pack_id) === -1) completed.push(profile.active_pack_id);
        profile.completed_packs = completed;
        pack = pickNewPack(profile);
        if (!pack) { profile.season_completed = true; profile.today_day_key = today; profile.today_question_id = ''; return profile; }
        profile.active_pack_id = pack.pack_id;
        profile.current_day = 1;
      }
    }
    pack = packById(profile.active_pack_id);
    const question = pack ? questionForPackDay(pack, +profile.current_day || 1, profile) : null;
    if (!question) { profile.season_completed = true; return profile; }
    const seenQ = arr(profile.seen_questions).slice(), seenC = arr(profile.seen_concepts).slice();
    if (seenQ.indexOf(question.id) === -1) seenQ.push(question.id);
    if (seenC.indexOf(question.concept_id) === -1) seenC.push(question.concept_id);
    profile.seen_questions = seenQ;
    profile.seen_concepts = seenC;
    profile.today_day_key = today;
    profile.today_question_id = question.id;
    profile.today_done = false;
    profile.today_attempts = 0;
    profile.today_hints = 0;
    profile.updated = U.mysqlNow();
    return profile;
  }

  /* ---------- acik (public) gorunumler ---------- */
  function publicQuestion(q, profile) {
    if (!q) return null;
    const hints = Array.isArray(q.hints) ? q.hints : [];
    const usedHints = profile ? (+profile.today_hints || 0) : 0;
    const unlockedHint = usedHints > 0 ? U.sanitizeText(hints[Math.min(hints.length - 1, usedHints - 1)] || hints[0] || '') : '';
    return {
      id: q.id, pack_id: q.pack_id || '', pack_title: q.pack_title || '', day_no: +q.day_no || 0,
      concept_id: q.concept_id || '', symbol: q.symbol || '◆', theme: q.theme || '',
      category: U.sanitizeText(q.category || 'genel'), letter_count: +q.letter_count || 0,
      text: q.q || '', lore: q.lore || '', hint: U.sanitizeText(hints[0] || ''),
      unlocked_hint: unlockedHint,
    };
  }
  function publicProfile(p) {
    const pack = p.active_pack_id ? packById(p.active_pack_id) : null;
    return {
      name: U.sanitizeText(p.name || ''), score: +p.score || 0, answered: +p.answered || 0,
      streak: +p.streak || 0, best_streak: +p.best_streak || 0, current_day: +p.current_day || 1,
      active_pack_id: U.sanitizeText(p.active_pack_id || ''), active_pack_title: pack ? U.sanitizeText(pack.title) : '',
      completed_packs: arr(p.completed_packs).length, seen_questions: arr(p.seen_questions).length,
      seen_concepts: arr(p.seen_concepts).length, today_done: !!p.today_done, today_hints: +p.today_hints || 0,
      last_correct_day_key: U.sanitizeText(p.last_correct_day_key || ''),
    };
  }

  /* ---------- siralama ---------- */
  function compactBoard(board) {
    const map = {};
    arr(board).forEach((row) => {
      const name = U.sanitizeText((row && row.name) || '');
      if (name === '') return;
      const key = playerKey(name);
      const score = +row.score || 0, answered = +row.answered || 0;
      const cur = map[key];
      if (!cur || score > cur.score || (score === cur.score && answered > (+cur.answered || 0))) {
        map[key] = Object.assign({}, row, { name, score, answered, rank_key: key });
      }
    });
    return Object.keys(map).map((k) => map[k]).sort((a, b) => (b.score - a.score) || ((+b.answered || 0) - (+a.answered || 0)));
  }
  function leaderboard(limit) {
    const board = compactBoard(L.db.get('secret_rank', []));
    return board.slice(0, limit || 10).map((r, i) => ({ rank: i + 1, name: U.sanitizeText(r.name || ''), score: +r.score || 0, answered: +r.answered || 0 }));
  }
  function saveRank(profile) {
    const name = U.sanitizeText(profile.name || '');
    if (name === '') return;
    const key = playerKey(name);
    const entry = {
      rank_key: key, name, score: +profile.score || 0, answered: +profile.answered || 0,
      level: +profile.streak || 0, date: U.mysqlNow(),
    };
    ['secret_rank', 'daily_rank_all'].forEach((dbKey) => {
      let board = compactBoard(L.db.get(dbKey, []));
      const old = board.find((r) => r.rank_key === key);
      if (old) {
        const os = +old.score || 0, oa = +old.answered || 0;
        if (os > entry.score || (os === entry.score && oa > entry.answered)) {
          entry.score = os; entry.answered = oa; entry.level = Math.max(entry.level || 0, +old.level || 0);
        }
      }
      board = board.filter((r) => r.rank_key !== key);
      board.push(Object.assign({}, entry));
      L.db.set(dbKey, compactBoard(board).slice(0, 150));
    });
  }

  /* ---------- profil yukleme ---------- */
  // Donus: { profile } veya { error: L.err(...) }
  function loadProfile(req, requirePin) {
    const p = req.params || {};
    const nv = U.validateName(p.name, 20);
    if (!nv[0]) return { error: L.err(nv[1], 'invalid_name', 400) };
    const name = nv[1];
    if (requirePin) {
      const r = U.pinClaimOrVerify(name, U.pinFromParams(p), 'gunun_sirri');
      if (!r[0]) return { error: L.err(r[1], r[2], 400) };
    }
    const dbKey = profileDbKey(name);
    let profile = L.db.get(dbKey, null);
    if (!profile || typeof profile !== 'object') profile = defaultProfile(name);
    profile.name = name;
    profile = assignToday(profile);
    L.db.set(dbKey, profile);
    saveRank(profile);
    return { profile, dbKey };
  }

  const noLib = () => L.err('Soru kütüphanesi yüklenemedi (daily-library.js eksik).', 'library_missing', 500);

  /* ---------- rotalar ---------- */
  L.register('GET', NS + '/today', (req) => {
    if (!library()) return noLib();
    const r = loadProfile(req, true);
    if (r.error) return r.error;
    const q = r.profile.today_question_id ? questionById(r.profile.today_question_id) : null;
    return {
      ok: true, day_key: dayKey(), next_reset: nextReset(), season_completed: !!r.profile.season_completed,
      question: publicQuestion(q, r.profile), profile: publicProfile(r.profile), library: libraryStats(), leaderboard: leaderboard(10),
    };
  });

  L.register('POST', NS + '/hint', (req) => {
    if (!library()) return noLib();
    const r = loadProfile(req, true);
    if (r.error) return r.error;
    const profile = r.profile;
    if (profile.today_done) {
      return { ok: true, hint: 'Bugünün sırrı zaten tamamlandı.', penalty: 0, profile: publicProfile(profile), library: libraryStats() };
    }
    const q = questionById(profile.today_question_id);
    if (!q) return L.err('Bugün için soru bulunamadı.', 'no_question', 404);
    const hints = Array.isArray(q.hints) && q.hints.length ? q.hints : ['Daha dikkatli bak.'];
    const maxHints = Math.min(2, hints.length);
    if ((+profile.today_hints || 0) < maxHints) {
      profile.today_hints = (+profile.today_hints || 0) + 1;
      profile.updated = U.mysqlNow();
      L.db.set(r.dbKey, profile);
    }
    const idx = Math.max(0, Math.min(hints.length - 1, (+profile.today_hints || 1) - 1));
    return {
      ok: true, hint: hints[idx] || hints[0] || 'Daha dikkatli bak.', penalty: 25 * (+profile.today_hints || 1),
      profile: publicProfile(profile), library: libraryStats(),
    };
  });

  L.register('POST', NS + '/answer', (req) => {
    if (!library()) return noLib();
    const r = loadProfile(req, true);
    if (r.error) return r.error;
    let profile = r.profile;
    const dbKey = r.dbKey;
    const params = req.params || {};
    if (profile.today_done) {
      if ((+profile.answered || 0) > 0 || (+profile.score || 0) > 0) U.chatUnlock(profile.name || '', 'gunun_sirri');
      return {
        ok: true, correct: true, already_done: true, message: 'Bugünün sırrını zaten çözdün.', earned_score: 0,
        profile: publicProfile(profile), library: libraryStats(), leaderboard: leaderboard(10),
      };
    }
    let q = questionById(profile.today_question_id || '');
    const postedId = U.sanitizeText(params.question_id || '');
    if (postedId !== '') {
      const posted = questionById(postedId);
      if (!posted) return L.err('Ekrandaki soru kütüphanede bulunamadı. Sayfayı yenile.', 'question_not_found', 409);
      if (profile.today_day_key !== dayKey() || profile.today_question_id !== postedId) {
        profile = assignToday(profile);
        L.db.set(dbKey, profile);
        return L.err('Soru yenilenmiş. Lütfen Sırrı Getir butonuna basıp yeni soruyu aç.', 'question_expired', 409, {
          day_key: dayKey(), profile: publicProfile(profile),
          question: publicQuestion(questionById(profile.today_question_id || '')),
          library: libraryStats(), leaderboard: leaderboard(10),
        });
      }
      q = posted;
    }
    if (!q) return L.err('Bugün atanacak yeni soru kalmadı. Yeni sır paketi eklenmeli.', 'season_completed', 409);
    const answer = U.sanitizeText(params.answer || '');
    const alen = Array.from(answer).length;
    if (alen < 1 || alen > 80) return L.err('Cevap 1-80 karakter olmalıdır.', 'invalid_answer', 400);
    if (U.containsBadWords(answer)) return L.err('Uygunsuz cevap tespit edildi.', 'bad_word', 400);
    const exactAnswers = Array.from(new Set([].concat(q.exact || [], [q.answer_key || ''])));
    const match = matchAnswer(answer, exactAnswers, q.close || []);
    profile.today_attempts = (+profile.today_attempts || 0) + 1;
    if (match.result !== 'fail') {
      const today = dayKey();
      const yesterday = addDays(today, -1);
      const last = U.sanitizeText(profile.last_correct_day_key || '');
      profile.streak = last === yesterday ? (+profile.streak || 0) + 1 : 1;
      profile.best_streak = Math.max(+profile.best_streak || 0, profile.streak);
      const hintPenalty = Math.min(50, (+profile.today_hints || 0) * 25);
      const attemptPenalty = Math.max(0, (profile.today_attempts - 1) * 10);
      const finalBonus = (+q.day_no || 0) === 7 ? 200 : 0;
      const streakBonus = Math.min(150, profile.streak * 5);
      const earned = Math.max(20, match.score_base + streakBonus + finalBonus - hintPenalty - attemptPenalty);
      profile.score = (+profile.score || 0) + earned;
      profile.answered = (+profile.answered || 0) + 1;
      profile.last_correct_day_key = today;
      profile.today_done = true;
      const history = arr(profile.history).slice();
      history.push({ day_key: today, question_id: q.id, pack_id: q.pack_id || '', concept_id: q.concept_id || '', result: match.result, score: earned });
      profile.history = history.slice(-80);
      profile.updated = U.mysqlNow();
      L.db.set(dbKey, profile);
      saveRank(profile);
      U.chatUnlock(profile.name || '', 'gunun_sirri');
      return {
        ok: true, correct: true, result: match.result,
        message: match.result === 'exact' ? 'Sır kabul edildi.' : 'Yakın cevap kabul edildi.',
        earned_score: earned, profile: publicProfile(profile), library: libraryStats(), leaderboard: leaderboard(10),
      };
    }
    profile.updated = U.mysqlNow();
    L.db.set(dbKey, profile);
    const hints = q.hints || [];
    const hintIdx = Math.min(1, Math.max(0, (+profile.today_attempts || 1) - 1));
    return {
      ok: true, correct: false, result: 'fail', message: 'Bu cevap kapıya değmedi. Tekrar düşün.',
      tries_left: Math.max(0, 3 - profile.today_attempts), hint: hints[hintIdx] || hints[0] || '',
      profile: publicProfile(profile), library: libraryStats(),
    };
  });

  L.register('GET', NS + '/profile', (req) => {
    if (!library()) return noLib();
    const r = loadProfile(req, false);
    if (r.error) return { ok: true, found: false, message: (r.error.data && r.error.data.message) || '' };
    return { ok: true, found: true, profile: publicProfile(r.profile), library: libraryStats(), leaderboard: leaderboard(10) };
  });

  window.UACSecretLocal = { dayKey, nextReset, normalize, matchAnswer, libraryStats };
})();
