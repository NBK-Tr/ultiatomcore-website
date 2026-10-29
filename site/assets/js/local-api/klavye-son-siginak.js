/*
 * UltiAtomCore - Yerel API: Klavye Muharebesi + Son Siginak
 *
 * Veri anahtarlari (UACLocal.db uzerinden, 'uacdb:' oneki core tarafindan eklenir):
 *   km_board_all | km_board_week | km_board_day : { <entry_key>: { name, score, level, date } }
 *   km_board_week_period / km_board_day_period    : o tahtanin ait oldugu weekKey / dayKey
 *   km_profile_<id>   (id = sanitize_key(lowercase(isim)))
 *   km_sessions       : { <token>: { name, start, used, exp } }
 *   ss_board_all | ss_board_week | ss_board_day   : { 'p_<ownerHash48>': entry }
 *   ss_board_week_period / ss_board_day_period
 *   ss_profile_<ownerHash>
 *   ss_claims         : isim takisi kayitlari (uacsswp_name_claims_v2)
 *   ss_sessions       : { <sha(token)>: {...} }
 *
 * Hafta/gun tahtalarini okumak isteyen moduller icin yardimci:
 *   UACLocalKS.kmBoard('all'|'week'|'day')  -> periyodu guncel olan tahta (map)
 *   UACLocalKS.ssBoard('all'|'week'|'day')
 */
(function () {
  'use strict';
  if (!window.UACLocal) return;
  const L = window.UACLocal;
  const db = L.db;
  const U = L.util;
  const err = L.err;

  const UACSSWP_FIRST_BOSS_TIME = 80;
  const UACSSWP_BOSS_INTERVAL = 45;
  const LOCAL_SALT = 'uac-local-salt-v1';

  /* ---------- ortak yardimcilar ---------- */
  const nowSec = () => Math.floor(Date.now() / 1000);
  const toInt = (v) => { const n = Math.trunc(Number(v)); return isFinite(n) ? n : 0; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const sanitizeKey = (s) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9_\-]/g, '');
  const lower = (s) => String(s == null ? '' : s).toLowerCase();

  // 64 haneli hex (sha256 benzeri) - yerel taklit
  function hex64(str) {
    let out = '';
    for (let i = 0; i < 5; i++) {
      out += parseInt(U.hash(str + '|' + i), 36).toString(16).padStart(14, '0').slice(-14);
    }
    return out.slice(0, 64);
  }

  function randToken(len) {
    let t = '';
    while (t.length < len) t += U.randomToken(24);
    return t.slice(0, len);
  }

  function periodKey(period) {
    if (period === 'day') return U.dayKey();
    if (period === 'week') return U.weekKey();
    return 'all';
  }

  // Tahtayi oku; hafta/gun periyodu degistiyse eskiyi at
  function readBoard(prefix, period) {
    const key = prefix + '_board_' + period;
    if (period === 'all') return db.get(key, {}) || {};
    const pk = key + '_period';
    const cur = periodKey(period);
    if (db.get(pk) !== cur) {
      db.set(key, {});
      db.set(pk, cur);
      return {};
    }
    return db.get(key, {}) || {};
  }
  function writeBoard(prefix, period, board) {
    const key = prefix + '_board_' + period;
    if (period !== 'all') db.set(key + '_period', periodKey(period));
    db.set(key, board);
  }

  function sortEntries(board, withDuration) {
    return Object.keys(board).map((k) => [k, board[k]]).sort((a, b) => {
      const s = toInt(b[1].score) - toInt(a[1].score);
      if (s !== 0 || !withDuration) return s;
      return toInt(b[1].duration) - toInt(a[1].duration);
    });
  }

  function saveToBoard(prefix, period, entryKey, entry, withDuration, limit) {
    const board = readBoard(prefix, period);
    if (!board[entryKey] || toInt(entry.score) > toInt(board[entryKey].score)) board[entryKey] = entry;
    const sorted = sortEntries(board, withDuration).slice(0, limit || 100);
    const out = {};
    sorted.forEach((p) => { out[p[0]] = p[1]; });
    writeBoard(prefix, period, out);
  }

  function pruneSessions(key, map) {
    const t = nowSec();
    Object.keys(map).forEach((k) => { if (map[k].exp && map[k].exp < t) delete map[k]; });
    db.set(key, map);
  }

  /* =====================================================================
   *  KLAVYE MUHAREBESI  (klavye-muharebesi/v1)
   * ===================================================================== */
  const KM = '/klavye-muharebesi/v1';
  const kmProfileKey = (name) => 'km_profile_' + U.playerKey(name);
  const kmEntryKey = (name) => U.playerKey(name);

  function kmFindRank(period, name) {
    const sorted = sortEntries(readBoard('km', period), false);
    const needle = kmEntryKey(name);
    for (let i = 0; i < sorted.length; i++) if (sorted[i][0] === needle) return i + 1;
    return null;
  }

  L.register('POST', KM + '/check-name', (req) => {
    const v = U.validateName(req.params.name, 20);
    if (!v[0]) return err(v[1], 'invalid_name', 400);
    const p = U.pinClaimOrVerify(v[1], U.pinFromParams(req.params), 'klavye_muharebesi');
    if (!p[0]) return err(p[1], p[2], 403);
    return { ok: true, pin_status: p[2] };
  });

  L.register('POST', KM + '/score-start', (req) => {
    let name = U.sanitizeText(req.params.name);
    if (name !== '') {
      const v = U.validateName(name, 20);
      if (!v[0]) return err(v[1], 'invalid_name', 400);
      name = v[1];
      const p = U.pinClaimOrVerify(name, U.pinFromParams(req.params), 'klavye_muharebesi');
      if (!p[0]) return err(p[1], p[2], 403);
    }
    const session = randToken(40);
    const sessions = db.get('km_sessions', {}) || {};
    sessions[session] = { name, start: nowSec(), used: false, exp: nowSec() + 7200 };
    pruneSessions('km_sessions', sessions);
    return { ok: true, session };
  });

  L.register('POST', KM + '/score-save', (req) => {
    const P = req.params;
    let name = U.sanitizeText(P.name);
    const score = Math.max(0, toInt(P.score));
    const level = Math.max(1, toInt(P.level));
    const duration = Math.max(0, toInt(P.duration));
    const words = Math.max(0, toInt(P.words));
    const session = U.sanitizeText(P.session);

    const v = U.validateName(name, 20);
    if (!v[0]) return err(v[1], 'invalid_name', 400);
    name = v[1];

    const sessions = db.get('km_sessions', {}) || {};
    const sd = sessions[session];
    if (!sd || sd.name !== name || sd.used || (sd.exp && sd.exp < nowSec())) {
      return err('Geçersiz oyun oturumu.', 'invalid_session', 400);
    }
    sd.used = true;
    sd.exp = nowSec() + 300;
    pruneSessions('km_sessions', sessions);

    const elapsed = nowSec() - toInt(sd.start);
    if (score <= 0 || level < 1 || words < 1 || duration < 1) return err('Geçersiz oyun verisi.', 'invalid_game_data', 400);
    if (elapsed < 2 || duration > elapsed + 20) return err('Geçersiz oyun süresi.', 'cheat_detected', 400);

    const margin = 3.0;
    const maxByLevel = level * 6 * 70 * margin;
    const maxByWords = words * 70 * margin;
    if (score > maxByLevel || score > maxByWords) return err('Geçersiz skor.', 'cheat_detected', 400);
    if (words > 0 && duration < Math.max(2, Math.floor(words * 0.45))) return err('Geçersiz oyun verisi.', 'cheat_detected', 400);

    const now = U.mysqlNow();
    const pkey = kmProfileKey(name);
    const profile = db.get(pkey) || {
      name, total_games: 0, total_score: 0, best_score: 0, best_level: 0,
      total_words: 0, total_time: 0, first_played: now, last_played: now,
    };
    profile.total_games++;
    profile.total_score += score;
    profile.total_words += words;
    profile.total_time += duration;
    profile.last_played = now;
    if (score > profile.best_score) profile.best_score = score;
    if (level > profile.best_level) profile.best_level = level;
    db.set(pkey, profile);
    U.chatUnlock(name, 'klavye_muharebesi');

    const ek = kmEntryKey(name);
    const entry = { name, score, level, date: now };
    saveToBoard('km', 'all', ek, Object.assign({}, entry), false, 100);
    saveToBoard('km', 'week', ek, Object.assign({}, entry), false, 100);
    saveToBoard('km', 'day', ek, Object.assign({}, entry), false, 100);

    return { ok: true, best_score: profile.best_score, total_games: profile.total_games };
  });

  L.register('GET', KM + '/leaderboard', (req) => {
    let period = sanitizeKey(req.params.period || 'all') || 'all';
    if (['all', 'week', 'day'].indexOf(period) === -1) period = 'all';
    const limit = Math.min(50, Math.max(1, toInt(req.params.limit) || 10));
    const sorted = sortEntries(readBoard('km', period), false).slice(0, limit);
    const entries = sorted.map((p, i) => ({
      rank: i + 1,
      name: U.sanitizeText(p[1].name || ''),
      score: toInt(p[1].score),
      level: p[1].level === undefined ? 1 : toInt(p[1].level),
      date: U.sanitizeText(p[1].date || ''),
    }));
    return { ok: true, period, entries };
  });

  L.register('GET', KM + '/profile', (req) => {
    const v = U.validateName(req.params.name, 20);
    if (!v[0]) return { ok: false, found: false };
    const name = v[1];
    const profile = db.get(kmProfileKey(name));
    if (!profile || typeof profile !== 'object') return { ok: true, found: false };
    const rankAll = kmFindRank('all', name);
    const rankWeek = kmFindRank('week', name);
    const avg = profile.total_games > 0 ? Math.round(profile.total_score / profile.total_games) : 0;
    return {
      ok: true, found: true,
      profile: {
        name: U.sanitizeText(profile.name),
        total_games: toInt(profile.total_games),
        total_score: toInt(profile.total_score),
        best_score: toInt(profile.best_score),
        best_level: toInt(profile.best_level),
        total_words: toInt(profile.total_words),
        total_time: toInt(profile.total_time),
        first_played: U.sanitizeText(profile.first_played),
        last_played: U.sanitizeText(profile.last_played),
      },
      rank_all: rankAll,
      rank_week: rankWeek,
      avg_score: avg,
    };
  });

  L.register('POST', KM + '/weekly-reset', () => {
    db.set('km_board_week', {});
    db.set('km_board_week_period', U.weekKey());
    return { ok: true, message: 'Haftalık liderlik sıfırlandı.' };
  });

  /* =====================================================================
   *  SON SIGINAK  (uac-son-siginak/wp)
   * ===================================================================== */
  const SS = '/uac-son-siginak/wp';

  function ssValidateName(name) {
    name = U.sanitizeText(name);
    if (name === '') name = 'Misafir';
    return U.validateName(name, 20);
  }

  function ssValidatePlayerKey(key) {
    key = U.sanitizeText(key);
    if (key.length < 16 || key.length > 120) return false;
    return key;
  }

  const ssOwnerHash = (playerKey) => hex64(playerKey + LOCAL_SALT + 'auth');
  const ssProfileKey = (ownerHash) => {
    let clean = String(ownerHash).replace(/[^a-f0-9]/gi, '').slice(0, 64);
    if (clean.length < 16) clean = hex64(String(ownerHash));
    return 'ss_profile_' + clean.toLowerCase();
  };
  const ssBaseKey = (name) => sanitizeKey(lower(name).replace(/\s+/g, ' '));

  function ssTagForOwner(base, ownerHash, claims) {
    let raw = hex64(base + '|' + ownerHash + '|' + LOCAL_SALT).replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
    const used = [];
    Object.keys(claims).forEach((h) => { if (claims[h] && claims[h].tag) used.push(claims[h].tag); });
    let tag = raw;
    let i = 1;
    while (used.indexOf(tag) !== -1) {
      tag = hex64(raw + i).slice(0, 4).toUpperCase();
      i++;
    }
    return tag;
  }

  function ssResolveIdentity(display, playerKey) {
    const base = ssBaseKey(display);
    const ownerHash = ssOwnerHash(playerKey);
    const all = db.get('ss_claims', {}) || {};
    if (!all[base] || typeof all[base] !== 'object') all[base] = {};
    const now = U.mysqlNow();
    if (!all[base][ownerHash]) {
      all[base][ownerHash] = { display, tag: ssTagForOwner(base, ownerHash, all[base]), created: now, last_seen: now };
    } else {
      all[base][ownerHash].display = display;
      all[base][ownerHash].last_seen = now;
    }
    db.set('ss_claims', all);
    const tag = U.sanitizeText(all[base][ownerHash].tag);
    return { base: display, tag, identity: display + '#' + tag, owner_hash: ownerHash };
  }

  async function sha(str) { return hex64('s|' + str); }

  L.register('POST', SS + '/session-start', (req) => {
    const v = ssValidateName(req.params.name);
    if (!v[0]) return err(v[1], 'invalid_name', 400);
    const cleanName = v[1];
    // Eger bu isim baska bir oyuncu tarafindan PIN ile kilitlenmisse, PIN eslesmesini kontrol et
    if (cleanName.toLowerCase() !== 'misafir') {
      const acc = U.getPlayerAccount ? U.getPlayerAccount(cleanName) : null;
      if (acc && acc.registered) {
        const pin = U.pinFromParams(req.params) || (typeof localStorage !== 'undefined' ? localStorage.getItem('uac_player_pin') || '' : '');
        const pv = U.pinVerifyOnly(cleanName, pin);
        if (pv[0] === false) {
          return err('"' + cleanName + '" adı PIN ile korunuyor! Kendi adın ise আগে Profilim/oyun ekranından PIN kodunu doğrula veya farklı bir isim seç.', 'pin_protected', 403);
        }
      }
    }
    const playerKey = ssValidatePlayerKey(req.params.player_key);
    if (!playerKey) return err('Oyuncu kimliği oluşturulamadı. Tarayıcı depolamasını kontrol edin.', 'invalid_player_key', 400);
    const identity = ssResolveIdentity(cleanName, playerKey);

    const token = randToken(48);
    const sessions = db.get('ss_sessions', {}) || {};
    sessions[hex64('s|' + token)] = {
      name: identity.identity,
      base_name: identity.base,
      tag: identity.tag,
      owner_hash: identity.owner_hash,
      started: nowSec(),
      used: false,
      exp: nowSec() + 3 * 3600,
    };
    pruneSessions('ss_sessions', sessions);
    return { ok: true, session: token, identity: identity.identity, base_name: identity.base, tag: identity.tag };
  });

  L.register('POST', SS + '/score-save', (req) => {
    const P = req.params;
    const name = U.sanitizeText(P.name);
    const playerKey = ssValidatePlayerKey(P.player_key);
    if (!playerKey) return err('Geçersiz oyuncu kimliği.', 'invalid_player_key', 400);
    const ownerHash = ssOwnerHash(playerKey);
    const session = U.sanitizeText(P.session);
    const sKey = hex64('s|' + session);
    const sessions = db.get('ss_sessions', {}) || {};
    const sd = sessions[sKey];
    if (!sd || sd.used || sd.name !== name || sd.owner_hash !== ownerHash || (sd.exp && sd.exp < nowSec())) {
      return err('Geçersiz oyun oturumu.', 'invalid_session', 400);
    }

    const duration = clamp(toInt(P.duration), 0, 7200);
    const kills = clamp(toInt(P.kills), 0, 50000);
    const bosses = clamp(toInt(P.bosses), 0, 1000);
    const chests = clamp(toInt(P.chests), 0, 2000);
    const level = clamp(toInt(P.level), 1, 1000);
    const score = clamp(toInt(P.score), 0, 999999999);
    const character = U.sanitizeText(P.character || 'Hayatta Kalan');
    let achievements = P.achievements;
    if (!Array.isArray(achievements)) achievements = [];
    const seen = {};
    achievements = achievements.map(sanitizeKey).filter((a) => (seen[a] ? false : (seen[a] = true))).slice(0, 50);

    const elapsed = nowSec() - toInt(sd.started);
    if (duration < 2 || score < 1) return err('Geçersiz oyun verisi.', 'invalid_game_data', 400);
    if (elapsed < 2 || duration > elapsed + 25) return err('Geçersiz oyun süresi.', 'invalid_time', 400);

    const bossMax = duration < UACSSWP_FIRST_BOSS_TIME ? 0
      : 1 + Math.floor(Math.max(0, duration - UACSSWP_FIRST_BOSS_TIME) / UACSSWP_BOSS_INTERVAL) + 2;
    if (bosses > bossMax) return err('Geçersiz boss verisi.', 'invalid_boss_data', 400);
    if (kills > Math.max(40, duration * 8)) return err('Geçersiz düşman verisi.', 'invalid_kill_data', 400);

    const expected = (duration * 10) + (kills * 14) + (bosses * 260) + (chests * 35) + (level * 60);
    if (Math.abs(score - expected) > Math.max(80, Math.round(expected * 0.16))) {
      return err('Skor doğrulaması başarısız.', 'invalid_score', 400);
    }

    sd.used = true;
    sd.exp = nowSec() + 300;
    pruneSessions('ss_sessions', sessions);

    const now = U.mysqlNow();
    const baseName = U.sanitizeText(sd.base_name || name);
    const entry = {
      name, base_name: baseName, tag: U.sanitizeText(sd.tag || ''), owner_hash: ownerHash,
      score, duration, kills, bosses, chests, level, character, date: now,
    };
    const ek = 'p_' + ownerHash.replace(/[^a-f0-9]/gi, '').slice(0, 48);
    ['all', 'week', 'day'].forEach((p) => saveToBoard('ss', p, ek, Object.assign({}, entry), true, 100));

    const pkey = ssProfileKey(ownerHash);
    const profile = db.get(pkey) || {
      name, base_name: baseName, games: 0, total_score: 0, best_score: 0, best_duration: 0,
      total_kills: 0, total_bosses: 0, total_chests: 0, achievements: [], last_played: now,
    };
    profile.games = toInt(profile.games) + 1;
    profile.total_score = toInt(profile.total_score) + score;
    profile.best_score = Math.max(toInt(profile.best_score), score);
    profile.best_duration = Math.max(toInt(profile.best_duration), duration);
    profile.base_name = baseName;
    profile.total_kills = toInt(profile.total_kills) + kills;
    profile.total_bosses = toInt(profile.total_bosses) + bosses;
    profile.total_chests = toInt(profile.total_chests) + chests;
    const merged = (Array.isArray(profile.achievements) ? profile.achievements : []).concat(achievements);
    const seen2 = {};
    profile.achievements = merged.filter((a) => (seen2[a] ? false : (seen2[a] = true)));
    profile.last_played = now;
    profile.player_id = U.unifiedPlayerId ? U.unifiedPlayerId(baseName) : '';
    db.set(pkey, profile);
    db.set('ss_profile_name_' + U.playerKey(baseName), profile);
    U.chatUnlock(baseName, 'son_siginak');

    return { ok: true, best_score: profile.best_score, best_duration: profile.best_duration, achievement_count: profile.achievements.length };
  });

  L.register('GET', SS + '/leaderboard', (req) => {
    let period = sanitizeKey(req.params.period || 'all') || 'all';
    if (['all', 'week', 'day'].indexOf(period) === -1) period = 'all';
    const limit = Math.min(50, Math.max(1, toInt(req.params.limit) || 10));
    const sorted = sortEntries(readBoard('ss', period), true).slice(0, limit);
    const entries = sorted.map((p, i) => {
      const e = p[1];
      return {
        rank: i + 1,
        name: U.sanitizeText(e.name || ''),
        score: toInt(e.score),
        duration: toInt(e.duration),
        kills: toInt(e.kills),
        bosses: toInt(e.bosses),
        chests: toInt(e.chests),
        level: e.level === undefined ? 1 : toInt(e.level),
        character: U.sanitizeText(e.character || ''),
        date: U.sanitizeText(e.date || ''),
      };
    });
    return { ok: true, period, entries };
  });

  L.register('GET', SS + '/profile', (req) => {
    const name = U.sanitizeText(req.params.name);
    const playerKey = ssValidatePlayerKey(req.params.player_key);
    if (!playerKey && name === '') return err('Oyuncu kimliği veya isim gerekli.', 'identity_required', 400);
    let profile = null;
    if (name !== '') {
      profile = db.get('ss_profile_name_' + U.playerKey(name));
    }
    if (!profile && playerKey) {
      const ownerHash = ssOwnerHash(playerKey);
      const cand = db.get(ssProfileKey(ownerHash));
      if (cand && typeof cand === 'object') {
        if (name === '' || U.playerKey(cand.base_name || '') === U.playerKey(name) || U.playerKey(cand.name || '') === U.playerKey(name)) {
          profile = cand;
        }
      }
    }
    if (!profile && name !== '') {
      const target = U.playerKey(name);
      const keys = db.keys('ss_profile_');
      for (let i = 0; i < keys.length; i++) {
        const cand = db.get(keys[i]);
        if (cand && typeof cand === 'object' && (U.playerKey(cand.base_name || '') === target || U.playerKey(cand.name || '') === target)) {
          profile = cand;
          break;
        }
      }
    }
    if (!profile || typeof profile !== 'object') return { ok: true, found: false };
    return {
      ok: true, found: true,
      profile: {
        name: U.sanitizeText(profile.name || name),
        base_name: U.sanitizeText(profile.base_name || ''),
        games: toInt(profile.games),
        best_score: toInt(profile.best_score),
        best_duration: toInt(profile.best_duration),
        total_kills: toInt(profile.total_kills),
        total_bosses: toInt(profile.total_bosses),
        total_chests: toInt(profile.total_chests),
        achievement_count: Array.isArray(profile.achievements) ? profile.achievements.length : 0,
      },
    };
  });

  window.UACLocalKS = {
    kmBoard: (period) => readBoard('km', period || 'all'),
    ssBoard: (period) => readBoard('ss', period || 'all'),
    kmFindRank,
  };
})();
