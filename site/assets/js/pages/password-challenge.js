(() => {
  'use strict';

  const API_BASE = window.UAC_PASSWORD_API_BASE || '/wp-json/password-game/v1';

  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('password');
    const rulesDiv = document.getElementById('rules');
    const charCount = document.getElementById('charCount');
    const playerArea = document.getElementById('playerArea');
    const playerName = document.getElementById('playerName');
    const playerPin = document.getElementById('playerPin');
    const saveSolution = document.getElementById('saveSolution');
    const closePlayerArea = document.getElementById('closePlayerArea');
    const solutionsDiv = document.getElementById('solutions');
    const aiJudge = document.getElementById("aiJudge");

    if (!input || !rulesDiv) return;

    let unlockedRules = 2;
    let lastUnlocked = -1;
    let renderTimeout = null;

    let completedOnce = localStorage.getItem('uac_password_completed') === 'yes';
    const aiJudgeState = {
      lastText: '',
      lastUpdate: 0,
      lastPassed: 0,
      lastAnnouncedUnlocked: -1,
      winShown: false
    };

    function pickRandom(list) {
      return list[Math.floor(Math.random() * list.length)];
    }

    function setAIJudge(text, tone = '', force = false) {
      if (!aiJudge) return;

      const now = Date.now();
      const minDelay = 4200;

      if (!force && now - aiJudgeState.lastUpdate < minDelay) return;

      if (text === aiJudgeState.lastText && now - aiJudgeState.lastUpdate < 12000) return;

      aiJudge.textContent = text;
      aiJudge.className = `uac-ai-judge ${tone}`.trim();

      aiJudgeState.lastText = text;
      aiJudgeState.lastUpdate = now;
    }

    function updateAIJudgeStatus(p, passedCount, failedCount, totalVisible, isGameFinished, newRuleOpened) {
      if (!aiJudge) return;

      const len = p.length;
      const ratio = totalVisible > 0 ? passedCount / totalVisible : 0;
      const improved = passedCount > aiJudgeState.lastPassed;

      if (isGameFinished) {
        if (!aiJudgeState.winShown) {
          setAIJudge(pickRandom([
            'Sistem teslim oldu. Çözüm kabul edildi.',
            'Kurallar sustu. Kazandın.',
            'Bu çözüm sisteme fazla geldi.'
          ]), 'win', true);
          aiJudgeState.winShown = true;
        }

        aiJudgeState.lastPassed = passedCount;
        return;
      }

      aiJudgeState.winShown = false;

      if (newRuleOpened) {
        setAIJudge(pickRandom([
          'Yeni kural açıldı. Sistem savunmayı artırıyor.',
          'Bir engel daha geldi. Oyun şimdi başlıyor.',
          'Sistem boş durmadı, yeni kural gönderdi.'
        ]), 'warn', true);

        aiJudgeState.lastPassed = passedCount;
        return;
      }

      if (len === 0) {
        setAIJudge('Sistem bekliyor...', '', true);
        aiJudgeState.lastPassed = 0;
        return;
      }

      if (improved && ratio >= 0.35) {
        setAIJudge(pickRandom([
          'Güzel hamle, sistem biraz yumuşadı.',
          'Bazı kurallar teslim oldu.',
          'Fena değil, çözüm güçleniyor.'
        ]), 'good');

        aiJudgeState.lastPassed = passedCount;
        return;
      }

      if (failedCount <= 2 && passedCount > 0) {
        setAIJudge(pickRandom([
          'Az kaldı, kurallar direniyor.',
          'Sistem tereddüt ediyor.',
          'Yaklaştın ama sistem hâlâ tam ikna olmadı.'
        ]), 'warn');

        aiJudgeState.lastPassed = passedCount;
        return;
      }

      if (ratio < 0.25) {
        setAIJudge(pickRandom([
          'Daha sistem ikna olmadı.',
          'Bu çözüm kapıdan dönemedi.',
          'Kurallar seni uzaktan izliyor.'
        ]), 'bad');

        aiJudgeState.lastPassed = passedCount;
        return;
      }

      setAIJudge(pickRandom([
        'Yaklaştın ama sistem hâlâ ikna olmadı.',
        'Çözüm fena değil ama açıklar var.',
        'Sistem izliyor, kurallar hâlâ ayakta.'
      ]), '');

      aiJudgeState.lastPassed = passedCount;
    }

    const cityRegex = /istanbul|ankara|izmir|bursa|antalya|balıkesir|muğla|muş|adana|adıyaman|afyonkarahisar|ağrı|aksaray|amasya|ardahan|artvin|aydın|bartın|batman|bayburt|bilecik|bingöl|bitlis|bolu|burdur|çanakkale|çankırı|çorum|denizli|diyarbakır|düzce|edirne|elazığ|erzincan|erzurum|eskişehir|gaziantep|giresun|gümüşhane|hakkari|hatay|ığdır|ısparta|kahramanmaraş|karabük|karaman|kars|kastamonu|kayseri|kilis|kırkkale|kırklareli|kırşehir|kocaeli|konya|kütahya|malatya|manisa|mardin|mersin|nevşehir|niğde|ordu|osmaniye|rize|sakarya|samsun|şanlıurfa|siirt|sinop|şırnak|sivas|tekirdağ|tokat|trabzon|tunceli|uşak|van|yalova|yozgat|zonguldak/i;

    const rules = [
      { text: 'En az 8 karakter olmalı', check: p => p.length >= 8 },
      { text: 'Büyük harf içermeli', check: p => /[A-Z]/.test(p) },
      { text: "Çözüm 'abc' içermeli", check: p => p.toLowerCase().includes('abc') },
      { text: 'İçinde en az 2 basamaklı bir sayı olmalı', check: p => /\d{2,}/.test(p) },
      { text: 'İçinde en az bir tek sayı olmalı', check: p => /[13579]/.test(p) },
      { text: 'En az 1 özel karakter olmalı (!@#$)', check: p => /[!@#$]/.test(p) },
      { text: 'Sayı ile başlamamalı ama sayı içermeli', check: p => !/^\d/.test(p) && /\d/.test(p) },
      { text: 'Aynı karakter 3 kez tekrar edemez', check: p => !/(.)\1\1/u.test(p) },
      { text: 'Uzunluğu asal olmalı', check: p => isPrime([...p].length), meta: p => ` [Şu an: ${[...p].length}]` },
      { text: 'Rakamların toplamı 10-65 arasında olmalı', check: p => { const n = p.match(/\d/g); if (!n) return false; const s = n.reduce((a, b) => a + Number(b), 0); return s >= 10 && s <= 65; }, meta: p => { const n = p.match(/\d/g) || []; const s = n.reduce((a, b) => a + Number(b), 0); return ` [Toplam: ${s}]`; } },
      { text: 'Geçerli Roma rakamı içermeli', check: p => { const m = p.match(/[IVXLCDM]+/gi); if (!m) return false; return m.some(r => /^(M{0,3})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i.test(r)); } },
      { text: 'Her büyük harften sonra küçük harf gelmeli', check: p => { const ch = [...p]; for (let i = 0; i < ch.length; i++) if (/[A-Z]/.test(ch[i]) && !/[a-z]/.test(ch[i + 1] || '')) return false; return true; } },
      { text: 'Büyük Türkçe harf içermemeli (İ, Ğ, Ü, Ş, Ö, Ç)', check: p => !/[İĞÜŞÖÇ]/.test(p) },
      { text: 'Harf sayısı rakam sayısının 2 katından fazla olamaz', check: p => { const h = (p.match(/[a-zA-ZğüşıöçĞÜŞİÖÇ]/g) || []).length; const r = (p.match(/\d/g) || []).length; return r > 0 && h <= r * 2; }, meta: p => { const h = (p.match(/[a-zA-ZğüşıöçĞÜŞİÖÇ]/g) || []).length; const r = (p.match(/\d/g) || []).length; return ` [${h} harf / ${r} rakam]`; } },
      { text: 'En az 2 farklı noktalama işareti içermeli (. , ; : ? !)', check: p => new Set(p.match(/[.,;:?!]/g) || []).size >= 2 },
      { text: 'Yan yana 2 büyük harf olamaz', check: p => !/[A-Z]{2}/.test(p) },
      { text: 'Ünlü harflerin sayısı çift olmalı', check: p => (p.match(/[aeıioöuüAEIİOÖUÜ]/g) || []).length % 2 === 0, meta: p => ` [${(p.match(/[aeıioöuüAEIİOÖUÜ]/g) || []).length} ünlü]` },
      { text: 'İlk yarısında en az 1 büyük harf olmalı', check: p => /[A-Z]/.test(p.slice(0, Math.floor(p.length / 2))) },
      { text: 'En az 3 farklı özel karakter türü içermeli', check: p => new Set(p.match(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g) || []).size >= 3 },
      { text: 'Boşluk içermemeli', check: p => !/\s/.test(p) },
      { text: "'dağ' kelimesini içermeli", check: p => p.toLocaleLowerCase('tr-TR').includes('dağ') },
      { text: 'En az 1 çift tırnak veya tek tırnak olmalı', check: p => /['"]/.test(p) },
      { text: 'Bu kural önemli değil gibi duruyor...', check: () => true },
      { text: 'İçindeki sayıların çarpımı 3’e bölünebilmeli', check: p => { const nums = p.match(/\d/g); if (!nums) return false; return nums.some(d => Number(d) % 3 === 0); } },
      { text: "'su' kelimesini içermemeli", check: p => !p.toLocaleLowerCase('tr-TR').includes('su') },
      { text: 'En az 2 farklı sayı içermeli', check: p => { const n = p.match(/\d/g); return !!n && new Set(n).size >= 2; } },
      { text: 'En az 1 matematiksel işlem olmalı (+,-,*,/)', check: p => /[+\-*/]/.test(p) },
      { text: "İçinde 'X' varsa yanında sayı olmalı", check: p => { const ch = [...p]; for (let i = 0; i < ch.length; i++) { if (ch[i] === 'X' && !(/\d/.test(ch[i - 1] || '') || /\d/.test(ch[i + 1] || ''))) return false; } return true; } },
      { text: 'Bir gün adı içermeli', check: p => /pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar/i.test(p) },
      { text: 'Koordinat formatı içermeli (örn: 40.12,29.34)', check: p => /\d{2,3}\.\d+,\d{2,3}\.\d+/.test(p) },
      { text: 'Bir şehir adı içermeli', check: p => cityRegex.test(p) },
      { text: 'HEX renk kodu içermeli (#ff00aa gibi)', check: p => /#[0-9a-fA-F]{6}/.test(p) },
      { text: 'En az 1 asal uzunlukta kelime olmalı', check: p => p.split(/[^a-zA-Z]/).some(w => isPrime(w.length)) },
      { text: 'Tersiyle aynı olan 3 karakterlik parça olmalı (aba gibi)', check: p => { for (let i = 0; i < p.length - 2; i++) { const s = p.slice(i, i + 3); if (s === [...s].reverse().join('')) return true; } return false; } },
      { text: 'Artan 3 sayı içermeli (123,456 gibi)', check: p => /123|234|345|456|567|678|789/.test(p) },
      { text: "İçinde 'js' geçmeli", check: p => p.toLowerCase().includes('js') },
      { text: "'2026' ile bitmeli", check: p => p.endsWith('2026') },
      { text: 'En az 1 noktalama işareti içermeli (.,:;?)', check: p => /[.,:;?]/.test(p) },
      { text: 'En az 1 Fibonacci sayısı geçmeli (13,21,34,55,89)', check: p => /13|21|34|55|89/.test(p) }
    ];

    function isPrime(n) {
      n = Number(n);
      if (n <= 1) return false;
      if (n <= 3) return true;
      for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return false;
      return true;
    }

    function evaluate(value) {
      const shown = rules.slice(0, unlockedRules).map((rule, index) => ({ rule, index, ok: rule.check(value) }));
      return { shown, allShownPassed: shown.every(r => r.ok), allRulesPassed: rules.every(rule => rule.check(value)) };
    }

    function render(value) {
      const state = evaluate(value);
      rulesDiv.replaceChildren();

      const ordered = [
        ...state.shown.filter(r => !r.ok && r.index !== lastUnlocked),
        ...state.shown.filter(r => r.index === lastUnlocked),
        ...state.shown.filter(r => r.ok && r.index !== lastUnlocked)
      ];

      for (const item of ordered) {
        const div = document.createElement('div');
        div.className = `rule ${item.ok ? 'pass' : 'fail'}${item.index === lastUnlocked ? ' new' : ''}`;
        const metaText = typeof item.rule.meta === 'function' ? item.rule.meta(value) : '';
        div.textContent = `${item.ok ? '✅' : '❌'} ${item.rule.text}${metaText}`;
        rulesDiv.appendChild(div);
      }

      input.classList.toggle('good', state.allShownPassed);
      input.classList.toggle('bad', !state.allShownPassed);

      if (state.allShownPassed && unlockedRules < rules.length) {
        lastUnlocked = unlockedRules;
        unlockedRules++;
        clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => {
          if (input.value === value) render(value);
        }, 350);
        return;
      }

      const passedCount = state.shown.filter(item => item.ok).length;
      const failedCount = state.shown.length - passedCount;
      const totalVisible = state.shown.length;
      const newRuleOpenedNow = lastUnlocked >= 0 &&
        aiJudgeState.lastAnnouncedUnlocked !== lastUnlocked &&
        state.shown.some(item => item.index === lastUnlocked);

      if (newRuleOpenedNow) {
        aiJudgeState.lastAnnouncedUnlocked = lastUnlocked;
      }

      updateAIJudgeStatus(
        value,
        passedCount,
        failedCount,
        totalVisible,
        state.allRulesPassed,
        newRuleOpenedNow
      );

      if (state.allRulesPassed) {
        completedOnce = true;
        localStorage.setItem('uac_password_completed', 'yes');
        if (playerArea) playerArea.style.display = 'block';
        if (!window.uacPasswordConfettiPlayed) {
          window.uacPasswordConfettiPlayed = true;
          startConfetti();
        }
        loadSolutions();
      } else if (playerArea) {
        playerArea.style.display = 'none';
      }
    }

    const handlePasswordUpdate = () => {
      const value = input.value || '';
      if (charCount) charCount.textContent = `${[...value].length} karakter`;
      clearTimeout(renderTimeout);
      render(value);
    };

    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');

    ['input', 'change', 'keyup', 'compositionend'].forEach(evt => {
      input.addEventListener(evt, handlePasswordUpdate);
    });

    if (charCount && !document.getElementById('uac-pw-mobile-tools')) {
      const tools = document.createElement('div');
      tools.id = 'uac-pw-mobile-tools';
      tools.className = 'uac-pw-mobile-tools';
      tools.innerHTML = `
        <button type="button" id="uacPwStripSpaces" title="Mobil klavyenin otomatik eklediği boşlukları siler">✨ Boşlukları Sil</button>
        <button type="button" id="uacPwCopyVal" title="Mevcut metni panoya kopyalar">📋 Metni Kopyala</button>
      `;
      charCount.insertAdjacentElement('afterend', tools);
      document.getElementById('uacPwStripSpaces')?.addEventListener('click', () => {
        input.value = (input.value || '').replace(/\s+/g, '');
        handlePasswordUpdate();
        input.focus();
      });
      document.getElementById('uacPwCopyVal')?.addEventListener('click', () => {
        if (!input.value) return;
        navigator.clipboard?.writeText(input.value).catch(() => {});
      });
    }

    if (closePlayerArea) closePlayerArea.addEventListener('click', () => { playerArea.style.display = 'none'; });
    if (saveSolution) saveSolution.addEventListener('click', savePlayerSolution);

    async function savePlayerSolution() {
      const name = (playerName?.value || '').trim();
      const solution = input.value;
      const pin = (playerPin?.value || '').trim();
      const state = evaluate(solution);

      if (!name) { alert('Adını yaz.'); return; }
      if (!/^[a-zA-Z0-9_-]{4,12}$/.test(pin)) { alert('PIN 4-12 karakter olmalı. Harf/rakam kullan.'); return; }
      if (!state.allRulesPassed) { alert('Tüm kurallar tamamlanmadan kayıt yapılamaz.'); return; }

      saveSolution.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, solution, player_pin: pin })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.message || 'Kayıt başarısız.');

        alert('Kaydedildi!');
        localStorage.setItem('playerName', name);
        localStorage.setItem('uac_player_pin', pin);
        localStorage.setItem('km_player_name', name);
        localStorage.setItem('uacss5_name', name);
        if (playerName) playerName.value = '';
        if (playerPin) playerPin.value = pin;
        if (playerArea) playerArea.style.display = 'none';
        await loadSolutions();
        solutionsDiv?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        alert(error.message || 'Hata oluştu.');
      } finally {
        saveSolution.disabled = false;
      }
    }

    async function loadSolutions() {
      if (!solutionsDiv || !completedOnce) {
        if (solutionsDiv) solutionsDiv.replaceChildren();
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/list?completed=yes`);
        const data = await res.json();
        solutionsDiv.replaceChildren();

        const title = document.createElement('h2');
        title.className = 'uac-list-title';
        title.textContent = '🏆 Kazananlar';
        solutionsDiv.appendChild(title);

        const entries = Array.isArray(data.entries) ? data.entries : (Array.isArray(data) ? data : []);
        if (!entries.length) {
          const empty = document.createElement('p');
          empty.className = 'uac-muted';
          empty.textContent = 'Henüz kayıtlı çözüm yok.';
          solutionsDiv.appendChild(empty);
          return;
        }

        let shortest = null;
        entries.forEach(item => {
          const div = document.createElement('div');
          div.className = 'solution-item';
          const nameEl = document.createElement('strong');
          nameEl.textContent = item.name || 'Oyuncu';
          const solutionEl = document.createElement('span');
          solutionEl.textContent = `: ${item.solution || item.password || ''}`;
          div.append(nameEl, solutionEl);
          solutionsDiv.appendChild(div);

          const len = String(item.solution || item.password || '').length;
          if (!shortest || len < shortest.len) shortest = { div, len };
        });
        if (shortest) shortest.div.classList.add('best-solution');
      } catch (error) {}
    }

    function startConfetti() {
      const canvas = document.getElementById('confetti');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
      resize();
      window.addEventListener('resize', resize, { passive: true });

      const pieces = Array.from({ length: 120 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 6 + 2,
        speed: Math.random() * 3 + 1
      }));

      let frames = 0;
      function update() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
          p.y += p.speed;
          if (p.y > canvas.height) p.y = 0;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        frames++;
        if (frames < 420) requestAnimationFrame(update);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      update();
    }

    if (playerName && !playerName.value) playerName.value = localStorage.getItem('playerName') || localStorage.getItem('km_player_name') || localStorage.getItem('uacss5_name') || '';
    if (playerPin && !playerPin.value) playerPin.value = localStorage.getItem('uac_player_pin') || '';
    if (completedOnce) loadSolutions();
    render(input.value || '');
  });
})();
