(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');
  const IS_STATIC_HTML = /\.html$/i.test(window.location.pathname) || window.location.protocol === 'file:';
  function getProfileBaseUrl() {
    if (IS_STATIC_HTML) return 'profilim.html';
    const navLink = document.querySelector('#masthead a[href*="profil"], header nav a[href*="profil"], .site-header a[href*="profil"]');
    if (navLink) {
      const href = (navLink.getAttribute('href') || '').trim();
      if (href && !href.endsWith('.html')) return href.split('?')[0].split('#')[0];
    }
    return '/profilim/';
  }

  function normName(v) {
    return String(v || '')
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9ğüşıöç]/gi, '');
  }

  function uniqueEntries(entries) {
    const map = new Map();
    (entries || []).forEach(item => {
      const key = normName(item.name || 'oyuncu');
      if (!key) return;
      const old = map.get(key);
      if (!old || Number(item.score || 0) > Number(old.score || 0)) map.set(key, item);
    });
    return [...map.values()]
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .map((item, i) => ({ ...item, rank: i + 1 }));
  }

  function renderBoard(el, entries, emptyText) {
    if (!el) return;
    entries = uniqueEntries(entries);
    if (!entries.length) {
      el.innerHTML = `<p class="uac-empty-note">${esc(emptyText)}</p>`;
      return;
    }
    el.innerHTML = entries.slice(0, 6).map(item => `
      <div class="uac-board-row">
        <span>#${esc(item.rank)}</span>
        <span>${esc(item.name || 'Oyuncu')}</span>
        <b>${fmt(item.score)}</b>
      </div>
    `).join('');
  }

  async function getJson(url) {
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function loadHome() {
    if (!document.querySelector('.uac-platform')) return;
    try {
      const data = await getJson('/wp-json/uac-platform/v1/home');
      if (!data || !data.ok) throw new Error('Veri gelmedi');

      const counts = data.counts || {};
      const online = Number(data.online_count || 0);

      if ($('#uacStatOnline')) $('#uacStatOnline').textContent = fmt(online);
      if ($('#uacStatChat')) $('#uacStatChat').textContent = fmt(counts.chat_messages);
      if ($('#uacStatDaily')) $('#uacStatDaily').textContent = fmt(counts.daily_players);

      const live = $('#uacHomeLive');
      if (live) {
        live.innerHTML = `
          <div class="uac-live-row"><span>Online</span><b>${fmt(online)}</b></div>
          <div class="uac-live-row"><span>Password kazananı</span><b>${fmt(counts.password_winners)}</b></div>
          <div class="uac-live-row"><span>Günün Sırrı oyuncusu</span><b>${fmt(counts.daily_players)}</b></div>
        `;
      }

      const kmEntries = (data.leaderboards?.km_week && data.leaderboards.km_week.length)
        ? data.leaderboards.km_week
        : data.leaderboards?.km_all;
      renderBoard($('#uacHomeKmBoard'), kmEntries, 'Henüz skor yok. İlk sırayı sen al.');
      renderBoard($('#uacHomeDailyBoard'), data.leaderboards?.daily_all, 'Günün Sırrı için henüz kayıt yok.');
    } catch (err) {
      if ($('#uacStatOnline')) $('#uacStatOnline').textContent = '0';
      if ($('#uacStatChat')) $('#uacStatChat').textContent = '0';
      if ($('#uacStatDaily')) $('#uacStatDaily').textContent = '0';
      const live = $('#uacHomeLive');
      if (live) live.innerHTML = '<div class="uac-live-row"><span>Durum</span><b>Sistem açık</b></div>';
      renderBoard($('#uacHomeKmBoard'), [], 'İlk skor geldiğinde liste burada görünür.');
      renderBoard($('#uacHomeDailyBoard'), [], 'İlk skor geldiğinde liste burada görünür.');
    }
  }

  function getSavedName() {
    return localStorage.getItem('playerName') || localStorage.getItem('km_player_name') || localStorage.getItem('uacss5_name') || '';
  }

  function saveName(name) {
    if (!name) return;
    localStorage.setItem('playerName', name);
    localStorage.setItem('km_player_name', name);
    localStorage.setItem('uacss5_name', name);
  }

  function profileUrl(name) {
    const base = getProfileBaseUrl();
    return name ? `${base}?oyuncu=${encodeURIComponent(name)}` : base;
  }

  function goProfile(name) {
    name = String(name || '').trim();
    saveName(name);
    window.location.href = profileUrl(name);
  }

  function setupProfileLinks() {
    const input = $('#uacHomeProfileName');
    const btn = $('#uacHomeProfileGo');
    const heroLink = $('#uacHeroProfileLink');

    if (input) input.value = getSavedName();

    if (btn) {
      btn.addEventListener('click', () => goProfile(input ? input.value : getSavedName()));
    }

    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') goProfile(input.value);
      });
    }

    if (heroLink) {
      heroLink.href = getProfileBaseUrl();
      heroLink.addEventListener('click', e => {
        e.preventDefault();
        const name = input && input.value.trim() ? input.value : getSavedName();
        goProfile(name);
      });
    }

    // Ana sayfadaki tum buton/kart linklerinin hem Statik HTML hem WordPress ortaminda dogru adrese gitmesini garantile
    const wpToStatic = {
      '/klavye-muharebesi/': 'klavye-muharebesi.html',
      '/password-challenge/': 'password-challenge.html',
      '/son-siginak/': 'son-siginak.html',
      '/uac-son-siginak/': 'son-siginak.html',
      '/gunun-sirri/': 'gunun-sirri.html',
      '/sifre-olusturucu/': 'sifre-olusturucu.html',
      '/profilim/': 'profilim.html',
      '/sohbet/': 'sohbet.html',
      '/rehber/': 'rehber.html'
    };
    const staticToWp = {
      'klavye-muharebesi.html': '/klavye-muharebesi/',
      'password-challenge.html': '/password-challenge/',
      'son-siginak.html': '/son-siginak/',
      'uac-son-siginak.html': '/son-siginak/',
      'gunun-sirri.html': '/gunun-sirri/',
      'sifre-olusturucu.html': '/sifre-olusturucu/',
      'profilim.html': '/profilim/',
      'sohbet.html': '/sohbet/',
      'rehber.html': '/rehber/'
    };

    document.querySelectorAll('.uac-platform a[href]').forEach(a => {
      if (a.id === 'uacHeroProfileLink') return;
      const raw = (a.getAttribute('href') || '').trim();
      if (!raw || raw.startsWith('http') || raw.startsWith('mailto:') || raw.startsWith('#')) return;
      const [basePath, hashPart] = raw.split('#');
      const suffix = hashPart ? '#' + hashPart : '';
      if (IS_STATIC_HTML && wpToStatic[basePath]) {
        a.setAttribute('href', wpToStatic[basePath] + suffix);
      } else if (!IS_STATIC_HTML && staticToWp[basePath]) {
        a.setAttribute('href', staticToWp[basePath] + suffix);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadHome();
    setupProfileLinks();
  });
})();
