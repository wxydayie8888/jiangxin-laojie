/* Juice 层（交互真实感改造·第1批）——全局多汁反馈 + 生成式 BGM。
   独立文件、零侵入：靠事件委托接管所有点击的"手感"，自建 AudioContext 放 BGM。
   暴露 window.Juice = { float, particles, ripple, setMusic }。尊重 prefers-reduced-motion。 */
window.Juice = (function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const app = () => document.getElementById('app') || document.body;

  /* ---------- 视觉：点击涟漪 + 目标 squash ---------- */
  function ripple(x, y, color) {
    if (reduce) return;
    const r = document.createElement('div');
    r.className = 'jx-ripple';
    r.style.cssText = `left:${x}px;top:${y}px;border-color:${color || 'rgba(242,166,90,.8)'}`;
    app().appendChild(r);
    setTimeout(() => r.remove(), 620);
  }
  function squash(el) {
    if (reduce || !el || el.__jxsq) return;
    el.__jxsq = 1;
    el.style.transition = 'transform .12s cubic-bezier(.34,1.56,.64,1)';
    const old = el.style.transform || '';
    el.style.transform = old + ' scale(.93)';
    setTimeout(() => { el.style.transform = old; setTimeout(() => { el.__jxsq = 0; }, 130); }, 90);
  }

  /* ---------- 视觉：飘字 ---------- */
  function float(x, y, text, opts) {
    opts = opts || {};
    const f = document.createElement('div');
    f.className = 'jx-float' + (opts.big ? ' big' : '');
    f.textContent = text;
    f.style.cssText = `left:${x}px;top:${y}px`;
    app().appendChild(f);
    setTimeout(() => f.remove(), 1600);
  }

  /* ---------- 视觉：粒子迸出（对象池，≤30）---------- */
  const pool = [];
  function particles(x, y, opts) {
    if (reduce) return;
    opts = opts || {};
    const n = Math.min(opts.n || 12, 24);
    const colors = opts.colors || ['#F2A65A', '#C4554D', '#E6B450'];
    for (let i = 0; i < n; i++) {
      let p = pool.pop();
      if (!p) { p = document.createElement('div'); p.className = 'jx-particle'; }
      const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const spd = 60 + Math.random() * 120;
      const dx = Math.cos(ang) * spd, dy = Math.sin(ang) * spd - 40;
      p.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};--dx:${dx}px;--dy:${dy}px`;
      app().appendChild(p);
      // 强制重排后触发动画
      p.getBoundingClientRect();
      p.classList.add('go');
      setTimeout(() => { p.classList.remove('go'); p.remove(); if (pool.length < 30) pool.push(p); }, 760);
    }
  }

  /* ---------- 声音：独立 AudioContext（BGM + tap 兜底）---------- */
  let ctx, master, bgmGain, bgmTimer, musicOn = false;
  const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0]; // C宫五声
  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      bgmGain = ctx.createGain(); bgmGain.gain.value = 0.0; bgmGain.connect(master);
      return true;
    } catch (e) { return false; }
  }
  function note(freq, dur, type, gain, when, dest) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // 生成式 BGM：极慢五声游走主旋律（古琴感）+ 低音垫，循环不重复
  let mi = 0;
  function bgmStep() {
    if (!musicOn || !ctx) return;
    // 主旋律：在五声音阶上小步游走，偶尔跳进
    const oct = Math.random() < 0.3 ? 2 : 1;
    const f = PENTA[mi % PENTA.length] * oct;
    note(f, 2.6, 'sine', 0.16, 0, bgmGain);
    note(f * 2, 1.6, 'sine', 0.04, 0.02, bgmGain); // 泛音
    // 低音垫每隔几步换一次
    if (mi % 4 === 0) note(PENTA[0] / 2, 5.2, 'sine', 0.10, 0, bgmGain);
    mi += (Math.random() < 0.5 ? 1 : (Math.random() < 0.5 ? 2 : 4));
    const gap = 1700 + Math.random() * 1400; // 慢板，留白
    bgmTimer = setTimeout(bgmStep, gap);
  }
  function setMusic(on) {
    musicOn = on;
    if (on) {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      bgmGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5); // 缓入
      clearTimeout(bgmTimer); bgmTimer = setTimeout(bgmStep, 400);
    } else {
      if (bgmGain) bgmGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
      clearTimeout(bgmTimer);
    }
  }
  function tap() { // 轻木鱼，点击兜底音（仅当游戏静音系统未接管时用）
    if (!musicOn || !ctx) return;
    note(196 * (0.98 + Math.random() * 0.04), 0.07, 'triangle', 0.12);
  }

  /* ---------- 全局事件委托：点任何"可点物"都有手感 ---------- */
  const TAP_SEL = 'button,.btn,.chip,.vspot,.npc-fig-wrap,.npc-chip,.house,.shelf-item,.role-card,.bag-item,.glaze-chip,.pt-glaze,.icon-btn,.quest-banner,.product-item';
  document.addEventListener('pointerdown', e => {
    const t = e.target.closest && e.target.closest(TAP_SEL);
    if (!t) return;
    ripple(e.clientX, e.clientY);
    squash(t);
    tap();
  }, true);

  /* 首次交互后，若游戏声音已开则启动 BGM；否则等游戏开声音时由下方轮询接管 */
  let started = false;
  function tryStart() {
    if (started) return;
    started = true;
    ensure();
    // 跟随游戏自身的声音开关（window.Sfx.enabled）
    const sync = () => { const want = !!(window.Sfx && window.Sfx.enabled); if (want !== musicOn) setMusic(want); };
    sync();
    setInterval(sync, 1500);
  }
  document.addEventListener('pointerdown', tryStart, { once: true });

  return { float, particles, ripple, setMusic };
})();
