(() => {
  const storageKey = 'shiny.storyQueue';
  const dialog = document.querySelector('#storyQueue');
  const list = dialog.querySelector('ol');
  const opener = document.querySelector('#openStoryQueue');
  const start = dialog.querySelector('[data-start]');
  const order = dialog.querySelector('[data-order]');
  const addResults = dialog.querySelector('[data-add-results]');
  const previous = dialog.querySelector('[data-previous]');
  const next = dialog.querySelector('[data-next]');
  const pageLabel = dialog.querySelector('[data-page]');
  const pageSize = 30;
  const queuedKeys = new Set();
  let rows = [];
  let playing = '';
  let page = 0, warmingKey = '', prefetch = null;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) rows = saved.filter(row => typeof row?.key === 'string' && typeof row.title === 'string');
  } catch {}

  function render() {
    queuedKeys.clear();
    for (const row of rows) queuedKeys.add(row.key);
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.max(0, Math.min(page, pages - 1));
    opener.textContent = `播放队列（${rows.length}）`;
    start.disabled = !rows.length;
    order.disabled = rows.length < 2;
    previous.disabled = page === 0;
    next.disabled = page + 1 >= pages;
    pageLabel.textContent = `${page + 1} / ${pages}`;
    dialog.querySelector('[data-pagination]').hidden = pages === 1;
    list.replaceChildren();
    list.start = page * pageSize + 1;
    rows.slice(page * pageSize, (page + 1) * pageSize).forEach((row, offset) => {
      const index = page * pageSize + offset;
      const item = document.createElement('li');
      const title = document.createElement('span');
      title.textContent = row.title;
      item.append(title,
        button('上移', () => move(index, -1), index === 0),
        button('下移', () => move(index, 1), index === rows.length - 1),
        button('移除', () => { rows.splice(index, 1); save(); }));
      list.append(item);
    });
    dialog.querySelector('[data-empty]').hidden = rows.length > 0;
    for (const control of document.querySelectorAll('[data-queue-key]')) {
      const queued = queuedKeys.has(control.dataset.queueKey);
      control.textContent = queued ? '✓ 已加入' : '＋ 加入队列';
      control.setAttribute('aria-pressed', String(queued));
    }
  }

  function button(label, action, disabled = false) {
    const control = document.createElement('button');
    control.type = 'button';
    control.disabled = disabled;
    control.textContent = label;
    control.onclick = action;
    return control;
  }

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(rows)); } catch {}
    render();
  }

  function move(index, step) {
    const target = index + step;
    if (!rows[target]) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    page = Math.floor(target / pageSize);
    save();
  }

  function addButton(story) {
    const control = button('加入队列', () => {
      const index = rows.findIndex(row => row.key === story.key);
      if (index === -1) rows.push({ key: story.key, title: story.title });
      else rows.splice(index, 1);
      save();
    });
    control.dataset.queueKey = story.key;
    control.className = 'story-queue-add story-action-btn';
    control.title = '加入剧情播放队列，稍后按顺序连续播放';
    control.setAttribute('aria-label', `加入剧情播放队列：${story.title}`);
    const queued = queuedKeys.has(story.key);
    control.textContent = queued ? '✓ 已加入' : '＋ 加入队列';
    control.setAttribute('aria-pressed', String(queued));
    return control;
  }

  async function sortByChronology() {
    await window.storyNavigationReady;
    const compare = window.compareStoryChronology;
    if (!compare) return;
    const lookup = new Map(window.navigationCatalog.map(story => [story.key, story]));
    rows.sort((a, b) => {
      const left = lookup.get(a.key), right = lookup.get(b.key);
      return left && right ? compare(left, right) : Number(!left) - Number(!right);
    });
    page = 0;
    save();
  }

  function stopPrefetch() {
    prefetch?.abort();
    prefetch = null;
    warmingKey = '';
  }

  function warmNext(key) {
    if (playing !== key) return;
    const index = rows.findIndex(row => row.key === key);
    const candidate = index === -1 ? rows[0]?.key : rows[index + 1]?.key;
    if (!candidate || candidate === warmingKey || !/^\w+\/[\w-]+\.json$/.test(candidate)) return;
    stopPrefetch();
    warmingKey = candidate;
    prefetch = new AbortController();
    fetch('/api/story-preload?key=' + encodeURIComponent(candidate), {
      method: 'POST', signal: prefetch.signal
    }).catch(() => {});
  }

  function playNext() {
    playing = '';
    while (rows.length) {
      const row = rows[0];
      if (window.openStoryByKey?.(row.key)) {
        playing = row.key;
        return true;
      }
      rows.shift();
      save();
    }
    return false;
  }

  opener.onclick = () => dialog.showModal();
  previous.onclick = () => { page--; render(); };
  next.onclick = () => { page++; render(); };
  order.onclick = sortByChronology;
  addResults.onclick = async () => {
    const results = window.getQueueStories?.() || [];
    for (const story of results) {
      if (queuedKeys.has(story.key)) continue;
      queuedKeys.add(story.key);
      rows.push({ key: story.key, title: story.title });
    }
    save();
    await sortByChronology();
  };
  start.onclick = () => {
    if (playNext()) dialog.close();
  };
  document.querySelector('#viewer').addEventListener('close', () => { playing = ''; stopPrefetch(); });
  window.addEventListener('pagehide', stopPrefetch);
  window.StoryQueue = {
    addButton,
    ready: warmNext,
    opened(key) {
      if (playing && playing !== key) { playing = ''; stopPrefetch(); }
    },
    finished(key) {
      if (playing !== key) return false;
      rows = rows.filter(row => row.key !== key);
      save();
      if (!playNext()) stopPrefetch();
      return true;
    }
  };
  render();
})();
