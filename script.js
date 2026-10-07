// =============================================
// GameZone — VIRAL Premium Interactive JS
// Particles, counters, glass effects, full-screen
// =============================================

// ---- Floating Particle System ----
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const isMobile = window.innerWidth <= 768;
  const PARTICLE_COUNT = isMobile ? 30 : 60;
  const colors = ['rgba(124,58,237,0.3)', 'rgba(168,85,247,0.2)', 'rgba(236,72,153,0.2)', 'rgba(6,182,212,0.15)', 'rgba(249,115,22,0.15)'];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2.5 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.opacity = Math.random() * 0.5 + 0.1;
      this.pulseSpeed = Math.random() * 0.02 + 0.005;
      this.pulseOffset = Math.random() * Math.PI * 2;
    }
    update(t) {
      this.x += this.speedX;
      this.y += this.speedY;
      this.currentOpacity = this.opacity * (0.5 + 0.5 * Math.sin(t * this.pulseSpeed + this.pulseOffset));
      if (this.x < -10 || this.x > canvas.width + 10 || this.y < -10 || this.y > canvas.height + 10) {
        this.reset();
      }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.currentOpacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  let t = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t++;
    particles.forEach(p => { p.update(t); p.draw(); });

    // Draw connection lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(124,58,237,0.06)';
          ctx.globalAlpha = 1 - dist / 120;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    requestAnimationFrame(animate);
  }
  animate();
})();

// ---- Header Scroll Effect ----
const siteHeader = document.getElementById('siteHeader');
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const st = window.scrollY;
  if (st > 30) {
    siteHeader?.classList.add('scrolled');
  } else {
    siteHeader?.classList.remove('scrolled');
  }
  lastScroll = st;
}, { passive: true });

// ---- Animated Counter (count-up on scroll) ----
function animateCounters() {
  const counters = document.querySelectorAll('.stat-num[data-target]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target'));
        const suffix = target > 10 ? '+' : '';
        const duration = 2000;
        const start = performance.now();

        function tick(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(eased * target);
          el.textContent = current.toLocaleString() + suffix;

          if (progress < 1) {
            requestAnimationFrame(tick);
          }
        }
        requestAnimationFrame(tick);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(c => observer.observe(c));
}
animateCounters();

// ---- Mobile Drawer ----
const menuBtn = document.getElementById('menuBtn');
const closeDrawerBtn = document.getElementById('closeDrawer');
const mobileDrawer = document.getElementById('mobileDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');

function openDrawer() {
  mobileDrawer?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  mobileDrawer?.classList.remove('open');
  document.body.style.overflow = '';
}
menuBtn?.addEventListener('click', openDrawer);
closeDrawerBtn?.addEventListener('click', closeDrawer);
drawerOverlay?.addEventListener('click', closeDrawer);

// Drawer links auto-close
document.querySelectorAll('.drawer-link').forEach(link => {
  link.addEventListener('click', closeDrawer);
});

// Drawer category filter chips
document.querySelectorAll('.drawer-cat-chip').forEach(chipBtn => {
  chipBtn.addEventListener('click', () => {
    const filter = chipBtn.getAttribute('data-drawer-cat');
    closeDrawer();
    const targetChip = document.querySelector(`.chip[data-cat="${filter}"]`);
    if (targetChip) {
      targetChip.click();
    }
    document.getElementById('playableGamesSection')?.scrollIntoView({ behavior: 'smooth' });
  });
});

// ---- Search Modal ----
const searchBtn = document.getElementById('searchBtn');
const mobileSearchBtn = document.getElementById('mobileSearchBtn');
const drawerSearchBtn = document.getElementById('drawerSearchBtn');
const searchModal = document.getElementById('searchModal');
const searchBackdrop = document.getElementById('searchBackdrop');
const searchInput = document.getElementById('searchInput');

function openSearch() {
  searchModal?.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => searchInput?.focus(), 100);
}
function closeSearch() {
  searchModal?.classList.remove('open');
  document.body.style.overflow = '';
}
searchBtn?.addEventListener('click', openSearch);
mobileSearchBtn?.addEventListener('click', openSearch);
drawerSearchBtn?.addEventListener('click', () => {
  closeDrawer();
  openSearch();
});
searchBackdrop?.addEventListener('click', closeSearch);

// Instant Search Filtering
const searchResults = document.querySelector('.search-results');
const ALL_GAMES_SEARCH = [
  { title: 'Tumblebolt', cat: 'Racing / 3D Stunt Physics', img: 'assets/tumblebolt.jpg', url: 'Tumblebolt.html' },
  { title: 'Trust Issues', cat: 'Troll / Puzzle Platformer', img: 'assets/trust_issues.jpg', url: 'Trust Issues.html' },
  { title: 'Tumble Tussle', cat: '2-Player / Physics Ragdoll Brawler', img: 'assets/tumble_tussle.jpg', url: 'TUMBLE TUSSLE.html' },
  { title: 'Flip Bottle Run', cat: 'Arcade / Physics Runner', img: 'assets/bottle_flip.jpg', url: 'https://bottle-flip-navy.vercel.app/' },
  { title: 'Flight Simulator 3D', cat: 'Simulation / 3D Airplane', img: 'assets/flight_sim.jpg', url: 'Plane_Landing_Game_v2/index.html' },
  { title: 'Stack It', cat: 'Arcade / 3D Tower Stacking', img: 'assets/stack_it.jpg', url: 'neew/index.html' },
  { title: 'Magnet Ball Chaos', cat: 'Physics / Electromagnetic Puzzle', img: 'assets/magnet_ball_chaos.jpg', url: 'magnet-ball-chaos.html' }
];

searchInput?.addEventListener('input', (e) => {
  const query = e.target.value.trim().toLowerCase();
  if (!searchResults) return;
  if (!query) {
    searchResults.innerHTML = '<p class="search-hint">Start typing to search our playable games…</p>';
    return;
  }
  const matches = ALL_GAMES_SEARCH.filter(g => 
    g.title.toLowerCase().includes(query) || g.cat.toLowerCase().includes(query)
  );
  if (matches.length === 0) {
    searchResults.innerHTML = `<p class="search-hint">No games found matching "<strong>${e.target.value}</strong>".</p>`;
  } else {
    searchResults.innerHTML = matches.map(g => `
      <div class="search-item" data-url="${g.url}" data-title="${g.title}">
        <img src="${g.img}" alt="${g.title}" class="search-thumb" />
        <div class="search-meta">
          <div class="search-name">${g.title}</div>
          <div class="search-cat">${g.cat}</div>
        </div>
        <button class="search-play-btn">Play →</button>
      </div>
    `).join('');

    searchResults.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        const title = item.getAttribute('data-title');
        closeSearch();
        if (url) {
          openGameModal(url, title);
        } else {
          showToast(`Now playing: ${title}`);
        }
      });
    });
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openSearch();
  }
  if (e.key === 'Escape') {
    closeSearch();
    closeDrawer();
    closeGameModal();
  }
});

// ---- Game Player Modal ----
const gameModal = document.getElementById('gameModal');
const gameModalBackdrop = document.getElementById('gameModalBackdrop');
const gameModalIframe = document.getElementById('gameModalIframe');
const modalGameTitle = document.getElementById('modalGameTitle');
const modalExternalBtn = document.getElementById('modalExternalBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalFullscreenBtn = document.getElementById('modalFullscreenBtn');

// ---- Game Details Registry ----
const GAME_DETAILS = {
  'Tumblebolt': {
    desc: 'Hit the gas and conquer wild 3D physics stunt courses! Upgrade buggies, rally cars, monster trucks, and trail bikes in your garage, stick crazy ramp landings, and collect golden bolts across 24 tracks.',
    controls: [
      { key: 'W / ↑', action: 'Gas' },
      { key: 'S / ↓', action: 'Brake / Reverse' },
      { key: 'A / ←', action: 'Tilt Left' },
      { key: 'D / →', action: 'Tilt Right' },
      { key: 'R', action: 'Restart' },
      { key: 'P / Esc', action: 'Pause' }
    ]
  },
  'Tumble Tussle': {
    desc: 'Computer Game (PC Screen Only): Grab a friend and brawl on one physical keyboard! A chaotic 2-player local physics ragdoll battle arena with Knockout, Goal Rush, Coin Chaos, King of the Hill, and Party Mode across floating islands.',
    controls: [
      { key: 'Platform', action: 'PC / Computer Screen' },
      { key: 'P1: A D', action: 'Move' },
      { key: 'P1: W', action: 'Jump' },
      { key: 'P1: S', action: 'Kick' },
      { key: 'P2: ← →', action: 'Move' },
      { key: 'P2: ↑', action: 'Jump' },
      { key: 'P2: ↓', action: 'Kick' }
    ]
  },
  'Trust Issues': {
    desc: 'Trust nothing. Especially floors! A viral Poki-style troll platformer packed with fake ground, surprise falling spikes, and devious traps. Can you beat all levels without raging?',
    controls: [
      { key: '← → / A D', action: 'Move' },
      { key: '↑ / Space / W', action: 'Jump' },
      { key: 'R', action: 'Restart Level' },
      { key: 'P / Esc', action: 'Pause' }
    ]
  },
  'Flip Bottle Run': {
    desc: 'Master the art of the perfect bottle flip! Tap or click to launch your bottle across floating cosmic platforms, balance the upright landing, and collect coins to unlock custom skins.',
    controls: [
      { key: 'Click / Tap', action: 'Flip Bottle' },
      { key: 'Space', action: 'Jump' },
      { key: 'Goal', action: 'Land Upright' }
    ]
  },
  'Flight Simulator 3D': {
    desc: 'Take control of the cockpit in this realistic 3D landing simulator. Guide commercial aircraft onto high-pressure runways through sunset winds and tight approaches.',
    controls: [
      { key: 'W / S', action: 'Pitch / Altitude' },
      { key: 'A / D', action: 'Roll / Turn' },
      { key: 'Throttle', action: 'Engine Power' }
    ]
  },
  'Stack It': {
    desc: 'Test your reflexes and precision timing in this hypnotic 3D neon tower stacker! Tap or press space at the exact moment to slice and stack glowing blocks up to 30 levels high. Rack up combo streaks and set high scores!',
    controls: [
      { key: 'Tap / Click', action: 'Drop Block' },
      { key: 'Space', action: 'Drop Block' },
      { key: 'P / Esc', action: 'Pause' }
    ]
  },
  'Magnet Ball Chaos': {
    desc: 'Harness electromagnetic fields across 20 puzzle levels! Move your cursor or finger to position the magnetic core, toggle between Attract and Repel polarities, and guide chaotic metal balls into energy goals.',
    controls: [
      { key: 'Move Pointer', action: 'Position Magnet' },
      { key: 'Click / Space', action: 'Toggle Polarity' },
      { key: 'P / Esc', action: 'Pause' }
    ]
  }
};

function openGameModal(url, title = 'Flip Bottle Run') {
  if (!gameModal) return;
  if (gameModalIframe) gameModalIframe.src = url;
  if (modalGameTitle) modalGameTitle.textContent = title;
  if (modalExternalBtn) modalExternalBtn.href = url;

  const details = GAME_DETAILS[title] || {
    desc: `${title} is a free online browser game. Play instantly with no downloads required!`,
    controls: [
      { key: 'Arrows / WASD', action: 'Move' },
      { key: 'Space / Click', action: 'Action' }
    ]
  };

  const descEl = document.getElementById('modalGameDesc');
  const pillsEl = document.getElementById('modalControlPills');
  if (descEl) descEl.textContent = details.desc;
  if (pillsEl) {
    pillsEl.innerHTML = details.controls.map(c => `<span class="control-pill"><kbd>${c.key}</kbd> ${c.action}</span>`).join('');
  }

  gameModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeGameModal() {
  if (!gameModal) return;
  gameModal.classList.remove('open');
  gameModal.classList.remove('is-fullscreen');
  gameModal.classList.remove('footer-collapsed');
  modalInfoBtn?.classList.remove('active');
  if (gameModalIframe) gameModalIframe.src = '';
  document.body.style.overflow = '';
}

const modalInfoBtn = document.getElementById('modalInfoBtn');
modalCloseBtn?.addEventListener('click', closeGameModal);
gameModalBackdrop?.addEventListener('click', closeGameModal);
modalFullscreenBtn?.addEventListener('click', () => {
  gameModal?.classList.toggle('is-fullscreen');
});
modalInfoBtn?.addEventListener('click', () => {
  gameModal?.classList.toggle('footer-collapsed');
  modalInfoBtn?.classList.toggle('active');
});

// Bind all interactive play elements with data-game-url
document.querySelectorAll('[data-game-url]').forEach(el => {
  el.addEventListener('click', (e) => {
    const url = el.getAttribute('data-game-url');
    const title = el.getAttribute('data-game-title') || 'Featured Game';
    if (url) {
      e.preventDefault();
      openGameModal(url, title);
    }
  });
});

// ---- Surprise Me (Centralized Random Game Launcher) ----
const surpriseBtn = document.getElementById('surpriseBtn');
const drawerSurpriseBtn = document.getElementById('drawerSurpriseBtn');
const bbSurprise = document.getElementById('bbSurprise');

const ALL_PLAYABLE_GAMES = [
  { name: 'Tumblebolt', url: 'Tumblebolt.html' },
  { name: 'Tumble Tussle', url: 'TUMBLE TUSSLE.html' },
  { name: 'Trust Issues', url: 'Trust Issues.html' },
  { name: 'Flip Bottle Run', url: 'https://bottle-flip-navy.vercel.app/' },
  { name: 'Flight Simulator 3D', url: 'Plane_Landing_Game_v2/index.html' },
  { name: 'Stack It', url: 'neew/index.html' },
  { name: 'Magnet Ball Chaos', url: 'magnet-ball-chaos.html' }
];

function triggerSurpriseGame() {
  const pick = ALL_PLAYABLE_GAMES[Math.floor(Math.random() * ALL_PLAYABLE_GAMES.length)];
  openGameModal(pick.url, pick.name);
  showToast(`Surprise Pick: ${pick.name}!`);
}

surpriseBtn?.addEventListener('click', triggerSurpriseGame);
drawerSurpriseBtn?.addEventListener('click', () => {
  closeDrawer();
  triggerSurpriseGame();
});
bbSurprise?.addEventListener('click', triggerSurpriseGame);

// ---- Mobile Bottom Bar Controls ----
const bbHome = document.getElementById('bbHome');
const bbGames = document.getElementById('bbGames');
const bbSearch = document.getElementById('bbSearch');
const bbMenu = document.getElementById('bbMenu');

bbSearch?.addEventListener('click', openSearch);
bbMenu?.addEventListener('click', openDrawer);

// Bottom bar active state indicator based on scroll
window.addEventListener('scroll', () => {
  const gamesSec = document.getElementById('playableGamesSection');
  if (!gamesSec) return;
  const rect = gamesSec.getBoundingClientRect();
  if (rect.top <= window.innerHeight * 0.45) {
    bbGames?.classList.add('bottom-bar-active');
    bbHome?.classList.remove('bottom-bar-active');
  } else {
    bbHome?.classList.add('bottom-bar-active');
    bbGames?.classList.remove('bottom-bar-active');
  }
}, { passive: true });

// ---- Category Chips (Live Card Filtering) ----
document.querySelectorAll('.chip[data-cat]').forEach(chip => {
  chip.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip-active'));
    chip.classList.add('chip-active');
    const filter = chip.getAttribute('data-cat');
    document.querySelectorAll('.gcard').forEach(card => {
      const cardCats = card.getAttribute('data-cat') || '';
      if (filter === 'all' || cardCats.includes(filter)) {
        card.style.display = '';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      } else {
        card.style.display = 'none';
      }
    });
  });
});

// ---- Game Card Click ----
document.querySelectorAll('.gcard').forEach(card => {
  card.addEventListener('click', (e) => {
    const url = card.getAttribute('data-game-url');
    const title = card.getAttribute('title') || 'Game';
    if (url) {
      e.preventDefault();
      openGameModal(url, title);
    } else {
      e.preventDefault();
      showToast(`Starting: ${title}`);
    }
  });
});

// ---- Play Now Button (stop propagation) ----
document.querySelectorAll('.btn-play').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const url = btn.getAttribute('data-game-url') || btn.closest('.gcard')?.getAttribute('data-game-url');
    const card = btn.closest('.gcard');
    const title = card?.getAttribute('title') || 'Game';
    if (url) {
      e.preventDefault();
      openGameModal(url, title);
    } else {
      showToast(`Now playing: ${title}`);
    }
  });
});

// ---- Toast Notification (Premium glass style) ----
function showToast(message) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="flex-shrink:0;color:#a855f7">
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
    </svg>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}

// ---- Inject Toast Styles ----
const toastCSS = document.createElement('style');
toastCSS.textContent = `
  .toast-notification {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(80px) scale(0.9);
    background: rgba(10, 10, 30, 0.9);
    border: 1px solid rgba(124, 58, 237, 0.3);
    color: #f0eeff;
    padding: 14px 24px; border-radius: 16px;
    font-family: 'Inter', sans-serif;
    font-size: .875rem; font-weight: 600;
    backdrop-filter: blur(24px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 30px rgba(124,58,237,0.15);
    z-index: 9999;
    transition: transform .4s cubic-bezier(.34,1.56,.64,1), opacity .4s;
    opacity: 0; white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: calc(100vw - 32px);
  }
  .toast-notification.show {
    transform: translateX(-50%) translateY(0) scale(1);
    opacity: 1;
  }
  @media (max-width: 767px) {
    .toast-notification {
      bottom: calc(68px + env(safe-area-inset-bottom, 0px));
      font-size: .82rem;
      padding: 12px 18px;
    }
  }
`;
document.head.appendChild(toastCSS);

// ---- Scroll Reveal (Staggered fade-in) ----
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.gcard, .spotlight-card, .hero-stat, .live-bar').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 6) * 50}ms`;
  revealObserver.observe(el);
  const rect = el.getBoundingClientRect();
  if (rect.top < window.innerHeight) {
    el.classList.add('revealed');
  }
});

const revealCSS = document.createElement('style');
revealCSS.textContent = `
  .gcard, .spotlight-card {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity .5s cubic-bezier(.4,0,.2,1), transform .5s cubic-bezier(.4,0,.2,1), box-shadow .35s, border-color .35s;
  }
  .gcard.revealed, .spotlight-card.revealed {
    opacity: 1;
    transform: translateY(0);
  }
  @media (hover: hover) and (pointer: fine) {
    .gcard:hover {
      transform: translateY(-6px) !important;
    }
  }
`;
document.head.appendChild(revealCSS);

// ---- Card Tilt (3D hover effect - desktop mouse only) ----
const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
if (hasFinePointer.matches) {
  document.querySelectorAll('.gcard').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const tiltX = (0.5 - y) * 8;
      const tiltY = (x - 0.5) * 8;
      card.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ---- Live Player Count Animation ----
function animateLiveCounts() {
  const strongEls = document.querySelectorAll('.live-item strong');
  setInterval(() => {
    strongEls.forEach(el => {
      const current = parseInt(el.textContent.replace(/,/g, ''));
      const delta = Math.floor(Math.random() * 40) - 20;
      const newVal = Math.max(100, current + delta);
      el.textContent = newVal.toLocaleString();
    });
  }, 5000);
}
animateLiveCounts();

// ---- Hero parallax on mouse move ----
const heroRight = document.querySelector('.hero-right');
const heroCharImg = document.querySelector('.hero-char-img');
if (heroRight && heroCharImg) {
  document.querySelector('.hero-banner')?.addEventListener('mousemove', (e) => {
    const rect = heroRight.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    heroCharImg.style.transform = `scale(1.03) translate(${cx * -10}px, ${cy * -10}px)`;
  });
  document.querySelector('.hero-banner')?.addEventListener('mouseleave', () => {
    heroCharImg.style.transform = '';
  });
}

// ---- Game of the Day Countdown ----
(function initGOTDCountdown() {
  const hEl = document.getElementById('gotdH');
  const mEl = document.getElementById('gotdM');
  const sEl = document.getElementById('gotdS');
  if (!hEl || !mEl || !sEl) return;

  function update() {
    const now = new Date();
    // Countdown to midnight (end of "today")
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = Math.max(0, midnight - now);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    hEl.textContent = String(h).padStart(2, '0');
    mEl.textContent = String(m).padStart(2, '0');
    sEl.textContent = String(s).padStart(2, '0');
  }
  update();
  setInterval(update, 1000);
})();

// ---- Hot Right Now & Genre Cards — click handlers ----
document.querySelectorAll('.hot-card, .genre-card').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target.classList.contains('genre-play-btn')) e.stopPropagation();
    const url = card.getAttribute('data-game-url');
    const title = card.getAttribute('data-game-title') || 'Game';
    if (url) openGameModal(url, title);
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const url = card.getAttribute('data-game-url');
      const title = card.getAttribute('data-game-title') || 'Game';
      if (url) openGameModal(url, title);
    }
  });
});

// Genre play buttons
document.querySelectorAll('.genre-play-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const card = btn.closest('.genre-card');
    const url = card?.getAttribute('data-game-url');
    const title = card?.getAttribute('data-game-title') || 'Game';
    if (url) openGameModal(url, title);
  });
});

// GOTD play button
document.querySelector('.gotd-play-btn')?.addEventListener('click', (e) => {
  const url = e.currentTarget.getAttribute('data-game-url');
  const title = e.currentTarget.getAttribute('data-game-title');
  if (url) openGameModal(url, title);
});

// ---- Recently Played (localStorage) ----
const RECENTLY_KEY = 'gz_recently_played';
const MAX_RECENT = 5;

function getRecentlyPlayed() {
  try { return JSON.parse(localStorage.getItem(RECENTLY_KEY) || '[]'); }
  catch { return []; }
}
function addToRecentlyPlayed(url, title) {
  let list = getRecentlyPlayed();
  // Remove duplicate
  list = list.filter(g => g.url !== url);
  // Find thumbnail from known games
  const known = ALL_GAMES_SEARCH.find(g => g.url === url || g.title === title);
  const img = known?.img || 'assets/tumblebolt.jpg';
  list.unshift({ url, title, img });
  if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENTLY_KEY, JSON.stringify(list)); }
  catch {}
  renderRecentlyPlayed();
}
function renderRecentlyPlayed() {
  const section = document.getElementById('recentlySection');
  const row = document.getElementById('recentlyRow');
  if (!section || !row) return;
  const list = getRecentlyPlayed();
  if (list.length === 0) { section.style.display = 'none'; return; }
  section.style.display = '';
  row.innerHTML = list.map(g => `
    <div class="hot-card" data-game-url="${g.url}" data-game-title="${g.title}" tabindex="0" role="button" aria-label="Play ${g.title}">
      <img src="${g.img}" alt="${g.title}" class="hot-card-img" />
      <div class="hot-card-glow"></div>
      <div class="hot-card-info">
        <span class="hot-card-title">${g.title}</span>
        <span class="hot-card-stat" style="color:var(--cyan);">Recently Played</span>
      </div>
    </div>
  `).join('');
  // Re-bind clicks
  row.querySelectorAll('.hot-card').forEach(card => {
    card.addEventListener('click', () => {
      const url = card.getAttribute('data-game-url');
      const title = card.getAttribute('data-game-title');
      if (url) openGameModal(url, title);
    });
  });
}
renderRecentlyPlayed();

// Clear recently played
document.getElementById('recentlyClearBtn')?.addEventListener('click', () => {
  localStorage.removeItem(RECENTLY_KEY);
  renderRecentlyPlayed();
  showToast('Play history cleared');
});

// Hook into openGameModal to track recently played
const _origOpenGameModal = openGameModal;
window.openGameModal = function(url, title) {
  _origOpenGameModal(url, title);
  addToRecentlyPlayed(url, title);
  checkAchievements(title);
};

// ---- Mood-Based Game Finder ----
const MOOD_MAP = {
  hype:        { title: 'Tumblebolt', url: 'Tumblebolt.html', img: 'assets/tumblebolt.jpg', reason: 'Adrenaline-packed 3D stunt racing at full throttle!' },
  chill:       { title: 'Stack It', url: 'neew/index.html', img: 'assets/stack_it.jpg', reason: 'Hypnotic neon block stacking — relax, time your drops, and build sky-high.' },
  competitive: { title: 'Tumblebolt', url: 'Tumblebolt.html', img: 'assets/tumblebolt.jpg', reason: 'Chase track records and master every stunt course!' },
  chaotic:     { title: 'Magnet Ball Chaos', url: 'magnet-ball-chaos.html', img: 'assets/magnet_ball_chaos.jpg', reason: 'Electromagnetic forces, wild ricochets, and absolute controlled chaos!' },
  social:      { title: 'Tumble Tussle', url: 'TUMBLE TUSSLE.html', img: 'assets/tumble_tussle.jpg', reason: 'Grab a friend and brawl on the same keyboard!' },
  explore:     { title: 'Flight Simulator 3D', url: 'Plane_Landing_Game_v2/index.html', img: 'assets/flight_sim.jpg', reason: 'Soar above the clouds in immersive 3D simulation.' }
};
const MOOD_SVGS = {
  hype:        `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  chill:       `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" x2="6" y1="1" y2="4"/><line x1="10" x2="10" y1="1" y2="4"/><line x1="14" x2="14" y1="1" y2="4"/></svg>`,
  competitive: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  chaotic:     `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  social:      `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  explore:     `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`
};

const moodEmoji = document.getElementById('moodEmoji');
const moodResult = document.getElementById('moodResult');
const moodResultImg = document.getElementById('moodResultImg');
const moodResultGame = document.getElementById('moodResultGame');
const moodResultReason = document.getElementById('moodResultReason');
const moodResultPlay = document.getElementById('moodResultPlay');
let activeMoodUrl = null;

document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const mood = btn.getAttribute('data-mood');
    const pick = MOOD_MAP[mood];
    if (!pick || !moodResult) return;
    if (moodEmoji && MOOD_SVGS[mood]) {
      moodEmoji.innerHTML = MOOD_SVGS[mood];
      moodEmoji.style.transform = 'scale(1.2) rotate(-5deg)';
      setTimeout(() => { moodEmoji.style.transform = ''; }, 300);
    }
    moodResultImg.src = pick.img;
    moodResultImg.alt = pick.title;
    moodResultGame.textContent = pick.title;
    moodResultReason.textContent = pick.reason;
    activeMoodUrl = pick.url;
    moodResultPlay.setAttribute('data-url', pick.url);
    moodResultPlay.setAttribute('data-title', pick.title);
    moodResult.style.display = '';
    // Force re-animation
    moodResult.style.animation = 'none';
    requestAnimationFrame(() => { moodResult.style.animation = ''; });
    showToast('Match found: ' + pick.title + '!');
  });
});

moodResultPlay?.addEventListener('click', () => {
  const url = moodResultPlay.getAttribute('data-url');
  const title = moodResultPlay.getAttribute('data-title');
  if (url) openGameModal(url, title);
});

// ---- Achievement System ----
const ACHIEVEMENTS = [
  { key: 'first_play',   name: 'First Play!',        desc: 'You played your first game',      condition: count => count === 1 },
  { key: 'three_games',  name: 'Triple Threat',      desc: 'Played 3 different games',         condition: count => count === 3 },
  { key: 'all_games',    name: 'Game Master',         desc: 'Tried every game on GameZone!',    condition: count => count >= 7 },
];

function checkAchievements(title) {
  const played = new Set(getRecentlyPlayed().map(g => g.title));
  const count = played.size;
  ACHIEVEMENTS.forEach(ach => {
    const unlocked = JSON.parse(localStorage.getItem('gz_ach_' + ach.key) || 'false');
    if (!unlocked && ach.condition(count)) {
      localStorage.setItem('gz_ach_' + ach.key, 'true');
      showAchievement(ach.name);
    }
  });
}

function showAchievement(name) {
  const overlay = document.getElementById('achievementOverlay');
  const nameEl = document.getElementById('achievementName');
  if (!overlay || !nameEl) return;
  nameEl.textContent = name;
  overlay.classList.remove('hide');
  overlay.classList.add('show');
  setTimeout(() => {
    overlay.classList.remove('show');
    overlay.classList.add('hide');
    setTimeout(() => overlay.classList.remove('hide'), 500);
  }, 4000);
}

console.log('GameZone — Viral Premium Edition loaded');
