#!/usr/bin/env node
/**
 * Build lightweight static JSON indexes for official extra assets:
 * - public/data/chibi-catalog.json (2,400+ CB / chibi Spine models)
 * - public/data/official-extras.json (681 comics, 215+ home backgrounds, 79 MVs, 33 signs, 14 UR picture motions)
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const allAssetsPath = path.join(root, 'research/official-current/all-assets.json');
const cardMediaPath = path.join(root, 'data/card-media.json');
const homeCatalogPath = path.join(root, 'public/home-assets/catalog.json');
const outDir = path.join(root, 'data');

fs.mkdirSync(outDir, { recursive: true });

const allAssets = JSON.parse(fs.readFileSync(allAssetsPath, 'utf8'));
const assetSet = new Set(allAssets);
const cardMedia = JSON.parse(fs.readFileSync(cardMediaPath, 'utf8'));
const homeCatalog = JSON.parse(fs.readFileSync(homeCatalogPath, 'utf8'));

const cardById = new Map();
for (const c of cardMedia) {
  if (c && c.id) cardById.set(String(c.id), c);
}

const ownerMetaById = new Map();
for (const p of homeCatalog) {
  ownerMetaById.set(String(p.id), { id: String(p.id), name: p.name });
}

function ownerIdFromCardId(cardId) {
  const s = String(cardId || '');
  if (s.length < 6) return null;
  const num = parseInt(s.slice(3, 6), 10);
  if (!Number.isFinite(num)) return null;
  if (num === 91) return 'staff';
  if (num >= 1 && num <= 28) return String(num);
  if (num >= 801 && num <= 804) return String(num);
  return null;
}

function ownerIdFromCharCode(code) {
  const num = parseInt(String(code || ''), 10);
  if (!Number.isFinite(num)) return null;
  if (num === 91) return 'staff';
  if (num >= 1 && num <= 28) return String(num);
  if (num >= 801 && num <= 804) return String(num);
  return null;
}

function rarityFromCardId(cardId) {
  const card = cardById.get(String(cardId));
  if (card && card.rarity) return card.rarity;
  const s = String(cardId || '');
  const rDigit = s.slice(2, 3);
  if (rDigit === '5') return 'UR';
  if (rDigit === '4') return 'SSR';
  if (rDigit === '3') return 'SR';
  if (rDigit === '2') return 'R';
  if (rDigit === '1') return 'N';
  return 'other';
}

/* ── 1. Build public/data/chibi-catalog.json ── */
const chibiGroups = new Map();
function ensureGroup(id, name) {
  if (!chibiGroups.has(id)) {
    chibiGroups.set(id, { id, name, outfits: [] });
  }
  return chibiGroups.get(id);
}

for (const p of homeCatalog) {
  ensureGroup(String(p.id), p.name);
}
ensureGroup('special', '283 特别小人（社长/制作人/彩蛋）');

const SUB_CB_LABELS = {
  'bird': { owner: 'special', label: '283 蓝鸽子小人', icon: '' },
  'ceo': { owner: 'special', label: '天井努 社长小人', icon: '' },
  'producer': { owner: 'special', label: '制作人（P）小人', icon: '' },
  'ugc': { owner: 'special', label: '283 特别活动小人', icon: '' },
  'staff': { owner: 'staff', label: '七草叶月 · 常服小人', icon: '' },
  'staff/christmas': { owner: 'staff', label: '七草叶月 · 圣诞装小人', icon: '' },
  'staff/dance': { owner: 'staff', label: '七草叶月 · 舞蹈教练小人', icon: '' },
  'staff/miko': { owner: 'staff', label: '七草叶月 · 巫女装小人', icon: '' },
  'staff/staff_chance': { owner: 'staff', label: '七草叶月 · 幸运机会小人', icon: '' },
  'staff/visual': { owner: 'staff', label: '七草叶月 · 形体教练小人', icon: '' },
  'staff/vocal': { owner: 'staff', label: '七草叶月 · 声乐教练小人', icon: '' }
};

for (const p of allAssets) {
  if (!p.startsWith('spine/') || !p.endsWith('/data.json')) continue;

  // 1a. spine/characters/cb/<code >/data.json & cb_costume & cb_gasha
  let m = p.match(/^spine\/characters\/(cb|cb_costume|cb_gasha)\/(\d+)\/data\.json$/);
  if (m) {
    const [, kindDir, code] = m;
    const ownerId = ownerIdFromCharCode(code);
    if (!ownerId) continue;
    const grp = chibiGroups.get(ownerId);
    if (!grp) continue;
    const kind = kindDir === 'cb_costume' ? 'cb_costume' : 'cb';
    const labelMap = {
      cb: '基础常服小人',
      cb_costume: '基础演出服小人',
      cb_gasha: '抽卡纪念常服小人'
    };
    const cbIcon = `images/content/characters/costume_cb_icon/${code}.png`;
    const cbLiveIcon = `images/content/characters/costume_cb_live_icon/${code}.png`;
    const icon = kind === 'cb_costume'
      ? (assetSet.has(cbLiveIcon) ? cbLiveIcon : (assetSet.has(cbIcon) ? cbIcon : ''))
      : (assetSet.has(cbIcon) ? cbIcon : '');
    grp.outfits.push({
      key: `char-${kindDir}-${code}`,
      id: code,
      kind,
      subKind: 'char_cb',
      label: `${labelMap[kindDir]} · ${grp.name}`,
      path: p,
      icon,
      rarity: 'other'
    });
    continue;
  }

  // 1b. spine/idols/cb/<id>/data.json & cb_costume
  m = p.match(/^spine\/idols\/(cb|cb_costume)\/(\d+)\/data\.json$/);
  if (m) {
    const [, kindDir, id] = m;
    const ownerId = ownerIdFromCardId(id);
    if (!ownerId) continue;
    const grp = chibiGroups.get(ownerId);
    if (!grp) continue;
    const card = cardById.get(id);
    const kind = kindDir === 'cb_costume' ? 'cb_costume' : 'cb';
    const cbIcon = `images/content/idols/costume_cb_icon/${id}.png`;
    const cbLiveIcon = `images/content/idols/costume_cb_live_icon/${id}.png`;
    const icon = kind === 'cb_costume'
      ? (assetSet.has(cbLiveIcon) ? cbLiveIcon : (assetSet.has(cbIcon) ? cbIcon : ''))
      : (assetSet.has(cbIcon) ? cbIcon : (assetSet.has(cbLiveIcon) ? cbLiveIcon : ''));
    const prefix = kind === 'cb_costume' ? '两头身演出服' : '两头身常服';
    grp.outfits.push({
      key: `${kindDir}-${id}`,
      id,
      kind,
      subKind: kindDir,
      label: card ? `${prefix} · ${card.name}` : `${prefix} · ${id}`,
      path: p,
      icon,
      rarity: rarityFromCardId(id)
    });
    continue;
  }

  // 1c. spine/awake_idols/cb_costume/<id>/data.json & idol_evolution_skins/cb_costume/<id>/data.json
  m = p.match(/^spine\/(awake_idols|idol_evolution_skins)\/cb_costume\/(\d+)\/data\.json$/);
  if (m) {
    const [, dirKind, id] = m;
    const ownerId = ownerIdFromCardId(id);
    if (!ownerId) continue;
    const grp = chibiGroups.get(ownerId);
    if (!grp) continue;
    const card = cardById.get(id);
    const cbLiveIcon = `images/content/idols/costume_cb_live_icon/${id}.png`;
    const icon = assetSet.has(cbLiveIcon) ? cbLiveIcon : '';
    const prefix = dirKind === 'awake_idols' ? '觉醒演出服小人' : '进化皮肤小人';
    grp.outfits.push({
      key: `${dirKind}-${id}`,
      id,
      kind: 'cb_costume',
      subKind: dirKind,
      label: card ? `${prefix} · ${card.name}` : `${prefix} · ${id}`,
      path: p,
      icon,
      rarity: rarityFromCardId(id)
    });
    continue;
  }

  // 1d. spine/support_idols/cb|cb_costume/<id>/data.json
  m = p.match(/^spine\/support_idols\/(cb|cb_costume)\/(\d+)\/data\.json$/);
  if (m) {
    const [, kindDir, id] = m;
    const ownerId = ownerIdFromCardId(id);
    if (!ownerId) continue;
    const grp = chibiGroups.get(ownerId);
    if (!grp) continue;
    const card = cardById.get(id);
    const kind = kindDir === 'cb_costume' ? 'cb_costume' : 'cb';
    grp.outfits.push({
      key: `sup-${kindDir}-${id}`,
      id,
      kind,
      subKind: 'support_cb',
      label: card ? `支援卡小人 · ${card.name}` : `支援卡小人 · ${id}`,
      path: p,
      icon: '',
      rarity: rarityFromCardId(id)
    });
    continue;
  }

  // 1e. spine/sub_characters/cb/<subpath>/data.json
  m = p.match(/^spine\/sub_characters\/cb\/(.+)\/data\.json$/);
  if (m) {
    const subKey = m[1];
    const meta = SUB_CB_LABELS[subKey] || { owner: 'special', label: `特别角色小人 · ${subKey}`, icon: '' };
    const grp = chibiGroups.get(meta.owner) || chibiGroups.get('special');
    grp.outfits.push({
      key: `sub-${subKey.replace(/\//g, '-')}`,
      id: subKey,
      kind: 'cb',
      subKind: 'sub_cb',
      label: meta.label,
      path: p,
      icon: meta.icon,
      rarity: 'other'
    });
    continue;
  }

  // 1f. Easter eggs: tap_counter_events (被窝甜花) & collaborate (太鼓达人/猫友)
  if (p === 'spine/events/tap_counter_events/50041/data.json') {
    chibiGroups.get('special').outfits.push({
      key: 'special-tenka-futon',
      id: '50041',
      kind: 'cb',
      subKind: 'special_cb',
      label: '被窝大崎甜花（敲击彩蛋小人）',
      path: p,
      icon: '',
      rarity: 'other'
    });
    // Also add into Tenka ('15') so fans find her easily
    chibiGroups.get('15')?.outfits.push({
      key: 'special-tenka-futon-15',
      id: '50041',
      kind: 'cb',
      subKind: 'special_cb',
      label: '被窝大崎甜花（敲击彩蛋小人）',
      path: p,
      icon: '',
      rarity: 'other'
    });
  } else if (p.startsWith('spine/collaborate/')) {
    const parts = p.split('/');
    const collabName = parts[2] === 'taiko'
      ? (parts[3] === 'don' ? '太鼓达人 · 咚酱小人' : '太鼓达人 · 咔酱小人')
      : `联动 · 猫友小人 ${parts[3]}`;
    chibiGroups.get('special').outfits.push({
      key: `collab-${parts[2]}-${parts[3]}`,
      id: `${parts[2]}-${parts[3]}`,
      kind: 'cb',
      subKind: 'special_cb',
      label: collabName,
      path: p,
      icon: '',
      rarity: 'other'
    });
  }
}

// Sort outfits cleanly: char_cb defaults first, then newest/highest rarity
const chibiCatalog = [...chibiGroups.values()].filter(g => g.outfits.length > 0);
for (const g of chibiCatalog) {
  g.outfits.sort((a, b) => {
    const aChar = a.subKind === 'char_cb' ? 0 : (a.subKind === 'special_cb' ? 1 : 2);
    const bChar = b.subKind === 'char_cb' ? 0 : (b.subKind === 'special_cb' ? 1 : 2);
    if (aChar !== bChar) return aChar - bChar;
    return String(b.id).localeCompare(String(a.id));
  });
}

fs.writeFileSync(path.join(outDir, 'chibi-catalog.json'), JSON.stringify(chibiCatalog));

/* ── 2. Build data/official-extras.json ── */
const comics = [];
for (const p of allAssets) {
  const m = p.match(/^images\/content\/comics\/(web|limited|special)\/page\/([^/]+)\.jpg$/);
  if (!m) continue;
  const [, group, id] = m;
  const numId = Number(id);
  // Only include publicly accessible un-salted comics (verified HTTP 200):
  // web: 10000..10307 (308), limited: all (9), special: <= 20007 (7) -> 324 total
  if (group === 'web' && (!Number.isFinite(numId) || numId > 10307)) continue;
  if (group === 'special' && (!Number.isFinite(numId) || numId > 20007)) continue;
  const iconPath = `images/content/comics/${group}/icon/${id}.jpg`;
  comics.push({
    id,
    group,
    page: p,
    icon: assetSet.has(iconPath) ? iconPath : p
  });
}
comics.sort((a, b) => Number(b.id) - Number(a.id) || b.id.localeCompare(a.id));

const backgrounds = [];
for (const p of allAssets) {
  const m = p.match(/^images\/content\/home_deck_background\/bg\/([^/]+)\.jpg$/);
  if (!m) continue;
  const id = m[1];
  const thumb = `images/content/home_deck_background/thumbnail/${id}.jpg`;
  const icon = `images/content/home_deck_background/icon/${id}.png`;
  backgrounds.push({
    id,
    bg: p,
    thumb: assetSet.has(thumb) ? thumb : p,
    icon: assetSet.has(icon) ? icon : ''
  });
}
backgrounds.sort((a, b) => a.id.localeCompare(b.id));

// Official MVs in movies/music_video/* require authenticated per-song hashes; do not expose unplayable entries
const musicVideos = [];

const signatures = {};
for (const p of allAssets) {
  const m = p.match(/^images\/content\/characters\/sign\/(\d+)\.png$/);
  if (!m) continue;
  const oid = ownerIdFromCharCode(m[1]);
  if (oid) signatures[oid] = p;
}

const pmIdolMap = new Map();
for (const p of allAssets) {
  const m = p.match(/^movies\/idols\/(picture_motion|picture_motion_costume)\/(\d+)\.mp4$/);
  if (!m) continue;
  const [, kind, id] = m;
  if (!pmIdolMap.has(id)) pmIdolMap.set(id, { id });
  if (kind === 'picture_motion') pmIdolMap.get(id).movie = p;
  else pmIdolMap.get(id).costumeMovie = p;
}

const pmSupport = [];
for (const p of allAssets) {
  const m = p.match(/^spine\/support_idols\/picture_motion\/(\d+)\/data\.json$/);
  if (!m) continue;
  pmSupport.push({ id: m[1], spine: p });
}

const officialExtras = {
  generatedAt: new Date().toISOString(),
  comics,
  backgrounds,
  musicVideos,
  signatures,
  pictureMotions: {
    idols: [...pmIdolMap.values()],
    support: pmSupport
  }
};

fs.writeFileSync(path.join(outDir, 'official-extras.json'), JSON.stringify(officialExtras));

const totalChibi = chibiCatalog.reduce((n, g) => n + g.outfits.length, 0);
console.log(JSON.stringify({
  chibiGroups: chibiCatalog.length,
  totalChibiOutfits: totalChibi,
  comics: comics.length,
  backgrounds: backgrounds.length,
  musicVideos: musicVideos.length,
  signatures: Object.keys(signatures).length,
  pictureMotionIdols: officialExtras.pictureMotions.idols.length,
  pictureMotionSupport: officialExtras.pictureMotions.support.length
}, null, 2));
