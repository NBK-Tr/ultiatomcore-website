(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt = n => Number(n || 0).toLocaleString('tr-TR');

  function getQueryName() {
    try {
      const params = new URLSearchParams(location.search);
      const value = params.get('oyuncu') || params.get('player') || params.get('uac_name') || params.get('name') || '';
      if (value) {
        const isRes = window.UACLocal?.util?.isAdminReservedName?.(value) && !window.UACLocal?.util?.isAdminSession?.();
        if (!isRes) {
          localStorage.setItem('playerName', value);
          localStorage.setItem('km_player_name', value);
          localStorage.setItem('uacss5_name', value);
        }
        history.replaceState(null, '', location.pathname);
      }
      return value;
    } catch (e) {
      return '';
    }
  }

  function getSonKey() { return localStorage.getItem('uacss5_player_key') || ''; }
  async function json(url, init) {
    const opts = Object.assign({ credentials: 'same-origin' }, init || {});
    const headers = Object.assign({}, opts.headers || {});
    if (window.UAC_REST_NONCE) headers['X-WP-Nonce'] = window.UAC_REST_NONCE;
    const adminTok = sessionStorage.getItem('uac_admin_token') || '';
    if (adminTok) headers['X-UAC-Admin-Token'] = adminTok;
    opts.headers = headers;
    const r = await fetch(url, opts);
    return r.json();
  }
  function box(title, icon, html) { return `<article class="uac-game-profile-box"><h3>${icon} ${esc(title)}</h3>${html}</article>`; }

  async function loadProfile() {
    const input = $('#uacProfileName');
    const pinInput = $('#uacProfilePin');
    const authStatus = $('#uacProfileAuthStatus');
    const result = $('#uacProfileResult');
    if (!input || !result) return;
    const name = input.value.trim();
    const pin = (pinInput?.value || '').trim();
    if (!name) { input.focus(); return; }

    result.innerHTML = '<p class="uac-empty-note">Profil yükleniyor...</p>';

    // Eger PIN girilmisse once Birlesik Oyuncu Girisi / PIN Kilitleme yap
    if (pin) {
      try {
        const authRes = await json('/wp-json/uac-platform/v1/auth-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, player_pin: pin })
        });
        if (!authRes.ok) {
          if (authStatus) {
            authStatus.style.color = '#ff6674';
            authStatus.textContent = '❌ ' + (authRes.message || 'Giriş / PIN doğrulaması başarısız.');
          }
          result.innerHTML = `<p class="uac-empty-note">${esc(authRes.message || 'PIN doğrulaması başarısız.')}</p>`;
          return;
        }
        localStorage.setItem('playerName', name);
        localStorage.setItem('km_player_name', name);
        localStorage.setItem('uacss5_name', name);
        localStorage.setItem('uac_player_pin', pin);
        if (authStatus) {
          authStatus.style.color = '#00ffcc';
          authStatus.textContent = '✅ ' + (authRes.message || 'Giriş başarılı ve tüm oyunlar için senkronize edildi.');
        }
      } catch (e) {}
    } else {
      const isRes = window.UACLocal?.util?.isAdminReservedName?.(name) && !window.UACLocal?.util?.isAdminSession?.();
      if (!isRes) {
        localStorage.setItem('playerName', name);
        localStorage.setItem('km_player_name', name);
        localStorage.setItem('uacss5_name', name);
      }
      if (authStatus) {
        authStatus.style.color = '';
        authStatus.textContent = 'İpucu: PIN kodunu da yazıp butona basarsan bu oyuncu adını kendi adına kilitlersin.';
      }
    }

    let platform = null, secret = null, son = null;
    try { platform = await json('/wp-json/uac-platform/v1/profile?name=' + encodeURIComponent(name)); } catch (e) { platform = null; }
    try { secret = await json('/wp-json/uac-secret/v2/profile?name=' + encodeURIComponent(name) + '&device_key=' + encodeURIComponent(localStorage.getItem('uac_daily_device_key') || '')); } catch (e) { secret = null; }
    try {
      const key = getSonKey();
      son = await json('/wp-json/uac-son-siginak/wp/profile?name=' + encodeURIComponent(name) + (key ? '&player_key=' + encodeURIComponent(key) : ''));
    } catch (e) { son = null; }

    const km = platform?.km;
    const pw = platform?.password;
    const acc = platform?.account;
    const daily = secret?.profile || platform?.daily;
    const best = Math.max(Number(km?.best_score || 0), Number(son?.profile?.best_score || 0), Number(daily?.score || 0));

    if ($('#uacProfileNameTitle')) $('#uacProfileNameTitle').textContent = platform?.name || name;
    if ($('#uacProfileUidBadge')) $('#uacProfileUidBadge').textContent = 'ID: ' + (acc?.player_id || 'UAC-MISAFIR');
    if ($('#uacProfileLockBadge')) {
      const srcCount = acc?.sources ? Object.keys(acc.sources).length : 0;
      $('#uacProfileLockBadge').textContent = acc?.registered
        ? `🔒 PIN Korumalı Hesap · Kayıtlı Oyun/Modül: ${srcCount}`
        : '🔓 Henüz PIN ile kilitlenmemiş (Herhangi bir oyunda veya soldaki kutuda PIN girerek kilitleyebilirsin)';
    }
    if ($('#uacProfileBest')) $('#uacProfileBest').textContent = fmt(best);
    if ($('#uacProfileGames')) $('#uacProfileGames').textContent = fmt(Number(km?.total_games || 0) + Number(son?.profile?.games || 0) + (pw?.completed ? 1 : 0));
    if ($('#uacProfileStreak')) $('#uacProfileStreak').textContent = fmt(daily?.streak || 0);

    const parts = [];
    if (km) {
      parts.push(box('Klavye Muharebesi', '⌨️', `<ul><li>En iyi skor: <b>${fmt(km.best_score)}</b></li><li>En iyi level: <b>${fmt(km.best_level)}</b></li><li>Toplam oyun: <b>${fmt(km.total_games)}</b></li><li>Toplam kelime: <b>${fmt(km.total_words)}</b></li><li>Genel sıra: <b>${km.rank_all ? '#' + fmt(km.rank_all) : '-'}</b></li><li>Haftalık sıra: <b>${km.rank_week ? '#' + fmt(km.rank_week) : '-'}</b></li></ul>`));
    } else {
      parts.push(box('Klavye Muharebesi', '⌨️', '<p class="uac-empty-note">Bu isimle kayıtlı skor yok.</p>'));
    }
    if (daily && (Number(daily.answered || 0) > 0 || Number(daily.score || 0) > 0)) {
      parts.push(box('Günün Sırrı', '🧩', `<ul><li>Puan: <b>${fmt(daily.score)}</b></li><li>Çözülen: <b>${fmt(daily.answered)}</b></li><li>Seri: <b>${fmt(daily.streak)}</b></li><li>En iyi seri: <b>${fmt(daily.best_streak)}</b></li><li>Paket: <b>${esc(daily.active_pack_title || '-')}</b></li><li>Gün: <b>${fmt(daily.current_day || 0)}/7</b></li><li>Bugün: <b>${daily.today_done ? 'Tamamlandı' : 'Bekliyor'}</b></li></ul>`));
    } else {
      parts.push(box('Günün Sırrı', '🧩', '<p class="uac-empty-note">Henüz Günün Sırrı çözümü yok.</p>'));
    }
    if (son?.found && son.profile) {
      const p = son.profile;
      parts.push(box('Son Sığınak', '🛡️', `<ul><li>En iyi skor: <b>${fmt(p.best_score)}</b></li><li>En uzun süre: <b>${fmt(p.best_duration)} sn</b></li><li>Oyun: <b>${fmt(p.games)}</b></li><li>Toplam düşman: <b>${fmt(p.total_kills)}</b></li><li>Boss: <b>${fmt(p.total_bosses)}</b></li><li>Başarım: <b>${fmt(p.achievement_count)}</b></li></ul>`));
    } else {
      parts.push(box('Son Sığınak', '🛡️', '<p class="uac-empty-note">Bu isimle kayıtlı Son Sığınak skoru yok.</p>'));
    }
    if (pw?.completed) {
      parts.push(box('Password Challenge', '🔐', `<ul><li>Durum: <b>✅ Tamamlandı</b></li><li>Çözüm uzunluğu: <b>${fmt(pw.length)} karakter</b></li><li>Tarih: <b>${esc(pw.date || '-')}</b></li></ul>`));
    } else {
      parts.push(box('Password Challenge', '🔐', '<p class="uac-empty-note">Henüz tamamlanmış çözüm kaydı yok.</p>'));
    }
    result.innerHTML = `<div class="uac-profile-games">${parts.join('')}</div>`;
  }

  function updateAdminUI() {
    const isAdmin = !!(window.UAC_IS_ADMIN || sessionStorage.getItem('uac_admin_token') || (window.UACLocal?.util?.isAdminSession && window.UACLocal.util.isAdminSession()));
    const badge = $('#uacAdminStatusBadge');
    const logoutBtn = $('#uacAdminLogoutBtn');
    const loginBtn = $('#uacAdminLoginBtn');
    if (badge) {
      badge.textContent = isAdmin ? '👑 Kurucu / Admin Aktif' : 'Standart Oyuncu';
      badge.style.color = isAdmin ? '#ffe600' : '';
    }
    if (logoutBtn) logoutBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    if (loginBtn) loginBtn.textContent = isAdmin ? 'Anahtarı Güncelle' : 'Admin Yetkisini Aç';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const input = $('#uacProfileName');
    const pinInput = $('#uacProfilePin');
    const btn = $('#uacProfileLoad');
    if (input && btn) {
      input.value = getQueryName() || localStorage.getItem('playerName') || localStorage.getItem('km_player_name') || localStorage.getItem('uacss5_name') || '';
      if (pinInput) pinInput.value = localStorage.getItem('uac_player_pin') || '';
      btn.addEventListener('click', loadProfile);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') loadProfile(); });
      if (pinInput) pinInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadProfile(); });
      if (input.value.trim()) loadProfile();
    }

    updateAdminUI();
    $('#uacAdminLoginBtn')?.addEventListener('click', async () => {
      const key = ($('#uacAdminKeyInput')?.value || '').trim();
      const newKey = ($('#uacNewAdminKeyInput')?.value || '').trim();
      const msgEl = $('#uacAdminMsg');
      try {
        const res = await json('/wp-json/uac-platform/v1/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin_key: key, new_admin_key: newKey })
        });
        if (!res.ok) throw new Error(res.message || 'Admin girişi başarısız.');
        if (res.admin_token) sessionStorage.setItem('uac_admin_token', res.admin_token);
        window.UAC_IS_ADMIN = true;
        if ($('#uacAdminKeyInput')) $('#uacAdminKeyInput').value = '';
        if ($('#uacNewAdminKeyInput')) $('#uacNewAdminKeyInput').value = '';
        if (msgEl) { msgEl.style.color = '#00ffcc'; msgEl.textContent = '✅ ' + res.message; }
        updateAdminUI();
      } catch (e) {
        if (msgEl) { msgEl.style.color = '#ff6674'; msgEl.textContent = '❌ ' + (e.message || 'Hata'); }
      }
    });

    $('#uacAdminLogoutBtn')?.addEventListener('click', async () => {
      await json('/wp-json/uac-platform/v1/admin-logout', { method: 'POST' });
      sessionStorage.removeItem('uac_admin_token');
      window.UAC_IS_ADMIN = false;
      const msgEl = $('#uacAdminMsg');
      if (msgEl) { msgEl.style.color = ''; msgEl.textContent = 'Admin oturumu kapatıldı.'; }
      updateAdminUI();
    });
  });
})();
