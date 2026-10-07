'use strict';

/* ================= CONFIG ================= */
const CONFIG = {
  targetStack: 30,
  worldWidth: 400,          // logical width; everything scales from this
  viewHeight: 640,          // logical height used to fit the screen
  anchorY: 0.62,            // screen fraction where the tower top sits
  gravity: 1800,
  initialPlatformWidth: 200,
  platformHeight: 28,
  baseSpeed: 170,
  speedPerStack: 5.5,
  maxSpeed: 340,
  perfectTolerance: 5,      // world units, start of game
  perfectToleranceMin: 3,   // world units, at stack 30
  goodRatio: 0.88,          // kept-width ratio counted as "good"
  minPlatformWidth: 2,      // overlap at or below this = loss
  comboMultiplier: 20,      // bonus points per combo level
  scores: { normal: 100, good: 150, perfect: 250 },
  maxDelta: 0.05,
  minDropInterval: 90,      // ms, anti-spam
  cameraSmoothing: 6,
  maxParticles: 160,
  maxPieces: 12,
  keys: { best: 'stackit.best', stack: 'stackit.stack', sound: 'stackit.sound' }
};

const State = Object.freeze({ LOADING: 'LOADING', MENU: 'MENU', PLAYING: 'PLAYING', PAUSED: 'PAUSED', GAME_OVER: 'GAME_OVER', VICTORY: 'VICTORY' });
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const reduced = () => motionQuery.matches;

/* All difficulty scaling lives here. */
function getDifficulty(stackCount) {
  const t = clamp(stackCount / CONFIG.targetStack, 0, 1);
  return {
    speed: Math.min(CONFIG.maxSpeed, CONFIG.baseSpeed + stackCount * CONFIG.speedPerStack),
    tolerance: CONFIG.perfectTolerance - (CONFIG.perfectTolerance - CONFIG.perfectToleranceMin) * t
  };
}

function roundedRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ================= STORAGE ================= */
class StorageManager {
  constructor() { this.mem = {}; }
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v !== null) return v;
    } catch (e) { /* storage unavailable */ }
    return this.mem[key] !== undefined ? this.mem[key] : fallback;
  }
  set(key, value) {
    this.mem[key] = String(value);
    try { localStorage.setItem(key, String(value)); } catch (e) { /* storage unavailable */ }
  }
  getInt(key) {
    const n = parseInt(this.get(key, '0'), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
}

/* ================= AUDIO ================= */
class AudioManager {
  constructor(enabled) { this.enabled = enabled; this.ctx = null; this.master = null; this.noise = null; this.failed = false; }

  unlock() {
    if (!this.enabled || this.failed) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { this.failed = true; return; }
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.6;
        this.master.connect(this.ctx.destination);
        const len = Math.floor(this.ctx.sampleRate * 0.3);
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.failed = true; this.ctx = null; }
  }

  setEnabled(on) {
    this.enabled = on;
    if (on) this.unlock();
    else if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  get ready() { return this.enabled && !!this.ctx && this.ctx.state === 'running'; }

  tone(f0, f1, dur, type, vol, delay = 0) {
    if (!this.ready) return;
    try {
      const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* ignore single-voice failure */ }
  }

  burst(dur, freq, filterType, vol) {
    if (!this.ready) return;
    try {
      const c = this.ctx, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noise; f.type = filterType; f.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(t); s.stop(t + dur);
    } catch (e) { /* ignore single-voice failure */ }
  }

  playLand() {
    this.tone(150, 45, 0.18, 'sine', 0.9);
    this.tone(320, 120, 0.06, 'triangle', 0.3);
    this.burst(0.08, 900, 'lowpass', 0.5);
  }
  playPerfect() {
    this.playLand();
    this.tone(880, 880, 0.28, 'sine', 0.3, 0.02);
    this.tone(1320, 1320, 0.3, 'sine', 0.22, 0.08);
  }
  playCombo(n) {
    const f = 520 * Math.pow(2, Math.min(n, 12) / 12);
    this.tone(f, f, 0.12, 'triangle', 0.25, 0.1);
    this.tone(f * 1.5, f * 1.5, 0.16, 'triangle', 0.2, 0.17);
  }
  playCut() { this.burst(0.15, 2500, 'highpass', 0.25); this.tone(400, 120, 0.15, 'square', 0.08); }
  playGameOver() { [330, 262, 196, 130].forEach((f, i) => this.tone(f, f * 0.9, 0.3, 'sawtooth', 0.18, i * 0.16)); }
  playVictory() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, f, 0.35, 'triangle', 0.28, i * 0.1)); }
  playClick() { this.tone(700, 500, 0.05, 'square', 0.12); }
}

/* ================= CAMERA ================= */
class Camera {
  constructor() { this.reset(); }
  reset() { this.y = 0; this.target = 0; this.t = 0; this.dur = 1; this.i = 0; this.ox = 0; this.oy = 0; }
  shake(intensity, duration) {
    const i = intensity * (reduced() ? 0.15 : 1);
    if (i >= this.i * (this.t / this.dur)) { this.i = i; this.dur = duration; this.t = duration; }
  }
  update(dt) {
    this.y += (this.target - this.y) * (1 - Math.exp(-CONFIG.cameraSmoothing * dt));
    if (this.t > 0) {
      this.t = Math.max(0, this.t - dt);
      const m = this.i * (this.t / this.dur);
      this.ox = rand(-m, m); this.oy = rand(-m, m);
    } else { this.ox = 0; this.oy = 0; }
  }
}

/* ================= PARTICLES (pooled) ================= */
class ParticleSystem {
  constructor(max) {
    this.pool = Array.from({ length: max }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, rot: 0, rotSpeed: 0, grav: 0, color: '#fff' }));
  }
  clear() { for (const p of this.pool) p.active = false; }
  emit(x, y, count, o = {}) {
    let n = Math.ceil(count * (reduced() ? 0.4 : 1));
    for (let i = 0; i < this.pool.length && n > 0; i++) {
      const p = this.pool[i];
      if (p.active) continue;
      n--;
      const a = (o.dir !== undefined ? o.dir : -Math.PI / 2) + (Math.random() - 0.5) * (o.spread !== undefined ? o.spread : Math.PI);
      const sp = (o.speed || 160) * (0.4 + Math.random() * 0.6);
      const hue = o.hue !== undefined ? o.hue : Math.random() * 360;
      p.active = true; p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      p.maxLife = p.life = (o.life || 0.6) * (0.7 + Math.random() * 0.5);
      p.size = (o.size || 3) * (0.6 + Math.random() * 0.8);
      p.rot = Math.random() * 6; p.rotSpeed = rand(-8, 8);
      p.grav = o.grav !== undefined ? o.grav : 500;
      p.color = `hsl(${hue},${o.sat || 85}%,${o.light || 68}%)`;
    }
  }
  update(dt) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.rotSpeed * dt;
    }
  }
  draw(ctx) {
    for (const p of this.pool) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.min(1, p.life / p.maxLife * 1.5);
      ctx.fillStyle = p.color;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.8);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

/* Cut-off chunks: visual only, never used for collision. */
class FallingPieces {
  constructor(max) { this.pool = Array.from({ length: max }, () => ({ active: false, x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, rot: 0, rs: 0, alpha: 1, color: '#fff' })); }
  clear() { for (const p of this.pool) p.active = false; }
  spawn(x, y, w, h, hue, dir) {
    const p = this.pool.find(q => !q.active) || this.pool[0];
    Object.assign(p, { active: true, x, y, w, h, vx: dir * rand(30, 70), vy: -60, rot: 0, rs: dir * rand(0.6, 1.5), alpha: 1, color: `hsl(${hue},70%,55%)` });
  }
  update(dt) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.vy += CONFIG.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.rs * dt; p.alpha -= dt * 1.1;
      if (p.alpha <= 0) p.active = false;
    }
  }
  draw(ctx) {
    for (const p of this.pool) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.alpha); ctx.fillStyle = p.color;
      ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2); ctx.rotate(p.rot);
      roundedRect(ctx, -p.w / 2, -p.h / 2, p.w, p.h, 6); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

/* ================= PLATFORM ================= */
class Platform {
  constructor(x, y, w, level) {
    this.x = x; this.y = y; this.w = w; this.h = CONFIG.platformHeight;
    this.vel = 0; this.bounce = 0; this.glow = 0; this.setLevel(level);
  }
  setLevel(level) {
    this.level = level; this.hue = (200 + level * 9) % 360;
    this.top = `hsl(${this.hue},80%,68%)`; this.bottom = `hsl(${this.hue},75%,46%)`;
  }
  update(dt) {
    this.x += this.vel * dt;
    const max = CONFIG.worldWidth - this.w;
    if (this.x <= 0) { this.x = 0; this.vel = Math.abs(this.vel); }
    else if (this.x >= max) { this.x = max; this.vel = -Math.abs(this.vel); }
  }
  tick(dt) { this.bounce = Math.max(0, this.bounce - dt * 5); this.glow = Math.max(0, this.glow - dt * 3); }
  draw(ctx, isActive) {
    const { x, y, w, h } = this;
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.scale(1 + 0.08 * this.bounce, 1 - 0.14 * this.bounce);
    ctx.translate(-(x + w / 2), -(y + h));
    ctx.fillStyle = 'rgba(0,0,0,0.28)';           // cheap offset shadow
    roundedRect(ctx, x + 2, y + 7, w, h, 8); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, this.top); g.addColorStop(1, this.bottom);
    ctx.fillStyle = g; roundedRect(ctx, x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.38)';       // top highlight
    roundedRect(ctx, x + 2, y + 2, Math.max(0, w - 4), 5, 3); ctx.fill();
    if (isActive) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; roundedRect(ctx, x, y, w, h, 8); ctx.stroke(); }
    if (this.glow > 0) { ctx.fillStyle = `rgba(255,255,255,${0.6 * this.glow})`; roundedRect(ctx, x, y, w, h, 8); ctx.fill(); }
    ctx.restore();
  }
}

/* ================= UI ================= */
class UIManager {
  constructor() {
    const $ = id => document.getElementById(id);
    this.hudEl = $('hud'); this.scoreEl = $('hud-score'); this.stackEl = $('hud-stack');
    this.screens = Array.from(document.querySelectorAll('.screen'));
    this.$ = $; this.lastScore = null; this.lastStack = null;
  }
  show(name) { this.screens.forEach(s => s.classList.toggle('hidden', s.id !== name)); }
  hud(visible) { this.hudEl.classList.toggle('hidden', !visible); }
  pop(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  setScore(v, force) { if (v === this.lastScore && !force) return; this.lastScore = v; this.scoreEl.textContent = v; if (!force) this.pop(this.scoreEl); }
  setStack(n, force) { if (n === this.lastStack && !force) return; this.lastStack = n; this.stackEl.textContent = `${n} / ${CONFIG.targetStack}`; if (!force) this.pop(this.stackEl); }
  setSound(on) {
    document.querySelectorAll('.snd').forEach(b => { b.textContent = on ? '🔊' : '🔇'; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Sound on' : 'Sound off'); });
  }
  setMenu(best, stack) { this.$('menu-best').textContent = best; this.$('menu-stack').textContent = stack; }
  showOver(r) {
    this.$('over-score').textContent = r.score; this.$('over-stack').textContent = `${r.stack} / ${CONFIG.targetStack}`;
    this.$('over-best').textContent = r.best; this.$('over-new').classList.toggle('hidden', !r.newBest); this.show('over');
  }
  showVictory(r) {
    this.$('vic-score').textContent = r.score; this.$('vic-new').classList.toggle('hidden', !r.newBest); this.show('victory');
  }
}

/* ================= GAME ================= */
class Game {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.storage = new StorageManager();
    this.audio = new AudioManager(this.storage.get(CONFIG.keys.sound, '1') !== '0');
    this.ui = new UIManager(); this.camera = new Camera();
    this.particles = new ParticleSystem(CONFIG.maxParticles); this.pieces = new FallingPieces(CONFIG.maxPieces);
    this.best = this.storage.getInt(CONFIG.keys.best); this.highStack = this.storage.getInt(CONFIG.keys.stack);
    this.state = State.LOADING;
    this.W = 1; this.H = 1; this.dpr = 1; this.scale = 1; this.offX = 0;
    this.dots = Array.from({ length: 24 }, () => ({ x: Math.random(), y: Math.random(), r: rand(1.5, 4), s: rand(4, 14), p: rand(0.02, 0.12) }));
    this.bgHue = 210; this.last = null; this.raf = 0; this.lastDrop = 0; this.time = 0;
    this.reset();
  }

  init() {
    this.resize();
    this.ui.setSound(this.audio.enabled);
    this.toMenu();
    if (!this.raf) this.raf = requestAnimationFrame(this.loop);
  }

  /* ---- lifecycle ---- */
  reset() {
    const w = CONFIG.initialPlatformWidth;
    this.platforms = [new Platform((CONFIG.worldWidth - w) / 2, 0, w, 0)];
    this.stack = 0; this.score = 0; this.combo = 0; this.newBest = false;
    this.popups = []; this.flash = 0; this.endTimer = 0; this.endKind = null; this.confetti = 0; this.burstT = 0;
    this.particles.clear(); this.pieces.clear(); this.camera.reset();
    this.spawnActive();
    this.ui.setScore(0, true); this.ui.setStack(0, true);
  }
  start() {
    this.reset(); this.state = State.PLAYING; this.lastDrop = 0; this.last = null;
    this.ui.show(null); this.ui.hud(true);
  }
  toMenu() {
    this.reset(); this.state = State.MENU; this.ui.hud(false);
    this.ui.setMenu(this.best, this.highStack); this.ui.show('menu');
    const l = document.getElementById('loading'); if (l) l.classList.add('hidden');
  }
  pause() { if (this.state !== State.PLAYING) return; this.state = State.PAUSED; this.ui.show('pause'); }
  resume() { if (this.state !== State.PAUSED) return; this.state = State.PLAYING; this.last = null; this.ui.show(null); }
  toggleSound() {
    this.audio.setEnabled(!this.audio.enabled);
    this.storage.set(CONFIG.keys.sound, this.audio.enabled ? '1' : '0');
    this.ui.setSound(this.audio.enabled);
  }

  /* ---- platforms ---- */
  get top() { return this.platforms[this.platforms.length - 1]; }
  getNextPlatformX(width) {
    // Starts near one edge (alternating) so the sweep is always fully reachable.
    const range = CONFIG.worldWidth - width, jitter = Math.random() * range * 0.25;
    return (this.stack % 2 === 0) ? jitter : range - jitter;
  }
  spawnActive() {
    const prev = this.top, level = this.stack + 1, w = prev.w;
    const x = this.getNextPlatformX(w), range = CONFIG.worldWidth - w;
    const p = new Platform(x, -level * CONFIG.platformHeight, w, level);
    p.vel = (x < range / 2 ? 1 : -1) * getDifficulty(this.stack).speed;
    this.active = p; this.locked = false;
  }

  /* ---- input ---- */
  drop() {
    const now = performance.now();
    if (this.state !== State.PLAYING || this.locked || !this.active || now - this.lastDrop < CONFIG.minDropInterval) return;
    this.locked = true; this.lastDrop = now; this.audio.unlock();
    this.placeActive();
  }

  placeActive() {
    const cur = this.active, prev = this.top, H = CONFIG.platformHeight;
    const overlapLeft = Math.max(cur.x, prev.x);
    const overlapRight = Math.min(cur.x + cur.w, prev.x + prev.w);
    const overlapWidth = overlapRight - overlapLeft;
    if (overlapWidth <= CONFIG.minPlatformWidth) { this.miss(); return; }

    const centerDiff = Math.abs((cur.x + cur.w / 2) - (prev.x + prev.w / 2));
    const perfect = centerDiff <= getDifficulty(this.stack).tolerance;
    let newX = overlapLeft, newW = overlapWidth;
    if (perfect) { newX = prev.x; newW = prev.w; }
    else {
      if (cur.x < prev.x) this.pieces.spawn(cur.x, cur.y, prev.x - cur.x, H, cur.hue, -1);
      const curR = cur.x + cur.w, prevR = prev.x + prev.w;
      if (curR > prevR) this.pieces.spawn(prevR, cur.y, curR - prevR, H, cur.hue, 1);
      this.audio.playCut();
    }
    const good = newW / prev.w >= CONFIG.goodRatio;
    cur.x = newX; cur.w = newW; cur.vel = 0; cur.bounce = 1; cur.glow = perfect ? 1 : 0.35;
    this.platforms.push(cur);
    this.stack++;

    this.combo = perfect ? this.combo + 2 : good ? this.combo + 1 : 0;
    const base = perfect ? CONFIG.scores.perfect : good ? CONFIG.scores.good : CONFIG.scores.normal;
    const gained = base + (this.combo >= 2 ? this.combo * CONFIG.comboMultiplier : 0);
    this.score += gained;
    this.ui.setScore(this.score); this.ui.setStack(this.stack);

    // feedback
    const cx = newX + newW / 2, ly = cur.y + H, hue = cur.hue;
    this.particles.emit(cx, ly, perfect ? 28 : 10, { hue: hue, spread: Math.PI * 0.9, speed: perfect ? 260 : 170, size: perfect ? 4 : 3 });
    this.camera.shake(perfect ? 6 : 3, perfect ? 0.18 : 0.12);
    this.flash = reduced() ? 0.05 : (perfect ? 0.3 : 0.15);
    if (perfect) { this.audio.playPerfect(); this.popup('PERFECT', cx, cur.y - 22, '#ffd54a', 30, 0.9); }
    else { this.audio.playLand(); this.popup('+' + gained, cx, cur.y - 22, '#ffffff', 22, 0.7); }
    if (this.combo >= 2) { this.audio.playCombo(this.combo); this.popup('COMBO x' + this.combo, cx, cur.y - 52, '#7dffb0', 20, 0.9); }

    if (this.stack >= CONFIG.targetStack) { this.win(); return; }
    this.camera.target = Math.max(0, this.stack - 2) * H;
    this.spawnActive();
  }

  popup(text, x, y, color, size, life) { this.popups.push({ text, x, y, color, size, life, max: life }); }

  saveRecords() {
    this.newBest = this.score > this.best;
    if (this.newBest) { this.best = this.score; this.storage.set(CONFIG.keys.best, this.best); }
    if (this.stack > this.highStack) { this.highStack = this.stack; this.storage.set(CONFIG.keys.stack, this.highStack); }
  }

  miss() {
    const a = this.active, prev = this.top;
    const dir = (a.x + a.w / 2) < (prev.x + prev.w / 2) ? -1 : 1;
    this.pieces.spawn(a.x, a.y, a.w, a.h, a.hue, dir);
    this.active = null; this.combo = 0; this.state = State.GAME_OVER;
    this.camera.shake(7, 0.3); this.audio.playCut(); this.audio.playGameOver();
    this.saveRecords(); this.endTimer = 0.8; this.endKind = 'over';
  }

  win() {
    this.active = null; this.state = State.VICTORY; this.confetti = 3.5; this.burstT = 0;
    this.camera.target += CONFIG.platformHeight * 4; this.camera.shake(8, 0.4);
    this.audio.playVictory(); this.saveRecords(); this.endTimer = 1.4; this.endKind = 'victory';
  }

  /* ---- resize ---- */
  resize() {
    const dpr = clamp(window.devicePixelRatio || 1, 1, 3);
    const W = Math.max(1, window.innerWidth), H = Math.max(1, window.innerHeight);
    this.canvas.style.width = W + 'px'; this.canvas.style.height = H + 'px';
    this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr);
    this.W = W; this.H = H; this.dpr = dpr;
    this.scale = Math.min(W / CONFIG.worldWidth, H / CONFIG.viewHeight);
    this.offX = (W - CONFIG.worldWidth * this.scale) / 2;
  }

  /* ---- loop ---- */
  loop = (ts) => {
    let dt = this.last === null ? 0 : (ts - this.last) / 1000;
    this.last = ts;
    dt = clamp(dt, 0, CONFIG.maxDelta);
    this.update(dt); this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  update(dt) {
    if (this.state === State.PAUSED || this.state === State.LOADING) return;
    this.time += dt;
    const targetHue = 210 + this.stack * 5;
    this.bgHue += (targetHue - this.bgHue) * Math.min(1, dt * 2);

    if (this.state === State.PLAYING && this.active) this.active.update(dt);
    for (const p of this.platforms) p.tick(dt);
    this.particles.update(dt); this.pieces.update(dt); this.camera.update(dt);
    this.flash = Math.max(0, this.flash - dt * 1.5);
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i]; p.life -= dt; p.y -= 28 * dt;
      if (p.life <= 0) this.popups.splice(i, 1);
    }

    if (this.state === State.VICTORY && this.confetti > 0) {
      this.confetti -= dt; this.burstT -= dt;
      const topY = (0 - this.H * CONFIG.anchorY) / this.scale - this.camera.y;
      this.particles.emit(rand(0, CONFIG.worldWidth), topY, 3, { dir: Math.PI / 2, spread: 1.4, speed: 140, grav: 90, life: 3, size: 6 });
      if (this.burstT <= 0) {
        this.burstT = 0.45;
        this.particles.emit(rand(60, 340), -this.stack * CONFIG.platformHeight - 40, 18, { spread: Math.PI * 2, speed: 260, size: 5, life: 1 });
        this.camera.shake(2, 0.1);
      }
    }
    if (this.endTimer > 0) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) {
        const r = { score: this.score, stack: this.stack, best: this.best, newBest: this.newBest };
        if (this.endKind === 'over') this.ui.showOver(r); else this.ui.showVictory(r);
      }
    }
  }

  render() {
    const { ctx, W, H } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackground();
    if (this.state === State.MENU || this.state === State.LOADING) return;

    const s = this.scale;
    ctx.save();
    ctx.translate(this.offX + this.camera.ox, H * CONFIG.anchorY + this.camera.oy);
    ctx.scale(s, s);
    ctx.translate(0, this.camera.y);
    const cullTop = -(H * CONFIG.anchorY) / s - this.camera.y - 80;
    const cullBottom = (H * (1 - CONFIG.anchorY)) / s - this.camera.y + 80;
    for (const p of this.platforms) if (p.y > cullTop && p.y < cullBottom) p.draw(ctx, false);
    if (this.active) this.active.draw(ctx, true);
    this.pieces.draw(ctx); this.particles.draw(ctx);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const p of this.popups) {
      const age = p.max - p.life, k = 1 + 0.5 * Math.max(0, 1 - age * 7);
      ctx.globalAlpha = Math.min(1, p.life / (p.max * 0.5));
      ctx.font = `900 ${p.size * k}px system-ui,sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash})`; ctx.fillRect(0, 0, W, H); }
  }

  drawBackground() {
    const { ctx, W, H } = this, h = this.bgHue;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `hsl(${h},55%,30%)`); g.addColorStop(1, `hsl(${h + 30},60%,10%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    const camPx = this.camera.y * this.scale;
    for (const d of this.dots) {
      const y = (((d.y * H - this.time * d.s + camPx * d.p * 3) % H) + H) % H;
      ctx.beginPath(); ctx.arc(d.x * W, y, d.r, 0, 6.283); ctx.fill();
    }
  }
}

/* ================= INPUT ================= */
class InputManager {
  constructor(game, canvas) {
    const held = new Set();
    canvas.addEventListener('pointerdown', e => { e.preventDefault(); game.audio.unlock(); game.drop(); });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerdown', () => game.audio.unlock(), true);
    window.addEventListener('keydown', e => {
      game.audio.unlock();
      if (e.code === 'Space' || e.code === 'Enter') {
        if (game.state === State.PLAYING) {
          e.preventDefault();
          if (!e.repeat && !held.has(e.code)) { held.add(e.code); game.drop(); }
        }
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (game.state === State.PLAYING) game.pause(); else if (game.state === State.PAUSED) game.resume();
      }
    });
    window.addEventListener('keyup', e => held.delete(e.code));
    window.addEventListener('blur', () => held.clear());
    document.addEventListener('click', e => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      btn.blur(); game.audio.unlock(); game.audio.playClick();
      switch (btn.dataset.action) {
        case 'play': case 'restart': game.start(); break;
        case 'resume': game.resume(); break;
        case 'pause': game.pause(); break;
        case 'menu': game.toMenu(); break;
        case 'sound': game.toggleSound(); break;
      }
    });
    // Pause automatically when the tab is hidden; reset timing on return.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) game.pause();
      game.last = null;
    });
    const onResize = () => game.resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 120));
  }
}

/* ================= BOOT ================= */
(function boot() {
  const canvas = document.getElementById('game');
  if (!canvas || !canvas.getContext || !canvas.getContext('2d')) {
    document.getElementById('loading').textContent = 'Canvas is not supported in this browser.';
    return;
  }
  const game = new Game(canvas);
  new InputManager(game, canvas);
  game.init();
})();
