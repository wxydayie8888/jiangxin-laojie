/* canvas 海报：新村民证（青年）/ 工坊名片（工匠）/ 学徒帖 */
window.Poster = (function () {
  const W = 750, H = 1334;
  /* AI 成稿头图：脚本加载即预取，生成海报时若已就绪则使用，否则退回代码绘制 */
  const artDay = new Image(); artDay.src = 'art/keyart-day.jpg';
  const artNight = new Image(); artNight.src = 'art/keyart-night.jpg';

  /* 把成稿按 cover 裁切画进 (0,y0,W,h)，并压一层渐变保证标题可读 */
  function artHeader(ctx, img, y0, h) {
    if (!img.complete || !img.naturalWidth) return false;
    const scale = Math.max(W / img.naturalWidth, h / img.naturalHeight);
    const sw = W / scale, sh = h / scale;
    const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) * 0.3;
    ctx.drawImage(img, sx, sy, sw, sh, 0, y0, W, h);
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, 'rgba(24,22,30,.42)');
    g.addColorStop(0.5, 'rgba(24,22,30,.12)');
    g.addColorStop(1, 'rgba(247,239,226,.95)');
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, h);
    return true;
  }
  const C = { paper: '#F7EFE2', ink: '#4A3B2F', dim: '#9A8B7A', lantern: '#F2A65A', verm: '#C4554D', bamboo: '#8AA37B', dusk: '#2B2A33' };
  const SERIF = '"Songti SC","STSong","SimSun",serif';
  const SANS = '"PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function chipRow(ctx, items, y, font) {
    ctx.font = font || `26px ${SANS}`;
    const pad = 22, gap = 14, h = 56;
    const widths = items.map(t => ctx.measureText(t).width + pad * 2);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
    let x = (W - total) / 2;
    items.forEach((t, i) => {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#E4D5BE'; ctx.lineWidth = 2;
      rr(ctx, x, y, widths[i], h, 28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t, x + widths[i] / 2, y + h / 2 + 2);
      x += widths[i] + gap;
    });
  }

  function seal(ctx, x, y, r, text) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-0.12);
    ctx.strokeStyle = C.verm; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(196,85,77,.08)'; ctx.fill();
    ctx.fillStyle = C.verm;
    ctx.font = `bold ${text.length > 3 ? 30 : 36}px ${SERIF}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (text.length <= 3) ctx.fillText(text, 0, 0);
    else { ctx.fillText(text.slice(0, 2), 0, -20); ctx.fillText(text.slice(2), 0, 20); }
    ctx.restore();
  }

  function street(ctx, y0, h) {
    // 天空
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, C.dusk); g.addColorStop(1, '#5d4a52');
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, h);
    // 星
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 26; i++) ctx.fillRect((i * 137) % W, y0 + ((i * 89) % (h * 0.55)), 3, 3);
    // 屋檐剪影
    ctx.fillStyle = '#211f29';
    ctx.beginPath(); ctx.moveTo(0, y0 + h);
    const pts = [[0, .72], [.07, .70], [.10, .52], [.17, .50], [.20, .68], [.28, .66], [.31, .42], [.40, .40], [.43, .62], [.53, .60], [.56, .36], [.65, .34], [.68, .58], [.77, .56], [.80, .44], [.88, .42], [.91, .66], [1, .63]];
    pts.forEach(([x, yy]) => ctx.lineTo(x * W, y0 + yy * h));
    ctx.lineTo(W, y0 + h); ctx.closePath(); ctx.fill();
    // 灯笼
    ctx.fillStyle = C.lantern;
    [[.14, .62], [.34, .54], [.50, .70], [.60, .48], [.84, .56]].forEach(([x, yy]) => {
      ctx.save();
      ctx.shadowColor = 'rgba(242,166,90,.9)'; ctx.shadowBlur = 26;
      rr(ctx, x * W - 9, y0 + yy * h, 18, 26, 9); ctx.fill();
      ctx.restore();
    });
  }

  function frameBorder(ctx) {
    ctx.strokeStyle = C.verm; ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    rr(ctx, 24, 24, W - 48, H - 48, 20); ctx.stroke();
    ctx.setLineDash([]);
  }

  function footer(ctx, line1, line2) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.dim; ctx.font = `21px ${SANS}`;
    ctx.fillText(line1, W / 2, H - 96);
    ctx.font = `19px ${SANS}`;
    const max = W - 140;
    if (ctx.measureText(line2).width > max) {
      const mid = Math.ceil(line2.length / 2);
      ctx.fillText(line2.slice(0, mid), W / 2, H - 64);
      ctx.fillText(line2.slice(mid), W / 2, H - 38);
    } else ctx.fillText(line2, W / 2, H - 64);
  }

  function youth() {
    const y = Store.state.youth;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    if (!artHeader(ctx, artNight, 0, 360)) street(ctx, 0, 360);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = `34px ${SERIF}`;
    ctx.fillText('匠 心 老 街', W / 2, 84);
    ctx.fillStyle = C.lantern; ctx.font = `bold 56px ${SERIF}`;
    ctx.fillText('新 村 民 证', W / 2, 158);

    ctx.fillStyle = C.ink; ctx.font = `bold 76px ${SERIF}`;
    ctx.fillText(y.nickname || '新村民', W / 2, 470);
    ctx.fillStyle = C.dim; ctx.font = `26px ${SANS}`;
    const cityLine = (y.city ? y.city + ' · ' : '') + '第一次进村';
    ctx.fillText(cityLine, W / 2, 520);

    // 称号
    ctx.font = `30px ${SERIF}`;
    const title = Store.title('youth');
    ctx.fillStyle = C.bamboo;
    ctx.fillText('—— ' + title + ' ——', W / 2, 580);

    // 行囊
    ctx.fillStyle = C.dim; ctx.font = `24px ${SANS}`;
    ctx.fillText('行囊里装着', W / 2, 650);
    const bags = y.bagItems.map(id => {
      const it = DATA.bagItems.find(b => b.id === id);
      return it ? `${it.emoji} ${it.name}` : '';
    }).filter(Boolean);
    chipRow(ctx, bags.length ? bags : ['🌱 一颗好奇心'], 676);

    // 想去的工坊
    ctx.fillStyle = C.dim; ctx.font = `24px ${SANS}`;
    ctx.fillText(y.keepsakes.length ? '我想去的工坊' : '这次先逛逛，灯都替我记得', W / 2, 810);
    if (y.keepsakes.length) {
      const ks = y.keepsakes.slice(0, 3).map(id => {
        const w = DATA.workshops.find(s => s.id === id);
        return `${w.emoji} ${w.name}`;
      });
      chipRow(ctx, ks, 836, `24px ${SANS}`);
      if (y.keepsakes.length > 3) {
        ctx.fillStyle = C.dim; ctx.font = `22px ${SANS}`;
        ctx.fillText(`…还有 ${y.keepsakes.length - 3} 间`, W / 2, 940);
      }
    }

    // 印章与编号
    seal(ctx, W / 2 - 160, 1060, 78, title);
    ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.font = `26px ${SANS}`;
    ctx.fillText(`点亮灯笼 ${y.stamps.length} 盏`, W / 2 - 50, 1040);
    ctx.fillStyle = C.verm; ctx.font = `bold 34px ${SERIF}`;
    ctx.fillText(`第 ${y.visitorNo || Store.globalLights()} 位新村民`, W / 2 - 50, 1092);

    frameBorder(ctx);
    footer(ctx, '街上还缺手艺人。把这条街，转给你认识的师傅。',
      '乡村工匠「焕青计划」· 中国乡村发展基金会、小红书、《时装》杂志社、乡村笔记联合发起');
    return cv.toDataURL('image/png');
  }

  function craftsman() {
    const c = Store.state.craftsman;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    if (!artHeader(ctx, artDay, 0, 300)) street(ctx, 0, 300);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = `30px ${SERIF}`;
    ctx.fillText('匠 心 老 街', W / 2, 80);

    // 木招牌
    ctx.fillStyle = '#6b513a';
    rr(ctx, W / 2 - 240, 360, 480, 110, 14); ctx.fill();
    ctx.strokeStyle = '#8a6f4d'; ctx.lineWidth = 6;
    rr(ctx, W / 2 - 240, 360, 480, 110, 14); ctx.stroke();
    ctx.fillStyle = '#f7efe2'; ctx.font = `bold 52px ${SERIF}`;
    ctx.fillText(c.workshopName || '匠心坊', W / 2, 432);

    ctx.fillStyle = C.ink; ctx.font = `bold 60px ${SERIF}`;
    ctx.fillText(c.name || '老师傅', W / 2, 570);
    const craft = c.craftType === '其他' ? (c.craftCustom || '手艺') : c.craftType;
    ctx.fillStyle = C.bamboo; ctx.font = `30px ${SERIF}`;
    ctx.fillText(`与${craft}相处的${c.years || '许多年'}`, W / 2, 630);
    if (c.region) { ctx.fillStyle = C.dim; ctx.font = `26px ${SANS}`; ctx.fillText('📍 ' + c.region, W / 2, 680); }

    if (c.intro) {
      ctx.fillStyle = C.ink; ctx.font = `28px ${SERIF}`;
      ctx.fillText('「' + c.intro + '」', W / 2, 750);
    }

    ctx.fillStyle = C.dim; ctx.font = `24px ${SANS}`;
    ctx.fillText('我家的门，这样开', W / 2, 830);
    const fs = c.visibility.slice(0, 3).map(id => {
      const f = DATA.furniture.find(x => x.id === id);
      return `${f.emoji} ${f.name}`;
    });
    if (fs.length) chipRow(ctx, fs, 856, `24px ${SANS}`);
    if (c.visibility.length > 3) {
      ctx.fillStyle = C.dim; ctx.font = `22px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(`…一共开了 ${c.visibility.length} 扇门`, W / 2, 960);
    }

    seal(ctx, W / 2 - 160, 1080, 78, Store.title('craftsman'));
    ctx.fillStyle = C.verm; ctx.textAlign = 'left'; ctx.font = `bold 34px ${SERIF}`;
    ctx.fillText(`老街第 ${c.workshopNo || 1} 号工坊`, W / 2 - 50, 1095);

    frameBorder(ctx);
    footer(ctx, '徒弟还没来？把这条街转给一个年轻人。',
      '乡村工匠「焕青计划」· 中国乡村发展基金会、小红书、《时装》杂志社、乡村笔记联合发起');
    return cv.toDataURL('image/png');
  }

  /* 学徒帖：驿站「想去」清单的分享图 */
  function apprentice() {
    const y = Store.state.youth;
    const all = [...DATA.station.learn, ...DATA.station.trips];
    const picks = y.wishTrips.map(id => all.find(p => p.id === id)).filter(Boolean);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    if (!artHeader(ctx, artDay, 0, 320)) street(ctx, 0, 320);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = `32px ${SERIF}`;
    ctx.fillText('匠 心 老 街 · 驿 站', W / 2, 86);
    ctx.fillStyle = C.lantern; ctx.font = `bold 58px ${SERIF}`;
    ctx.fillText('学 徒 帖', W / 2, 168);

    ctx.fillStyle = C.ink; ctx.font = `bold 56px ${SERIF}`;
    ctx.fillText(y.nickname || '新村民', W / 2, 430);
    ctx.fillStyle = C.dim; ctx.font = `26px ${SANS}`;
    ctx.fillText('要从纸上村，走进真村子', W / 2, 480);

    let yy = 580;
    picks.slice(0, 5).forEach(p => {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#E4D5BE'; ctx.lineWidth = 2;
      rr(ctx, 70, yy, W - 140, 96, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.font = `bold 28px ${SANS}`;
      ctx.fillText(`${p.emoji} ${p.title}`, 100, yy + 42);
      ctx.fillStyle = C.bamboo; ctx.font = `22px ${SANS}`;
      ctx.fillText(`${p.place} · ${p.days}`, 100, yy + 76);
      yy += 116;
    });

    seal(ctx, W / 2 + 170, yy + 90, 70, '想去');
    ctx.fillStyle = C.verm; ctx.textAlign = 'left'; ctx.font = `bold 32px ${SERIF}`;
    ctx.fillText(`第 ${y.visitorNo || Store.globalLights()} 位新村民`, 90, yy + 86);
    ctx.fillStyle = C.dim; ctx.font = `24px ${SANS}`;
    ctx.fillText('在驿站挂了木牌', 90, yy + 126);

    frameBorder(ctx);
    footer(ctx, '你的工坊，在村里等你。',
      '乡村工匠「焕青计划」· 中国乡村发展基金会、小红书、《时装》杂志社、乡村笔记联合发起');
    return cv.toDataURL('image/png');
  }

  return { youth, craftsman, apprentice };
})();
