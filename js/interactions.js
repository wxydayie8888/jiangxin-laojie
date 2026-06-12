/* 10 间工坊微交互 —— 每个 mount(stage, ws, done)，纯 Pointer Events，零失败兜底
   app.js 每次进工坊都会新建 .stage 节点，监听器随节点销毁 */
window.Interactions = (function () {

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);

  function addEntryGuide(stage, ws) {
    stage.appendChild(el('div', 'stage-entry whisper', ws.entry));
    stage.appendChild(el('div', 'stage-guide', ws.guide));
  }

  /* ① 老茶馆：长按倾听（可分次累计，无失败） */
  function listen(stage, ws, done) {
    addEntryGuide(stage, ws);
    const lines = el('div', 'mono-lines');
    ws.monologue.forEach(t => lines.appendChild(el('p', '', t)));
    stage.appendChild(lines);
    const ps = lines.querySelectorAll('p');
    let held = 0, holding = false, timer = null, beat = null, finished = false, last = 0;
    const PER = 900; // 每行 0.9s

    function tick() {
      const now = Date.now();
      held += now - last; last = now;
      const idx = Math.min(ps.length - 1, Math.floor(held / PER));
      for (let i = 0; i <= idx; i++) ps[i].classList.add('show');
      if (held >= PER * ps.length && !finished) {
        finished = true; stop(); setTimeout(done, 700);
      }
    }
    function stop() { clearInterval(timer); clearInterval(beat); holding = false; }
    stage.addEventListener('pointerdown', ev => {
      if (finished || holding) return;
      holding = true;
      stage.querySelector('.stage-entry').style.opacity = '0';
      const r = el('div', 'ripple');
      const rect = stage.getBoundingClientRect();
      r.style.cssText = `left:${ev.clientX - rect.left - 40}px;top:${ev.clientY - rect.top - 40}px;width:80px;height:80px;`;
      stage.appendChild(r);
      last = Date.now();
      timer = setInterval(tick, 100);
      beat = setInterval(() => Sfx.heartbeat(), 950);
      Sfx.heartbeat();
      const up = () => { stop(); r.remove(); };
      stage.addEventListener('pointerup', up, { once: true });
      stage.addEventListener('pointercancel', up, { once: true });
    });
  }

  /* ② 名师木作堂：拖动取景框找师傅（8 秒后目标微光提示） */
  function frame(stage, ws, done) {
    addEntryGuide(stage, ws);
    const scene = el('div', 'vf-scene');
    [['🪑', 15, 62], ['🧰', 70, 20], ['🪚', 22, 24], ['🏺', 68, 66]].forEach(([e, x, y]) => {
      const d = el('div', 'vf-target', e);
      d.style.cssText = `left:${x}%;top:${y}%;opacity:.5;`;
      scene.appendChild(d);
    });
    const target = el('div', 'vf-target', '🧓');
    const tx = rnd(30, 60), ty = rnd(35, 55);
    target.style.cssText = `left:${tx}%;top:${ty}%;`;
    scene.appendChild(target);
    stage.appendChild(scene);

    const vf = el('div', 'viewfinder');
    vf.style.cssText = 'left:12%;top:60%;';
    stage.appendChild(vf);

    let found = false;
    const hintTimer = setTimeout(() => { if (!found) target.style.filter = 'drop-shadow(0 0 12px var(--lantern))'; }, 8000);

    vf.addEventListener('pointerdown', ev => {
      if (found) return;
      try { vf.setPointerCapture(ev.pointerId); } catch (e) {}
      const sr = stage.getBoundingClientRect();
      const move = e2 => {
        const x = e2.clientX - sr.left - 55, y = e2.clientY - sr.top - 55;
        vf.style.left = Math.max(0, Math.min(sr.width - 110, x)) + 'px';
        vf.style.top = Math.max(0, Math.min(sr.height - 110, y)) + 'px';
        const vr = vf.getBoundingClientRect(), tr = target.getBoundingClientRect();
        const dx = (vr.left + vr.width / 2) - (tr.left + tr.width / 2);
        const dy = (vr.top + vr.height / 2) - (tr.top + tr.height / 2);
        if (!found && Math.hypot(dx, dy) < 42) {
          found = true; clearTimeout(hintTimer);
          try { vf.releasePointerCapture(e2.pointerId); } catch (e) {}
          const tc = target.getBoundingClientRect();
          vf.style.left = (tc.left - sr.left + tc.width / 2 - 55) + 'px';
          vf.style.top = (tc.top - sr.top + tc.height / 2 - 55) + 'px';
          Sfx.carve(); Sfx.paper(); Sfx.chime();
          const flash = el('div');
          flash.style.cssText = 'position:absolute;inset:0;background:#fff;opacity:.85;z-index:5;transition:opacity .6s;';
          stage.appendChild(flash);
          setTimeout(() => { flash.style.opacity = '0'; }, 30);
          setTimeout(() => {
            flash.remove(); vf.remove();
            const pol = el('div', 'polaroid', `<div class="ph">🧓🪵</div><div class="cap">${ws.found}<br><span style="color:#9a8b7a">${ws.bio}</span></div>`);
            pol.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-3deg);z-index:6;';
            stage.appendChild(pol);
            setTimeout(done, 2200);
          }, 650);
        }
      };
      vf.addEventListener('pointermove', move);
      vf.addEventListener('pointerup', () => vf.removeEventListener('pointermove', move), { once: true });
    });
  }

  /* ③ 陶泥小教室：滑动拉坯 + 选釉色 */
  function pottery(stage, ws, done) {
    addEntryGuide(stage, ws);
    stage.appendChild(el('div', 'clay-wheel'));
    const clay = el('div', 'clay');
    stage.appendChild(clay);
    let shape = 0, startY = null, doneShape = false;

    stage.addEventListener('pointerdown', e => { startY = e.clientY; });
    stage.addEventListener('pointermove', e => {
      if (startY == null || doneShape) return;
      if (startY - e.clientY > 60) {
        startY = e.clientY;
        shape = Math.min(2, shape + 1);
        clay.className = 'clay' + (shape ? ' s' + shape : '');
        Sfx.hum();
        if (shape === 2) {
          doneShape = true;
          stage.querySelector('.stage-guide').textContent = ws.shaped + ' 挑个釉色吧。';
          const chips = el('div', 'glaze-chips');
          ws.glazes.forEach(g => {
            const c = el('button', 'glaze-chip');
            c.style.background = g.color;
            c.setAttribute('aria-label', g.name);
            c.addEventListener('click', () => {
              clay.style.background = g.color;
              Store.state.youth.glaze = g.name; Store.save();
              Sfx.arpeggio();
              chips.remove();
              setTimeout(done, 900);
            });
            chips.appendChild(c);
          });
          stage.appendChild(chips);
        }
      }
    });
    stage.addEventListener('pointerup', () => { startY = null; });
  }

  /* ④ 蓝白设计台：拖纹样进单品 */
  function pattern(stage, ws, done) {
    addEntryGuide(stage, ws);
    const drops = el('div', 'drop-items');
    const shapes = ['', 'case', 'hoodie'];
    ws.items.forEach((name, i) => {
      const d = el('div', 'drop-item', `<div class="drop-shape ${shapes[i]}"></div>${name}`);
      drops.appendChild(d);
    });
    stage.appendChild(drops);
    const sw = el('div', 'drag-swatch');
    sw.style.cssText = 'left:calc(50% - 38px);bottom:14%;top:auto;';
    stage.appendChild(sw);
    let merged = false;

    sw.addEventListener('pointerdown', ev => {
      if (merged) return;
      try { sw.setPointerCapture(ev.pointerId); } catch (e) {}
      const sr = stage.getBoundingClientRect();
      const move = e2 => {
        sw.style.bottom = 'auto';
        sw.style.left = (e2.clientX - sr.left - 38) + 'px';
        sw.style.top = (e2.clientY - sr.top - 38) + 'px';
      };
      const up = e2 => {
        sw.removeEventListener('pointermove', move);
        const items = [...drops.children];
        const swr = sw.getBoundingClientRect();
        const hit = items.find(it => {
          const r = it.getBoundingClientRect();
          return swr.left < r.right && swr.right > r.left && swr.top < r.bottom && swr.bottom > r.top;
        });
        if (hit && !merged) {
          merged = true;
          hit.classList.add('merged');
          sw.style.opacity = '0'; sw.style.transition = 'opacity .4s';
          stage.querySelector('.stage-guide').textContent = ws.merged;
          Sfx.drip(); Sfx.arpeggio();
          setTimeout(done, 1500);
        }
      };
      sw.addEventListener('pointermove', move);
      sw.addEventListener('pointerup', up, { once: true });
    });
  }

  /* ⑤ 村口直播间：连点带货 */
  function live(stage, ws, done) {
    addEntryGuide(stage, ws);
    const wrap = el('div', 'live-stage');
    stage.appendChild(wrap);
    const goods = el('div', 'live-goods', '🧺');
    wrap.appendChild(goods);
    const stockEl = el('div', 'live-stock');
    let stock = -1, finished = false;
    const startBtn = el('button', 'btn primary', '帮老周点「上架」');
    startBtn.style.cssText = 'position:absolute;left:50%;bottom:18%;transform:translateX(-50%);';
    wrap.appendChild(startBtn);

    startBtn.addEventListener('click', () => {
      startBtn.remove();
      stock = 36;
      stockEl.innerHTML = `库存 <b>${stock}</b> 件`;
      wrap.appendChild(stockEl);
      stage.querySelector('.stage-guide').textContent = '猛点屏幕，点赞！';
    });

    wrap.addEventListener('pointerdown', ev => {
      if (stock <= 0 || finished) return;
      const rect = wrap.getBoundingClientRect();
      const pool = ['❤️', '❤️', '👍', ...ws.danmaku];
      const f = el('div', 'fly', pool[Math.floor(Math.random() * pool.length)]);
      f.style.cssText = `left:${ev.clientX - rect.left}px;top:${ev.clientY - rect.top}px;`;
      wrap.appendChild(f);
      setTimeout(() => f.remove(), 1600);
      Sfx.pop();
      stock -= Math.floor(rnd(2, 5));
      if (stock <= 0) {
        finished = true;
        stockEl.innerHTML = '库存 <b>0</b> 件';
        const so = el('div', 'soldout-sign', '3 秒售罄');
        wrap.appendChild(so);
        stage.querySelector('.stage-guide').textContent = ws.soldout;
        Sfx.arpeggio();
        setTimeout(done, 1800);
      } else {
        stockEl.innerHTML = `库存 <b>${stock}</b> 件`;
      }
    });
  }

  /* ⑥ 联名设计室：双向吸合 */
  function collab(stage, ws, done) {
    addEntryGuide(stage, ws);
    const L = el('div', 'half l', '绣云纹<br>☁️'), R = el('div', 'half r', '潮牌字母<br>ZN');
    stage.appendChild(L); stage.appendChild(R);
    let merged = false;

    function dragHalf(h, isLeft) {
      h.addEventListener('pointerdown', ev => {
        if (merged) return;
        try { h.setPointerCapture(ev.pointerId); } catch (e) {}
        const x0 = ev.clientX;
        const move = e2 => {
          if (merged) return;
          const dx = e2.clientX - x0;
          h.style.transform = `translateX(${dx}px)`;
          const sw = stage.getBoundingClientRect().width;
          if ((isLeft && dx > sw * 0.22) || (!isLeft && dx < -sw * 0.22)) {
            merged = true;
            L.style.transition = R.style.transition = 'all .35s';
            L.style.transform = ''; R.style.transform = '';
            L.style.left = 'calc(50% - 96px)'; R.style.right = 'calc(50% - 96px)';
            Sfx.tickStitch();
            setTimeout(() => {
              stage.appendChild(el('div', 'seal', ws.sealText));
              stage.querySelector('.stage-guide').textContent = ws.merged;
              Sfx.stamp();
              setTimeout(done, 1700);
            }, 420);
          }
        };
        h.addEventListener('pointermove', move);
        h.addEventListener('pointerup', () => {
          h.removeEventListener('pointermove', move);
          if (!merged) h.style.transform = '';
        }, { once: true });
      });
    }
    dragHalf(L, true); dragHalf(R, false);
  }

  /* ⑦ 城里的展厅：canvas 擦雾 */
  function wipe(stage, ws, done) {
    addEntryGuide(stage, ws);
    const under = el('div', 'wipe-under', `<div class="poster-mini">${ws.revealText.replace('\n', '<br>')}</div>`);
    stage.appendChild(under);
    const cv = el('canvas', 'wipe-canvas');
    stage.appendChild(cv);
    let finished = false, wiped = 0;

    setTimeout(() => {
      const r = stage.getBoundingClientRect();
      cv.width = r.width; cv.height = r.height;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#9aa3ad';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      for (let i = 0; i < 40; i++) ctx.fillRect(rnd(0, cv.width), rnd(0, cv.height), rnd(4, 30), 2);
      ctx.globalCompositeOperation = 'destination-out';

      let last = null, lastBrush = 0;
      const xy = e => { const cr = cv.getBoundingClientRect(); return [e.clientX - cr.left, e.clientY - cr.top]; };
      cv.addEventListener('pointerdown', e => { last = xy(e); });
      cv.addEventListener('pointermove', e => {
        if (!last || finished) return;
        const [lx, ly] = last;
        const [nx, ny] = xy(e);
        const d = Math.hypot(nx - lx, ny - ly);
        wiped += d;
        if (Date.now() - lastBrush > 160) { Sfx.brush(); lastBrush = Date.now(); }
        ctx.lineWidth = 56; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(nx, ny); ctx.stroke();
        last = [nx, ny];
        if (wiped > 2400) {
          finished = true;
          cv.style.transition = 'opacity 1.2s'; cv.style.opacity = '0';
          Sfx.chime();
          setTimeout(done, 1800);
        }
      });
      cv.addEventListener('pointerup', () => { last = null; });
    });
  }

  /* ⑧ 村口驿站：一笔画路线 */
  function route(stage, ws, done) {
    addEntryGuide(stage, ws);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'route-svg');
    stage.appendChild(svg);
    const spots = [[22, 30], [68, 26], [74, 62], [30, 68]];
    const marks = [];
    setTimeout(() => {
      const r = stage.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
      spots.forEach(([px, py], i) => {
        const g = document.createElementNS(NS, 'g');
        const x = px / 100 * r.width, y = py / 100 * r.height;
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 13);
        c.setAttribute('fill', 'none'); c.setAttribute('stroke', 'var(--lantern)'); c.setAttribute('stroke-width', 2);
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', x); t.setAttribute('y', y + 30);
        t.setAttribute('class', 'route-spot-label');
        t.textContent = ws.spots[i];
        g.appendChild(c); g.appendChild(t); svg.appendChild(g);
        marks.push({ x, y, hit: false, c });
      });
      const line = document.createElementNS(NS, 'polyline');
      line.setAttribute('fill', 'none'); line.setAttribute('stroke', 'var(--vermilion)');
      line.setAttribute('stroke-width', 3); line.setAttribute('stroke-dasharray', '6 6');
      svg.appendChild(line);
      let pts = [], drawing = false;
      const pos = e => { const sr = svg.getBoundingClientRect(); return [e.clientX - sr.left, e.clientY - sr.top]; };
      svg.addEventListener('pointerdown', e => { drawing = true; pts.push(pos(e)); });
      svg.addEventListener('pointermove', e => {
        if (!drawing) return;
        const [x, y] = pos(e);
        const lp = pts[pts.length - 1];
        if (Math.hypot(x - lp[0], y - lp[1]) < 10) return;
        pts.push([x, y]);
        line.setAttribute('points', pts.map(p => p.join(',')).join(' '));
        marks.forEach(m => {
          if (!m.hit && Math.hypot(x - m.x, y - m.y) < 26) {
            m.hit = true;
            m.c.setAttribute('fill', 'var(--lantern)');
            const st = document.createElementNS(NS, 'text');
            st.setAttribute('x', m.x); st.setAttribute('y', m.y + 5);
            st.setAttribute('text-anchor', 'middle'); st.setAttribute('class', 'route-stamped');
            st.textContent = '📮';
            svg.appendChild(st);
            Sfx.stamp();
            if (marks.every(k => k.hit)) {
              stage.querySelector('.stage-guide').textContent = ws.done;
              Sfx.arpeggio();
              setTimeout(done, 1600);
            }
          }
        });
      });
      svg.addEventListener('pointerup', () => { drawing = false; });
    });
  }

  /* ⑨ 声浪塔：上滑助力 */
  function shout(stage, ws, done) {
    addEntryGuide(stage, ws);
    const wrap = el('div', 'shout-stage');
    wrap.appendChild(el('div', 'shout-horn', '📢'));
    stage.appendChild(wrap);
    let y0 = null, count = 0, finished = false;
    wrap.addEventListener('pointerdown', e => { y0 = e.clientY; });
    wrap.addEventListener('pointerup', e => {
      if (y0 == null || finished) return;
      if (y0 - e.clientY > 50) {
        const b = el('div', 'topic-bubble', ws.topics[count % ws.topics.length]);
        b.style.cssText = `left:${rnd(8, 64)}%;top:${rnd(8, 52)}%;`;
        wrap.appendChild(b);
        Sfx.woosh();
        count++;
        if (count >= 5) {
          finished = true;
          stage.querySelector('.stage-guide').textContent = ws.done;
          Sfx.arpeggio();
          setTimeout(done, 1700);
        }
      }
      y0 = null;
    });
  }

  /* ⑩ 远航码头：推纸船过世界地图 */
  function boat(stage, ws, done) {
    addEntryGuide(stage, ws);
    stage.appendChild(el('div', 'boat-river'));
    const b = el('div', 'boat', '⛵');
    stage.appendChild(b);
    const portsPos = [[38, 38], [58, 30], [76, 44]];
    const stamps = ws.ports.map((p, i) => {
      const s = el('div', 'port-stamp', p);
      s.style.cssText = `left:${portsPos[i][0]}%;top:${portsPos[i][1]}%;`;
      stage.appendChild(s);
      return s;
    });
    let sailed = false;

    b.addEventListener('pointerdown', ev => {
      if (sailed) return;
      try { b.setPointerCapture(ev.pointerId); } catch (e) {}
      const x0 = ev.clientX;
      const move = e2 => {
        const dx = Math.max(0, e2.clientX - x0);
        b.style.transform = `translateX(${dx}px)`;
        if (dx > 60 && !sailed) {
          sailed = true;
          b.removeEventListener('pointermove', move);
          const w = stage.getBoundingClientRect().width;
          const supportsPath = CSS.supports && CSS.supports('offset-path', 'path("M0,0 L10,10")');
          if (supportsPath) {
            b.style.offsetPath = `path("M 0,0 C ${w * 0.3},-40 ${w * 0.5},20 ${w * 0.78},-16")`;
            b.style.offsetRotate = '0deg';
            b.style.transform = '';
            b.classList.add('sail');
          } else {
            b.style.transition = 'transform 3.2s ease-in-out';
            b.style.transform = `translateX(${w * 0.72}px) translateY(-20px)`;
          }
          Sfx.water(); setTimeout(() => Sfx.horn(), 600);
          stamps.forEach((s, i) => setTimeout(() => { s.classList.add('show'); Sfx.stamp(); }, 900 + i * 800));
          setTimeout(() => {
            stage.querySelector('.stage-guide').textContent = ws.done;
            Sfx.arpeggio();
            setTimeout(done, 1500);
          }, 3400);
        }
      };
      b.addEventListener('pointermove', move);
      b.addEventListener('pointerup', () => { b.removeEventListener('pointermove', move); if (!sailed) b.style.transform = ''; }, { once: true });
    });
  }

  return { listen, frame, pottery, pattern, live, collab, wipe, route, shout, boat };
})();
