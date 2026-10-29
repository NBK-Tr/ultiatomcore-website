(function () {
  'use strict';

  const POOLS = {
    tr_cities: [
      'Adana','Adıyaman','Afyon','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın','Balıkesir',
      'Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli',
      'Diyarbakır','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari',
      'Hatay','Isparta','Mersin','İstanbul','İzmir','Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir',
      'Kocaeli','Konya','Kütahya','Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş','Nevşehir',
      'Niğde','Ordu','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Tekirdağ','Tokat',
      'Trabzon','Tunceli','Şanlıurfa','Uşak','Van','Yozgat','Zonguldak','Aksaray','Bayburt','Karaman',
      'Kırıkkale','Batman','Şırnak','Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye','Düzce'
    ],
    countries: [
      'İzlanda','Japonya','Şili','Norveç','Peru','Fas','Bhutan','Estonya','Finlandiya','Meksika',
      'Arjantin','Portekiz','İskoçya','Vietnam','Nepal','Küba','Moğolistan','Uruguay','İrlanda',
      'Madagaskar','Tanzanya','Gürcistan','Azerbaycan','Kazakistan','Kore','İsviçre','Kanada','Brezilya','Mısır'
    ],
    capitals_ancient: [
      'Efes','Göbeklitepe','Kyoto','Petra','Semerkant','Babil','Troya','Hattuşa','Zeugma','Assos',
      'Reykjavik','Lizbon','Prag','Buhara','Timbuktu','Pompeii','Kartaca','Persepolis','Knossos',
      'Sagalassos','Myra','Olympos','Nemrut','Patara','Bergama','Gordion'
    ],
    nature_geo: [
      'Kaçkar','Mariana','Altay','Amazon','Fırat','Dicle','Everest','Baykal',
      'Tuna','Nil','Patagonya','Sahra','Atacama','Kamçatka','Pamir','Toros','Ihlara',
      'Kapadokya','Süphan','Erciyes'
    ],
    rare_concepts: [
      { word: 'Petrichor', desc: 'Yağmur sonrası toprak kokusu' },
      { word: 'Sonder', desc: 'Herkesin derin bir hayatı olduğunu fark etme anı' },
      { word: 'Kairos', desc: 'Eyleme geçmek için en doğru, kritik an' },
      { word: 'Vellichor', desc: 'Eski kitapçıların uyandırdığı nostaljik his' },
      { word: 'Ikigai', desc: 'Sabah uyanma sebebi, yaşam amacı' },
      { word: 'Eunoia', desc: 'Güzel ve iyi niyetli düşünce yapısı' },
      { word: 'Meraki', desc: 'Bir işe ruhunu ve sevgisini katmak' },
      { word: 'Yakamoz', desc: 'Suda ay ışığının ışıltılı yansıması' },
      { word: 'Hiraeth', desc: 'Dönülemeyen bir yuvaya duyulan derin özlem' },
      { word: 'Komorebi', desc: 'Ağaç yaprakları arasından süzülen güneş ışığı' },
      { word: 'Ataraxia', desc: 'Sarsılmaz içsel huzur ve dinginlik' },
      { word: 'Fernweh', desc: 'Hiç gidilmemiş uzak diyarlara duyulan özlem' },
      { word: 'Phosphene', desc: 'Gözleri kapatınca görülen renkli ışık benekleri' },
      { word: 'Apricity', desc: 'Kış gününde güneşin verdiği tatlı sıcaklık' },
      { word: 'Syzygy', desc: 'Üç gök cisminin aynı hizaya gelmesi' },
      { word: 'Clinamen', desc: 'Atomların kaderi kıran öngörülemez sapması' },
      { word: 'Kintsugi', desc: 'Kırıkları altınla onarma sanatı' },
      { word: 'Solitude', desc: 'Kendi kendine yetebilen verimli yalnızlık' },
      { word: 'Nefelibata', desc: 'Bulutların üzerinde yürüyen hayalperest' },
      { word: 'Ubuntu', desc: 'Biz olduğumuz için ben varım felsefesi' }
    ],
    elements: [
      'Xenon54','Kobalt27','Titanyum22','İridyum77','Osmiyum76','Argon18','Kripton36','Neon10',
      'Platin78','Tungsten74','Bizmut83','Vanadyum23','Rodyum45','Toryum90','Sezyum55','Galyum31'
    ],
    space: [
      'Sirius','Quasar','Andromeda','Pulsar','Kepler','Orion','Vega','Nebula','Supernova',
      'Magnetar','Centauri','Rigel','Cassini','Voyager','Halley','Oort','Aldebaran','Antares','Titan'
    ],
    mythology: [
      'Tulpar','Simurg','Tengri','Anka','Fenrir','Atlas','Hyperion','Ülgen','Kayra','Erlik',
      'Umay','Bürküt','Tepegöz','Şahmeran','Valkyrie','Odin','Poseidon','Prometheus','Icarus','Nyx','Aether','Chronos'
    ],
    cyber_tech: [
      'Kernel','Entropy','Cipher','Qubit','Vector','Matrix','ZeroDay','Payload','Socket','Daemon',
      'Protocol','Tensor','HashNode','Firewall','Quantum','Enigma','Vortex'
    ],
    history_years: [
      '1071','1453','1923','1919','1969','1789','1299','1881','1938','1492','1989','1903','1687','1945','1347'
    ],
    animals_phenom: [
      'Vaşak','Albatros','Kuzgun','Aurora','Tayfun','Bozkurt','Şahin','Pars','Karakulak','Atmaca',
      'Kasırga','Tsunami','Muson','Yıldırım','Manta','Kondor','Puma','Çita','Narval'
    ],
    gems_colors: [
      'Obsidyen','Safir','Kehribar','Zümrüt','Ametist','Kuvars','Lapis','Opal','Topaz','Yakut',
      'Turkuaz','Oniks','Malakit','Peridot'
    ],
    chess_moves: [
      'Nf3','Bc4','Qh5','Rxd8','O-O','e4e5','Nc6','Bb5','Qd1','Kxf7','Nbd7','Rad1','Bg5','f4f5'
    ],
    primes: [
      '13','17','19','23','29','31','37','41','43','47','53','59','61','67','71','73','79','83','89','97',
      '101','103','107','109','113','127','131','137','139','149','151','157','163','167','173','179','181','191','193','197','199'
    ],
    fibonacci: [
      '13','21','34','55','89','144','233','377','610','987'
    ],
    romans: [
      'IV','VII','IX','XII','XIV','XVII','XIX','XXI','XXIV','XXVII','XLII','LVIII','XCIX'
    ],
    math_consts: [
      { code: '314', label: 'Pi Sabiti (π)' },
      { code: '271', label: 'Euler Sayısı (e)' },
      { code: '1618', label: 'Altın Oran (φ)' },
      { code: '1414', label: 'Kök 2 (√2)' },
      { code: '2997', label: 'Işık Hızı (c)' },
      { code: '6626', label: 'Planck Sabiti (h)' },
      { code: '1380', label: 'Boltzmann (k)' }
    ],
    specials: ['!', '@', '#', '$', '%', '^', '&', '*', '?', '+', '=', '~', ':']
  };

  function cryptoRandInt(max) {
    if (max <= 1) return 0;
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function pick(arr) {
    return arr[cryptoRandInt(arr.length)];
  }

  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = cryptoRandInt(i + 1);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function toAscii(str) {
    const map = {
      'ç':'c','Ç':'C','ğ':'g','Ğ':'G','ı':'i','İ':'I',
      'ö':'o','Ö':'O','ş':'s','Ş':'S','ü':'u','Ü':'U',
      'â':'a','Â':'A','î':'i','Î':'I','û':'u','Û':'U'
    };
    return String(str).replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/g, (ch) => map[ch] || ch);
  }

  function applyLeetPartial(str) {
    const map = { 'a':'4', 'A':'4', 'e':'3', 'E':'3', 'i':'1', 'I':'1', 'o':'0', 'O':'0', 's':'5', 'S':'5', 't':'7', 'T':'7' };
    let changed = 0;
    return String(str).split('').map((ch) => {
      if (map[ch] && (changed === 0 || cryptoRandInt(100) < 42)) {
        changed++;
        return map[ch];
      }
      return ch;
    }).join('');
  }

  function applyRandomCase(str) {
    return String(str).split('').map((ch, idx) => {
      if (idx === 0 || cryptoRandInt(100) < 35) return ch.toUpperCase();
      return ch.toLowerCase();
    }).join('');
  }

  function cleanAmbiguous(str) {
    return String(str).replace(/[0OIl1|]/g, (ch) => {
      const replacements = { '0':'8', 'O':'Q', 'I':'K', 'l':'m', '1':'7', '|':'!' };
      return replacements[ch] || ch;
    });
  }

  function getSelectedRules() {
    const checks = document.querySelectorAll('.uac-pwgen-check input[type="checkbox"]');
    const rules = {};
    checks.forEach((c) => {
      rules[c.getAttribute('data-rule')] = !!c.checked;
    });
    return rules;
  }

  function charLen(s) {
    return Array.from(String(s || '')).length;
  }

  function sliceChars(s, count) {
    return Array.from(String(s || '')).slice(0, Math.max(0, count)).join('');
  }

  function buildSinglePassword(rules, customText, customNumber, placement, sepMode, targetLen, exactMode) {
    const candidateGenerators = [];
    const customParts = [];

    const transformWord = (w) => {
      let out = String(w);
      if (rules.ascii_only) out = toAscii(out);
      if (rules.random_case) out = applyRandomCase(out);
      if (rules.leet_partial) out = applyLeetPartial(out);
      if (rules.no_ambiguous) out = cleanAmbiguous(out);
      return out;
    };

    if (customText) {
      const cleaned = transformWord(customText.replace(/\s+/g, ''));
      if (cleaned) customParts.push({ text: cleaned, label: 'Kendi Metnin', badge: '✏️', priority: 10 });
    }
    if (customNumber) {
      const cleanedNum = customNumber.replace(/\s+/g, '');
      if (cleanedNum) customParts.push({ text: cleanedNum, label: 'Kendi Sayın', badge: '🔢', priority: 10 });
    }

    // Kisa sayisal/sembolik kurallar (tam uzunluk modunda kolay sigar)
    const numericTokenGens = [];
    if (rules.odd_num) {
      numericTokenGens.push(() => {
        const odds = ['1','3','5','7','9'];
        const o = pick(odds) + (targetLen >= 14 ? pick(odds) : '');
        return { text: o, label: 'Tek Sayı (' + o + ')', badge: '1️⃣' };
      });
    }
    if (rules.even_num) {
      numericTokenGens.push(() => {
        const evens = ['2','4','6','8','0'];
        const e = pick(['2','4','6','8']) + (targetLen >= 14 ? pick(evens) : '');
        return { text: e, label: 'Çift Sayı (' + e + ')', badge: '2️⃣' };
      });
    }
    if (rules.prime_num) {
      numericTokenGens.push(() => {
        const pr = pick(POOLS.primes);
        return { text: pr, label: 'Asal Sayı (' + pr + ')', badge: '🧮' };
      });
    }
    if (rules.fibonacci) {
      numericTokenGens.push(() => {
        const fb = pick(POOLS.fibonacci);
        return { text: fb, label: 'Fibonacci (' + fb + ')', badge: '🌀' };
      });
    }
    if (rules.roman) {
      numericTokenGens.push(() => {
        const rm = pick(POOLS.romans);
        return { text: rm, label: 'Roma Rakamı (' + rm + ')', badge: '🏛️' };
      });
    }
    if (rules.math_const) {
      numericTokenGens.push(() => {
        const mc = pick(POOLS.math_consts);
        return { text: mc.code, label: mc.label, badge: '📐' };
      });
    }
    if (rules.tr_plate) {
      numericTokenGens.push(() => {
        const p = String(cryptoRandInt(81) + 1).padStart(2, '0');
        return { text: p, label: 'Plaka Kodu (' + p + ')', badge: '🚗' };
      });
    }
    if (rules.history_year) {
      numericTokenGens.push(() => {
        const y = pick(POOLS.history_years);
        return { text: y, label: 'Tarihi Yıl', badge: '⏳' };
      });
    }
    if (rules.chess_move) {
      numericTokenGens.push(() => {
        const c = pick(POOLS.chess_moves);
        return { text: c, label: 'Satranç Hamlesi', badge: '♟️' };
      });
    }

    // Kelime / Kavram havuzlari
    const wordTokenGens = [];
    if (rules.tr_city) {
      wordTokenGens.push(() => ({ text: transformWord(pick(POOLS.tr_cities)), label: 'Türkiye Şehri', badge: '🏙️' }));
    }
    if (rules.country) {
      wordTokenGens.push(() => ({ text: transformWord(pick(POOLS.countries)), label: 'Ülke', badge: '🌍' }));
    }
    if (rules.capital_ancient) {
      wordTokenGens.push(() => ({ text: transformWord(pick(POOLS.capitals_ancient)), label: 'Başkent / Antik Kent', badge: '🏛️' }));
    }
    if (rules.nature_geo) {
      wordTokenGens.push(() => ({ text: transformWord(pick(POOLS.nature_geo)), label: 'Coğrafi Yer', badge: '⛰️' }));
    }
    if (rules.rare_concept) {
      wordTokenGens.push(() => {
        const item = pick(POOLS.rare_concepts);
        return { text: transformWord(item.word), label: 'Kavram: ' + item.word + ' (' + item.desc + ')', badge: '💎' };
      });
    }
    if (rules.element) {
      wordTokenGens.push(() => ({ text: transformWord(pick(POOLS.elements)), label: 'Periyodik Element', badge: '⚛️' }));
    }
    if (rules.space) {
      wordTokenGens.push(() => ({ text: transformWord(pick(POOLS.space)), label: 'Uzay & Kozmos', badge: '🪐' }));
    }
    if (rules.mythology) {
      wordTokenGens.push(() => ({ text: transformWord(pick(POOLS.mythology)), label: 'Mitoloji', badge: '🐉' }));
    }
    if (rules.cyber_tech) {
      wordTokenGens.push(() => ({ text: transformWord(pick(POOLS.cyber_tech)), label: 'Siber / Kuantum', badge: '💻' }));
    }
    if (rules.animal_phenom) {
      wordTokenGens.push(() => ({ text: transformWord(pick(POOLS.animals_phenom)), label: 'Doğa / Canlı', badge: '🦅' }));
    }
    if (rules.gem_color) {
      wordTokenGens.push(() => ({ text: transformWord(pick(POOLS.gems_colors)), label: 'Değerli Taş', badge: '💠' }));
    }

    const getSep = () => {
      if (sepMode === 'none') return '';
      if (sepMode === 'random_sym') return pick(POOLS.specials);
      return sepMode;
    };

    const parts = [];
    const totalSelectedCats = wordTokenGens.length + numericTokenGens.length;

    if (!exactMode) {
      // ESNEK MOD: Secilen tum kutulari ekle
      wordTokenGens.forEach((fn) => parts.push(fn()));
      numericTokenGens.forEach((fn) => parts.push(fn()));
      if (rules.special) {
        const s1 = pick(POOLS.specials) + pick(POOLS.specials);
        parts.push({ text: s1, label: 'Özel Sembol (' + s1 + ')', badge: '✨' });
      }
    } else {
      // TAM UZUNLUK MODU: Kullanici 20 kutu secse bile targetLen'i asmadan secilen havuzlardan rastgele parcalar harmanla!
      let currentLen = customParts.reduce((s, p) => s + charLen(p.text), 0);
      // Zorunlu tekil karakterler icin (ozel sembol, tek/cift sayi vb.) 2-3 karakterlik rezerv birak
      const reserve = (rules.special ? 1 : 0) + (rules.odd_num ? 1 : 0) + (rules.even_num ? 1 : 0);
      const shuffledWords = shuffle(wordTokenGens);
      const shuffledNums = shuffle(numericTokenGens);
      const mixedQueue = [];

      // Dengeli dagilim: Bir kelime, bir sayisal/kisa kural seklinde sirala
      const maxLen = Math.max(shuffledWords.length, shuffledNums.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < shuffledWords.length) mixedQueue.push(shuffledWords[i]);
        if (i < shuffledNums.length) mixedQueue.push(shuffledNums[i]);
      }

      for (let i = 0; i < mixedQueue.length; i++) {
        const remaining = targetLen - currentLen - reserve;
        if (remaining <= 1) break;
        const tok = mixedQueue[i]();
        const tLen = charLen(tok.text);
        if (tLen <= remaining) {
          parts.push(tok);
          currentLen += tLen;
        } else if (remaining >= 3) {
          // Kalan bosluga sigacak sekilde kavramin anlamli kok kismini kes (Orn: Andromeda -> Andro)
          const sliced = sliceChars(tok.text, remaining);
          parts.push({
            text: sliced,
            label: tok.label + ' [' + sliced + ']',
            badge: tok.badge
          });
          currentLen += charLen(sliced);
          break;
        }
      }

      if (rules.special && currentLen < targetLen) {
        const sp = pick(POOLS.specials);
        parts.push({ text: sp, label: 'Özel Sembol (' + sp + ')', badge: '✨' });
        currentLen += 1;
      }
    }

    if (parts.length === 0 && customParts.length === 0) {
      const fallback = sliceChars(transformWord(pick(POOLS.rare_concepts).word), Math.max(4, targetLen - 3));
      parts.push({ text: fallback, label: 'Rastgele Çekirdek', badge: '🎲' });
    }

    let ordered = shuffle(parts);
    if (customParts.length > 0) {
      if (placement === 'start') {
        ordered = customParts.concat(ordered);
      } else if (placement === 'end') {
        ordered = ordered.concat(customParts);
      } else if (placement === 'middle') {
        const mid = Math.floor(ordered.length / 2);
        ordered = ordered.slice(0, mid).concat(customParts, ordered.slice(mid));
      } else {
        ordered = shuffle(ordered.concat(customParts));
      }
    }

    let password = '';
    for (let i = 0; i < ordered.length; i++) {
      const sep = i > 0 ? getSep() : '';
      if (exactMode && charLen(password) + charLen(sep) + charLen(ordered[i].text) > targetLen) {
        const rem = targetLen - charLen(password);
        if (rem > 0) {
          const piece = sliceChars(ordered[i].text, rem);
          password += piece;
          ordered[i].text = piece;
        }
        ordered = ordered.slice(0, i + 1);
        break;
      }
      password += sep + ordered[i].text;
    }

    // Eger exactMode aciksa ve password targetLen'den uzunsa (ornegin customText cok uzunsa), tam targetLen'e kes
    if (exactMode && charLen(password) > targetLen) {
      password = sliceChars(password, targetLen);
    }

    // Hedef uzunluga ulasana kadar secilen kurallara uygun rastgele karakterlerle doldur
    const fillerPool = (
      (rules.uppercase !== false ? (rules.no_ambiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') : '') +
      (rules.lowercase !== false ? (rules.no_ambiguous ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz') : '') +
      (rules.odd_num ? '13579' : '') +
      (rules.even_num ? '2468' : '') +
      (rules.special ? '!@#$%^&*?' : '')
    ) || 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';

    let extraPad = '';
    while (charLen(password) + charLen(extraPad) < targetLen) {
      extraPad += fillerPool[cryptoRandInt(fillerPool.length)];
    }
    if (extraPad) {
      password += extraPad;
      ordered.push({ text: extraPad, label: 'Tam Uzunluk Tamamlayıcı', badge: '🛡️' });
    }

    // Temel karakter sinifi garantileri (Buyuk harf, Kucuk harf, Tek sayi, Cift sayi, Ozel sembol)
    // Eger exactMode'daysa uzunlugu bozmadan son karakterleri degistirir; degilse sona ekler
    const ensureCharRule = (regex, poolStr, label, badge) => {
      if (regex.test(password)) return;
      const ch = poolStr[cryptoRandInt(poolStr.length)];
      if (exactMode && charLen(password) >= targetLen) {
        const chars = Array.from(password);
        // Custom text olmayan bir pozisyonu degistir
        const replaceIdx = Math.max(0, chars.length - 1 - cryptoRandInt(Math.min(4, chars.length)));
        chars[replaceIdx] = ch;
        password = chars.join('');
      } else {
        password += ch;
      }
      ordered.push({ text: ch, label, badge });
    };

    if (rules.uppercase) ensureCharRule(/[A-ZÇĞİÖŞÜ]/, rules.no_ambiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'Büyük Harf', '🔠');
    if (rules.lowercase) ensureCharRule(/[a-zçğıöşü]/, rules.no_ambiguous ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz', 'Küçük Harf', '🔡');
    if (rules.odd_num) ensureCharRule(/[13579]/, '13579', 'Tek Rakam', '1️⃣');
    if (rules.even_num) ensureCharRule(/[02468]/, '2468', 'Çift Rakam', '2️⃣');
    if (rules.special) ensureCharRule(/[!@#$%^&*?+=~:\-_.]/, POOLS.specials.join(''), 'Özel Sembol', '✨');

    return { password, breakdown: ordered, totalSelectedCats };
  }

  function calcEntropy(pw) {
    const len = Array.from(pw).length;
    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/[0-9]/.test(pw)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;
    if (/[çÇğĞıİöÖşŞüÜ]/.test(pw)) pool += 12;
    if (pool === 0) pool = 26;
    return Math.round(len * Math.log2(pool));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  }

  function copyToClipboard(text, statusMsg) {
    const statusEl = document.getElementById('pwCopyStatus');
    const done = () => {
      if (!statusEl) return;
      statusEl.textContent = statusMsg || '✅ Şifre panoya kopyalandı!';
      statusEl.classList.add('show');
      clearTimeout(copyToClipboard._t);
      copyToClipboard._t = setTimeout(() => statusEl.classList.remove('show'), 2400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        fallbackCopy(text);
        done();
      });
    } else {
      fallbackCopy(text);
      done();
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function updateSliderLabel() {
    const slider = document.getElementById('pwMinLength');
    const sliderVal = document.getElementById('pwLengthVal');
    const exactToggle = document.getElementById('pwExactLengthMode');
    if (slider && sliderVal) {
      const exact = !exactToggle || exactToggle.checked;
      sliderVal.textContent = slider.value + ' karakter (' + (exact ? 'Tam Sabit' : 'En Az') + ')';
    }
  }

  function generateAll() {
    updateSliderLabel();
    const customText = (document.getElementById('pwCustomText')?.value || '').trim();
    const customNumber = (document.getElementById('pwCustomNumber')?.value || '').trim();
    const placement = document.getElementById('pwCustomPlacement')?.value || 'random';
    const sepMode = document.getElementById('pwSeparator')?.value || 'none';
    const targetLen = parseInt(document.getElementById('pwMinLength')?.value || '16', 10) || 16;
    const exactToggle = document.getElementById('pwExactLengthMode');
    const exactMode = !exactToggle || exactToggle.checked;
    const rules = getSelectedRules();

    const main = buildSinglePassword(rules, customText, customNumber, placement, sepMode, targetLen, exactMode);
    const outEl = document.getElementById('pwMainOutput');
    if (outEl) outEl.textContent = main.password;

    const len = Array.from(main.password).length;
    const bits = calcEntropy(main.password);
    const strengthEl = document.getElementById('pwStrengthLabel');
    const entropyEl = document.getElementById('pwEntropyLabel');
    const barEl = document.getElementById('pwStrengthBar');

    let levelText = 'Çok Güçlü (Kuantum Dirençli)';
    let pct = Math.min(100, Math.round((bits / 128) * 100));
    if (bits < 50) { levelText = 'Orta Seviye'; pct = Math.max(25, pct); }
    else if (bits < 75) { levelText = 'Güçlü'; }
    else if (bits < 105) { levelText = 'Çok Güçlü'; }

    if (strengthEl) strengthEl.textContent = 'Güç: ' + levelText;
    if (entropyEl) entropyEl.textContent = bits + ' bit entropi · Tam ' + len + ' karakter';
    if (barEl) barEl.style.width = pct + '%';

    const bdEl = document.getElementById('pwBreakdownList');
    if (bdEl) {
      bdEl.innerHTML = main.breakdown.map((b) =>
        `<span class="uac-pwgen-tag"><em>${escapeHtml(b.badge)}</em> <b>${escapeHtml(b.text)}</b> <small>${escapeHtml(b.label)}</small></span>`
      ).join('');
    }

    const varEl = document.getElementById('pwVariantsList');
    if (varEl) {
      const variants = [];
      for (let i = 0; i < 4; i++) {
        variants.push(buildSinglePassword(rules, customText, customNumber, placement, sepMode, targetLen, exactMode).password);
      }
      varEl.innerHTML = variants.map((v) =>
        `<button type="button" class="uac-pwgen-variant-btn" data-pw="${escapeHtml(v)}" title="Kopyalamak için tıkla">
          <code>${escapeHtml(v)}</code>
          <span>${Array.from(v).length} kr · Kopyala</span>
        </button>`
      ).join('');
      varEl.querySelectorAll('.uac-pwgen-variant-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const pw = btn.getAttribute('data-pw') || '';
          copyToClipboard(pw, '✅ Varyasyon kopyalandı (' + Array.from(pw).length + ' karakter)');
        });
      });
    }
  }

  function init() {
    const slider = document.getElementById('pwMinLength');
    if (slider) {
      slider.addEventListener('input', generateAll);
    }
    const exactToggle = document.getElementById('pwExactLengthMode');
    if (exactToggle) {
      exactToggle.addEventListener('change', generateAll);
    }

    document.querySelectorAll('.uac-pwgen-check input, #pwCustomPlacement, #pwSeparator').forEach((el) => {
      el.addEventListener('change', generateAll);
    });
    ['pwCustomText', 'pwCustomNumber'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', generateAll);
    });

    const genBtn = document.getElementById('pwGenerateBtn');
    if (genBtn) genBtn.addEventListener('click', generateAll);

    const copyBtn = document.getElementById('pwCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const pw = document.getElementById('pwMainOutput')?.textContent || '';
        if (pw) copyToClipboard(pw, '✅ Ana şifre panoya kopyalandı!');
      });
    }

    const surpriseBtn = document.getElementById('pwSurpriseBtn');
    if (surpriseBtn) {
      surpriseBtn.addEventListener('click', () => {
        const allChecks = Array.from(document.querySelectorAll('.uac-pwgen-check input[type="checkbox"]'));
        const contentRules = ['tr_city','tr_plate','country','capital_ancient','nature_geo','rare_concept','element','space','mythology','cyber_tech','history_year','animal_phenom','gem_color','chess_move','odd_num','even_num','prime_num','fibonacci','roman','math_const'];
        const chosen = shuffle(contentRules).slice(0, 3 + cryptoRandInt(3));
        allChecks.forEach((c) => {
          const r = c.getAttribute('data-rule');
          if (r === 'uppercase' || r === 'lowercase' || r === 'special') c.checked = true;
          else if (chosen.indexOf(r) !== -1) c.checked = true;
          else c.checked = false;
        });
        generateAll();
      });
    }

    const selectAllBtn = document.getElementById('pwSelectAllBtn');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.uac-pwgen-check input[type="checkbox"]').forEach((c) => {
          const r = c.getAttribute('data-rule');
          if (r !== 'ascii_only' && r !== 'no_ambiguous') c.checked = true;
        });
        generateAll();
      });
    }

    const resetBtn = document.getElementById('pwResetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const defaults = { uppercase: true, lowercase: true, special: true, odd_num: true, rare_concept: true };
        document.querySelectorAll('.uac-pwgen-check input[type="checkbox"]').forEach((c) => {
          const r = c.getAttribute('data-rule');
          c.checked = !!defaults[r];
        });
        const t = document.getElementById('pwCustomText');
        const n = document.getElementById('pwCustomNumber');
        if (t) t.value = '';
        if (n) n.value = '';
        generateAll();
      });
    }

    generateAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
