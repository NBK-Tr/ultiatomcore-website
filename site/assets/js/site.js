/* Site iskeleti: mobil menu + aktif oyuncu rozeti */
(function () {
  var btn = document.querySelector('.site-nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (btn && nav) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !btn.contains(e.target)) {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Dokunmatik cihaz sinifi ekle
  try {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.documentElement.classList.add('uac-touch-device');
    }
  } catch (e) {}

  // Aktif oyuncu adini ust barda rozet olarak goster
  try {
    var savedName =
      localStorage.getItem('playerName') ||
      localStorage.getItem('km_player_name') ||
      localStorage.getItem('uacss5_name') ||
      '';
    if (savedName && nav && !nav.querySelector('.site-player-chip')) {
      var chip = document.createElement('a');
      chip.className = 'site-player-chip';
      var isPluginSubdir = location.pathname.indexOf('uac-son-siginak-wp') !== -1;
      var isStatic = /\.html$/i.test(location.pathname) || location.protocol === 'file:';
      var baseHref = isPluginSubdir ? '../site/profilim.html' : (isStatic ? 'profilim.html' : '/profilim/');
      chip.href = baseHref + '?oyuncu=' + encodeURIComponent(savedName);
      chip.title = 'Aktif oyuncu profilin';
      chip.textContent = '👤 ' + savedName;
      nav.appendChild(chip);
    }
  } catch (e) {}
})();
