/* 状态管理：localStorage 持久化 + 全服点灯计数模拟 */
window.Store = (function () {
  const KEY = 'hq_state_v1';

  const defaults = () => ({
    version: 1,
    role: null,                 // 'youth' | 'craftsman'
    scene: 'boot',
    youth: {
      nickname: '', bagItems: [], city: '', wish: '',
      keepsakes: [],            // 留下纪念物的工坊 id
      stamps: [],               // 盖章的工坊 id（=点亮）
      depth: '', availability: '',
      visitorNo: 0, ceremonyDone: false,
      cityAsked: false, wishAsked: false,
      glaze: '',
      wishTrips: [],                        // 驿站「想去」的项目 id
      goldStamps: [],                       // 金章工坊 id（线下回流）
      metGranny: false,                     // 任务 q1
      posterMade: false,                    // 任务 q9：生成过学徒帖
      hero: ''                              // 'm' 沈砚 / 'f' 林知夏
    },
    craftsman: {
      name: '', craftType: '', craftCustom: '', years: '',
      region: '', intro: '', visibility: [],
      workshopName: '', workshopNo: 0, opened: false
    },
    letters: { delivered: [], read: [], gold: [] },   // 工坊 id 列表；gold=金章特别回信
    settings: { sound: null },              // null=未询问
    sim: { myLights: 0, lastVisit: 0, firstSeen: 0 },
    slowwork: {},                           // wsId -> { start }
    products: [],                           // 慢工产物 [{wsId, name, emoji, at}]
    questsDone: [],                         // 已庆祝的任务 id
    village: { x: 0, y: 0 }                 // 主角在村里的位置（px）
  });

  let state = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = Object.assign(defaults(), saved);
      state.youth = Object.assign(defaults().youth, saved.youth || {});
      state.craftsman = Object.assign(defaults().craftsman, saved.craftsman || {});
      state.letters = Object.assign(defaults().letters, saved.letters || {});
      state.settings = Object.assign(defaults().settings, saved.settings || {});
      state.sim = Object.assign(defaults().sim, saved.sim || {});
    }
  } catch (e) { /* 损坏则重置 */ }

  if (!state.sim.firstSeen) state.sim.firstSeen = Date.now();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* 全服点灯计数模拟：基数 + 时间步长 + 本机贡献（单调递增，演示用） */
  function globalLights() {
    const elapsed = Math.max(0, Date.now() - DATA.launchTs);
    return DATA.counterBase + Math.floor(elapsed / DATA.counterStepMs) + state.sim.myLights;
  }

  function title(role) {
    const rules = DATA.titles[role];
    const n = role === 'youth' ? state.youth.keepsakes.length : state.craftsman.visibility.length;
    let t = rules[0][1];
    for (const [min, name] of rules) if (n >= min) t = name;
    return t;
  }

  /* 回信投递：距上次访问 >10 分钟，给已点亮但未寄信的工坊各投一封 */
  function deliverLetters() {
    const now = Date.now();
    const last = state.sim.lastVisit;
    state.sim.lastVisit = now;
    if (!last || now - last < 10 * 60 * 1000) { save(); return []; }
    const fresh = state.youth.stamps.filter(id => !state.letters.delivered.includes(id));
    fresh.forEach(id => state.letters.delivered.push(id));
    save();
    return fresh;
  }

  function unreadLetters() {
    return state.letters.delivered.filter(id => !state.letters.read.includes(id));
  }

  function reset() { state = defaults(); state.sim.firstSeen = Date.now(); save(); }

  /* ── 真实时钟：返回当前时段 key（morning/noon/dusk/night）── */
  function daypart() {
    const h = new Date().getHours();
    if (h >= 5 && h < 10) return 'morning';
    if (h >= 10 && h < 16) return 'noon';
    if (h >= 16 && h < 19) return 'dusk';
    return 'night';
  }

  /* ── 慢工系统 ── */
  function slowDurMs(id) {
    return DATA.slowwork[id].hours * 3600000 / (DATA.demoSpeed || 1);
  }
  function slowState(id) {
    const rec = state.slowwork[id];
    if (!rec) return { status: 'idle' };
    const remain = rec.start + slowDurMs(id) - Date.now();
    return remain <= 0 ? { status: 'ready' } : { status: 'waiting', remain };
  }
  function startSlow(id) {
    state.slowwork[id] = { start: Date.now() };
    save();
  }
  function collectSlow(id) {
    const def = DATA.slowwork[id];
    const v = def.variants[Math.floor(Math.random() * def.variants.length)];
    const p = { wsId: id, name: def.product.replace('{v}', v), emoji: def.emoji, at: Date.now() };
    state.products.push(p);
    delete state.slowwork[id];
    save();
    return p;
  }
  function fmtDur(ms) {
    const m = Math.ceil(ms / 60000);
    if (m < 1) return '不到一分钟';
    if (m < 60) return m + ' 分钟';
    const h = Math.floor(m / 60), mm = m % 60;
    return h + ' 小时' + (mm ? ' ' + mm + ' 分' : '');
  }

  return { state, save, globalLights, title, deliverLetters, unreadLetters, reset,
           daypart, slowState, startSlow, collectSlow, fmtDur };
})();
