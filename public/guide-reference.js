(async () => {
  const [ref, cardMedia] = await Promise.all([
    fetch('/guide-reference.json').then(r => r.json()),
    fetch('/data/card-media.json').then(r => r.json()).catch(() => [])
  ]);

  const el = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  };

  const ERA_META = {
    '2018': {
      title: '翼启之年 · 初代四组齐聚',
      desc: 'illumination STARS、L\'Antica、放课后、ALSTROEMERIA 共同开启 283 事务所的故事。',
      color: '#38bdf8',
      members: ['樱木真乃', '月冈恋钟', '小宫果穗', '大崎甘奈'],
      artIdol: '樱木真乃'
    },
    '2019': {
      title: '迷光初绽 · Straylight 登场',
      desc: '鲜明个性与炙热舞台碰撞，283 迎来了第五支锋芒毕露的新生力量。',
      color: '#f43f5e',
      members: ['芹泽朝日', '黛冬优子', '和泉爱依'],
      artIdol: '芹泽朝日'
    },
    '2020': {
      title: '透明之夏 · noctchill 启航',
      desc: '青梅竹马四人的透明青春，为事务所吹来清澈而真挚的海风。',
      color: '#0ea5e9',
      members: ['浅仓透', '樋口圆香', '福丸小糸', '市川雏菜'],
      artIdol: '浅仓透'
    },
    '2021': {
      title: '绯红与紫罗兰 · SHHis 降临',
      desc: '极致的追梦渴望与细腻心弦交织，双人组合开启全新张力篇章。',
      color: '#10b981',
      members: ['七草日花', '绯田美琴'],
      artIdol: '七草日花'
    },
    '2022': {
      title: '越境共鸣 · 事务所群像深化',
      desc: '跨组合羁绊与高规格大型活动接连上演，每位偶像都在蜕变中闪耀。',
      color: '#8b5cf6',
      members: ['风野灯织', '八宫巡', '田中摩美美', '杜野凛世'],
      artIdol: '风野灯织'
    },
    '2023': {
      title: '彗星划破夜空 · CoMETIK 登场',
      desc: '黑曜石般的孤高与炽热光芒交汇，第八支组合为 283 注入全新引力。',
      color: '#6366f1',
      members: ['斑鸠路加', '铃木羽那', '郁田春希'],
      artIdol: '斑鸠路加'
    },
    '2024': {
      title: '闪耀新章 · 棱镜物语共振',
      desc: '多线叙事与全新企划并进，记录她们迈向更广阔舞台的每一步。',
      color: '#ec4899',
      members: ['樱木真乃', '芹泽朝日', '浅仓透', '斑鸠路加'],
      artIdol: '黛冬优子'
    },
    '2025': {
      title: '流光续篇 · 多维轨迹延展',
      desc: '回望初心与奔赴未来的交汇点，更多群像故事在此汇聚。',
      color: '#f59e0b',
      members: ['黛冬优子', '樋口圆香', '七草日花', '铃木羽那'],
      artIdol: '樋口圆香'
    },
    '2026': {
      title: '向阳而行 · 无限闪耀未来',
      desc: '属于 283 事务所与制作人的全新旅途，此刻仍在继续书写。',
      color: '#06b6d4',
      members: ['樱木真乃', '月冈恋钟', '浅仓透', '斑鸠路加'],
      artIdol: '月冈恋钟'
    }
  };

  function pickEraArt(yearKey, era) {
    if (!Array.isArray(cardMedia) || !cardMedia.length) return { url: '', cardId: '', cardName: '' };
    const memberSet = new Set(era.members || []);
    const isHigh = c => c.rarity === 'UR' || c.rarity === 'SSR' || c.rarity === 'SR';
    // Strictly genuine full-CG awakened P-UR/P-SSR/P-SR cards (excludes all standing-pose / 1-image / 0-story promo cards)
    const STANDING_RE = /こどもたち|白いツバサ|283プロのヒナ|アイドルロード/;
    const isFullCG = c =>
      c.type === 'idols' &&
      Array.isArray(c.images) &&
      c.images.length >= 2 &&
      c.images.some(i => i.kind === 'fes' && i.path) &&
      !STANDING_RE.test(String(c.name || '')) &&
      ((Array.isArray(c.stories) && c.stories.length > 0) || (Array.isArray(c.movies) && c.movies.length > 0));
    const pickRand = arr => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
    const toInfo = c => {
      if (!c) return { url: '', cardId: '', cardName: '' };
      const fes = c.images.find(i => i.kind === 'fes' && i.path);
      const any = c.images.find(i => i.path);
      const url = (fes || any)?.path ? '/asset-original/' + (fes || any).path : '';
      return { url, cardId: String(c.id || ''), cardName: String(c.name || '') };
    };
    const exactPool = cardMedia.filter(c => isFullCG(c) && isHigh(c) && String(c.releaseDate || '').startsWith(yearKey) && (c.idol === era.artIdol || memberSet.has(c.idol)));
    if (exactPool.length) return toInfo(pickRand(exactPool));
    const idolPool = cardMedia.filter(c => isFullCG(c) && isHigh(c) && (c.idol === era.artIdol || memberSet.has(c.idol)));
    if (idolPool.length) return toInfo(pickRand(idolPool));
    const yearPool = cardMedia.filter(c => isFullCG(c) && isHigh(c) && String(c.releaseDate || '').startsWith(yearKey));
    return toInfo(pickRand(yearPool));
  }

  function eraOf(yearStr) {
    const m = String(yearStr || '').match(/20\d{2}/);
    const key = m ? m[0] : '';
    const base = ERA_META[key] || {
      title: '283 企划编年史 · 精选篇章',
      desc: '按参考指引整理的重要活动与越境故事节点。',
      color: '#38bdf8',
      members: ['樱木真乃', '风野灯织', '八宫巡'],
      artIdol: '樱木真乃'
    };
    const art = pickEraArt(key, base);
    return { ...base, yearKey: key, artUrl: art.url, artCardId: art.cardId, artCardName: art.cardName };
  }

  function mountPortraitCluster(container, members) {
    container.innerHTML = '';
    (members || []).forEach(name => {
      const chip = el('span', '', 'st-portrait-chip');
      chip.title = name;
      if (window.CharacterPortraits?.mount) {
        window.CharacterPortraits.mount(chip, name);
      } else {
        chip.textContent = name.slice(0, 1);
        window.addEventListener('DOMContentLoaded', () => window.CharacterPortraits?.mount?.(chip, name), { once: true });
      }
      container.append(chip);
    });
  }

  const ARC_CANONICAL = [
    { re: /^w\.?i\.?n\.?g\.?[編篇]?$/i, group: 'W.I.N.G.篇', label: 'W.I.N.G.篇 · 全偶像主线培育篇' },
    { re: /^(ファン)?[感感谢謝]謝?祭[編篇]?$/i, group: 'ファン感謝祭篇', label: '粉丝感谢祭篇 · 全偶像主线培育篇' },
    { re: /^g\.?r\.?a\.?d\.?[編篇]?$/i, group: 'G.R.A.D.篇', label: 'G.R.A.D.篇 · 全偶像主线培育篇' },
    { re: /^landing\s*point[編篇]?$/i, group: 'Landing Point篇', label: 'Landing Point篇 · 全偶像主线培育篇' },
    { re: /^s\.?t\.?e\.?p\.?[編篇]?$/i, group: 'S.T.E.P.篇', label: 'S.T.E.P.篇 · 全偶像主线培育篇' }
  ];

  function normGroupKey(s) {
    return String(s || '')
      .replace(/編/g, '篇')
      .replace(/[·・•･]/g, '·')
      .replace(/[―─—–-]/g, '-')
      .replace(/[：:]/g, ':')
      .replace(/[～~]/g, '~')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  function resolveTimelineLinks(row) {
    const rawGroups = Array.isArray(row.groups) ? row.groups.filter(Boolean) : [];
    if (!rawGroups.length) return [];
    const arcHit = ARC_CANONICAL.find(a => a.re.test(String(row.title || '').trim()) || rawGroups.some(g => a.re.test(String(g).trim())));
    if (arcHit) {
      return [{ group: arcHit.group, label: arcHit.label }];
    }
    const seen = new Set();
    const unique = [];
    for (const g of rawGroups) {
      const k = normGroupKey(g);
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(g);
    }
    return unique.map(group => {
      const sameAsTitle = normGroupKey(group) === normGroupKey(row.title);
      const label = (unique.length > 1 && !sameAsTitle) ? `${row.title} ／ ${group}` : row.title;
      return { group, label };
    });
  }

  function entries(rows) {
    const box = el('div', '', 'stories');
    for (const row of rows) {
      const item = el('div');
      item.append(el('small', row.date + ' · '));
      const links = resolveTimelineLinks(row);
      if (links.length) {
        for (const { group, label } of links) {
          const link = el('a', label);
          link.href = '/guide.html?' + new URLSearchParams({ group }) + '#archive';
          link.dataset.timelineGroup = group;
          item.append(link, el('br'));
        }
      } else {
        const near = row.near && row.near.length ? row.near : null;
        const hint = near
          ? '〔待匹配 · 疑似「' + String(near[0]).replace(/^【/, '').replace(/】.*$/, '') + '」〕'
          : '〔本地待匹配〕';
        const span = el('span', row.title + hint, 'unmatched');
        span.dataset.timelineKey = `${row.date || ''}::${row.title || ''}`;
        if (near) span.title = '本地近似分组：' + near.join('、');
        item.append(span);
      }
      box.append(item);
    }
    return box;
  }

  async function mount() {
    if (!document.querySelector('.unit')) {
      setTimeout(mount, 100);
      return;
    }

    // 1. Mount per-unit event timelines inside unit cards
    for (const unit of document.querySelectorAll('.unit')) {
      const h2 = unit.querySelector('h2');
      if (!h2) continue;
      const group = ref.events.find(x => h2.textContent.includes(x.unit));
      if (!group) continue;
      const d = el('details', '', 'idol');
      const unitMatched = group.entries.filter(x => x.groups.length).length;
      d.append(
        el('summary', '组合活动 · 按指引日期（已匹配 ' + unitMatched + ' / ' + group.entries.length + '）'),
        entries(group.entries)
      );
      unit.append(d);
    }

    // 2. Mount Illustrated Scrollytelling Chronicle inside #timeline
    const panel = document.querySelector('#timeline');
    if (!panel || !Array.isArray(ref.timeline) || !ref.timeline.length) return;

    panel.classList.add('scrollytelling-chronicle');
    panel.innerHTML = '';

    const head = el('div', '', 'st-head');
    head.append(
      el('p', '283 CHRONICLE · SCROLLYTELLING', 'eyebrow'),
      el('h2', '整体时序 · 283 企划编年史')
    );
    panel.append(head);

    const layout = el('div', '', 'st-layout');

    // Left Sticky Stage (use <div> to avoid app.css global bare `aside` sidebar styles!)
    const stage = el('div', '', 'st-stage');
    stage.setAttribute('role', 'region');
    stage.setAttribute('aria-label', '当前时序章节舞台');

    const stageInner = el('div', '', 'st-stage-card');
    const stageGlow = el('div', '', 'st-stage-glow');
    stageGlow.setAttribute('aria-hidden', 'true');

    // Cinematic 2-Layer Crossfade Artwork Showcase inside Sticky Stage (clickable -> opens exact card!)
    const stageVisual = el('a', '', 'st-stage-visual');
    stageVisual.href = 'card-gallery.html';
    const stageArtA = document.createElement('img');
    stageArtA.className = 'st-stage-art is-front';
    stageArtA.alt = '283 企划年代代表卡面';
    const stageArtB = document.createElement('img');
    stageArtB.className = 'st-stage-art';
    stageArtB.alt = '';
    stageArtB.setAttribute('aria-hidden', 'true');
    const stageArtShade = el('div', '', 'st-stage-art-shade');
    stageArtShade.setAttribute('aria-hidden', 'true');
    const stageCardHint = el('span', '查看此卡面 ↗', 'st-stage-card-hint');
    const stageMembers = el('div', '', 'st-stage-members');
    stageVisual.append(stageArtA, stageArtB, stageArtShade, stageCardHint, stageMembers);

    stageVisual.addEventListener('click', (e) => {
      const cardId = stageVisual.dataset.cardId;
      if (!cardId) return;
      const targetUrl = 'card-gallery.html?card=' + encodeURIComponent(cardId);
      try {
        if (window.parent && window.parent !== window && window.parent.__shinyShell?.navigate) {
          e.preventDefault();
          window.parent.__shinyShell.navigate(targetUrl);
          return;
        }
      } catch {}
    });

    const stageBody = el('div', '', 'st-stage-body');
    const stageWm = el('span', String(ref.timeline[0].year), 'st-stage-wm');
    stageWm.setAttribute('aria-hidden', 'true');
    const stageEyebrow = el('small', 'ERA CHAPTER', 'st-stage-eyebrow');
    const stageYear = el('div', String(ref.timeline[0].year), 'st-stage-year');
    const stageTitle = el('h3', eraOf(ref.timeline[0].year).title, 'st-stage-title');
    const stageDesc = el('p', eraOf(ref.timeline[0].year).desc, 'st-stage-desc');

    const stageMetrics = el('div', '', 'st-stage-metrics');
    const mTotal = el('span', '', 'st-metric');
    const mMatched = el('span', '', 'st-metric');
    stageMetrics.append(mTotal, mMatched);

    const progressTrack = el('div', '', 'st-progress-track');
    const progressFill = el('div', '', 'st-progress-fill');
    progressTrack.append(progressFill);

    const navDots = el('nav', '', 'st-year-dots');
    navDots.setAttribute('aria-label', '年份快速跳转');

    stageBody.append(stageWm, stageEyebrow, stageYear, stageTitle, stageDesc, stageMetrics, progressTrack, navDots);
    stageInner.append(stageGlow, stageVisual, stageBody);
    stage.append(stageInner);

    // Right Scrollable Narrative Chapters
    const chaptersWrap = el('div', '', 'st-chapters');
    const chapterMeta = [];

    ref.timeline.forEach((year, idx) => {
      const ym = year.entries.filter(x => x.groups.length).length;
      const era = eraOf(year.year);
      const chapter = el('article', '', 'st-chapter');
      chapter.dataset.yearIdx = String(idx);
      chapter.dataset.era = era.yearKey || '';
      chapter.style.setProperty('--st-accent', era.color);

      // Subtle feathered unit card art backdrop on right edge of chapter
      if (era.artUrl) {
        const chArt = document.createElement('img');
        chArt.className = 'st-chapter-art';
        chArt.src = era.artUrl;
        chArt.alt = '';
        chArt.loading = 'lazy';
        chArt.setAttribute('aria-hidden', 'true');
        chapter.append(chArt);
      }

      const chHead = el('div', '', 'st-chapter-head');
      const chBadge = el('span', String(year.year), 'st-chapter-badge');
      const chEra = el('strong', era.title, 'st-chapter-era');
      const chPortraits = el('div', '', 'st-chapter-portraits');
      mountPortraitCluster(chPortraits, era.members);
      const chStat = el('small', `${year.entries.length} 条记录 · 已匹配 ${ym}`, 'st-chapter-stat');
      chHead.append(chBadge, chEra, chPortraits, chStat);

      // Show up to 3 headline milestone chips
      const highlights = el('div', '', 'st-chapter-highlights');
      year.entries.slice(0, 3).forEach(r => {
        highlights.append(el('span', `${r.date} ${r.title}`, 'st-hl-chip'));
      });

      const d = el('details', '', 'idol st-chapter-details');
      d.append(
        el('summary', `展开 ${year.year} 全部 ${year.entries.length} 条时序（已匹配 ${ym} · 待匹配 ${year.entries.length - ym}）`),
        entries(year.entries)
      );

      chapter.append(chHead, highlights, d);
      chaptersWrap.append(chapter);

      // Jump dot on sticky stage
      const dot = el('button', String(year.year).replace(/[^0-9]/g, '').slice(-4) || String(year.year), 'st-dot');
      dot.type = 'button';
      dot.title = `${year.year} · ${era.title}`;
      dot.addEventListener('click', () => {
        chapter.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      navDots.append(dot);

      chapterMeta.push({ year, ym, era, chapter, dot });
    });

    layout.append(stage, chaptersWrap);
    panel.append(layout);

    // Background preload all era artworks so first click/scroll NEVER flashes blank!
    const preloadedUrls = new Set();
    chapterMeta.forEach(m => {
      if (m.era.artUrl && !preloadedUrls.has(m.era.artUrl)) {
        preloadedUrls.add(m.era.artUrl);
        const pre = new Image();
        pre.decoding = 'async';
        pre.src = m.era.artUrl;
      }
    });

    let activeIdx = -1;
    let artReqId = 0;
    let frontSlot = 0; // 0 -> stageArtA, 1 -> stageArtB
    const artLayers = [stageArtA, stageArtB];

    const activateChapter = (idx) => {
      if (idx === activeIdx || idx < 0 || idx >= chapterMeta.length) return;
      const dir = activeIdx === -1 ? 1 : (idx > activeIdx ? 1 : -1);
      activeIdx = idx;
      const item = chapterMeta[idx];

      stageInner.style.setProperty('--st-accent', item.era.color);
      stageInner.dataset.era = item.era.yearKey || '';
      stageInner.dataset.dir = dir > 0 ? 'next' : 'prev';
      panel.dataset.era = item.era.yearKey || '';

      // Trigger smooth directional choreography on year, watermark, title, desc & metrics
      stageBody.classList.remove('is-switching');
      void stageBody.offsetWidth;
      stageWm.textContent = String(item.year.year).replace(/[^0-9]/g, '').slice(-4) || String(item.year.year);
      stageYear.textContent = String(item.year.year);
      stageTitle.textContent = item.era.title;
      stageDesc.textContent = item.era.desc;
      mTotal.textContent = `当年记录 ${item.year.entries.length} 条`;
      mMatched.textContent = `已收录剧情 ${item.ym} 条`;
      stageBody.classList.add('is-switching');

      // True 2-layer crossfade for era artwork (zero snap, zero flash)
      if (item.era.artUrl) {
        stageVisual.hidden = false;
        stageVisual.dataset.cardId = item.era.artCardId || '';
        stageVisual.href = item.era.artCardId
          ? ('card-gallery.html?card=' + encodeURIComponent(item.era.artCardId))
          : 'card-gallery.html';
        stageVisual.title = item.era.artCardName ? ('点击查看卡面：' + item.era.artCardName) : '点击查看对应卡面';

        const myReq = ++artReqId;
        const nextUrl = item.era.artUrl;
        const curFront = artLayers[frontSlot];
        if (curFront.dataset.loadedUrl !== nextUrl) {
          const backSlot = 1 - frontSlot;
          const nextLayer = artLayers[backSlot];
          const doCrossfade = () => {
            if (myReq !== artReqId) return;
            nextLayer.dataset.loadedUrl = nextUrl;
            // Keep curFront fully opaque underneath (.is-under) while nextLayer fades in smoothly on top (.is-front)
            nextLayer.classList.remove('is-front', 'is-under', 'is-loaded');
            void nextLayer.offsetWidth;
            curFront.classList.remove('is-front');
            curFront.classList.add('is-under');
            requestAnimationFrame(() => {
              if (myReq !== artReqId) return;
              nextLayer.classList.add('is-loaded', 'is-front');
              frontSlot = backSlot;
            });
          };
          nextLayer.src = nextUrl;
          if (nextLayer.complete && nextLayer.naturalWidth > 0) {
            if (nextLayer.decode) nextLayer.decode().then(doCrossfade, doCrossfade);
            else doCrossfade();
          } else {
            nextLayer.onload = () => {
              if (nextLayer.decode) nextLayer.decode().then(doCrossfade, doCrossfade);
              else doCrossfade();
            };
          }
        } else {
          curFront.classList.add('is-loaded', 'is-front');
        }
      } else {
        stageVisual.hidden = true;
      }

      // Staggered spring entrance for unit member portraits
      mountPortraitCluster(stageMembers, item.era.members);
      Array.from(stageMembers.children).forEach((chip, ci) => {
        chip.style.setProperty('--chip-delay', `${ci * 55}ms`);
        chip.classList.add('is-pop-in');
      });

      const pct = chapterMeta.length > 1 ? (idx / (chapterMeta.length - 1)) * 100 : 100;
      progressFill.style.width = `${Math.max(8, pct)}%`;

      chapterMeta.forEach((m, i) => {
        m.chapter.classList.toggle('is-active', i === idx);
        m.dot.classList.toggle('is-active', i === idx);
      });
    };

    activateChapter(0);

    // IntersectionObserver drives Scrollytelling stage transitions cleanly at 60fps
    if (typeof IntersectionObserver !== 'undefined') {
      const stIO = new IntersectionObserver((entriesList) => {
        for (const ent of entriesList) {
          if (ent.isIntersecting) {
            const idx = Number(ent.target.dataset.yearIdx);
            if (Number.isFinite(idx)) activateChapter(idx);
          }
        }
      }, { rootMargin: '-28% 0px -48% 0px', threshold: 0.05 });

      // Hover over any chapter card or year dot -> smoothly showcase that year on the sticky stage!
      let hoverTimer = 0;
      const scheduleHoverActivate = (targetIdx) => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => activateChapter(targetIdx), 55);
      };
      chapterMeta.forEach((m, i) => {
        m.chapter.addEventListener('pointerenter', (e) => {
          if (e.pointerType === 'mouse') scheduleHoverActivate(i);
        });
        m.dot.addEventListener('pointerenter', (e) => {
          if (e.pointerType === 'mouse') scheduleHoverActivate(i);
        });
      });

      chapterMeta.forEach(m => stIO.observe(m.chapter));
    }
    window.ShinyWatchedStories?.syncAll?.();
  }

  mount();
})().catch(e => {
  const t = document.querySelector('#timeline');
  if (t) t.textContent = '参考时序载入失败：' + e.message;
});
