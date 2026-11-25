const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_MODELS_DIR = process.env.SC_TTS_MODELS_DIR || 'G:\\我的云端硬盘\\sc_tts\\models';
const REF_PROMPTS_DIR = path.join(ROOT, 'tts-dataset', 'reference_prompts');
const SUMMARY_FILE = path.join(ROOT, 'tts-dataset', 'dataset_summary.json');
const STORY_PROFILES_FILE = path.join(ROOT, 'data', 'story-voice-profiles.json');
const CATALOG_OUT = path.join(ROOT, 'data', 'tts-voice-catalog.json');
const STAGE_DIR = path.join(ROOT, 'dist', 'ShinyStories-TTS-Pack');
const ARCHIVE_OUT = path.join(ROOT, 'dist', 'ShinyStories-TTS-Pack.7z');
const ARCHIVE_TMP = path.join(ROOT, 'dist', 'ShinyStories-TTS-Pack.tmp.7z');
const SEVEN_ZIP = ['C:\\Program Files\\7-Zip\\7z.exe', 'C:\\Program Files (x86)\\7-Zip\\7z.exe'].find(p => fs.existsSync(p));

const EXTRA_ALIASES = {
  '01_mano': ['mano', '樱木真乃', '櫻木真乃', '真乃', '櫻木真乃'],
  '02_hiori': ['hiori', '风野灯织', '風野灯織', '灯织', '灯織'],
  '03_meguru': ['meguru', '八宫巡', '八宮めぐる', 'めぐる', '巡'],
  '04_kogane': ['kogane', '月冈恋钟', '月岡恋鐘', '恋钟', '恋鐘'],
  '05_mamimi': ['mamimi', '田中摩美美', '摩美々', '摩美美'],
  '06_sakuya': ['sakuya', '白濑咲耶', '白瀬咲耶', '咲耶'],
  '07_yuika': ['yuika', '三峰结华', '三峰結華', '结华', '結華'],
  '08_kiriko': ['kiriko', '幽谷雾子', '幽谷霧子', '雾子', '霧子'],
  '09_kaho': ['kaho', '小宫果穗', '小宮果穂', '果穗', '果穂'],
  '10_chiyoko': ['chiyoko', '园田智代子', '園田智代子', '智代子'],
  '11_juri': ['juri', '西城树里', '西城樹里', '树里', '樹里'],
  '12_rinze': ['rinze', '杜野凛世', '凛世'],
  '13_natsuha': ['natsuha', '有栖川夏叶', '有栖川夏葉', '夏叶', '夏葉'],
  '14_amana': ['amana', '大崎甘奈', '甘奈'],
  '15_tenka': ['tenka', '大崎甜花', '甜花'],
  '16_chiyuki': ['chiyuki', '桑山千雪', '千雪'],
  '17_asahi': ['asahi', '芹泽朝日', '芹沢あさひ', 'あさひ', '朝日'],
  '18a_fuyuko_fuyu': ['fuyuko_fuyu', 'fuyuko', '黛冬优子', '黛冬優子', '冬优子', '冬優子', 'ふゆ', '黛冬优子（营业夹子音·ふゆ）', '黛冬优子(ふゆ)'],
  '18b_fuyuko_real': ['fuyuko_real', '冬优子本音', '冬优子(素颜)', '黛冬优子（素颜本音·冬优子）'],
  '19_mei': ['mei', '和泉爱依', '和泉愛依', '爱依', '愛依'],
  '20_toru': ['toru', '浅仓透', '浅倉透', '透'],
  '21_madoka': ['madoka', '樋口圆香', '樋口円香', '圆香', '円香'],
  '22_koito': ['koito', '福丸小糸', '小糸'],
  '23_hinana': ['hinana', '市川雏菜', '市川雛菜', '雏菜', '雛菜'],
  '24_nichika': ['nichika', '七草日花', '七草にちか', 'にちか', '日花'],
  '25_mikoto': ['mikoto', '绯田美琴', '緋田美琴', '美琴'],
  '26_luca': ['luca', 'ruka', '斑鸠路加', '斑鳩ルカ', 'ルカ', '路加'],
  '27_hana': ['hana', '铃木羽那', '鈴木羽那', '羽那'],
  '28_haruki': ['haruki', '郁田春希', '郁田阳希', '郁田はるき', 'はるき', '春希', '阳希'],
  '29_hazuki': ['hazuki', '七草叶月', '七草はづき', 'はづき', '叶月', '葉月']
};

function findWeight(dir, slot, ext) {
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith(ext) && (f.startsWith(slot + '-') || f.startsWith(slot + '_')));
  if (!files.length) throw new Error(`Missing ${ext} weight for ${slot} in ${dir}`);
  files.sort();
  return files[files.length - 1];
}

function slotToId(slot) {
  return slot.replace(/^\d+[a-z]?_/, '');
}

function build() {
  if (!SEVEN_ZIP) throw new Error('7-Zip (7z.exe) not found');
  const ffmpegRes = spawnSync('ffmpeg', ['-version'], { windowsHide: true, stdio: 'ignore' });
  if (ffmpegRes.error) throw new Error('ffmpeg not found in PATH');

  const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
  let storyProfiles = [];
  try {
    storyProfiles = JSON.parse(fs.readFileSync(STORY_PROFILES_FILE, 'utf8')).profiles || [];
  } catch {}

  const gptSrcDir = path.join(SOURCE_MODELS_DIR, 'GPT_weights_v4');
  const sovitsSrcDir = path.join(SOURCE_MODELS_DIR, 'SoVITS_weights_v4');
  if (!fs.existsSync(gptSrcDir) || !fs.existsSync(sovitsSrcDir)) {
    throw new Error('Source v4 weights missing: ' + SOURCE_MODELS_DIR);
  }

  fs.rmSync(STAGE_DIR, { recursive: true, force: true });
  const gptDstDir = path.join(STAGE_DIR, 'models', 'GPT_weights_v4');
  const sovitsDstDir = path.join(STAGE_DIR, 'models', 'SoVITS_weights_v4');
  const refsDstDir = path.join(STAGE_DIR, 'refs');
  fs.mkdirSync(gptDstDir, { recursive: true });
  fs.mkdirSync(sovitsDstDir, { recursive: true });
  fs.mkdirSync(refsDstDir, { recursive: true });

  const voices = [];
  for (const row of summary) {
    const slot = row.slot;
    const id = slotToId(slot);
    const gptFile = findWeight(gptSrcDir, slot, '.ckpt');
    const sovitsFile = findWeight(sovitsSrcDir, slot, '.pth');

    const refSrc = path.join(REF_PROMPTS_DIR, slot);
    const promptsPath = path.join(refSrc, 'prompts.json');
    if (!fs.existsSync(promptsPath)) throw new Error('Missing prompts.json for ' + slot);
    const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
    if (!prompts.length) throw new Error('Empty prompts.json for ' + slot);

    fs.copyFileSync(path.join(gptSrcDir, gptFile), path.join(gptDstDir, gptFile));
    fs.copyFileSync(path.join(sovitsSrcDir, sovitsFile), path.join(sovitsDstDir, sovitsFile));

    const slotRefDst = path.join(refsDstDir, slot);
    fs.mkdirSync(slotRefDst, { recursive: true });
    const convertedRefs = [];
    for (const p of prompts) {
      const m4aPath = path.join(refSrc, p.file);
      if (!fs.existsSync(m4aPath)) throw new Error('Missing ref audio ' + m4aPath);
      const wavName = p.file.replace(/\.[^.]+$/, '.wav');
      const wavPath = path.join(slotRefDst, wavName);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', m4aPath, '-ac', '1', '-ar', '32000', '-c:a', 'pcm_s16le', wavPath], { windowsHide: true });
      convertedRefs.push({
        file: `refs/${slot}/${wavName}`,
        text_jp: String(p.text_jp || '').replace(/\s+/g, ' ').trim(),
        story: p.story || ''
      });
    }
    fs.writeFileSync(path.join(slotRefDst, 'prompts.json'), JSON.stringify(convertedRefs, null, 2), 'utf8');

    const baseId = id.replace(/_(fuyu|real)$/, '');
    const sp = storyProfiles.find(x => x.id === baseId || x.id === id);
    const shortName = sp?.shortName || row.name;
    const aliases = [...new Set([id, slot, row.name, shortName, sp?.name, ...(EXTRA_ALIASES[slot] || [])].filter(Boolean))];

    voices.push({
      id,
      slot,
      name: row.name,
      shortName,
      aliases,
      version: 'v4',
      gpt: `models/GPT_weights_v4/${gptFile}`,
      sovits: `models/SoVITS_weights_v4/${sovitsFile}`,
      refAudio: convertedRefs[0].file,
      refText: convertedRefs[0].text_jp,
      refLang: 'ja',
      refs: convertedRefs
    });
    console.log(`[${voices.length}/${summary.length}] ${slot} -> ${gptFile} + ${sovitsFile} (${convertedRefs.length} refs)`);
  }

  const manifest = {
    name: '283 Production GPT-SoVITS v4 全员 30 声线整合包',
    version: '2026-11-25',
    engine: 'GPT-SoVITS v4',
    voiceCount: voices.length,
    voices
  };
  fs.writeFileSync(path.join(STAGE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  fs.writeFileSync(CATALOG_OUT, JSON.stringify({
    updatedAt: manifest.version,
    engine: manifest.engine,
    voiceCount: voices.length,
    voices
  }, null, 2), 'utf8');

  const batContent = [
    '@echo off',
    'chcp 65001 >nul',
    'title 283PRO GPT-SoVITS v4 语音推理服务 (127.0.0.1:9880)',
    'setlocal',
    'set "PACK_DIR=%~dp0"',
    'if defined GPT_SOVITS_DIR if exist "%GPT_SOVITS_DIR%\\api_v2.py" goto :found',
    'for %%D in ("%PACK_DIR%GPT-SoVITS" "%PACK_DIR%..\\GPT-SoVITS" "%PACK_DIR%..\\..\\GPT-SoVITS" "F:\\GPT-SoVITS" "D:\\GPT-SoVITS" "C:\\GPT-SoVITS") do (',
    '  if exist "%%~fD\\api_v2.py" (',
    '    set "GPT_SOVITS_DIR=%%~fD"',
    '    goto :found',
    '  )',
    ')',
    'echo [未找到 GPT-SoVITS 运行环境]',
    'echo 请设置环境变量 GPT_SOVITS_DIR，或在播放器悬浮窗「🔌 -> 指定 GPT-SoVITS 目录」选择您本机的 GPT-SoVITS 文件夹。',
    'pause',
    'exit /b 1',
    ':found',
    'cd /d "%GPT_SOVITS_DIR%"',
    'if exist "runtime\\python.exe" (',
    '  "runtime\\python.exe" api_v2.py -a 127.0.0.1 -p 9880',
    ') else (',
    '  python api_v2.py -a 127.0.0.1 -p 9880',
    ')',
    'pause'
  ].join('\r\n') + '\r\n';
  fs.writeFileSync(path.join(STAGE_DIR, '启动283语音服务.bat'), batContent, 'utf8');

  const readmeContent = [
    '=== 闪耀色彩 283PRO 全员 30 声线整合包（GPT-SoVITS v4） ===',
    '',
    '包含内容：',
    '- 全部 30 组 v4 GPT(.ckpt) + SoVITS(.pth) 权重（01_mano ~ 29_hazuki，含冬优子双声线 fuyuko_fuyu / fuyuko_real）',
    '- 全部 30 位角色的 32kHz 单声道参考音频（refs/<slot>/ref_01.wav ~ ref_05.wav）与精确日文台本',
    '',
    '在播放器内一键部署：',
    '1. 打开「透明桌面伙伴悬浮窗 -> 🔌」，或「怪文书 -> AI 配音 -> 配音服务与音色库」',
    '2. 点击「📦 一键部署全部声音（.7z/.zip）」选择 ShinyStories-TTS-Pack.7z（或挂载已解压目录）',
    '3. 确保本机已启动 GPT-SoVITS v4 推理服务 api_v2.py（默认端口 9880；也可在界面内指定本机 GPT-SoVITS 目录后点「🚀 启动推理引擎」）',
    '4. 返回悬浮窗或怪文书，选择任意偶像即可自动切换对应权重与参考音频并合成本地人声。'
  ].join('\r\n') + '\r\n';
  fs.writeFileSync(path.join(STAGE_DIR, '使用说明.txt'), readmeContent, 'utf8');

  console.log('Packing ShinyStories-TTS-Pack.7z (mx=1, multi-threaded)...');
  fs.rmSync(ARCHIVE_TMP, { force: true });
  execFileSync(SEVEN_ZIP, ['a', '-t7z', '-mx=1', '-mmt=on', ARCHIVE_TMP, '*'], { cwd: STAGE_DIR, stdio: 'inherit' });
  fs.rmSync(ARCHIVE_OUT, { force: true });
  fs.renameSync(ARCHIVE_TMP, ARCHIVE_OUT);
  const bytes = fs.statSync(ARCHIVE_OUT).size;
  console.log(`DONE: ${ARCHIVE_OUT} (${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB)`);
  fs.rmSync(STAGE_DIR, { recursive: true, force: true });
}

build();
