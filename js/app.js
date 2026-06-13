/* 《匠心老街》主程序：场景状态机 + 对话引擎 + 回信投递 */
(function () {
  const S = Store.state;
  const sceneRoot = document.getElementById('scene');
  const $ = s => document.querySelector(s);

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  let toastTimer = null;
  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2400);
  }

  /* ── 打字机 ── */
  function type(elm, text, speed) {
    return new Promise(res => {
      let i = 0, done = false;
      const finish = () => { if (done) return; done = true; elm.textContent = text; res(); };
      elm.addEventListener('pointerdown', finish, { once: true });
      const t = setInterval(() => {
        elm.textContent = text.slice(0, ++i);
        if (i >= text.length) { clearInterval(t); finish(); }
      }, speed || 55);
    });
  }

  /* ── 对话引擎 ── */
  async function runDialog(view, steps, opts) {
    const wrap = el('div', 'dialog-wrap scene-pad');
    view.appendChild(wrap);
    const ctrl = el('div', 'controls scene-pad');
    view.appendChild(ctrl);
    const avatar = (opts && opts.avatar) || '👵';

    async function npcSay(text, sub) {
      const row = el('div', 'npc-row');
      row.appendChild(el('div', 'npc-avatar', avatar));
      const b = el('div', 'bubble');
      row.appendChild(b);
      wrap.appendChild(row);
      wrap.scrollTop = wrap.scrollHeight;
      Sfx.paper();
      await type(b, text);
      if (sub) b.appendChild(el('span', 'sub', sub));
      wrap.scrollTop = wrap.scrollHeight;
    }
    function meSay(text) {
      wrap.appendChild(el('div', 'bubble me', text));
      wrap.scrollTop = wrap.scrollHeight;
    }

    for (const st of steps) {
      await npcSay(st.text, st.sub);
      if (st.type === 'pause') { await sleep(st.ms || 800); continue; }

      const answer = await new Promise(res => {
        ctrl.innerHTML = '';
        if (st.type === 'input') {
          const inp = el('input', 'text-input');
          inp.placeholder = st.ph || '';
          inp.maxLength = st.max || 16;
          const row = el('div', 'btn-row');
          const ok = el('button', 'btn primary', '就这么叫');
          ok.textContent = st.okText || '好';
          ok.addEventListener('click', () => {
            const v = inp.value.trim();
            if (!v && !st.optional) { inp.focus(); toast(st.needText || '写一个吧，随便写。'); return; }
            res(v || null);
          });
          row.appendChild(ok);
          if (st.optional) {
            const skip = el('button', 'btn ghost', st.skipText || '先跳过');
            skip.addEventListener('click', () => res(null));
            row.appendChild(skip);
          }
          ctrl.appendChild(inp); ctrl.appendChild(row);
          inp.focus();
        } else if (st.type === 'chips') {
          const chips = el('div', 'chips');
          st.options.forEach(o => {
            const c = el('button', 'chip', o);
            c.addEventListener('click', () => { Sfx.knock(); res(o); });
            chips.appendChild(c);
          });
          if (st.extraInput) {
            const inp = el('input', 'text-input');
            inp.placeholder = st.extraInput;
            inp.addEventListener('keydown', e => { if (e.key === 'Enter' && inp.value.trim()) res(inp.value.trim()); });
            const ok = el('button', 'btn ghost', '就写这个');
            ok.addEventListener('click', () => { if (inp.value.trim()) res(inp.value.trim()); });
            ctrl.appendChild(chips); ctrl.appendChild(inp); ctrl.appendChild(ok);
          } else ctrl.appendChild(chips);
        }
      });

      ctrl.innerHTML = '';
      if (answer != null) meSay(answer);
      if (st.onAnswer) st.onAnswer(answer);
      const reaction = st.react ? st.react(answer) : null;
      if (reaction) { await sleep(350); await npcSay(reaction); }
      await sleep(420);
    }
    ctrl.remove();
    return wrap;
  }

  /* ── 场景切换 ── */
  const Scenes = {};
  window.__go = (n, p) => go(n, p); // 演示/调试钩子：控制台跳转任意场景
  function go(name, param) {
    S.scene = name; Store.save();
    sceneRoot.innerHTML = '';
    const view = el('section', 'scene-view');
    view.dataset.scene = name;
    sceneRoot.appendChild(view);
    Scenes[name](view, param);
    updateTopbar();
  }

  function updateTopbar() {
    const isYouthStreet = S.role === 'youth' && S.youth.nickname;
    const chip = $('#lantern-count');
    chip.hidden = !isYouthStreet;
    if (isYouthStreet) chip.querySelector('span').textContent = S.youth.stamps.length;
    $('#btn-bag').hidden = !isYouthStreet;
    const pc = $('#points-chip');
    if (pc) { pc.hidden = !isYouthStreet; pc.querySelector('span').textContent = S.points; }
    const cc = $('#coins-chip');
    if (cc) { cc.hidden = !isYouthStreet; cc.querySelector('span').textContent = S.coins; }
  }

  /* ── S0 开屏 ── */
  Scenes.boot = view => {
    const sky = el('div', 'boot-sky scene-pad');
    // AI 成稿：点灯夜景作开屏底图（加载失败则退回 CSS 手绘）
    const art = el('div', 'boot-art');
    const im = new Image();
    im.src = 'art/keyart-night.jpg';
    im.onerror = () => art.remove();
    im.onload = () => ['.silhouette', '.boot-lanterns', '.boot-cat'].forEach(s => { const n = sky.querySelector(s); if (n) n.remove(); });
    art.appendChild(im);
    sky.appendChild(art);
    const w = el('div', 'whisper');
    DATA.boot.forEach((t, i) => {
      const p = el('p', '', t);
      p.style.animationDelay = (i * 1.1) + 's';
      w.appendChild(p);
    });
    const hint = el('p', 'hint', DATA.bootHint);
    hint.style.cssText = `opacity:0;animation:line-in 1s ${DATA.boot.length * 1.1 + .4}s forwards;margin-top:22px;`;
    w.appendChild(hint);
    sky.appendChild(w);
    const lan = el('div', 'boot-lanterns');
    for (let i = 0; i < 10; i++) lan.appendChild(el('div', 'mini-lantern' + (S.youth.stamps.includes(i + 1) ? ' lit' : '')));
    sky.appendChild(lan);
    sky.appendChild(el('div', 'boot-cat', '🐈'));
    sky.appendChild(el('div', 'silhouette'));
    view.appendChild(sky);
    view.addEventListener('pointerdown', () => { Sfx.chime(); go('role'); }, { once: true });
  };

  /* ── S1 角色选择 ── */
  Scenes.role = view => {
    const pad = el('div', 'scene-pad');
    pad.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:center;gap:18px;';
    pad.appendChild(el('p', 'whisper', `<p>${DATA.role.narrator}</p>`));
    const cards = el('div', 'role-cards');
    [['youth', DATA.role.youth], ['craftsman', DATA.role.craftsman]].forEach(([role, d]) => {
      const c = el('button', 'role-card', `<span class="emoji">${d.emoji}</span><div><b>${d.name}</b><span>${d.desc}</span></div>`);
      c.addEventListener('click', () => {
        S.role = role; Store.save();
        document.body.dataset.role = role;
        Sfx.chime();
        go(role === 'youth' ? 'heroPick' : 'craftReg');
      });
      cards.appendChild(c);
    });
    pad.appendChild(cards);
    view.appendChild(pad);
  };

  /* ── S1.5 选主角：沈砚 / 林知夏（故事圣经 第二节）── */
  Scenes.heroPick = view => {
    const HP = DATA.heroPick;
    const pad = el('div', 'scene-pad');
    pad.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:center;gap:14px;overflow-y:auto;padding-top:16px;padding-bottom:16px;';
    pad.appendChild(el('p', 'whisper', `<p>${HP.narrator}</p>`));
    pad.appendChild(el('p', 'hint', HP.hint));
    const row = el('div', 'hero-pick');
    ['m', 'f'].forEach(k => {
      const h = DATA.heroes[k];
      const c = el('button', 'hero-card');
      c.innerHTML = `<div class="hp-img"><img src="${h.sprite}" alt="${h.name}"></div>
        <b>${h.name}</b><span class="tag">${h.tag}</span><span class="bio">${h.bio}</span>`;
      c.addEventListener('click', () => {
        S.youth.hero = k;
        if (!S.youth.bagItems.length) S.youth.bagItems = h.bag.slice();
        Store.save();
        Sfx.chime();
        go('youthReg');
      });
      row.appendChild(c);
    });
    pad.appendChild(row);
    view.appendChild(pad);
  };

  /* ── S2 青年登记：称呼 + 行囊 ── */
  Scenes.youthReg = async view => {
    const R = DATA.youthReg;
    const hero = DATA.heroes[S.youth.hero] || DATA.heroes.m;
    await runDialog(view, [
      { text: R.hello, type: 'pause', ms: 600 },
      {
        text: R.askName, type: 'input', ph: hero.namePh, max: 8,
        optional: true, skipText: '就叫' + hero.name,
        onAnswer: v => { S.youth.nickname = v || hero.name; Store.save(); },
        react: v => `${v || hero.name}，好名字。`
      },
      { text: R.bagGuide, type: 'pause', ms: 400 }
    ]);

    const grid = el('div', 'bag-grid scene-pad');
    const picked = new Set(S.youth.bagItems);
    DATA.bagItems.forEach(it => {
      const b = el('button', 'bag-item' + (picked.has(it.id) ? ' on' : ''),
        `<span class="emoji">${it.emoji}</span><b>${it.name}</b><span>${it.skill}</span>`);
      b.addEventListener('click', () => {
        if (picked.has(it.id)) { picked.delete(it.id); b.classList.remove('on'); }
        else if (picked.size < 3) { picked.add(it.id); b.classList.add('on'); Sfx.knock(); }
        else toast('行囊小，装三样就够了。');
        okBtn.disabled = picked.size !== 3;
        okBtn.textContent = picked.size === 3 ? '收拾好了，进村' : `再挑 ${3 - picked.size} 样`;
      });
      grid.appendChild(b);
    });
    const okRow = el('div', 'btn-row scene-pad');
    okRow.style.paddingBottom = '20px';
    const okBtn = el('button', 'btn primary', picked.size === 3 ? '收拾好了，进村' : '再挑 3 样');
    okBtn.disabled = picked.size !== 3;
    okBtn.addEventListener('click', async () => {
      S.youth.bagItems = [...picked]; Store.save();
      grid.style.opacity = '.4'; okRow.remove();
      Sfx.arpeggio();
      toast(DATA.youthReg.bagDone, 2600);
      await sleep(1700);
      go('village');
    });
    okRow.appendChild(okBtn);
    view.appendChild(grid); view.appendChild(okRow);
  };

  /* ── S3 老街 ── */
  Scenes.street = view => {
    const scroll = el('div', 'street-scroll');
    view.appendChild(scroll);
    const stamps = S.youth.stamps;

    // 行囊推荐气泡
    const recItem = DATA.bagItems.find(b => S.youth.bagItems.includes(b.id) && !stamps.includes(b.rec));
    if (recItem && S.role === 'youth' && stamps.length < 8) {
      scroll.appendChild(el('div', 'rec-bubble', `👵 ${recItem.recText}`));
    }

    // 真实时钟：当下时段的一句话氛围
    const dp = DATA.dayparts[Store.daypart()];
    scroll.appendChild(el('div', 'daypart-line', `${dp.label} · ${dp.line}`));

    // 驿站（O2O 入口）与村民图鉴
    const nav = el('div', 'btn-row');
    nav.style.marginBottom = '8px';
    const vBtn = el('button', 'btn primary', DATA.village.backDoor);
    vBtn.addEventListener('click', () => go('village'));
    nav.appendChild(vBtn);
    const stBtn = el('button', 'btn', DATA.station.door);
    stBtn.addEventListener('click', () => go('station'));
    const dxBtn = el('button', 'btn ghost', DATA.dex.door);
    dxBtn.addEventListener('click', () => go('dex'));
    nav.appendChild(stBtn); nav.appendChild(dxBtn);
    scroll.appendChild(nav);

    // 信箱
    const unread = Store.unreadLetters();
    if (S.letters.delivered.length) {
      const spot = el('div', 'street-spot');
      const b = el('button', 'btn', `📮 信箱${unread.length ? `（${unread.length} 封新信）` : ''}`);
      b.addEventListener('click', () => go('mailbox'));
      spot.appendChild(b);
      scroll.appendChild(spot);
    }

    const path = el('div', 'street-path');
    scroll.appendChild(path);

    // 主灯笼（点亮≥3盏后出现在街口）
    if (stamps.length >= 3 && !S.youth.ceremonyDone) {
      const cta = el('button', 'main-lantern-cta', `<div class="big">🏮</div><div class="hint">${DATA.ceremony.ready}</div>`);
      cta.addEventListener('click', () => go('ceremony'));
      path.appendChild(cta);
    }
    if (S.youth.ceremonyDone) {
      const cta = el('button', 'main-lantern-cta', `<div class="big">🏮</div><div class="hint">看看我的新村民证</div>`);
      cta.addEventListener('click', () => go('posterY'));
      path.appendChild(cta);
    }

    DATA.workshops.forEach((ws, i) => {
      const lit = stamps.includes(ws.id);
      let hline = lit ? '灯亮着。随时回来看看。' : ws.doorLine, ready = '';
      if (lit && Store.slowState(ws.id).status === 'ready') {
        hline = DATA.slowUi.streetHint.replace('{verb}', DATA.slowwork[ws.id].verb);
        ready = ' ready';
      }
      const h = el('button', 'house' + (lit ? ' lit' : ''),
        `<div class="roof"></div>
         <div class="facade">
           <div class="lantern"></div>
           <div>
             <div class="h-name">${ws.emoji} ${ws.name}</div>
             <div class="h-line${ready}">${hline}</div>
           </div>
           ${lit ? `<div class="h-stamp${S.youth.goldStamps.includes(ws.id) ? ' gold' : ''}">${ws.stamp.slice(0, 2)}</div>` : ''}
         </div>`);
      h.addEventListener('click', () => { Sfx.knock(); go('workshop', ws.id); });
      path.appendChild(h);

      // 疗愈角落插在第 5 间后
      if (i === 4) {
        const spot = el('div', 'street-spot');
        const b = el('button', 'btn ghost', '🌳 村口的秋千，空着');
        b.addEventListener('click', () => go('corner'));
        spot.appendChild(b);
        path.appendChild(spot);
      }
    });

    const foot = el('div', 'small');
    foot.style.cssText = 'text-align:center;padding:6px 0 14px;';
    foot.textContent = `全村已点亮 ${Store.globalLights().toLocaleString()} 盏灯`;
    scroll.appendChild(foot);

    // 首次到街上：轻轻提示一次"村里有声音"
    if (S.settings.sound === null && !S.settings.soundAsked) {
      S.settings.soundAsked = true; Store.save();
      setTimeout(() => toast(DATA.misc.soundAsk + '（点右上角 🔇）', 3600), 2200);
    }

    // 散落式提问（回街时各触发一次）
    maybeAsk();
  };

  async function maybeAsk() {
    const y = S.youth;
    if (S.role !== 'youth') return;
    await sleep(900);
    if (y.stamps.length >= 1 && !y.cityAsked) {
      y.cityAsked = true; Store.save();
      askSheet('👵', DATA.askCity.q, { input: DATA.askCity.ph, skip: DATA.askCity.skip }, v => {
        if (v) {
          y.city = v; Store.save();
          const hit = Object.keys(DATA.askCity.react).find(k => v.includes(k));
          return hit ? DATA.askCity.react[hit] : DATA.askCity.reactDefault.replace('{city}', v);
        }
        return DATA.askCity.reactSkip;
      });
    } else if (y.stamps.length >= 2 && !y.wishAsked) {
      y.wishAsked = true; Store.save();
      askSheet('🐈', DATA.askWish.narrator, { chips: DATA.askWish.options }, v => {
        if (v) { y.wish = v; Store.save(); }
        return DATA.askWish.react;
      });
    }
  }

  /* 底部轻提问（散落问答用） */
  function askSheet(avatar, question, kind, onDone) {
    const ov = $('#overlay');
    ov.hidden = false; ov.innerHTML = '';
    const sheet = el('div', 'sheet');
    const row = el('div', 'npc-row');
    row.appendChild(el('div', 'npc-avatar', avatar));
    row.appendChild(el('div', 'bubble', question));
    sheet.appendChild(row);
    const ctrl = el('div', 'controls');
    sheet.appendChild(ctrl);
    ov.appendChild(sheet);

    function close(answer) {
      const re = onDone(answer);
      ov.hidden = true; ov.innerHTML = '';
      if (re) toast(re, 3000);
    }
    if (kind.chips) {
      const chips = el('div', 'chips');
      kind.chips.forEach(o => {
        const c = el('button', 'chip', o);
        c.addEventListener('click', () => { Sfx.knock(); close(o); });
        chips.appendChild(c);
      });
      ctrl.appendChild(chips);
      const skip = el('button', 'btn ghost', '不说也行');
      skip.addEventListener('click', () => close(null));
      ctrl.appendChild(skip);
    } else {
      const inp = el('input', 'text-input');
      inp.placeholder = kind.input;
      const rowB = el('div', 'btn-row');
      const ok = el('button', 'btn primary', '说了');
      ok.addEventListener('click', () => close(inp.value.trim() || null));
      const skip = el('button', 'btn ghost', kind.skip);
      skip.addEventListener('click', () => close(null));
      rowB.appendChild(ok); rowB.appendChild(skip);
      ctrl.appendChild(inp); ctrl.appendChild(rowB);
    }
  }

  /* ── 章节卡：半屏卷轴仪式 ── */
  function showChapterCard(cc) {
    const card = el('div', 'chapter-card');
    card.innerHTML = `<div class="cc-inner"><div class="cc-name">${cc.name}</div><div class="cc-sub">${cc.sub}</div><div class="cc-tap">${DATA.chapterTap}</div></div>`;
    card.addEventListener('pointerdown', () => { card.classList.add('out'); setTimeout(() => card.remove(), 450); });
    document.getElementById('app').appendChild(card);
    Sfx.chime();
  }

  /* ── 送礼（星露谷式，但礼物会讲故事）── */
  function giftSheet(ws) {
    const ov = $('#overlay');
    ov.hidden = false; ov.innerHTML = '';
    const sheet = el('div', 'sheet');
    sheet.appendChild(el('p', 'hint', DATA.relUi.giftPick + ' · 送给 ' + ws.npc.split(' · ').pop()));
    if (!S.products.length) {
      sheet.appendChild(el('p', 'small', DATA.relUi.giftEmpty));
    } else {
      const pl = el('div', 'product-list');
      S.products.forEach((p, idx) => {
        const srcWs = DATA.workshops.find(w => w.id === p.wsId);
        const row = el('button', 'product-item');
        row.style.cssText = 'width:100%;text-align:left;cursor:pointer;font-family:inherit;color:var(--ink);';
        row.innerHTML = `<span class="e">${p.emoji}</span>${p.name}<span class="from">${srcWs.name}</span>`;
        row.addEventListener('click', () => {
          ov.hidden = true; ov.innerHTML = '';
          let line;
          if (p.wsId === ws.id) {
            line = DATA.giftOwn.replace('{npc}', ws.npc.split(' · ').pop());
          } else {
            if (DATA.bonds[ws.id] === p.wsId) line = DATA.bondLines[ws.id + '_' + p.wsId];
            else line = DATA.giftThanks[ws.id];
            S.products.splice(idx, 1);
            S.flags['gift_' + ws.id] = true;
            Store.save();
            gain('gift');
          }
          Sfx.chime();
          askSheet(ws.emoji, line, { chips: ['🙂'] }, () => { go('workshop', ws.id); return null; });
        });
        pl.appendChild(row);
      });
      sheet.appendChild(pl);
    }
    const close = el('button', 'btn ghost', '收起来');
    close.style.width = '100%';
    close.addEventListener('click', () => { ov.hidden = true; ov.innerHTML = ''; });
    sheet.appendChild(close);
    ov.appendChild(sheet);
  }

  /* ── 慢工盒子（策划案 14.2-③）── */
  function buildSlowBox(ws) {
    const def = DATA.slowwork[ws.id];
    const box = el('div', 'slow-box');
    box.appendChild(el('div', 'sw-title', '慢工 · 急不得'));
    function render() {
      [...box.querySelectorAll('.sw-line, .btn')].forEach(n => n.remove());
      const st = Store.slowState(ws.id);
      if (st.status === 'idle') {
        box.appendChild(el('div', 'sw-line', `<span class="e">${def.emoji}</span>${def.verb}`));
        const durMs = def.hours * 3600000 / (DATA.demoSpeed || 1);
        const b = el('button', 'btn primary', DATA.slowUi.start.replace('{t}', Store.fmtDur(durMs)));
        b.addEventListener('click', () => {
          Store.startSlow(ws.id);
          S.slowCount[ws.id] = (S.slowCount[ws.id] || 0) + 1; Store.save();
          gain('slowStart'); Sfx.knock(); render();
        });
        box.appendChild(b);
      } else if (st.status === 'waiting') {
        box.appendChild(el('div', 'sw-line',
          `<span class="e">${def.emoji}</span>${DATA.slowUi.waiting.replace('{verb}', def.verb).replace('{t}', Store.fmtDur(st.remain))}`));
      } else {
        box.appendChild(el('div', 'sw-line', `<span class="e">${def.emoji}</span>${DATA.slowUi.ready}`));
        const b = el('button', 'btn primary', DATA.slowUi.collect);
        b.addEventListener('click', () => {
          const p = Store.collectSlow(ws.id);
          Sfx.arpeggio();
          toast(DATA.slowUi.collected.replace('{name}', p.name) + ' ' + def.done, 4200);
          gain('slowCollect');
          render();
        });
        box.appendChild(b);
      }
    }
    render();

    // ── 修缮（大掌柜式经营环：铜板 → 加速慢工）──
    const lv = S.shopLv[ws.id] || 0;
    if (lv < DATA.coins.repairCosts.length) {
      const cost = DATA.coins.repairCosts[lv];
      const rb = el('button', 'btn ghost', '🔨 ' + DATA.orderUi.repairBtn.replace('{c}', cost) + (lv ? ` ★${lv}` : ''));
      rb.addEventListener('click', () => {
        if (S.coins < cost) { toast(DATA.orderUi.noCoins); Sfx.knock(); return; }
        S.coins -= cost;
        S.shopLv[ws.id] = lv + 1;
        Store.save();
        updateTopbar();
        Sfx.ceremony();
        toast(DATA.orderUi.repaired, 3200);
        go('workshop', ws.id);
      });
      box.appendChild(rb);
    } else {
      box.appendChild(el('p', 'small', DATA.orderUi.repairMax + ' ★★'));
    }
    return box;
  }

  /* ── S4 工坊 ── */
  Scenes.workshop = (view, id) => {
    const ws = DATA.workshops.find(w => w.id === id);
    const lit = S.youth.stamps.includes(id);

    const head = el('div', 'shop-head scene-pad', `<h2>${ws.emoji} ${ws.name}</h2><div class="npc">${ws.npc}</div>`);
    view.appendChild(head);
    // AI 成稿：工坊建筑图
    const sart = el('div', 'shop-art');
    const si = new Image();
    si.src = 'art/shop-' + id + '.jpg';
    si.onerror = () => sart.remove();
    sart.appendChild(si);
    view.appendChild(sart);

    if (lit) { // 重访：复读介绍 + 慢工
      const flow = el('div', 'done-flow scene-pad');
      flow.appendChild(el('div', 'stamp-pop', `<span class="e">${ws.emoji}</span>${ws.stamp}`));
      flow.appendChild(el('div', 'action-card', ws.card.replace(/「(.+?)」/, '「<b>$1</b>」')));
      const kept = S.youth.keepsakes.includes(id);
      flow.appendChild(el('p', 'small', kept ? `${ws.keepsake.emoji} ${ws.keepsake.name}，在你的行囊里。` : '上次你笑着说，心领了。'));

      // 轨迹系：三层心事（交情 = 灯 + 回信 + 送礼）
      const rel = 1 + (S.letters.delivered.includes(id) ? 1 : 0) + (S.flags['gift_' + id] ? 1 : 0);
      const npcName = ws.npc.split(' · ').pop();
      const relBox = el('div', 'action-card rel-box');
      let rh = `<div class="small" style="margin-bottom:6px">${DATA.relUi.cupTitle} ${DATA.relUi.cup.repeat(rel)}</div>`;
      if (rel >= 2) rh += `<p>「${DATA.talks[id][0]}」</p>`;
      if (rel >= 3) rh += `<p style="margin-top:7px;color:var(--vermilion)">「${DATA.talks[id][1]}」</p>`;
      if (rel < 3) rh += `<div class="small" style="margin-top:7px">${DATA.relUi.hint.replace('{npc}', npcName)}</div>`;
      relBox.innerHTML = rh;
      flow.appendChild(relBox);
      const giftBtn = el('button', 'btn ghost', DATA.relUi.giftBtn);
      giftBtn.addEventListener('click', () => giftSheet(ws));
      flow.appendChild(giftBtn);

      flow.appendChild(buildSlowBox(ws));
      const back = el('button', 'btn ghost', DATA.misc.backStreet);
      back.addEventListener('click', () => go('village'));
      const row = el('div', 'btn-row'); row.appendChild(back);
      flow.appendChild(row);
      view.appendChild(flow);
      return;
    }

    const stage = el('div', 'stage');
    // 内景成稿铺底（加载失败自动退回纯色舞台）
    const inside = new Image();
    inside.src = 'art/inside-' + id + '.jpg';
    inside.onload = () => { stage.classList.add('has-art'); stage.style.backgroundImage = `url(${inside.src})`; };
    view.appendChild(stage);

    Interactions[ws.key](stage, ws, async () => {
      // 完成：灯亮 + 盖章 + 介绍卡 + 纪念物
      S.youth.stamps.push(id);
      S.sim.myLights++;
      Store.save();
      updateTopbar();
      Sfx.stamp();
      gain('stamp');

      stage.remove();
      const flow = el('div', 'done-flow scene-pad');
      view.appendChild(flow);
      flow.appendChild(el('div', 'stamp-pop', `<span class="e">${ws.emoji}</span>${ws.stamp}`));
      await sleep(800);
      flow.appendChild(el('div', 'action-card', ws.card.replace(/「(.+?)」/, '「<b>$1</b>」')));
      Sfx.chime();
      await sleep(1100);

      const ksLine = el('div', 'keepsake-line', `<span class="keepsake-emoji">${ws.keepsake.emoji}</span>${ws.keepsake.line}`);
      flow.appendChild(ksLine);
      const row = el('div', 'btn-row');
      const keep = el('button', 'btn primary', DATA.workshopOut.keepBtn);
      const decline = el('button', 'btn ghost', DATA.workshopOut.declineBtn);
      keep.addEventListener('click', () => finish(true));
      decline.addEventListener('click', () => finish(false));
      row.appendChild(keep); row.appendChild(decline);
      flow.appendChild(row);

      async function finish(kept) {
        if (kept) { S.youth.keepsakes.push(id); Store.save(); gain('keepsake'); }
        else { S.flags.declined = true; Store.save(); gain('decline'); }
        row.remove();
        Sfx.chime();
        flow.appendChild(el('p', 'small', kept ? DATA.workshopOut.keepFx : DATA.workshopOut.declineFx));
        await sleep(900);
        // 呼吸位
        sceneRoot.innerHTML = '';
        const breath = el('section', 'scene-view');
        breath.appendChild(el('div', 'swing-wrap', `<p class="hint">${DATA.misc.breathe}</p>`));
        sceneRoot.appendChild(breath);
        await sleep(1500);
        go('village');
      }
    });
  };

  /* ── S5 点灯仪式 ── */
  Scenes.ceremony = view => {
    const wrap = el('div', 'ceremony-wrap scene-pad');
    view.appendChild(wrap);
    const lantern = el('div', 'big-lantern');
    const wick = el('div', 'wick');
    lantern.appendChild(wick);
    const ring = el('div', 'hold-ring');
    lantern.appendChild(ring);
    const hint = el('p', 'hint', DATA.ceremony.holdHint);
    wrap.appendChild(lantern); wrap.appendChild(hint);

    let progress = 0, holding = false, finished = false, last = 0;
    const loopTimer = setInterval(() => {
      if (holding && !finished) {
        const now = Date.now();
        progress = Math.min(1, progress + (now - last) / 3000); // 长按3秒
        last = now;
        wick.style.opacity = progress;
        ring.style.setProperty('--p', progress * 100);
        if (progress >= 1) complete();
      }
    }, 50);

    lantern.addEventListener('pointerdown', () => {
      holding = true; last = Date.now();
      hint.textContent = DATA.ceremony.holding;
      Sfx.heartbeat();
      try { navigator.vibrate && navigator.vibrate(30); } catch (e) {}
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
      lantern.addEventListener(ev, () => { holding = false; if (!finished) hint.textContent = DATA.ceremony.holdHint; }));

    async function complete() {
      finished = true; clearInterval(loopTimer);
      lantern.classList.add('full');
      Sfx.ceremony();
      try { navigator.vibrate && navigator.vibrate([40, 80, 40]); } catch (e) {}
      S.youth.ceremonyDone = true;
      if (!S.youth.visitorNo) { S.sim.myLights++; S.youth.visitorNo = Store.globalLights(); }
      Store.save();
      gain('ceremony');
      document.body.classList.remove('dusk');
      document.body.classList.add('warm');
      await sleep(1200);
      const sky = el('div', 'sky-lantern', `🏮<span class="tag">${S.youth.nickname}</span>`);
      view.appendChild(sky);
      hint.innerHTML = `${DATA.ceremony.skyLantern.replace('{nickname}', S.youth.nickname)}<br><br><b style="color:var(--vermilion)">${DATA.ceremony.counterLine.replace('{n}', S.youth.visitorNo.toLocaleString())}</b>`;
      await sleep(2600);
      const btn = el('button', 'btn primary', '去村口的老树下');
      btn.addEventListener('click', () => go('wishboard'));
      wrap.appendChild(btn);
    }
  };

  /* ── S6 心愿木牌 ── */
  Scenes.wishboard = async view => {
    const WB = DATA.wishboard;
    const pad = el('div', 'scene-pad');
    pad.style.cssText = 'flex:1;overflow-y:auto;padding-bottom:24px;';
    view.appendChild(pad);
    pad.appendChild(el('p', 'whisper', `<p>${WB.narrator}</p>`));

    const tree = el('div', 'tags-tree');
    pad.appendChild(tree);
    function renderTags() {
      tree.innerHTML = '';
      if (!S.youth.keepsakes.length) { tree.appendChild(el('p', 'small', WB.empty)); return; }
      S.youth.keepsakes.forEach(id => {
        const ws = DATA.workshops.find(w => w.id === id);
        const t = el('button', 'wood-tag', `<span class="e">${ws.keepsake.emoji}</span>${ws.name}`);
        t.addEventListener('click', () => {
          S.youth.keepsakes = S.youth.keepsakes.filter(k => k !== id); Store.save();
          toast('木牌取下来了。随时能再挂。');
          renderTags();
        });
        tree.appendChild(t);
      });
    }
    renderTags();

    function chipQ(qObj, field) {
      return new Promise(res => {
        const box = el('div');
        box.appendChild(el('p', 'hint', qObj.q));
        box.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-top:18px;';
        const chips = el('div', 'chips');
        qObj.options.forEach(o => {
          const c = el('button', 'chip', o);
          c.addEventListener('click', () => {
            S.youth[field] = o; Store.save();
            [...chips.children].forEach(x => x.classList.remove('on'));
            c.classList.add('on');
            Sfx.knock();
            res();
          });
          chips.appendChild(c);
        });
        box.appendChild(chips);
        pad.appendChild(box);
      });
    }
    await chipQ(WB.q1, 'depth');
    await chipQ(WB.q2, 'availability');
    pad.appendChild(el('p', 'small', WB.outro));
    const row = el('div', 'btn-row');
    row.style.marginTop = '18px';
    const btn = el('button', 'btn primary', '继续往前走');
    btn.addEventListener('click', () => go('reveal'));
    row.appendChild(btn);
    pad.appendChild(row);
  };

  /* ── S7a 现实揭示 ── */
  Scenes.reveal = view => {
    const paper = el('div', 'letter-paper');
    DATA.reveal.forEach((t, i) => {
      const p = el('p', '', t);
      p.style.animationDelay = (i * 1.0) + 's';
      paper.appendChild(p);
    });
    const note = el('p', 'small', DATA.revealNote);
    note.style.cssText = `opacity:0;animation:line-in 1.2s ${DATA.reveal.length * 1.0 + .4}s forwards;line-height:1.9;margin-top:10px;`;
    paper.appendChild(note);
    // AI 成稿：真实老街的样子
    const ra = new Image();
    ra.className = 'reveal-art';
    ra.src = 'art/keyart-day.jpg';
    ra.style.cssText = `opacity:0;animation:line-in 1.2s ${DATA.reveal.length * 1.0 + .8}s forwards;`;
    ra.onerror = () => ra.remove();
    paper.appendChild(ra);
    const row = el('div', 'btn-row');
    row.style.cssText = `opacity:0;animation:line-in 1s ${DATA.reveal.length * 1.0 + 1.2}s forwards;margin-top:18px;`;
    const btn = el('button', 'btn primary', '领取我的新村民证');
    btn.addEventListener('click', () => go('posterY'));
    row.appendChild(btn);
    paper.appendChild(row);
    view.appendChild(paper);
  };

  /* ── S7b 新村民证 ── */
  Scenes.posterY = view => posterScene(view, 'youth');
  Scenes.posterC = view => posterScene(view, 'craftsman');

  function posterScene(view, role) {
    const wrap = el('div', 'poster-wrap');
    view.appendChild(wrap);
    const img = new Image();
    img.className = 'poster-img';
    img.src = role === 'youth' ? Poster.youth() : Poster.craftsman();
    wrap.appendChild(img);
    wrap.appendChild(el('p', 'small', DATA.misc.posterSaveHint));

    const row = el('div', 'btn-row');
    const copy = el('button', 'btn', '📋 复制邀请暗号');
    copy.addEventListener('click', async () => {
      const c = S.craftsman;
      const text = role === 'youth'
        ? DATA.share.youth.replace('{n}', S.youth.visitorNo.toLocaleString())
        : DATA.share.craftsman.replace('{shop}', c.workshopName).replace('{years}', c.years).replace('{craft}', c.craftType === '其他' ? c.craftCustom || '手艺' : c.craftType);
      try { await navigator.clipboard.writeText(text); toast(DATA.share.copied); }
      catch (e) { toast('长按下面文字复制：'); wrap.appendChild(el('p', 'small', text.replace(/\n/g, '<br>'))); }
    });
    const signup = el('button', 'btn primary', role === 'youth' ? '✍️ 去正式报名' : '✍️ 联系焕青计划');
    signup.addEventListener('click', () => toast('一期为演示版，正式报名渠道上线后在这里跳转。', 3200));
    row.appendChild(copy); row.appendChild(signup);
    wrap.appendChild(row);

    const row2 = el('div', 'btn-row');
    if (role === 'youth') {
      const back = el('button', 'btn ghost', DATA.misc.backStreet);
      back.addEventListener('click', () => go('village'));
      row2.appendChild(back);
    } else {
      const enter = el('button', 'btn', '🏮 去老街走走');
      enter.addEventListener('click', () => go('village'));
      const redo = el('button', 'btn ghost', '重新布置工坊');
      redo.addEventListener('click', () => go('decorate'));
      row2.appendChild(enter); row2.appendChild(redo);
    }
    wrap.appendChild(row2);
  }

  /* ── W2 工匠登记 ── */
  Scenes.craftReg = async view => {
    const R = DATA.craftReg;
    const c = S.craftsman;
    await runDialog(view, [
      { text: R.hello, sub: R.helper, type: 'pause', ms: 900 },
      {
        text: R.askName, type: 'input', ph: R.namePh, max: 10,
        onAnswer: v => { c.name = v; Store.save(); },
        react: v => `${v}，您好。`
      },
      {
        text: R.askCraft, type: 'chips', options: R.crafts,
        onAnswer: v => { c.craftType = v; Store.save(); }
      },
      {
        text: R.askYears, type: 'chips', options: R.yearsOptions,
        onAnswer: v => { c.years = v; Store.save(); },
        react: v => v === '30年以上' ? R.yearsAwe : null
      },
      {
        text: R.askRegion, type: 'input', ph: R.regionPh, optional: true, skipText: R.regionSkip, max: 20,
        onAnswer: v => { if (v) c.region = v; Store.save(); }
      },
      {
        text: R.askIntro, type: 'chips', options: R.introPresets, extraInput: R.introPh,
        onAnswer: v => { if (v) c.intro = v; Store.save(); },
        react: () => '好。年轻人会听见的。'
      }
    ], { avatar: '🏮' });
    if (c.craftType === '其他' && !c.craftCustom) {
      askSheet('🏮', '您的手艺，叫什么呢？', { input: R.craftPh, skip: '先不说' }, v => {
        if (v) { c.craftCustom = v; Store.save(); }
        go('decorate');
        return null;
      });
    } else go('decorate');
  };

  /* ── W3 布置工坊 ── */
  Scenes.decorate = view => {
    const c = S.craftsman;
    view.appendChild(el('div', 'shop-head scene-pad', `<h2>布置工坊</h2><div class="npc">${DATA.decorate.guide}</div>`));
    const room = el('div', 'room');
    view.appendChild(room);
    const shelf = el('div', 'shelf');
    view.appendChild(shelf);
    const footRow = el('div', 'btn-row scene-pad');
    footRow.style.paddingBottom = '16px';
    const nextBtn = el('button', 'btn primary', DATA.decorate.next);
    footRow.appendChild(nextBtn);
    view.appendChild(footRow);

    function render() {
      room.innerHTML = '';
      if (!c.visibility.length) room.appendChild(el('div', 'placeholder', '空荡荡的。从下面挑些家什摆进来。'));
      c.visibility.forEach(id => {
        const f = DATA.furniture.find(x => x.id === id);
        const it = el('button', 'room-item', `${f.emoji} ${f.name}`);
        it.title = '点一下可以收回';
        it.addEventListener('click', () => { c.visibility = c.visibility.filter(v => v !== id); Store.save(); render(); });
        room.appendChild(it);
      });
      room.classList.toggle('cozy', c.visibility.length >= 3);
      if (c.visibility.length === 10) {
        room.appendChild(el('div', 'swallow', '🐦'));
        toast(DATA.decorate.swallow, 3600);
      }
      [...shelf.children].forEach((s, i) => s.classList.toggle('placed', c.visibility.includes(DATA.furniture[i].id)));
      nextBtn.disabled = !c.visibility.length;
      nextBtn.textContent = c.visibility.length ? `${DATA.decorate.next}（开了 ${c.visibility.length} 扇门）` : '先摆一件家什';
    }

    DATA.furniture.forEach(f => {
      const s = el('button', 'shelf-item', `<span class="emoji">${f.emoji}</span><div><b>${f.name}</b><span>${f.line}</span></div>`);
      s.addEventListener('click', () => {
        if (c.visibility.includes(f.id)) c.visibility = c.visibility.filter(v => v !== f.id);
        else { c.visibility.push(f.id); Sfx.knock(); toast(f.line, 2200); }
        Store.save(); render();
      });
      shelf.appendChild(s);
    });
    nextBtn.addEventListener('click', () => { if (c.visibility.length) go('signboard'); });
    render();
  };

  /* ── W4 挂牌开张 ── */
  Scenes.signboard = view => {
    const c = S.craftsman;
    const SB = DATA.signboard;
    if (!c.workshopName) {
      const surname = (c.name || '匠').replace(/(师傅|老师|阿姨|大叔|爷爷|奶奶)$/, '').slice(0, 1);
      const word = SB.nameWords[c.craftType] || SB.nameWords['其他'];
      c.workshopName = `${surname}记·${word}`;
      Store.save();
    }
    const wrap = el('div', 'ceremony-wrap scene-pad');
    view.appendChild(wrap);
    wrap.appendChild(el('p', 'hint', SB.guide));
    const sign = el('div', 'signboard', c.workshopName);
    wrap.appendChild(sign);
    const inp = el('input', 'text-input');
    inp.value = c.workshopName; inp.maxLength = 10;
    inp.style.maxWidth = '260px'; inp.style.textAlign = 'center';
    inp.addEventListener('input', () => { c.workshopName = inp.value.trim() || c.workshopName; sign.textContent = inp.value.trim() || '……'; Store.save(); });
    wrap.appendChild(inp);
    const hint = el('p', 'hint', SB.holdHint);
    wrap.appendChild(hint);

    let progress = 0, holding = false, finished = false, last = 0;
    const loopTimer = setInterval(() => {
      if (holding && !finished) {
        const now = Date.now();
        progress = Math.min(1, progress + (now - last) / 1400); // 长按1.4秒挂牌
        last = now;
        sign.style.transform = `translateY(${-16 + 16 * progress}px) rotate(${-1 + progress}deg)`;
        if (progress >= 1) complete();
      }
    }, 50);
    sign.addEventListener('pointerdown', () => { holding = true; last = Date.now(); Sfx.heartbeat(); });
    ['pointerup', 'pointercancel'].forEach(ev => sign.addEventListener(ev, () => { holding = false; }));

    async function complete() {
      finished = true; clearInterval(loopTimer);
      sign.classList.add('hung');
      inp.remove();
      if (!c.workshopNo) {
        c.workshopNo = 37 + Math.floor(Math.max(0, Date.now() - DATA.launchTs) / 21600000);
        c.opened = true; Store.save();
      }
      document.body.classList.remove('dusk');
      document.body.classList.add('warm');
      Sfx.ceremony();
      // 纸屑
      for (let i = 0; i < 24; i++) {
        const cf = el('div', 'confetti');
        cf.style.cssText = `left:${10 + Math.random() * 80}%;top:30%;background:${['#F2A65A', '#C4554D', '#8AA37B'][i % 3]};animation-delay:${Math.random() * .5}s;`;
        wrap.appendChild(cf);
      }
      hint.innerHTML = `<b style="color:var(--vermilion)">${SB.opened.replace('{n}', c.workshopNo)}</b>`;
      await sleep(2200);
      const btn = el('button', 'btn primary', '领取我的工坊名片');
      btn.addEventListener('click', () => go('posterC'));
      wrap.appendChild(btn);
    }
  };

  /* ══ 任务引擎：四章任务链，状态即进度（无额外存档负担）══ */
  const QUEST_CHECKS = {
    q1: () => S.youth.metGranny,
    q2: () => S.youth.stamps.length >= 1,
    q3: () => S.youth.stamps.length >= 3,
    q4: () => S.youth.ceremonyDone,
    q5: () => Object.keys(S.slowwork).length > 0 || S.products.length > 0,
    q6: () => S.letters.read.length > 0 || S.letters.gold.length > 0,
    q7: () => S.products.length > 0,
    q8: () => S.youth.wishTrips.length > 0,
    q9: () => S.youth.posterMade,
    q10: () => S.youth.goldStamps.length > 0
  };
  function activeQuest() { return DATA.quests.find(q => !QUEST_CHECKS[q.id]()); }
  function evaluateQuests(celebrate) {
    const fresh = DATA.quests.filter(q => QUEST_CHECKS[q.id]() && !S.questsDone.includes(q.id));
    if (!fresh.length) return;
    fresh.forEach(q => S.questsDone.push(q.id));
    Store.save();
    const pr = Store.addPoints(DATA.points.gain.quest[0] * fresh.length);
    pointsFx(DATA.points.gain.quest[0] * fresh.length, DATA.points.gain.quest[1]);
    updateTopbar();
    if (pr.leveled) setTimeout(() => levelUpCard(pr.after[1]), 700);
    if (celebrate) {
      Sfx.arpeggio();
      toast(fresh.length > 1 ? `✓ 完成了 ${fresh.length} 个任务` : DATA.questUi.completeToast.replace('{title}', fresh[0].title), 3200);
    }
  }
  function questTargetKey() {
    const q = activeQuest();
    if (!q) return null;
    if (q.spot === 'shop-unlit') { const ws = DATA.workshops.find(w => !S.youth.stamps.includes(w.id)); return ws ? 'shop' + ws.id : null; }
    if (q.spot === 'shop-lit') { const ws = DATA.workshops.find(w => S.youth.stamps.includes(w.id)); return ws ? 'shop' + ws.id : 'shop1'; }
    return q.spot;
  }
  /* ══ 灯火值：加分 + 飘字 + 升级卡（积分不买强度，买故事）══ */
  function pointsFx(n, why) {
    const chipEl = $('#points-chip');
    if (chipEl) {
      chipEl.querySelector('span').textContent = S.points;
      chipEl.classList.remove('pulse'); void chipEl.offsetWidth; chipEl.classList.add('pulse');
    }
    const f = el('div', 'float-pts', `+${n} ${DATA.points.name}${why ? ' · ' + why : ''}`);
    document.getElementById('app').appendChild(f);
    setTimeout(() => f.remove(), 1800);
  }
  function levelUpCard(name) {
    const ov = $('#overlay');
    ov.hidden = false; ov.innerHTML = '';
    const sheet = el('div', 'sheet levelup');
    sheet.innerHTML = `<div class="lu-spark">✨</div><p class="hint">${DATA.points.levelUp}</p>
      <p class="small">${DATA.points.levelUpSub}</p><div class="lu-name">${name}</div>
      <p class="small">${DATA.points.loreUnlock}</p>`;
    const row = el('div', 'btn-row');
    const b = el('button', 'btn primary', '翻开村志');
    b.addEventListener('click', () => { ov.hidden = true; ov.innerHTML = ''; showBoard(3); });
    const c = el('button', 'btn ghost', '继续赶路');
    c.addEventListener('click', () => { ov.hidden = true; ov.innerHTML = ''; });
    row.appendChild(b); row.appendChild(c);
    sheet.appendChild(row);
    ov.appendChild(sheet);
    Sfx.ceremony();
  }
  function coinsFx(n, why) {
    const chipEl = $('#coins-chip');
    if (chipEl) {
      chipEl.querySelector('span').textContent = S.coins;
      chipEl.classList.remove('pulse'); void chipEl.offsetWidth; chipEl.classList.add('pulse');
    }
    const f = el('div', 'float-pts', `+${n} ${DATA.coins.name}${why ? ' · ' + why : ''}`);
    document.getElementById('app').appendChild(f);
    setTimeout(() => f.remove(), 1800);
  }
  function gain(key, mult) {
    const def = DATA.points.gain[key];
    if (!def) return;
    const total = def[0] * (mult || 1);
    if (!total) return;
    const r = Store.addPoints(total);
    pointsFx(total, def[1]);
    updateTopbar();
    if (r.leveled) setTimeout(() => levelUpCard(r.after[1]), 700);
  }

  /* ══ 悬赏（侧任务）：状态即进度 ══ */
  const SIDE_CHECKS = {
    s1: () => DATA.npcs.filter(n => n.key !== 'motuan').every(n => (S.npcChats[n.key] || []).length > 0),
    s2: () => S.products.length >= 3,
    s3: () => S.visitParts.length >= 3,
    s4: () => !!S.flags.declined,
    s5: () => !!S.flags.swung,
    s6: () => S.letters.read.length + S.letters.gold.length >= 5,
    s7: () => Object.values(S.slowCount || {}).some(c => c >= 2),
    s8: () => S.youth.stamps.length >= 10
  };

  /* ══ 村务板：主线 / 悬赏 / 村志 ══ */
  function showBoard(tab) {
    const ov = $('#overlay');
    ov.hidden = false; ov.innerHTML = '';
    const sheet = el('div', 'sheet');
    sheet.appendChild(el('p', 'hint',
      `${DATA.board.emoji} ${DATA.board.name} · ${DATA.points.chip} ${S.points} ${DATA.points.name} · ${Store.level()[1]}`));
    const tabs = el('div', 'chips board-tabs');
    DATA.board.tabs.forEach((t, i) => {
      const c = el('button', 'chip' + (i === tab ? ' on' : ''), t);
      c.addEventListener('click', () => showBoard(i));
      tabs.appendChild(c);
    });
    sheet.appendChild(tabs);
    const body = el('div', 'quest-list');

    if (tab === 0) {
      const act = activeQuest();
      let lastCh = '';
      DATA.quests.forEach(q => {
        if (q.ch !== lastCh) { lastCh = q.ch; body.appendChild(el('div', 'qch', q.ch)); }
        const done = QUEST_CHECKS[q.id]();
        const row = el('div', 'qrow' + (done ? ' done' : '') + (act && act.id === q.id ? ' active' : ''));
        row.innerHTML = `<span class="st">${done ? '✓' : (act && act.id === q.id ? '❗' : '·')}</span><span>${q.title}</span>`;
        body.appendChild(row);
      });
    } else if (tab === 1) {
      body.appendChild(el('p', 'small', DATA.board.sideTitle));
      DATA.board.sides.forEach(sd => {
        const done = SIDE_CHECKS[sd.id]();
        const claimed = S.sideClaimed.includes(sd.id);
        const row = el('div', 'qrow' + (claimed ? ' done' : ''));
        row.innerHTML = `<span class="st">${claimed ? '✓' : done ? '●' : '·'}</span><span style="flex:1">${sd.title}</span><span class="pts">+${sd.pts}</span>`;
        if (done && !claimed) {
          const b = el('button', 'chip on', DATA.board.claim);
          b.addEventListener('click', () => {
            S.sideClaimed.push(sd.id);
            const r = Store.addPoints(sd.pts);
            Store.save();
            pointsFx(sd.pts, sd.title.split('：')[0]);
            updateTopbar();
            Sfx.arpeggio();
            if (r.leveled) { ov.hidden = true; ov.innerHTML = ''; setTimeout(() => levelUpCard(r.after[1]), 500); }
            else showBoard(1);
          });
          row.appendChild(b);
        }
        body.appendChild(row);
      });
    } else if (tab === 2) {
      body.appendChild(el('p', 'small', DATA.orderUi.title));
      DATA.orders.forEach(od => {
        const done = S.ordersDone.includes(od.id);
        const lit = S.youth.stamps.includes(od.ws);
        const ws = DATA.workshops.find(w => w.id === od.ws);
        const prodIdx = S.products.findIndex(p => p.wsId === od.ws);
        const row = el('div', 'qrow' + (done ? ' done' : ''));
        row.innerHTML = `<span class="st">${done ? '✓' : lit ? '●' : '·'}</span>
          <div style="flex:1;min-width:0"><b style="font-size:13px">${od.buyer}</b>
          <div class="small">想要：${od.want}（${ws.name}）</div>
          ${done ? `<div class="small">“${od.note}”</div>` : (lit && prodIdx < 0 ? `<div class="small">${DATA.orderUi.needMake}</div>` : '') + (!lit ? `<div class="small">${DATA.orderUi.notLit}</div>` : '')}</div>`;
        if (!done && lit && prodIdx >= 0) {
          const b = el('button', 'chip on', DATA.orderUi.ship);
          b.addEventListener('click', () => {
            S.products.splice(prodIdx, 1);
            S.ordersDone.push(od.id);
            Store.addCoins(DATA.coins.orderReward);
            coinsFx(DATA.coins.orderReward, od.buyer.split(' · ')[1]);
            updateTopbar();
            Sfx.arpeggio();
            toast(DATA.orderUi.shipped + '\n“' + od.note + '”', 5200);
            showBoard(2);
          });
          row.appendChild(b);
        }
        body.appendChild(row);
      });
    } else {
      const lv = Store.level()[0];
      DATA.lore.forEach(en => {
        if (en.lv <= lv) body.appendChild(el('div', 'lore-card', `<b>${en.title}</b><p>${en.text}</p>`));
        else body.appendChild(el('div', 'lore-card locked', DATA.board.lockedLore));
      });
    }
    sheet.appendChild(body);
    const row2 = el('div', 'btn-row');
    row2.style.marginTop = '12px';
    const lb = el('button', 'btn', DATA.village.listDoor + ' 街巷一览');
    lb.addEventListener('click', () => { ov.hidden = true; ov.innerHTML = ''; go('street'); });
    row2.appendChild(lb);
    sheet.appendChild(row2);
    const close = el('button', 'btn ghost', '收起来');
    close.style.cssText = 'width:100%;margin-top:8px;';
    close.addEventListener('click', () => { ov.hidden = true; ov.innerHTML = ''; });
    sheet.appendChild(close);
    // 重新进村（二次确认，保留声音偏好）
    const reset = el('button', 'btn ghost reset-btn', '🔄 重新进村');
    let armed = false;
    reset.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        reset.textContent = '⚠️ 进度会清空，再点一次确认';
        setTimeout(() => { armed = false; reset.textContent = '🔄 重新进村'; }, 3500);
        return;
      }
      const sound = S.settings.sound;
      Store.reset();
      Store.state.settings.sound = sound;
      Store.save();
      location.reload();
    });
    sheet.appendChild(reset);
    ov.appendChild(sheet);
  }
  function showQuestLog() { showBoard(0); }

  /* ══ 可行走村庄：大地图 + 主角 + 镜头跟随（V2.1）══ */
  Scenes.village = view => {
    const V = DATA.village;
    const dpNow = Store.daypart();
    if (!S.visitParts.includes(dpNow)) { S.visitParts.push(dpNow); Store.save(); }
    const vp = el('div', 'village-vp');
    view.appendChild(vp);
    const wrap = el('div', 'vmap-wrap');
    wrap.style.cssText = `width:${V.mapW}px;height:${V.mapH}px;`;
    const mapImg = new Image();
    mapImg.className = 'vmap';
    mapImg.src = V.map;
    mapImg.style.cssText = `width:${V.mapW}px;height:${V.mapH}px;`;
    wrap.appendChild(mapImg);
    vp.appendChild(wrap);

    // 主角
    if (!S.village.x) { S.village.x = V.spawn[0] * V.mapW; S.village.y = V.spawn[1] * V.mapH; }
    let hx = S.village.x, hy = S.village.y, tx = hx, ty = hy, pending = null, lastT = 0;
    let stepDist = 0, stepAlt = false;
    const hero = el('div', 'hero');
    const flipper = el('div', 'flipper');
    const baseSrc = (DATA.heroes[S.youth.hero] || {}).sprite || V.hero;       // 站立帧
    const walkSrc = baseSrc.replace('.png', '-walk.png');                     // 迈步帧
    new Image().src = walkSrc;                                                // 预载，切换不闪
    const hi = new Image();
    hi.src = baseSrc;
    hi.onerror = () => { hi.src = V.hero; };
    flipper.appendChild(hi);
    hero.appendChild(flipper);
    hero.appendChild(el('div', 'hshadow'));
    wrap.appendChild(hero);

    const bandY = [V.walkBand[0] * V.mapH, V.walkBand[1] * V.mapH];
    const clampPt = (x, y) => [Math.max(40, Math.min(V.mapW - 40, x)), Math.max(bandY[0], Math.min(bandY[1], y))];

    function place() {
      hero.style.left = hx + 'px'; hero.style.top = hy + 'px';
      // 近大远小：越靠街道下沿（离镜头近）人越大
      const f = (hy - bandY[0]) / ((bandY[1] - bandY[0]) || 1);
      const s = Math.max(0.78, Math.min(1.04, 0.82 + 0.22 * f));
      hero.style.transform = `translate(-50%, -94%) scale(${s.toFixed(3)})`;
      hero.style.zIndex = 6 + Math.round(f * 10);   // 靠前的盖住靠后的
    }
    let camX = null, camY = null;
    function camera(snap) {
      const vw = vp.clientWidth || 1, vh = vp.clientHeight || 1;
      const tx2 = Math.max(0, Math.min(V.mapW - vw, hx - vw / 2));
      const ty2 = Math.max(0, Math.min(V.mapH - vh, hy - vh * 0.58));
      if (camX === null || snap) { camX = tx2; camY = ty2; }
      else { camX += (tx2 - camX) * 0.14; camY += (ty2 - camY) * 0.14; }   // 镜头柔性追赶
      wrap.style.transform = `translate(${-camX}px,${-camY}px)`;
    }
    function step(now) {
      const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0;
      lastT = now;
      const dx = tx - hx, dy = ty - hy, d = Math.hypot(dx, dy);
      if (d > 4) {
        hero.classList.add('moving');
        if (Math.abs(dx) > 2) hero.classList.toggle('flip', dx < 0);
        const adv = Math.min(d, V.speed * dt);
        hx += dx / d * adv; hy += dy / d * adv;
        stepDist += adv;
        if (stepDist > 52) { stepDist = 0; stepAlt = !stepAlt; Sfx.footstep(stepAlt); hi.src = stepAlt ? walkSrc : baseSrc; }
        place(); camera();
      } else {
        camera();   // 停下后镜头继续缓动到位
      }
      if (d <= 4 && hero.classList.contains('moving')) {
        hero.classList.remove('moving');
        hi.src = baseSrc;   // 停下复位站立帧
        S.village.x = hx; S.village.y = hy; Store.save();
        if (pending) { const p = pending; pending = null; p.duet ? playDuet(p.duet) : p.npcChat ? chatNpc(p.npcChat, p.chIdx) : act(p); }
      }
    }
    // 双驱动：rAF 保证可见时丝滑，setInterval 兜底后台节流（真机切后台也能走完）
    function raf(t) { if (!vp.isConnected) return; step(t); requestAnimationFrame(raf); }
    const safety = setInterval(() => {
      if (!vp.isConnected) { clearInterval(safety); return; }
      if (performance.now() - lastT > 120) step(performance.now());
    }, 60);
    place();
    requestAnimationFrame(() => { camera(true); requestAnimationFrame(raf); });

    // 点地面行走
    vp.addEventListener('pointerdown', e => {
      const r = wrap.getBoundingClientRect();
      const p = clampPt(e.clientX - r.left, e.clientY - r.top);
      tx = p[0]; ty = p[1]; pending = null;
      const rip = el('div', 'tap-ripple');
      rip.style.cssText = `left:${p[0]}px;top:${p[1]}px;`;
      wrap.appendChild(rip);
      setTimeout(() => rip.remove(), 700);
    });

    // 热点木牌
    const targetKey = questTargetKey();
    V.spots.forEach(s => {
      if (s.key === 'lantern' && (S.youth.stamps.length < 3 || S.youth.ceremonyDone)) return;
      const shopId = s.key.startsWith('shop') ? +s.key.slice(4) : null;
      const spot = el('button', 'vspot' + (shopId && S.youth.stamps.includes(shopId) ? ' lit' : ''));
      let name = s.name;
      if (s.key === 'granny') {
        if (S.youth.stamps.length >= 10 && S.youth.ceremonyDone && !S.flags.handover) { name = DATA.handover.spotName; spot.classList.add('lit'); }
        else if (S.flags.handover) name = DATA.handover.grannySpotAfter;
      }
      if (s.key === 'mail') { const n = Store.unreadLetters().length; if (n) name += ' · ' + n; }
      if (shopId && S.shopLv[shopId]) name += ' ' + '★'.repeat(S.shopLv[shopId]);
      if (shopId && Store.slowState(shopId).status === 'ready') name += ' ✨';
      spot.innerHTML = `${targetKey === s.key ? '<span class="qmark">❗</span>' : ''}<span class="plaque">${s.emoji} ${name}</span><span class="pin"></span>`;
      spot.style.left = s.x * V.mapW + 'px';
      spot.style.top = s.y * V.mapH + 'px';
      spot.addEventListener('pointerdown', e => e.stopPropagation());
      spot.addEventListener('click', e => {
        e.stopPropagation();
        const p = clampPt(s.x * V.mapW, s.y * V.mapH + 24);
        if (Math.hypot(hx - p[0], hy - p[1]) < 100) { act(s); return; }
        tx = p[0]; ty = p[1]; pending = s;
        Sfx.knock();
      });
      wrap.appendChild(spot);
    });

    // ── 轨迹系 NPC：对白随章节换新；老韩按时段出勤；豆豆巡逻；墨团蹲在任务目标旁 ──
    const chapters = [...new Set(DATA.quests.map(q => q.ch))];
    const aq = activeQuest();
    const chIdx = aq ? Math.max(0, chapters.indexOf(aq.ch)) : chapters.length - 1;
    DATA.npcs.forEach(npc => {
      if (npc.dayparts && !npc.dayparts.includes(Store.daypart())) return;
      let nx = npc.x, ny = npc.y;
      if (npc.follow === 'target') {
        const tk = questTargetKey();
        const ts = V.spots.find(sp => sp.key === tk) || V.spots.find(sp => sp.key === 'swing');
        nx = Math.min(0.96, ts.x + 0.02); ny = Math.min(0.92, ts.y + 0.08);
      }
      const nb = el('button', (npc.sprite ? 'npc-fig-wrap' : 'npc-chip') + (npc.patrol ? ' patrol' : ''));
      nb.innerHTML = npc.sprite
        ? `<img class="npc-fig" src="${npc.sprite}"><span class="npc-name">${npc.name}</span>`
        : `<span class="e">${npc.emoji}</span><span>${npc.name}</span>`;
      nb.style.left = nx * V.mapW + 'px';
      nb.style.top = ny * V.mapH + 'px';
      if (npc.patrol) nb.style.setProperty('--patrol', npc.patrol + 'px');
      nb.addEventListener('pointerdown', e => e.stopPropagation());
      nb.addEventListener('click', e => {
        e.stopPropagation();
        const p = clampPt(nx * V.mapW, ny * V.mapH + 12);
        if (Math.hypot(hx - p[0], hy - p[1]) < 110) { chatNpc(npc, chIdx); return; }
        tx = p[0]; ty = p[1]; pending = { npcChat: npc, chIdx };
        Sfx.knock();
      });
      wrap.appendChild(nb);
    });

    function chatNpc(npc, ci) {
      // 轨迹系：先议论你最近做过的大事（每件事每人只说一次）
      const seen = S.reactSeen[npc.key] || (S.reactSeen[npc.key] = []);
      const reacts = DATA.npcReacts[npc.key] || {};
      const miles = [];
      if (S.youth.ceremonyDone) miles.push('ceremony');
      if (S.ordersDone.length) miles.push('ship');
      if (S.youth.goldStamps.length) miles.push('gold');
      const freshM = miles.find(m => reacts[m] && !seen.includes(m));
      const pool = npc.lines[Math.min(ci, npc.lines.length - 1)];
      let line = pool[Math.floor(Math.random() * pool.length)];
      if (freshM) { line = reacts[freshM]; seen.push(freshM); Store.save(); }
      const isF = S.youth.hero === 'f';
      line = line.replace(/哥哥\/姐姐/g, isF ? '姐姐' : '哥哥')
                 .replace(/哥\/姐/g, isF ? '姐' : '哥')
                 .replace(/丫头\/小子/g, isF ? '丫头' : '小子');
      const arr = S.npcChats[npc.key] || (S.npcChats[npc.key] = []);
      const firstThisCh = !arr.includes(ci);
      askSheet(npc.emoji, line, { chips: ['嗯嗯', '改天再聊'] }, () => {
        if (firstThisCh) { arr.push(ci); Store.save(); gain('chat'); }
        return null;
      });
    }

    // ── 轨迹系：双人旁听事件（羁绊落地）──
    DATA.duets.forEach(d => {
      if (!d.need.every(n => S.youth.stamps.includes(n))) return;
      if (S.flags['duet_' + d.id]) return;
      const ns = V.spots.find(sp => sp.key === d.near);
      const db = el('button', 'npc-chip duet');
      db.innerHTML = `<span class="e">👂</span><span>${d.title.replace('👂 ', '')}</span>`;
      db.style.left = Math.max(0.03, ns.x - 0.02) * V.mapW + 'px';
      db.style.top = Math.min(0.93, ns.y + 0.1) * V.mapH + 'px';
      db.addEventListener('pointerdown', e => e.stopPropagation());
      db.addEventListener('click', e => {
        e.stopPropagation();
        const p = clampPt(ns.x * V.mapW, (ns.y + 0.1) * V.mapH);
        if (Math.hypot(hx - p[0], hy - p[1]) < 120) { playDuet(d); return; }
        tx = p[0]; ty = p[1]; pending = { duet: d };
        Sfx.knock();
      });
      wrap.appendChild(db);
    });

    function playHandover() {
      const H = DATA.handover;
      const ov = $('#overlay');
      ov.hidden = false; ov.innerHTML = '';
      const sheet = el('div', 'sheet');
      sheet.appendChild(el('p', 'hint', '🏮 守街人的交接'));
      const lw = el('div', 'duet-lines');
      sheet.appendChild(lw);
      let i = 0;
      const btn = el('button', 'btn primary', '……');
      btn.style.width = '100%';
      function step() {
        if (i < H.lines.length) {
          const [who, text] = H.lines[i++];
          lw.appendChild(el('div', 'duet-line', `<b>${who}</b>${text}`));
          Sfx.paper();
          if (i === H.lines.length) { btn.textContent = '接过灯'; Sfx.ceremony(); }
        } else {
          S.flags.handover = true;
          Store.save();
          const r = Store.addPoints(H.gainPts);
          ov.hidden = true; ov.innerHTML = '';
          pointsFx(H.gainPts, H.gainWhy);
          updateTopbar();
          toast(H.done, 4600);
          if (r.leveled) setTimeout(() => levelUpCard(r.after[1]), 900);
          setTimeout(() => go('village'), 1200);
        }
      }
      btn.addEventListener('click', step);
      step();
      sheet.appendChild(btn);
      ov.appendChild(sheet);
    }

    function playDuet(d) {
      const ov = $('#overlay');
      ov.hidden = false; ov.innerHTML = '';
      const sheet = el('div', 'sheet');
      sheet.appendChild(el('p', 'hint', d.title));
      const lw = el('div', 'duet-lines');
      sheet.appendChild(lw);
      let i = 0;
      const btn = el('button', 'btn primary', DATA.duetUi.next);
      btn.style.width = '100%';
      function step() {
        if (i < d.lines.length) {
          const [who, text] = d.lines[i++];
          lw.appendChild(el('div', 'duet-line', `<b>${who}</b>${text}`));
          Sfx.paper();
          if (i === d.lines.length) btn.textContent = DATA.duetUi.end;
        } else {
          S.flags['duet_' + d.id] = true;
          S.products.push({ wsId: d.reward.wsId, name: d.reward.name, emoji: d.reward.emoji, at: Date.now() });
          Store.save();
          ov.hidden = true; ov.innerHTML = '';
          gain('duet');
          toast(DATA.duetUi.got + ' ' + d.reward.emoji + ' ' + d.reward.name, 4200);
          go('village');
        }
      }
      btn.addEventListener('click', step);
      step();
      sheet.appendChild(btn);
      ov.appendChild(sheet);
    }

    function act(s) {
      if (s.key === 'board') { showBoard(1); return; }
      if (s.key === 'granny') {
        // 终章：十灯全亮且已仪式 → 守街人的交接（暗线高潮）
        if (S.youth.stamps.length >= 10 && S.youth.ceremonyDone && !S.flags.handover) { playHandover(); return; }
        const first = !S.youth.metGranny;
        if (first) { S.youth.metGranny = true; Store.save(); }
        const pool = S.flags.handover ? DATA.village.grannyAfter : DATA.village.grannyAgain;
        askSheet('👵', first ? DATA.village.grannyHello : pool[Math.floor(Math.random() * pool.length)],
          { chips: ['哎，阿婆'] },
          () => { setTimeout(() => go('village'), 600); return first ? DATA.village.grannyMet : null; });
      }
      else if (s.key === 'mail') go('mailbox');
      else if (s.key === 'swing') go('corner');
      else if (s.key === 'station') go('station');
      else if (s.key === 'lantern') go('ceremony');
      else if (s.key.startsWith('shop')) go('workshop', +s.key.slice(4));
    }

    // HUD：横幅 + 操作提示
    const isYouth = S.role === 'youth';
    if (isYouth) {
      // 任务结算（先结算再渲染，计数才准）
      evaluateQuests(true);
      // 章节卡：翻开新的一卷
      if (chIdx > (S.lastChIdx ?? -1)) {
        S.lastChIdx = chIdx; Store.save();
        const cc = DATA.chapterCards[chIdx];
        if (cc) setTimeout(() => showChapterCard(cc), 600);
      }
    }
    // 街角小事：每天进村第一眼的一点不一样（双角色共享）
    const today = new Date().toDateString();
    if (S.lastMicroDay !== today) {
      S.lastMicroDay = today; Store.save();
      const me = DATA.microEvents[Math.floor(Math.random() * DATA.microEvents.length)];
      setTimeout(() => toast(me, 4200), 2600);
    }
    const banner = el('button', 'quest-banner');
    if (isYouth) {
      const q = activeQuest();
      banner.innerHTML = q
        ? `<span class="ch">${q.ch}</span><span class="qt">${q.title}</span><span class="more">📜 ${S.questsDone.length}/${DATA.quests.length}</span>`
        : `<span class="ch">圆满</span><span class="qt">${DATA.questUi.allDone}</span><span class="more">📜</span>`;
      banner.addEventListener('click', showQuestLog);
    } else {
      // 工匠：开张后串门逛街，横幅点回自己的名片
      const shop = S.craftsman.workshopName || '你的工坊';
      banner.innerHTML = `<span class="ch">${shop}</span><span class="qt">开张了。四处走走，串串门。</span><span class="more">📇 名片</span>`;
      banner.addEventListener('click', () => go('posterC'));
    }
    view.appendChild(banner);
    view.appendChild(el('div', 'village-hint', DATA.questUi.tapHint));

    if (isYouth) maybeAsk();
  };

  /* ── 「去村里」驿站：线下项目 + 金章暗号（策划案 15 章 O2O）── */
  Scenes.station = view => {
    const ST = DATA.station;
    view.appendChild(el('div', 'shop-head scene-pad', `<h2>🧭 去村里 · 驿站</h2><div class="npc">${ST.intro}</div>`));
    const scroll = el('div', 'station-scroll');
    view.appendChild(scroll);

    function projCard(p) {
      const wished = S.youth.wishTrips.includes(p.id);
      const card = el('div', 'proj-card');
      card.appendChild(el('span', 'e', p.emoji));
      card.appendChild(el('div', '', `<b>${p.title}</b><div class="meta">${p.place} · ${p.days}</div><div class="desc">${p.desc}</div>`));
      const chip = el('button', 'chip' + (wished ? ' on' : ''), wished ? ST.wishedBtn : ST.wishBtn);
      chip.addEventListener('click', () => {
        const i = S.youth.wishTrips.indexOf(p.id);
        if (i >= 0) { S.youth.wishTrips.splice(i, 1); chip.classList.remove('on'); chip.textContent = ST.wishBtn; }
        else {
          S.youth.wishTrips.push(p.id); chip.classList.add('on'); chip.textContent = ST.wishedBtn;
          Sfx.chime(); toast(ST.wished);
          if (!S.flags['w_' + p.id]) { S.flags['w_' + p.id] = true; gain('wish'); }
        }
        Store.save();
      });
      card.appendChild(chip);
      return card;
    }
    scroll.appendChild(el('div', 'station-sec', ST.learnTitle));
    ST.learn.forEach(p => scroll.appendChild(projCard(p)));
    scroll.appendChild(el('div', 'station-sec', ST.tripTitle));
    ST.trips.forEach(p => scroll.appendChild(projCard(p)));

    // 金章暗号（模拟线下扫码/盖章本回传）
    const gold = el('div', 'gold-box');
    gold.appendChild(el('div', 'sw-title', '🏅 ' + ST.goldTitle));
    gold.appendChild(el('div', 'small', ST.goldDesc));
    const row = el('div', 'row');
    const inp = el('input', 'text-input');
    inp.placeholder = ST.goldPh;
    const ok = el('button', 'btn primary', '兑');
    ok.addEventListener('click', () => {
      const m = /^金\s*(10|[1-9])$/.exec(inp.value.trim());
      if (!m) { toast(ST.goldBad); Sfx.knock(); return; }
      const id = +m[1];
      const ws = DATA.workshops.find(w => w.id === id);
      if (S.youth.goldStamps.includes(id)) { toast(ST.goldDup); return; }
      S.youth.goldStamps.push(id);
      if (!S.youth.stamps.includes(id)) { S.youth.stamps.push(id); S.sim.myLights++; } // 真去过，灯当然亮
      if (!S.letters.gold.includes(id)) S.letters.gold.push(id);
      Store.save(); updateTopbar();
      Sfx.stamp(); Sfx.arpeggio();
      inp.value = '';
      toast(ST.goldOk.replace('{name}', ws.name), 3600);
      gain('gold');
    });
    row.appendChild(inp); row.appendChild(ok);
    gold.appendChild(row);
    gold.appendChild(el('div', 'small', ST.goldHint));
    scroll.appendChild(gold);

    const foot = el('div', 'btn-row');
    const pBtn = el('button', 'btn primary', ST.posterBtn);
    pBtn.addEventListener('click', () => {
      if (!S.youth.wishTrips.length) { toast(ST.posterNone); return; }
      const ov = $('#overlay');
      ov.hidden = false; ov.innerHTML = '';
      const sheet = el('div', 'sheet');
      const img = new Image();
      img.className = 'poster-img';
      img.style.cssText = 'display:block;margin:0 auto;width:min(70%,280px);';
      img.src = Poster.apprentice();
      if (!S.youth.posterMade) { S.youth.posterMade = true; Store.save(); gain('poster'); }
      sheet.appendChild(img);
      sheet.appendChild(el('p', 'small', DATA.misc.posterSaveHint));
      const close = el('button', 'btn ghost', '收起来');
      close.style.width = '100%';
      close.addEventListener('click', () => { ov.hidden = true; ov.innerHTML = ''; });
      sheet.appendChild(close);
      ov.appendChild(sheet);
    });
    const sBtn = el('button', 'btn', ST.signupBtn);
    sBtn.addEventListener('click', () => toast('正式报名渠道上线后在这里跳转。', 3000));
    const back = el('button', 'btn ghost', DATA.misc.backStreet);
    back.addEventListener('click', () => go('village'));
    foot.appendChild(pBtn); foot.appendChild(sBtn); foot.appendChild(back);
    foot.style.padding = '0 22px 18px';
    view.appendChild(foot);
  };

  /* ── 村民图鉴：角色卡收集（谷子心智）── */
  Scenes.dex = view => {
    view.appendChild(el('div', 'shop-head scene-pad', `<h2>${DATA.dex.title}</h2><div class="npc">${DATA.dex.hint}</div>`));
    const scroll = el('div', 'station-scroll');
    view.appendChild(scroll);
    const grid = el('div', 'dex-grid');
    scroll.appendChild(grid);

    function dexCard(unlocked, imgSrc, name, line) {
      const c = el('div', 'dex-card' + (unlocked ? '' : ' locked'));
      if (unlocked) {
        const im = new Image();
        im.src = imgSrc;
        im.onerror = () => { im.replaceWith(el('div', 'back', '🏮')); };
        c.appendChild(im);
        c.appendChild(el('div', 'nm', name));
        c.style.cursor = 'pointer';
        c.addEventListener('click', () => {
          const ov = $('#overlay');
          ov.hidden = false; ov.innerHTML = '';
          const sheet = el('div', 'sheet');
          const big = new Image();
          big.src = imgSrc;
          big.style.cssText = 'width:100%;border-radius:10px;display:block;';
          sheet.appendChild(big);
          sheet.appendChild(el('p', 'hint', name));
          const close = el('button', 'btn ghost', '收起来');
          close.style.width = '100%';
          close.addEventListener('click', () => { ov.hidden = true; ov.innerHTML = ''; });
          sheet.appendChild(close);
          ov.appendChild(sheet);
          ov.addEventListener('click', e => { if (e.target === ov) { ov.hidden = true; ov.innerHTML = ''; } }, { once: true });
          Sfx.paper();
        });
      } else {
        c.appendChild(el('div', 'back', '？'));
        c.appendChild(el('div', 'nm', `${DATA.dex.lockedName} · ${line}`));
      }
      return c;
    }
    grid.appendChild(dexCard(true, 'art/npc-0.jpg', DATA.dex.granny, ''));
    DATA.workshops.forEach(ws => {
      grid.appendChild(dexCard(S.youth.stamps.includes(ws.id), 'art/npc-' + ws.id + '.jpg', ws.npc, DATA.dex.lockedLine));
    });
    const row = el('div', 'btn-row');
    row.style.padding = '0 0 16px';
    const back = el('button', 'btn ghost', DATA.misc.backStreet);
    back.addEventListener('click', () => go('village'));
    row.appendChild(back);
    scroll.appendChild(row);
  };

  /* ── 疗愈角落 ── */
  Scenes.corner = view => {
    const wrap = el('div', 'swing-wrap scene-pad');
    view.appendChild(wrap);
    wrap.appendChild(el('div', 'swing', '🌳'));
    const p = el('p', 'whisper', `<p>${DATA.corner.enter}</p>`);
    wrap.appendChild(p);
    const timer = setTimeout(() => {
      S.flags.swung = true; Store.save();
      p.innerHTML = `<p>${DATA.corner.later}</p>`;
      wrap.insertBefore(el('div', 'boot-cat', '🐈'), p);
      Sfx.chime();
    }, 30000);
    const row = el('div', 'btn-row');
    const stay = el('button', 'btn ghost', DATA.corner.stay);
    stay.addEventListener('click', () => toast('嗯。'));
    const leave = el('button', 'btn', DATA.corner.leave);
    leave.addEventListener('click', () => { clearTimeout(timer); go('village'); });
    row.appendChild(stay); row.appendChild(leave);
    wrap.appendChild(row);
  };

  /* ── 信箱 ── */
  Scenes.mailbox = view => {
    const newlyRead = Store.unreadLetters().length;
    view.appendChild(el('div', 'shop-head scene-pad', `<h2>📮 信箱</h2>`));
    const list = el('div', 'mail-list');
    view.appendChild(list);
    if (!S.letters.delivered.length && !(S.letters.gold || []).length) list.appendChild(el('p', 'small', DATA.mailbox.empty));
    (S.letters.gold || []).forEach(id => {
      const ws = DATA.workshops.find(w => w.id === id);
      const npcName = ws.npc.split(' · ').pop();
      list.appendChild(el('div', 'mail-card gold', `<div class="from">🏅 金章回信 · ${ws.name}</div>${DATA.station.goldLetter.replace('{npc}', npcName)}`));
    });
    S.letters.delivered.forEach(id => {
      const ws = DATA.workshops.find(w => w.id === id);
      list.appendChild(el('div', 'mail-card', `<div class="from">来自 ${ws.name} · ${ws.npc}</div>${ws.letter}`));
      if (!S.letters.read.includes(id)) S.letters.read.push(id);
    });
    Store.save();
    if (newlyRead) gain('letter', newlyRead);
    if (S.letters.delivered.length) list.appendChild(el('p', 'small', DATA.mailbox.allRead));
    const row = el('div', 'btn-row');
    row.style.padding = '0 22px 18px';
    const back = el('button', 'btn ghost', DATA.misc.backStreet);
    back.addEventListener('click', () => go('village'));
    row.appendChild(back);
    view.appendChild(row);
  };

  /* ── 顶栏交互 ── */
  $('#btn-sound').addEventListener('click', function () {
    Sfx.setEnabled(!Sfx.enabled);
    S.settings.sound = Sfx.enabled; Store.save();
    this.textContent = Sfx.enabled ? '🔊' : '🔇';
    if (Sfx.enabled) Sfx.chime();
  });

  $('#btn-bag').addEventListener('click', () => {
    const ov = $('#overlay');
    ov.hidden = false; ov.innerHTML = '';
    const sheet = el('div', 'sheet');
    sheet.appendChild(el('p', 'hint', S.youth.stamps.length ? '印章袋 · 章背面写着每间工坊的事' : DATA.misc.stampEmpty));
    const grid = el('div', 'stamp-grid');
    DATA.workshops.forEach(ws => {
      const got = S.youth.stamps.includes(ws.id);
      const gold = S.youth.goldStamps.includes(ws.id);
      const cell = el('div', 'stamp-cell' + (got ? ' got' : '') + (gold ? ' gold' : ''),
        `<div class="s">${got ? ws.emoji : '·'}</div>${got ? (gold ? '🏅' + ws.stamp : ws.stamp) : '？'}`);
      if (got) cell.addEventListener('click', () => toast('🥚 这枚章在现实里有个名字：「' + ws.action + '」——焕青计划十大公益行动之一。', 4600));
      grid.appendChild(cell);
    });
    sheet.appendChild(grid);
    // 手作集：慢工产物
    sheet.appendChild(el('p', 'hint', DATA.slowUi.shelfTitle));
    if (!S.products.length) {
      sheet.appendChild(el('p', 'small', DATA.slowUi.shelfEmpty));
    } else {
      const pl = el('div', 'product-list');
      S.products.slice().reverse().forEach(p => {
        const pws = DATA.workshops.find(w => w.id === p.wsId);
        pl.appendChild(el('div', 'product-item', `<span class="e">${p.emoji}</span>${p.name}<span class="from">${pws.name}</span>`));
      });
      sheet.appendChild(pl);
    }
    const close = el('button', 'btn ghost', '收起来');
    close.style.width = '100%';
    close.addEventListener('click', () => { ov.hidden = true; ov.innerHTML = ''; });
    sheet.appendChild(close);
    ov.appendChild(sheet);
    ov.addEventListener('click', e => { if (e.target === ov) { ov.hidden = true; ov.innerHTML = ''; } }, { once: true });
  });

  /* ── 萤火虫环境层 ── */
  (function fireflies() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const amb = $('#ambient');
    for (let i = 0; i < 10; i++) {
      const f = el('div', 'firefly');
      f.style.cssText = `left:${Math.random() * 100}%;top:${30 + Math.random() * 60}%;--dx:${(Math.random() - .5) * 120}px;--dy:${(Math.random() - .5) * 80}px;animation-duration:${9 + Math.random() * 8}s,${2 + Math.random() * 2}s;animation-delay:${-Math.random() * 9}s,${-Math.random() * 2}s;`;
      amb.appendChild(f);
    }
  })();

  /* ── 真实时钟：应用时段并每分钟刷新（环境声层随之切换）── */
  (function clock() {
    const apply = () => {
      const part = Store.daypart();
      document.body.dataset.daypart = part;
      Sfx.setAmbient(part);
    };
    apply();
    setInterval(apply, 60000);
  })();

  /* ── 启动：恢复状态 + 投递回信 ── */
  (function boot() {
    if (S.settings.sound) { /* 需用户手势后才能出声，仅恢复图标 */ $('#btn-sound').textContent = '🔊'; document.addEventListener('pointerdown', () => Sfx.setEnabled(true), { once: true }); }
    if (S.role) document.body.dataset.role = S.role;
    if (S.youth.ceremonyDone || S.craftsman.opened) {
      document.body.classList.remove('dusk');
      document.body.classList.add('warm');
    }

    let target = 'boot';
    if (S.role === 'youth' && S.youth.nickname && S.youth.bagItems.length === 3) {
      const fresh = Store.deliverLetters();
      target = 'village';
      if (fresh.length) setTimeout(() => toast(DATA.mailbox.badge.replace('{n}', Store.unreadLetters().length), 3400), 1400);
    } else if (S.role === 'craftsman' && S.craftsman.name) {
      target = S.craftsman.opened ? 'posterC' : 'decorate';
    }
    go(target);
  })();
})();
