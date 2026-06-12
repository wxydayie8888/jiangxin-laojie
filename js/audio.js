/* WebAudio 五声音阶合成器 —— 零素材文件，默认静音，可整体降级 */
window.Sfx = (function () {
  let ctx = null, master = null, enabled = false;
  const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]; // C宫调五声两个八度

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.25; // 约 -12dB，绝不突响
      master.connect(ctx.destination);
      return true;
    } catch (e) { return false; }
  }

  function setEnabled(on) {
    enabled = on;
    if (on && ensure() && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, type, gain, when) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain || 0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, gain) {
    if (!enabled || !ensure()) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800;
    const g = ctx.createGain(); g.gain.value = gain || 0.2;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  /* 频率滑音（鸟啭等） */
  function glide(f0, f1, dur, gain, when) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  /* ── 环境声层：随真实时钟（晨鸟/午蝉/暮静/夜虫）── */
  let ambTimer = null, ambPart = null;
  function ambientTick() {
    if (!enabled) return;
    let next = 6000;
    if (ambPart === 'morning') {        // 鸟啭：2-3 声上挑滑音
      const n = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) glide(1900 + Math.random() * 500, 2500 + Math.random() * 600, 0.13, 0.10, i * 0.18);
      next = 3500 + Math.random() * 5000;
    } else if (ambPart === 'noon') {    // 蝉：一串细密高频颤
      for (let i = 0; i < 14; i++) tone(4200 + Math.random() * 200, 0.04, 'triangle', 0.05, i * 0.055);
      next = 5000 + Math.random() * 6000;
    } else if (ambPart === 'dusk') {    // 暮：偶尔一声远风铃
      tone(pick(PENTA.slice(5)), 1.8, 'sine', 0.07);
      next = 7000 + Math.random() * 8000;
    } else {                            // 夜：蟋蟀三连
      for (let i = 0; i < 3; i++) tone(4100, 0.035, 'sine', 0.09, i * 0.12);
      next = 1800 + Math.random() * 3000;
    }
    ambTimer = setTimeout(ambientTick, next);
  }
  function setAmbient(part) {
    ambPart = part;
    clearTimeout(ambTimer);
    if (enabled && part) ambTimer = setTimeout(ambientTick, 1200);
  }

  return {
    setEnabled(on) { setEnabled(on); setAmbient(ambPart); }, get enabled() { return enabled; },
    setAmbient,
    /* 风铃：界面轻反馈 */
    chime() { tone(pick(PENTA.slice(4)), 1.2, 'sine', 0.3); },
    /* 木鱼：点击 */
    knock() { tone(196, 0.09, 'triangle', 0.5); },
    /* 翻纸 */
    paper() { noise(0.08, 0.15); },
    /* 心跳（茶馆锔瓷长按） */
    heartbeat() { tone(55, 0.18, 'sine', 0.8); tone(55, 0.15, 'sine', 0.5, 0.22); },
    /* 完成琶音：三音上行 */
    arpeggio() { const i = Math.floor(Math.random() * 4); [0, 1, 2].forEach(k => tone(PENTA[i + k], 0.8, 'sine', 0.35, k * 0.12)); },
    /* 盖章 */
    stamp() { tone(146, 0.12, 'triangle', 0.6); noise(0.05, 0.1); },
    /* 脚步：石板路轻响（左右脚音高微差）*/
    footstep(alt) { tone(alt ? 174 : 162, 0.04, 'triangle', 0.10); noise(0.025, 0.04); },

    /* ── 工坊手作声纹（策划案 15 章「手作声纹」，一期合成模拟）── */
    carve() { tone(820, 0.05, 'triangle', 0.3); noise(0.04, 0.12); },          // 刻木
    hum() { tone(98, 0.5, 'sine', 0.22); tone(196, 0.4, 'sine', 0.1, 0.05); }, // 拉坯转盘嗡鸣
    drip() { glide(900, 420, 0.18, 0.22); },                                    // 染缸水滴
    pop() { tone(523, 0.05, 'triangle', 0.35); noise(0.03, 0.08); },            // 直播间点赞
    tickStitch() { tone(1568, 0.03, 'sine', 0.25); },                           // 绣针轻挑
    brush() { noise(0.16, 0.07); },                                             // 漆刷/擦拭
    woosh() { glide(300, 1400, 0.3, 0.12); },                                   // 声浪上滑
    water() { noise(0.25, 0.06); glide(500, 300, 0.3, 0.08, 0.05); },           // 水波
    horn() { tone(116.5, 0.9, 'triangle', 0.22); tone(174.6, 0.7, 'sine', 0.12, 0.1); }, // 远航汽笛

    /* ── 点灯仪式：宫调五声主题短旋律（约 7 秒）── */
    ceremony() {
      tone(98, 7.0, 'sine', 0.16);                       // G2 低音垫
      tone(130.8, 7.0, 'sine', 0.10);                    // C3
      const seq = [2, 3, 4, 5, 4, 3, 2, 1, 0, 1, 2, 4, 2, 1, 0, 0]; // 宫调级进，落主音
      const dur = 0.36;
      seq.forEach((k, j) => {
        tone(PENTA[k], dur * 1.8, 'sine', 0.26, 0.5 + j * dur);
        tone(PENTA[k] * 2, dur * 1.2, 'sine', 0.07, 0.5 + j * dur); // 高八度泛音
      });
      [0, 2, 4].forEach((k, j) => tone(PENTA[k] * 2, 2.0, 'sine', 0.12, 0.5 + 16 * dur + j * 0.1)); // 尾和声
    }
  };
})();
