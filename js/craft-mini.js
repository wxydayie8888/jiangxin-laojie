/* 手艺小游戏（兴趣设计方法论样板）——「工序即玩法 + 奇观高潮 + 揭秘式知识 + 手感」
   每个 = mount(stage, ws, done)。优先于 interactions.js 的旧玩法被 app 调用。
   样板：① 锔瓷（老茶馆）——找碴→打孔→嵌钉→金缮→盛水，五步真工序，奇观=碗重新盛水不漏。 */
window.CraftMini = (function () {
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  // 每步揭秘一行手艺知识（诀五：玩到了才告知）
  function reveal(stage, text) {
    const r = el('div', 'craft-lore', text);
    stage.appendChild(r);
    setTimeout(() => r.classList.add('show'), 30);
    setTimeout(() => { r.classList.remove('show'); setTimeout(() => r.remove(), 600); }, 3400);
  }
  function guide(stage, text) {
    let g = stage.querySelector('.stage-guide');
    if (!g) { g = el('div', 'stage-guide'); stage.appendChild(g); }
    g.textContent = text;
  }
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  /* ① 锔瓷：让破碎重生 */
  function jianci(stage, ws, done) {
    stage.classList.add('craft-stage');
    const board = el('div', 'jc-board');
    stage.appendChild(board);
    // 一只碎成 3 片的碗（SVG 弧片），散落
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 300 220');
    svg.setAttribute('class', 'jc-svg');
    board.appendChild(svg);
    // 完整碗的三瓣路径（碗口椭圆切成3片）
    const shards = [
      'M150,40 A110,40 0 0,1 250,120 L150,120 Z',
      'M150,40 A110,40 0 0,0 50,120 L150,120 Z',
      'M50,120 A110,55 0 0,0 250,120 Z'
    ];
    const offs = [[60, -28], [-66, -16], [10, 46]];
    const pieces = shards.map((d, i) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', 'jc-shard');
      p.dataset.i = i;
      p.style.transform = `translate(${offs[i][0]}px,${offs[i][1]}px) rotate(${(i - 1) * 9}deg)`;
      svg.appendChild(p);
      return p;
    });
    // 裂缝高亮层（拼好后显示打孔位）
    let step = 0, fitted = 0;
    guide(stage, '碗碎了。先把碎片，找碴对缝拼回去。');

    // —— 步骤1：找碴对缝（点碎片归位，磁吸）——
    pieces.forEach(p => {
      p.addEventListener('pointerdown', e => {
        e.stopPropagation();
        if (step !== 0 || p.classList.contains('fit')) return;
        p.style.transition = 'transform .45s cubic-bezier(.2,1.3,.4,1)';
        p.style.transform = 'translate(0,0) rotate(0)';
        p.classList.add('fit');
        Sfx.knock(); buzz(12);
        if (++fitted === 1) reveal(stage, '找碴对缝——碎片的纹路，是唯一的密码。');
        if (fitted === pieces.length) {
          step = 1;
          setTimeout(startDrill, 500);
        }
      });
    });

    // —— 步骤2：金刚钻打孔（长按蓄力，过则钻透）——
    function startDrill() {
      guide(stage, '裂缝两侧打孔。稳住——力道过了会钻透。');
      const holes = [[112, 116], [150, 122], [188, 116]];  // 三个待打孔位
      let drilled = 0;
      const meterWrap = el('div', 'jc-meter'); const meter = el('div', 'jc-meter-fill');
      meterWrap.appendChild(meter); stage.appendChild(meterWrap);
      holes.forEach(([hx, hy], hi) => {
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', hx); dot.setAttribute('cy', hy); dot.setAttribute('r', 7);
        dot.setAttribute('class', 'jc-holespot'); dot.dataset.hi = hi;
        svg.appendChild(dot);
        let holding = false, lvl = 0, raf = null, last = 0, doneHole = false;
        function loop(t) {
          if (doneHole) return;
          raf = requestAnimationFrame(loop);
          if (!holding) { lvl = Math.max(0, lvl - (t - last) / 700); last = t; meter.style.width = (lvl * 100) + '%'; return; }
          lvl += (t - last) / 1100; last = t;
          meter.style.width = Math.min(100, lvl * 100) + '%';
          meter.classList.toggle('hot', lvl > 0.82);
          if (lvl >= 0.62 && lvl <= 0.82) { meter.classList.add('good'); } else { meter.classList.remove('good'); }
          if (lvl > 1) { // 钻透——温柔失败，可重来（诀四）
            doneHole = true; cancelAnimationFrame(raf);
            dot.classList.add('cracked'); meter.style.width = '0';
            guide(stage, '钻透了！没有金刚钻，别揽瓷器活——再来一次，停在绿区。');
            Sfx.paper(); buzz([20, 40, 20]);
            setTimeout(() => { doneHole = false; lvl = 0; dot.classList.remove('cracked'); requestAnimationFrame(loop); }, 900);
          }
        }
        dot.addEventListener('pointerdown', e => { e.stopPropagation(); if (doneHole) return; holding = true; last = performance.now(); Sfx.hum && Sfx.hum(); });
        const up = () => {
          if (doneHole || !holding) { holding = false; return; }
          holding = false;
          if (lvl >= 0.62 && lvl <= 0.82) {  // 命中绿区=成孔
            doneHole = true; cancelAnimationFrame(raf);
            dot.classList.add('done'); meter.style.width = '0'; Sfx.knock(); buzz(15);
            if (drilled === 0) reveal(stage, '钻不透底，只钻进一半——这"分寸"，是三十年的手感。');
            if (++drilled === holes.length) { meterWrap.remove(); step = 2; setTimeout(startNail, 400); }
          }
        };
        dot.addEventListener('pointerup', up);
        dot.addEventListener('pointerleave', up);
        requestAnimationFrame(loop);
      });
    }

    // —— 步骤3：嵌锔钉（拖铜钉入孔）——
    function startNail() {
      guide(stage, '把铜锔钉，嵌进孔里。它的张力，会把碎片重新抱住。');
      const spots = stage.querySelectorAll('.jc-holespot.done');
      const tray = el('div', 'jc-tray');
      stage.appendChild(tray);
      let nailed = 0;
      spots.forEach(spot => {
        const nail = el('div', 'jc-nail', '');
        tray.appendChild(nail);
        nail.addEventListener('pointerdown', ev => {
          ev.stopPropagation();
          nail.setPointerCapture && nail.setPointerCapture(ev.pointerId);
          const sr = stage.getBoundingClientRect();
          const move = e2 => { nail.style.left = (e2.clientX - sr.left) + 'px'; nail.style.top = (e2.clientY - sr.top) + 'px'; nail.classList.add('dragging'); };
          const up = e2 => {
            nail.removeEventListener('pointermove', move);
            const sp = spot.getBoundingClientRect();
            if (Math.hypot(e2.clientX - (sp.left + sp.width / 2), e2.clientY - (sp.top + sp.height / 2)) < 46) {
              // 命中——铜钉跨缝
              const cx = +spot.getAttribute('cx'), cy = +spot.getAttribute('cy');
              const NSn = document.createElementNS(NS, 'rect');
              NSn.setAttribute('x', cx - 9); NSn.setAttribute('y', cy - 3.5); NSn.setAttribute('width', 18); NSn.setAttribute('height', 7);
              NSn.setAttribute('rx', 3.5); NSn.setAttribute('class', 'jc-nail-set');
              svg.appendChild(NSn);
              nail.remove(); Sfx.stamp(); buzz(18);
              if (nailed === 0) reveal(stage, '锔钉跨过裂缝，像订书钉——金石之间，靠的是巧劲。');
              if (++nailed === spots.length) { tray.remove(); step = 3; setTimeout(startKin, 400); }
            } else { nail.style.left = ''; nail.style.top = ''; nail.classList.remove('dragging'); }
          };
          nail.addEventListener('pointermove', move);
          nail.addEventListener('pointerup', up, { once: true });
        });
      });
    }

    // —— 步骤4：金缮描金（手指沿裂缝描）——
    function startKin(){
      guide(stage, '最后，沿着裂缝描一道金。伤痕，不必藏。');
      // 在裂缝处放一条可描的金线 path
      const crack = document.createElementNS(NS,'path');
      crack.setAttribute('d','M150,120 L150,40');
      crack.setAttribute('class','jc-crack');
      svg.appendChild(crack);
      const len = crack.getTotalLength();
      crack.style.strokeDasharray = len; crack.style.strokeDashoffset = len;
      let drawing=false, prog=0;
      const onMove=e=>{ if(!drawing) return; prog=Math.min(1,prog+0.06); crack.style.strokeDashoffset=len*(1-prog);
        if(prog>=1){ drawing=false; reveal(stage,'金缮——伤痕，可以是金子做的纹路。'); step=4; setTimeout(startWater,700);} };
      stage.addEventListener('pointerdown',()=>{drawing=true;}, true);
      stage.addEventListener('pointerup',()=>{drawing=false;}, true);
      stage.addEventListener('pointermove',onMove);
    }

    // —— 步骤5（奇观高潮）：盛水不漏 ——
    function startWater(){
      guide(stage, '好了。试试——还能盛水吗？');
      const wbtn = el('button','btn primary jc-pour','倒一瓢水');
      stage.appendChild(wbtn);
      wbtn.addEventListener('click',()=>{
        wbtn.remove();
        const water = document.createElementNS(NS,'path');
        water.setAttribute('d','M150,40 A110,40 0 0,0 50,120 A110,55 0 0,0 250,120 A110,40 0 0,0 150,40 Z');
        water.setAttribute('class','jc-water');
        svg.insertBefore(water, svg.querySelector('.jc-nail-set'));
        Sfx.water && Sfx.water(); buzz(30);
        setTimeout(()=>{ Sfx.arpeggio();
          reveal(stage,'看，还能用。碗碎了，缘没断。——这就是锔瓷。');
        }, 700);
        setTimeout(done, 2600);
      });
    }
  }

  /* ③ 陶艺拉坯：定心→拉坯(手抖则塌)→收口→选釉→开窑窑变(奇观) */
  function pottery(stage, ws, done) {
    stage.classList.add('craft-stage');
    const wrap = el('div', 'pt-wrap');
    stage.appendChild(wrap);
    const wheel = el('div', 'pt-wheel');          // 转盘
    const clay = el('div', 'pt-clay');            // 泥团
    wrap.appendChild(wheel); wrap.appendChild(clay);
    let spin = 0, spinRAF;
    (function spinLoop(){ spin += 6; wheel.style.transform = `translateX(-50%) rotateX(60deg) rotate(${spin}deg)`; spinRAF = requestAnimationFrame(spinLoop); })();

    let step = 0;
    guide(stage, '先揉泥定心。点泥团中心，把它稳住。');

    // —— 步骤1：定心（连点中心，稳定度↑）——
    let center = 0;
    clay.classList.add('wobble');
    clay.addEventListener('pointerdown', onCenter);
    function onCenter(e){
      if (step !== 0) return;
      e.stopPropagation();
      center = Math.min(1, center + 0.2);
      clay.style.setProperty('--wob', (1 - center).toFixed(2));
      Sfx.knock && Sfx.knock(); buzz(8);
      if (center === 0.2) reveal(stage, '泥要定心——心不静，泥就跑偏。');
      if (center >= 1) {
        step = 1; clay.classList.remove('wobble');
        clay.removeEventListener('pointerdown', onCenter);
        guide(stage, '顺着泥，往上拉。稳稳地——手一抖，就塌。');
        startThrow();
      }
    }

    // —— 步骤2：拉坯（向上滑塑形，抖动/回拉则塌）——
    function startThrow(){
      let shape = 0, lastY = null, stability = 1, dirUp = 0;
      const stages = ['pt-s0','pt-s1','pt-s2','pt-s3'];   // 矮墩→碗→瓶→高瓶
      let humOn = false;
      stage.addEventListener('pointerdown', e => { lastY = e.clientY; humOn = true; });
      stage.addEventListener('pointerup', () => { lastY = null; humOn = false; });
      stage.addEventListener('pointermove', e => {
        if (step !== 1 || lastY == null) return;
        const dy = lastY - e.clientY; lastY = e.clientY;
        if (Math.abs(dy) > 26) {            // 抖动太猛 → 失稳
          stability -= 0.34;
          clay.classList.add('pt-shake');
          setTimeout(()=>clay.classList.remove('pt-shake'), 200);
          if (stability <= 0) {             // 塌了——温柔失败，回到本阶段重来
            stability = 1; shape = Math.max(0, shape - 1);
            clay.className = 'pt-clay ' + stages[shape];
            guide(stage, '塌了！手不能抖——稳住，再来。');
            Sfx.paper && Sfx.paper(); buzz([20,40,20]);
          }
          return;
        }
        if (dy > 4) {                       // 平稳上拉 → 长高
          if (humOn && Sfx.hum) Sfx.hum();
          dirUp += dy;
          stability = Math.min(1, stability + 0.05);
          if (dirUp > 130 && shape < 3) {
            shape++; dirUp = 0;
            clay.className = 'pt-clay ' + stages[shape];
            buzz(12);
            if (shape === 1) reveal(stage, '手不能抖——一抖，前功尽弃。这叫"手上的稳"。');
            if (shape === 3) { step = 2; guide(stage,'够高了。捏一下口沿，收个口。'); startRim(); }
          }
        }
      });
    }

    // —— 步骤3：收口 ——
    function startRim(){
      const rim = el('button','btn pt-rim','轻轻收口');
      stage.appendChild(rim);
      rim.addEventListener('click', ()=>{
        rim.remove(); clay.classList.add('pt-rimmed');
        reveal(stage,'收口——一只器物的气度，全在这一圈。');
        step = 3; setTimeout(startGlaze, 700);
      });
    }

    // —— 步骤4：选釉 ——
    function startGlaze(){
      guide(stage,'上釉吧。入窑一色，出窑……谁也说不准。');
      const glazes = [['豆青','#9DB99A'],['月白','#E8EDEA'],['柿红','#C4554D']];
      const row = el('div','pt-glazes');
      glazes.forEach(([nm,col])=>{
        const g = el('button','pt-glaze');
        g.style.background = col; g.title = nm;
        g.addEventListener('click', ()=>{
          clay.style.setProperty('--glaze', col);
          clay.classList.add('pt-glazed');
          Store.state.youth.glaze = nm; Store.save();
          row.remove(); reveal(stage,`上的是${nm}。可釉色入了窑，就由不得你了。`);
          step = 4; setTimeout(startKiln, 900);
        });
        row.appendChild(g);
      });
      stage.appendChild(row);
    }

    // —— 步骤5（奇观）：开窑窑变 ——
    function startKiln(){
      guide(stage,'封窑。火候到了，开窑。');
      const fire = el('div','pt-kiln'); stage.appendChild(fire);
      clay.classList.add('pt-firing');
      const open = el('button','btn primary pt-open','开 窑');
      stage.appendChild(open);
      open.addEventListener('click', ()=>{
        open.remove(); fire.remove();
        cancelAnimationFrame(spinRAF);
        // 窑变：随机一个意料之外的釉色渐变
        const yaobian = ['linear-gradient(160deg,#5B7A8C,#9DB99A,#C9A86A)','linear-gradient(160deg,#7C5A8C,#C4554D,#E6B450)','linear-gradient(150deg,#3E6B5A,#8AA37B,#E8EDEA)','linear-gradient(160deg,#8C4A3E,#C4554D,#E8C36A)'];
        clay.style.background = yaobian[Math.floor(Math.random()*yaobian.length)];
        clay.classList.remove('pt-firing'); clay.classList.add('pt-done');
        Sfx.arpeggio && Sfx.arpeggio(); buzz(30);
        setTimeout(()=> reveal(stage,'窑变——入窑一色，出窑万彩。同一炉火，谁也烧不出第二只。'), 600);
        setTimeout(done, 2800);
      });
    }
  }

  /* 青石坞志：玩法与背景信息页（顶栏 📖）——定义为全局，供 app.js 绑定解析（避免 app.js 反复被回退）*/
  window.showCodex = function () {
    const C = DATA.codex; if (!C) return;
    const ov = document.getElementById('overlay');
    ov.hidden = false; ov.innerHTML = '';
    const sheet = el('div', 'sheet codex-sheet');
    sheet.appendChild(el('div', 'codex-title', C.title));
    C.sections.forEach(s => {
      const b = el('div', 'codex-sec');
      b.appendChild(el('div', 'codex-h', s.h));
      b.appendChild(el('div', 'codex-p', s.p.replace(/\n/g, '<br>')));
      sheet.appendChild(b);
    });
    const close = el('button', 'btn ghost', C.close);
    close.style.cssText = 'width:100%;margin-top:10px;';
    close.addEventListener('click', () => { ov.hidden = true; ov.innerHTML = ''; });
    sheet.appendChild(close);
    ov.appendChild(sheet);
    Sfx.paper && Sfx.paper();
  };
  // 兜底直绑（顶栏为静态 HTML，此刻已存在）
  (function () { var b = document.getElementById('btn-help'); if (b) b.addEventListener('click', window.showCodex); })();

  return { 1: jianci, 3: pottery };
})();
