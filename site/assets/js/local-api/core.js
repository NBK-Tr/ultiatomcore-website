/*
 * UltiAtomCore - Yerel API cekirdegi (Guvenlik Sancagi + Birlesik Oyuncu ID & PIN Sistemi)
 * WordPress REST API (/wp-json/...) yerine tarayici icinde (localStorage) calisan taklit sunucu.
 *
 * Tum oyunlar (Klavye Muharebesi, Password Challenge, Gunun Sirri, Son Siginak) ve Sohbet
 * tek bir Birlesik Oyuncu Kimligi (Canonical Player ID + PIN Hash) etrafinda calisir.
 */
(function () {
  'use strict';
  if (window.UACLocal) return;

  const DB_PREFIX = 'uacdb:';
  const AUTH_SALT = 'uac-v2-unified-pepper-9941';
  const DEFAULT_ADMIN_HASH = '28iuxo5r5h8';
  const routes = {};

  /* ---------- depolama ---------- */
  const db = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(DB_PREFIX + key);
        return raw === null ? (fallback === undefined ? null : fallback) : JSON.parse(raw);
      } catch (e) { return fallback === undefined ? null : fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(DB_PREFIX + key, JSON.stringify(value)); } catch (e) { /* kota dolu */ }
      return value;
    },
    del(key) { try { localStorage.removeItem(DB_PREFIX + key); } catch (e) {} },
    keys(prefix) {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(DB_PREFIX + (prefix || '')) === 0) out.push(k.slice(DB_PREFIX.length));
      }
      return out;
    },
  };

  /* ---------- yanit yardimcilari ---------- */
  const ok = (data, status) => ({ __uac: true, status: status || 200, data });
  const err = (message, code, status, extra) => ({
    __uac: true,
    status: status || 400,
    data: Object.assign({ ok: false, code: code || 'error', message }, extra || {}),
  });

  /* ---------- zaman ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  function mysqlNow(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }
  function weekKey(d) {
    d = d || new Date();
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return t.getUTCFullYear() + pad(Math.ceil(((t - yearStart) / 86400000 + 1) / 7));
  }

  /* ---------- metin / isim / PIN / Admin Korumasi ---------- */
  function asciiFold(text) {
    let t = String(text == null ? '' : text).toLocaleLowerCase('tr-TR');
    const trMap = {
      'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i̇': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
      'â': 'a', 'î': 'i', 'û': 'u', 'é': 'e', 'á': 'a', 'à': 'a', 'ó': 'o', 'ú': 'u', 'í': 'i', 'č': 'c'
    };
    return Array.from(t).map((c) => (trMap[c] !== undefined ? trMap[c] : c)).join('');
  }

  function normalizeText(text) {
    let t = asciiFold(text);
    const leetMap = {
      '4': 'a', '@': 'a', '8': 'b', '0': 'o', '1': 'i', '!': 'i', '|': 'i',
      '3': 'e', '7': 't', '5': 's', '$': 's', '9': 'g', '+': 't'
    };
    t = t.replace(/vv/g, 'w').replace(/></g, 'x').replace(/\|</g, 'k');
    t = Array.from(t).map((c) => (leetMap[c] !== undefined ? leetMap[c] : c)).join('');
    t = t.replace(/(\w)\1+/gu, '$1');
    t = t.replace(/[ \-._*\/\\~^#'"`()\[\]{}:;,?+=&%]/g, '');
    return t;
  }

  const BAD_WORDS = [
    'orospu', 'ibne', 'yarrak', 'tasak', 'fahise', 'kaltak', 'sikis', 'sikik', 'gotlek', 'amcik',
    'orospucocugu', 'pezevenk', 'oglanci', 'ibnelik', 'serefsiz', 'namussuz', 'alcak', 'gerizekali',
    'dangalak', 'beyinsiz', 'kafasiz', 'ahmak', 'embesil', 'zibidi', 'serseri', 'surtuk', 'pislik',
    'murdar', 'kahpe', 'gavat', 'sapik', 'haysiyetsiz', 'budala', 'mankafa',
    'fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'cock', 'fucker', 'whore', 'slut', 'prick', 'twat',
    'wanker', 'tosser', 'arse', 'dumb', 'moron', 'retard', 'douche', 'jerk', 'scum', 'skank', 'faggot',
    'bastard', 'asshole', 'dirtbag', 'scumbag', 'douchebag', 'shithead', 'bullshit', 'dipshit', 'jackass',
    'motherfucker', 'fuckface', 'sonofabitch', 'dumbfuck', 'shitbag',
  ];
  function containsBadWords(text) {
    const clean = normalizeText(text);
    for (const w of BAD_WORDS) if (w.length >= 4 && clean.indexOf(w) !== -1) return w;
    for (const w of ['oc', 'amq', 'occ', 'amk', 'bok', 'got', 'sik', 'pic']) if (clean === w) return w;
    return false;
  }

  // ICINDE ADMIN / YONETICI GECEN HER TURLU ISMI YAKALA (ornegin: admin123, xAdmin, 4dmin, yonetici_1, kurucu vb.)
  const ADMIN_SUBSTRINGS = [
    'admin', 'adm1n', '4dmin', 'yonetici', 'moderator', 'kurucu', 'ultiatom', 'atomcore',
    'sysadmin', 'webmaster', 'superuser', 'yetkili', 'official', 'resmihesap'
  ];
  const ADMIN_EXACT = [
    'mod', 'root', 'system', 'sistem', 'support', 'destek', 'owner', 'gm', 'dev', 'bot', 'server', 'sunucu'
  ];

  function isAdminReservedName(name) {
    const norm = normalizeText(name);
    const plain = asciiFold(name).replace(/[^a-z0-9]/g, '');
    for (const sub of ADMIN_SUBSTRINGS) {
      const normSub = normalizeText(sub);
      if (norm.indexOf(normSub) !== -1 || plain.indexOf(sub) !== -1) return true;
    }
    for (const ex of ADMIN_EXACT) {
      if (norm === normalizeText(ex) || plain === ex) return true;
    }
    return false;
  }

  function sanitizeText(s) {
    return String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* ---------- Hash & Admin Oturum Kontrolu ---------- */
  function hash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  function pinHash(canonicalKey, pin) {
    return 'v2$' + hash(AUTH_SALT + '|' + canonicalKey + '|' + pin) + '$' + hash(pin + '|' + AUTH_SALT);
  }

  function getAdminExpectedHash() {
    return db.get('admin_master_hash') || DEFAULT_ADMIN_HASH;
  }

  const WP_ADMIN_INITIAL = window.UAC_IS_ADMIN === true && typeof window.UAC_REST_NONCE === 'string' && window.UAC_REST_NONCE.length > 0;

  function isAdminSession() {
    if (WP_ADMIN_INITIAL) {
      window.UAC_IS_ADMIN = true;
      return true;
    }
    try {
      const tok = localStorage.getItem('uac_admin_session_token') || '';
      const saved = db.get('admin_active_session');
      if (!tok || !saved || saved.token !== tok) {
        window.UAC_IS_ADMIN = false;
        return false;
      }
      if (saved.exp && saved.exp < Math.floor(Date.now() / 1000)) {
        db.del('admin_active_session');
        localStorage.removeItem('uac_admin_session_token');
        window.UAC_IS_ADMIN = false;
        return false;
      }
      window.UAC_IS_ADMIN = true;
      return true;
    } catch (e) {
      window.UAC_IS_ADMIN = false;
      return false;
    }
  }

  function loginAdmin(masterKey, newMasterKey) {
    const clean = sanitizeText(masterKey);
    if (!clean) return [false, 'Admin anahtarı gerekli.'];
    const candidateHash = hash(AUTH_SALT + '|ADMIN|' + clean);
    const expected = getAdminExpectedHash();
    if (candidateHash !== expected) {
      return [false, 'Geçersiz Admin Anahtarı!'];
    }
    if (newMasterKey && sanitizeText(newMasterKey).length >= 6) {
      db.set('admin_master_hash', hash(AUTH_SALT + '|ADMIN|' + sanitizeText(newMasterKey)));
    }
    const token = randomToken(32);
    const exp = Math.floor(Date.now() / 1000) + 86400 * 7;
    db.set('admin_active_session', { token, exp, created: mysqlNow() });
    localStorage.setItem('uac_admin_session_token', token);
    window.UAC_IS_ADMIN = true;
    return [true, 'Admin yetkisi aktif edildi.', token];
  }

  function logoutAdmin() {
    db.del('admin_active_session');
    localStorage.removeItem('uac_admin_session_token');
    window.UAC_IS_ADMIN = false;
  }

  // Sayfa yuklendiginde admin oturumunu dogrula (konsoldan elle window.UAC_IS_ADMIN = true yapilmasini engeller)
  isAdminSession();

  function validateName(name, max) {
    max = max || 30;
    name = sanitizeText(name);
    const len = Array.from(name).length;
    if (len < 2 || len > max) return [false, 'İsim 2-' + max + ' karakter olmalıdır.'];
    // Sadece dogrulanmis Admin oturumu varsa admin iceren isim kullanabilir; aksi halde kesinlikle yasak!
    if (isAdminReservedName(name) && !isAdminSession()) {
      return [false, 'İçinde "Admin / Yönetici / Kurucu" geçen isimler yalnızca site yöneticisine aittir. Lütfen farklı bir oyuncu adı seçin.'];
    }
    if (containsBadWords(name)) return [false, 'Uygunsuz kelime tespit edildi.'];
    return [true, name];
  }

  function validatePin(pin) {
    pin = sanitizeText(pin);
    if (pin === '') return [false, 'Oyuncu PIN gerekli. Aynı adı başka cihazda veya oyunda kullanmak için bu PIN gerekir.'];
    const len = Array.from(pin).length;
    if (len < 4 || len > 12) return [false, 'PIN 4-12 karakter olmalıdır.'];
    if (!/^[a-zA-Z0-9_-]+$/.test(pin)) return [false, 'PIN sadece harf, rakam, tire veya alt çizgi içerebilir.'];
    return [true, pin];
  }

  // Tekil ve Tutarli Kanonik Oyuncu Anahtari (Tum oyunlarda "Şahin" -> "sahin", "Çağrı" -> "cagri")
  function playerKey(name) {
    const k = asciiFold(name).replace(/[^a-z0-9_\-]/g, '');
    return k !== '' ? k : 'oyuncu';
  }

  // Her oyuncuya ozel tekil Birlesik ID (Orn: UAC-7F92B1C4)
  function unifiedPlayerId(name) {
    const k = playerKey(name);
    const raw = (hash('uid|' + k + '|' + AUTH_SALT) + hash('uid2|' + k)).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return 'UAC-' + raw.slice(0, 8).padEnd(8, '0');
  }

  function verifyStoredPin(data, key, rawPin) {
    if (!data || !data.pin_hash) return false;
    const v2 = pinHash(key, rawPin);
    if (data.pin_hash === v2) return true;
    // Eski v1 kayitlariyla geriye donuk uyumluluk (dogrulaninca v2'ye yukseltilir)
    if (data.pin_hash === hash(rawPin)) {
      data.pin_hash = v2;
      db.set('player_auth_' + key, data);
      return true;
    }
    return false;
  }

  // Donus: [true|false|null, mesaj, kod]
  function pinVerifyOnly(name, pin) {
    const vn = validateName(name, 30);
    if (!vn[0]) return [false, vn[1], 'invalid_name'];
    const v = validatePin(pin);
    if (!v[0]) return [false, v[1], 'pin_required'];
    const key = playerKey(vn[1]);
    const data = db.get('player_auth_' + key);
    if (!data || !data.pin_hash) return [null, 'Bu oyuncu adı için henüz PIN belirlenmemiş.', 'pin_not_set'];
    if (!verifyStoredPin(data, key, v[1])) {
      return [false, 'Bu oyuncu adı başka bir PIN ile korunuyor! PIN yanlışsa farklı bir oyuncu adı seçmelisin.', 'pin_wrong'];
    }
    return [true, '', 'pin_ok'];
  }

  function pinClaimOrVerify(name, pin, source) {
    const vn = validateName(name, 30);
    if (!vn[0]) return [false, vn[1], 'invalid_name'];
    name = vn[1];
    const v = validatePin(pin);
    if (!v[0]) return [false, v[1], 'pin_required'];
    const key = playerKey(name);
    const dbKey = 'player_auth_' + key;
    const data = db.get(dbKey);
    const now = mysqlNow();
    source = source || 'game';
    const uid = unifiedPlayerId(name);

    if (data && data.pin_hash) {
      if (!verifyStoredPin(data, key, v[1])) {
        return [false, 'Bu oyuncu adı ("' + name + '") başka bir oyuncuya ait veya PIN yanlış! Lütfen kendi PIN kodunu gir ya da farklı bir oyuncu adı seç.', 'pin_wrong'];
      }
      data.name = name;
      data.player_id = data.player_id || uid;
      data.sources = data.sources || {};
      data.sources[source] = now;
      data.updated = now;
      db.set(dbKey, data);
      return [true, 'PIN doğrulandı. Birleşik ID: ' + data.player_id, 'pin_ok', data.player_id];
    }

    const sources = {};
    sources[source] = now;
    const newRecord = {
      player_id: uid,
      canonical_key: key,
      name,
      pin_hash: pinHash(key, v[1]),
      created: now,
      updated: now,
      sources,
    };
    db.set(dbKey, newRecord);
    return [true, 'Oyuncu adı PIN ile kilitlendi ve Birleşik ID oluşturuldu: ' + uid, 'pin_created', uid];
  }

  function getPlayerAccount(name) {
    const key = playerKey(name);
    const data = db.get('player_auth_' + key);
    return {
      registered: !!(data && data.pin_hash),
      player_id: (data && data.player_id) || unifiedPlayerId(name),
      canonical_key: key,
      name: (data && data.name) || sanitizeText(name),
      created: (data && data.created) || '',
      updated: (data && data.updated) || '',
      sources: (data && data.sources) || {},
    };
  }

  function pinFromParams(p) {
    let pin = p.player_pin;
    if (pin === undefined || pin === null || pin === '') pin = p.pin;
    return sanitizeText(pin == null ? '' : pin);
  }

  // Sohbet kilidi: bir oyunu tamamlayan oyuncu sohbete yazabilir
  function chatUnlock(name, game) {
    const key = 'chat_unlock_' + playerKey(name);
    const d = db.get(key, { name: sanitizeText(name), player_id: unifiedPlayerId(name), games: {} });
    d.player_id = d.player_id || unifiedPlayerId(name);
    d.games = d.games || {};
    d.games[game || 'game'] = mysqlNow();
    db.set(key, d);
  }
  function chatIsUnlocked(name) {
    const d = db.get('chat_unlock_' + playerKey(name));
    return !!(d && d.games && Object.keys(d.games).length);
  }

  function randomToken(len) {
    const a = new Uint8Array(len || 24);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /* ---------- yonlendirici ---------- */
  function register(method, path, handler) { routes[method.toUpperCase() + ' ' + path.replace(/\/+$/, '')] = handler; }

  function parseBody(init) {
    const body = init && init.body;
    if (!body) return {};
    if (typeof body === 'string') {
      try { const j = JSON.parse(body); if (j && typeof j === 'object') return j; } catch (e) {}
      const out = {};
      new URLSearchParams(body).forEach((v, k) => { out[k] = v; });
      return out;
    }
    if (body instanceof URLSearchParams) { const o = {}; body.forEach((v, k) => { o[k] = v; }); return o; }
    if (typeof FormData !== 'undefined' && body instanceof FormData) { const o = {}; body.forEach((v, k) => { o[k] = v; }); return o; }
    return {};
  }

  async function handle(urlStr, init) {
    const method = ((init && init.method) || 'GET').toUpperCase();
    const idx = urlStr.indexOf('/wp-json/');
    let rest = urlStr.slice(idx + '/wp-json'.length);
    let queryStr = '';
    const q = rest.indexOf('?');
    if (q !== -1) { queryStr = rest.slice(q + 1); rest = rest.slice(0, q); }
    const hashPos = queryStr.indexOf('#'); if (hashPos !== -1) queryStr = queryStr.slice(0, hashPos);
    const path = rest.replace(/\/+$/, '');
    const query = {};
    new URLSearchParams(queryStr).forEach((v, k) => { query[k] = v; });
    const body = parseBody(init);
    const req = { method, path, query, body, params: Object.assign({}, query, body) };
    const handler = routes[method + ' ' + path];
    let result;
    if (!handler) {
      result = err('Bu adres için eşleşen rota bulunamadı.', 'rest_no_route', 404);
    } else {
      try { result = await handler(req); }
      catch (e) { console.error('[UACLocal]', path, e); result = err('Yerel API hatası: ' + e.message, 'local_error', 500); }
    }
    if (!result || !result.__uac) result = ok(result === undefined ? { ok: true } : result);
    return new Response(JSON.stringify(result.data), { status: result.status, headers: { 'Content-Type': 'application/json; charset=UTF-8' } });
  }

  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || String(input);
    if (url.indexOf('/wp-json/') !== -1) {
      if (typeof input !== 'string' && input && input.method && !(init && init.method)) init = Object.assign({ method: input.method }, init || {});
      return handle(url, init);
    }
    return nativeFetch(input, init);
  };

  window.UACLocal = {
    db, ok, err, register, handle,
    util: {
      mysqlNow, dayKey, weekKey, asciiFold, normalizeText, containsBadWords, isAdminReservedName,
      sanitizeText, validateName, validatePin, hash, playerKey, unifiedPlayerId, getPlayerAccount,
      pinVerifyOnly, pinClaimOrVerify, pinFromParams, randomToken, chatUnlock, chatIsUnlocked,
      isAdminSession, loginAdmin, logoutAdmin,
    },
  };
})();
