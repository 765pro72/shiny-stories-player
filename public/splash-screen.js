/* ═══════════════════════════════════════════════════════════════════
   ShinyStories — Startup Splash, Update Check & Birthday Choreography
   ═══════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  // 28 idols + staff birthdays (MM-DD) and fallback candidates ordered by latest year
  const IDOL_BIRTHDAYS = {
    '1': { name: '樱木真乃', date: '04-25', candidates: ['special_communications/4902008001.json','special_communications/4902007001.json','special_communications/4902005001.json','special_communications/4902004001.json','special_communications/4902003001.json','special_communications/4902002001.json','special_communications/490200101.json'] },
    '2': { name: '风野灯织', date: '03-04', candidates: ['special_communications/4902007002.json','special_communications/4902006002.json','special_communications/4902005002.json','special_communications/4902004002.json','special_communications/4902003002.json','special_communications/4902002002.json','special_communications/490200102.json'] },
    '3': { name: '八宫巡', date: '06-23', candidates: ['special_communications/4902008003.json','special_communications/4902007003.json','special_communications/4902005003.json','special_communications/4902004003.json','special_communications/4902003003.json','special_communications/4902002003.json','special_communications/490200103.json'] },
    '4': { name: '月冈恋钟', date: '02-25', candidates: ['special_communications/4902007004.json','special_communications/4902006004.json','special_communications/4902005004.json','special_communications/4902004004.json','special_communications/4902003004.json','special_communications/4902002004.json','special_communications/490200104.json'] },
    '5': { name: '田中摩美美', date: '03-25', candidates: ['special_communications/4902008005.json','special_communications/4902007005.json','special_communications/4902005005.json','special_communications/4902004005.json','special_communications/4902003005.json','special_communications/4902002005.json','special_communications/490200105.json'] },
    '6': { name: '白濑咲耶', date: '06-27', candidates: ['special_communications/4902008006.json','special_communications/4902007006.json','special_communications/4902005006.json','special_communications/4902004006.json','special_communications/4902003006.json','special_communications/4902002006.json','special_communications/490200106.json'] },
    '7': { name: '三峰结华', date: '01-16', candidates: ['special_communications/4902007007.json','special_communications/4902006007.json','special_communications/4902005007.json','special_communications/4902004007.json','special_communications/4902003007.json','special_communications/4902002007.json','special_communications/490200107.json'] },
    '8': { name: '幽谷雾子', date: '09-20', candidates: ['special_communications/4902008008.json','special_communications/4902007008.json','special_communications/4902006008.json','special_communications/4902005008.json','special_communications/4902004008.json','special_communications/4902003008.json','special_communications/490200108.json'] },
    '9': { name: '小宫果穗', date: '07-29', candidates: ['special_communications/4902008009.json','special_communications/4902007009.json','special_communications/4902005009.json','special_communications/4902004009.json','special_communications/4902003009.json','special_communications/4902002009.json','special_communications/490200109.json'] },
    '10': { name: '园田智代子', date: '02-24', candidates: ['special_communications/4902007010.json','special_communications/4902006010.json','special_communications/4902005010.json','special_communications/4902004010.json','special_communications/4902003010.json','special_communications/4902002010.json','special_communications/490200110.json'] },
    '11': { name: '西城树里', date: '11-26', candidates: ['special_communications/4902007011.json','special_communications/4902006011.json','special_communications/4902005011.json','special_communications/4902004011.json','special_communications/4902003011.json','special_communications/4902002011.json','special_communications/490200111.json'] },
    '12': { name: '杜野凛世', date: '10-19', candidates: ['special_communications/4902008012.json','special_communications/4902007012.json','special_communications/4902006012.json','special_communications/4902005012.json','special_communications/4902004012.json','special_communications/4902003012.json','special_communications/490200112.json'] },
    '13': { name: '有栖川夏叶', date: '08-16', candidates: ['special_communications/4902008013.json','special_communications/4902007013.json','special_communications/4902006013.json','special_communications/4902005013.json','special_communications/4902004013.json','special_communications/4902003013.json','special_communications/490200113.json'] },
    '14': { name: '大崎甘奈', date: '12-25', candidates: ['special_communications/4902007014.json','special_communications/4902006014.json','special_communications/4902005014.json','special_communications/4902004014.json','special_communications/4902003014.json','special_communications/4902002014.json','special_communications/490200114.json'] },
    '15': { name: '大崎甜花', date: '12-25', candidates: ['special_communications/4902007015.json','special_communications/4902006015.json','special_communications/4902005015.json','special_communications/4902004015.json','special_communications/4902003015.json','special_communications/4902002015.json','special_communications/490200115.json'] },
    '16': { name: '桑山千雪', date: '04-18', candidates: ['special_communications/4902007016.json','special_communications/4902006016.json','special_communications/4902005016.json','special_communications/4902004016.json','special_communications/4902003016.json','special_communications/4902002016.json','special_communications/490200116.json'] },
    '17': { name: '芹泽朝日', date: '01-04', candidates: ['special_communications/4902007017.json','special_communications/4902006017.json','special_communications/4902005017.json','special_communications/4902004017.json','special_communications/4902003017.json','special_communications/4902002017.json','special_communications/490200117.json'] },
    '18': { name: '黛冬优子', date: '12-04', candidates: ['special_communications/4902007018.json','special_communications/4902006018.json','special_communications/4902005018.json','special_communications/4902004018.json','special_communications/4902003018.json','special_communications/4902002018.json','special_communications/490200118.json'] },
    '19': { name: '和泉爱依', date: '08-02', candidates: ['special_communications/4902008019.json','special_communications/4902007019.json','special_communications/4902006019.json','special_communications/4902005019.json','special_communications/4902004019.json','special_communications/4902003019.json','special_communications/490200119.json'] },
    '20': { name: '浅仓透', date: '05-04', candidates: ['special_communications/4902008020.json','special_communications/4902007020.json','special_communications/4902005020.json','special_communications/4902004020.json','special_communications/4902003020.json','special_communications/4902002020.json','special_communications/490200120.json'] },
    '21': { name: '樋口圆香', date: '10-27', candidates: ['special_communications/4902008021.json','special_communications/4902007021.json','special_communications/4902006021.json','special_communications/4902005021.json','special_communications/4902004021.json','special_communications/4902003021.json','special_communications/4902002021.json'] },
    '22': { name: '福丸小糸', date: '11-11', candidates: ['special_communications/4902008022.json','special_communications/4902007022.json','special_communications/4902006022.json','special_communications/4902005022.json','special_communications/4902004022.json','special_communications/4902003022.json','special_communications/4902002022.json'] },
    '23': { name: '市川雏菜', date: '03-17', candidates: ['special_communications/4902007023.json','special_communications/4902006023.json','special_communications/4902005023.json','special_communications/4902004023.json','special_communications/4902003023.json','special_communications/4902002023.json'] },
    '24': { name: '七草日花', date: '07-26', candidates: ['special_communications/4902008024.json','special_communications/4902007024.json','special_communications/4902005024.json','special_communications/4902004024.json','special_communications/4902003024.json','special_communications/4902002024.json'] },
    '25': { name: '绯田美琴', date: '09-08', candidates: ['special_communications/4902008025.json','special_communications/4902007025.json','special_communications/4902006025.json','special_communications/4902005025.json','special_communications/4902004025.json','special_communications/4902002025.json'] },
    '26': { name: '斑鸠路加', date: '01-31', candidates: ['special_communications/4902007026.json','special_communications/4902006026.json','special_communications/4902005026.json'] },
    '27': { name: '铃木羽那', date: '04-11', candidates: ['special_communications/4902008027.json','special_communications/4902007027.json','special_communications/4902006027.json'] },
    '28': { name: '郁田春希', date: '10-02', candidates: ['special_communications/4902007028.json','special_communications/4902006028.json','special_communications/4902005028.json'] },
    'staff': { name: '七草叶月', date: '07-03', candidates: ['special_communications/4902007091.json','special_communications/4902005091.json','special_communications/490200101.json'] }
  };

  function getTodayMMDD() {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${m}-${d}`;
  }

  function getTodayYYYYMMDD() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function safeStorage(type, action, key, value) {
    try {
      const store = type === 'session' ? window.sessionStorage : window.localStorage;
      if (!store) return null;
      if (action === 'get') return store.getItem(key);
      if (action === 'set') store.setItem(key, value);
      if (action === 'remove') store.removeItem(key);
    } catch {
      return null;
    }
  }

  const isMobilePlatform = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || document.documentElement.dataset.platform === 'android';

  let splashDismissed = false;
  function dismissSplash() {
    if (splashDismissed) return;
    const splash = document.getElementById('appSplash');
    if (!splash) return;
    splashDismissed = true;
    splash.classList.add('splash-dismissed');
    splash.style.pointerEvents = 'none';
    const hideDelay = isMobilePlatform ? 250 : 500;
    setTimeout(() => {
      splash.style.display = 'none';
      try { splash.remove(); } catch {}
    }, hideDelay);
  }

  // Inside shell.html iframe, the unified #shellBoot handles cold-boot preloading
  if (window.parent !== window) {
    document.addEventListener('DOMContentLoaded', dismissSplash);
    dismissSplash();
    return;
  }

  // Standalone index.html: trigger official startup Title Call once
  const triggerStandaloneTitleCall = () => {
    try { window.ShinyTitleCall?.play?.(); } catch {}
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', triggerStandaloneTitleCall, { once: true });
  } else {
    triggerStandaloneTitleCall();
  }

  // Universal fail-safe: wait for real assets (up to 4200ms desktop / 3600ms mobile)
  const MAX_BOOT_WAIT = isMobilePlatform ? 3600 : 4200;
  setTimeout(() => {
    dismissSplash();
    setTimeout(() => {
      const splash = document.getElementById('appSplash');
      if (splash) {
        splash.style.display = 'none';
        try { splash.remove(); } catch {}
      }
    }, 300);
  }, MAX_BOOT_WAIT);

  // Dismiss only after window load + fonts ready + calm minimum duration
  const splashStart = Date.now();
  window.addEventListener('load', async () => {
    try {
      if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]);
    } catch {}
    const elapsed = Date.now() - splashStart;
    const wait = Math.max(0, (isMobilePlatform ? 1000 : 1200) - elapsed);
    setTimeout(dismissSplash, wait);
  });

  // Tap or click anywhere on splash screen to force dismiss immediately
  document.addEventListener('pointerdown', (e) => {
    const splash = document.getElementById('appSplash');
    if (splash && splash.contains(e.target)) {
      dismissSplash();
    }
  }, { passive: true });

  function setStatus(text, badgeText) {
    const el = document.getElementById('splashStatus');
    if (el) el.textContent = text;
    const badge = document.getElementById('splashBadge');
    if (badge && badgeText) {
      badge.textContent = badgeText;
      badge.style.display = 'inline-flex';
    }
  }

  async function performBootTasks() {
    const splash = document.getElementById('appSplash');
    if (!splash || splashDismissed) return;

    // Only run startup splash and background update once per app session
    if (safeStorage('session', 'get', 'app_booted_session')) {
      dismissSplash();
      return;
    }
    safeStorage('session', 'set', 'app_booted_session', '1');

    try {
      const todayMMDD = getTodayMMDD();
      const todayFull = getTodayYYYYMMDD();
      const startTime = Date.now();

      // 1. Check Idol Birthday
      let birthdayIdol = null;
      let birthdayIdolKey = null;
      for (const [key, info] of Object.entries(IDOL_BIRTHDAYS)) {
        if (info.date === todayMMDD) {
          birthdayIdol = info;
          birthdayIdolKey = key;
          break;
        }
      }

      if (birthdayIdol) {
        setStatus(`🎂 今天是【${birthdayIdol.name}】的生日！正在优先预载生日特别剧情…`, '生日特别活动');
        if (birthdayIdol.latestStory) {
          try { fetch(`/asset/json/${birthdayIdol.latestStory}`).catch(() => {}); } catch {}
        }
      }

      // 2. Check Producer Birthday
      const producerBirthday = safeStorage('local', 'get', 'producer_birthday') || window.desktop?.getState()?.producer_birthday;
      const isProducerBirthday = producerBirthday && producerBirthday === todayMMDD;
      if (isProducerBirthday) {
        setStatus('🎉 祝制作人先生生日快乐！正在准备专属生日祝福…', '制作人诞生日');
      }

      // 3. Background Update Check on Launch
      const runUpdateCheck = async () => {
        if (!window.desktop?.checkUpdates) return;
        try {
          const timeoutMs = isMobilePlatform ? 1200 : 2500;
          const checkResult = await Promise.race([
            window.desktop.checkUpdates().catch(() => null),
            new Promise(r => setTimeout(() => r(null), timeoutMs))
          ]);
          if (checkResult?.newStories?.length || checkResult?.sources?.some(s => s.hasUpdate)) {
            document.querySelectorAll('#update').forEach(btn => {
              btn.classList.add('has-update');
              btn.title = '发现新内容更新！点击更新';
            });
            if (!birthdayIdol && !isProducerBirthday) {
              setStatus('发现新内容更新 · 准备就绪', '发现新剧情更新');
            }
          } else if (!birthdayIdol && !isProducerBirthday) {
            setStatus('公开资料已是最新 · 准备就绪');
          }
        } catch (e) {}
      };

      // Resolve available birthday story with fallback support
      async function resolvePlayableBirthdayStory(idolInfo) {
        if (!idolInfo?.candidates?.length) return null;
        for (const path of idolInfo.candidates) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 1000);
            const res = await fetch(`/asset/json/${path}`, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timer);
            if (res.ok) return path;
          } catch {}
        }
        return idolInfo.candidates[idolInfo.candidates.length - 1] || null;
      }

      if (birthdayIdol) {
        setStatus(`🎂 今天是【${birthdayIdol.name}】的诞生日！最高优先级拉取并准备全屏特别演出…`, '生日特别演出');
        runUpdateCheck().catch(() => {});
      } else if (window.desktop?.checkUpdates) {
        if (!isProducerBirthday) setStatus('正在检查公开资料更新…');
        await runUpdateCheck();
      }

      // Ensure splash remains visible briefly for visual rhythm (at least 500ms)
      const elapsed = Date.now() - startTime;
      const minWait = isMobilePlatform ? 350 : 600;
      if (elapsed < minWait) {
        await new Promise(r => setTimeout(r, minWait - elapsed));
      }

      dismissSplash();

      // Post-launch Birthday Actions
      // 用户明确要求：“主界面不要有重温生日剧情的弹窗，想看去设置里那个按钮就行”
      // 保持主界面纯净：不自动弹窗，不挂主页胶囊/横幅，只在看板设置对话框中保留重温入口
      attachWardrobeBirthdayButton();
      document.getElementById('wardrobe')?.addEventListener('click', () => {
        setTimeout(attachWardrobeBirthdayButton, 50);
      });
    } catch (err) {
      console.warn('Boot task error:', err);
    } finally {
      dismissSplash();
    }
  }

  function mountProducerBirthdayPill() {
    if (!document.body.classList.contains('page-home') || document.getElementById('producerBirthdayPill')) return;
    const isMobile = window.innerWidth <= 600 || document.documentElement.dataset.platform === 'android' || /Android|iPhone|iPad/i.test(navigator.userAgent);
    const pill = document.createElement('div');
    pill.id = 'producerBirthdayPill';
    pill.className = 'producer-birthday-pill';
    if (isMobile) {
      pill.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top, 0px) + 68px);left:16px;right:16px;z-index:90;display:flex;align-items:center;justify-content:center;gap:8px;padding:9px 16px;border-radius:999px;background:linear-gradient(135deg,rgba(255,248,231,0.96),rgba(255,240,245,0.96));border:1px solid #ffd1dc;box-shadow:0 6px 20px rgba(220,130,160,0.2);font-size:13px;font-weight:600;color:#7a445d;cursor:pointer;-webkit-tap-highlight-color:transparent;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);touch-action:manipulation;';
    } else {
      pill.style.cssText = 'position:fixed;top:82px;right:24px;z-index:90;display:flex;align-items:center;gap:10px;padding:8px 18px;border-radius:999px;background:linear-gradient(135deg,#fff8e7,#fff0f5);border:1px solid #ffd1dc;box-shadow:0 6px 22px rgba(220,130,160,0.22);font-size:13px;font-weight:600;color:#7a445d;cursor:pointer;animation:floatRibbon 3s ease-in-out infinite;transition:transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;';
    }
    pill.innerHTML = `<span style="font-size:16px">🎂</span><span>祝制作人生日快乐！点击重温专属庆贺</span><span style="font-weight:700;color:#c04b78">↗</span>`;
    pill.onclick = () => {
      showProducerBirthdayModal(true);
    };
    pill.onmouseenter = () => {
      if (!isMobile) pill.style.transform = 'translateY(-2px) scale(1.02)';
    };
    pill.onmouseleave = () => {
      if (!isMobile) pill.style.transform = '';
    };
    document.body.append(pill);
  }

  function attachWardrobeBirthdayButton() {
    const dialog = document.getElementById('wardrobeDialog');
    if (!dialog || document.getElementById('bdayReplayInWardrobe')) return;
    const container = dialog.querySelector('.settings-scroll') || dialog;
    const btn = document.createElement('button');
    btn.id = 'bdayReplayInWardrobe';
    btn.type = 'button';
    btn.className = 'producer-bday-retrigger-btn';
    btn.innerHTML = '🎂 重温制作人生日专属庆贺祝福 ↗';
    btn.style.cssText = 'display:block;width:100%;margin:12px 0 16px;padding:12px 16px;border-radius:12px;background:linear-gradient(135deg,#fff8e7,#fff0f5);border:1px solid #ffd1dc;box-shadow:0 4px 14px rgba(220,130,160,0.18);color:#880e4f;font-weight:700;font-size:14px;cursor:pointer;text-align:center;transition:all 0.2s cubic-bezier(0.16, 1, 0.3, 1);';
    btn.onmouseenter = () => { btn.style.transform = 'translateY(-2px) scale(1.01)'; };
    btn.onmouseleave = () => { btn.style.transform = ''; };
    btn.onclick = () => {
      dialog.close();
      showProducerBirthdayModal(true);
    };
    container.prepend(btn);
  }

  function mountIdolBirthdayBanner(birthdayIdol, targetStory) {
    if (!document.body.classList.contains('page-home') || document.getElementById('idolBirthdayBanner')) return;
    const isMobile = window.innerWidth <= 600 || document.documentElement.dataset.platform === 'android' || /Android|iPhone|iPad/i.test(navigator.userAgent);
    const banner = document.createElement('div');
    banner.id = 'idolBirthdayBanner';
    banner.className = 'idol-birthday-ribbon';
    if (isMobile) {
      banner.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top, 0px) + 68px);left:16px;right:16px;z-index:90;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;border-radius:999px;background:linear-gradient(135deg,#fff8e7f8,#fff0f5f8);border:1px solid #ffd1dc;box-shadow:0 6px 22px rgba(220,130,160,0.22);font-size:13px;color:#7a445d;cursor:pointer;-webkit-tap-highlight-color:transparent;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);touch-action:manipulation;';
    } else {
      banner.style.cssText = 'position:fixed;top:82px;right:24px;z-index:90;display:flex;align-items:center;gap:10px;padding:8px 16px;border-radius:999px;background:linear-gradient(135deg,#fff8e7,#fff0f5);border:1px solid #ffd1dc;box-shadow:0 6px 20px rgba(220,130,160,0.18);font-size:13px;color:#7a445d;cursor:pointer;animation:floatRibbon 3s ease-in-out infinite;';
    }
    banner.innerHTML = `<span style="font-size:16px">🎂</span><span>今天是【<strong>${birthdayIdol.name}</strong>】的诞生日！✨ 点击全屏观赏</span><span style="font-weight:600;color:#c04b78">↗</span>`;
    banner.onclick = () => {
      if (targetStory) location.href = `/player/main.html?key=${encodeURIComponent(targetStory)}&story=${encodeURIComponent(targetStory)}&from=home&birthday=true`;
    };
    document.body.append(banner);
  }

  function showProducerBirthdayModal(force = false) {
    const todayFull = getTodayYYYYMMDD();
    const producerGreetedKey = `producer_bday_greeted_${todayFull}`;
    const greetedDate = safeStorage('local', 'get', 'producer_bday_greeted_date') || 
                        safeStorage('local', 'get', producerGreetedKey) ||
                        window.desktop?.getState()?.producer_bday_greeted_date;
    const seenInSession = safeStorage('session', 'get', 'producer_bday_already_seen_session') === '1';
    if (!force && (seenInSession || greetedDate === todayFull || safeStorage('local', 'get', producerGreetedKey) === '1')) {
      return;
    }
    safeStorage('session', 'set', 'producer_bday_already_seen_session', '1');
    safeStorage('local', 'set', producerGreetedKey, '1');
    safeStorage('local', 'set', 'producer_bday_greeted_date', todayFull);
    try { window.desktop?.saveState({ producer_bday_greeted_date: todayFull }); } catch {}
    if (document.querySelector('.birthday-celebration-modal')) return;

    let pName = '';
    try {
      pName = (localStorage.getItem('shiny.producerName') || window.desktop?.getState()?.['shiny.producerName'] || '').trim();
    } catch {}
    const titleText = pName ? `祝【${pName}】制作人先生，生日快乐！` : '制作人先生，生日快乐！';

    const modal = document.createElement('div');
    modal.className = 'birthday-celebration-modal';
    modal.innerHTML = `
      <div class="birthday-card" role="dialog" aria-modal="true" aria-label="制作人生日祝福">
        <button type="button" class="birthday-modal-close" id="bdayCloseX" aria-label="关闭">✕</button>
        <span class="birthday-icon">🎂</span>
        <h3>${titleText}</h3>
        <p>今天是您的诞生日！感谢您一直以来的陪伴与指导！在崭新的一岁里，283 事务所的大家也期待着与您一起走向更加闪耀的舞台！✨</p>
        <div class="birthday-actions">
          <button type="button" id="bdayPlayStory" class="birthday-primary">收下祝福并开启生日庆典 🎉</button>
          <button type="button" id="bdayClose" class="birthday-secondary">收下祝福</button>
        </div>
      </div>
    `;
    document.body.append(modal);

    const closeModal = (celebrate = false) => {
      try { safeStorage('local', 'set', producerGreetedKey, '1'); } catch {}
      modal.remove();
      if (celebrate) {
        try {
          if (typeof window.triggerHomeBirthdayCelebration === 'function') {
            window.triggerHomeBirthdayCelebration();
          } else {
            window.homeStage?.speak?.();
          }
        } catch {}
      }
    };

    modal.querySelector('#bdayPlayStory').onclick = () => {
      closeModal(true);
      // Play official voiced Producer Birthday mini-commu story (special_communications/4903001XX.json)
      try {
        let idolId = '1';
        const inspected = window.homeMulti?.inspect?.();
        if (inspected && inspected.length > 0) {
          const rand = inspected[Math.floor(Math.random() * inspected.length)];
          if (rand?.id) idolId = String(rand.id);
        } else if (window.homeStage?.prefs?.idol) {
          idolId = String(window.homeStage.prefs.idol);
        }
        const pad = idolId === 'staff' ? '91' : String(Number(idolId) || 1).padStart(2, '0');
        const targetStory = `special_communications/4903001${pad}.json`;
        setTimeout(() => {
          location.href = `/player/main.html?key=${encodeURIComponent(targetStory)}&story=${encodeURIComponent(targetStory)}&from=home&birthday=true`;
        }, 300);
      } catch {}
    };
    modal.querySelector('#bdayClose').onclick = () => closeModal(false);
    modal.querySelector('#bdayCloseX')?.addEventListener('click', () => closeModal(false));
    modal.onclick = (e) => {
      if (e.target === modal) closeModal(false);
    };
    const escHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        window.removeEventListener('keydown', escHandler);
        closeModal(false);
      }
    };
    window.addEventListener('keydown', escHandler);
  }
  window.showProducerBirthdayModal = showProducerBirthdayModal;
  window.getTodayMMDD = getTodayMMDD;
  window.getTodayYYYYMMDD = getTodayYYYYMMDD;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', performBootTasks);
  } else {
    performBootTasks();
  }
})();
