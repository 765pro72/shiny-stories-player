const fs = require('fs');
const path = require('path');

const logPath = 'translation-work/翻译变更日志.jsonl';
const now = new Date().toISOString();

function appendLog(file, key, before, after, reason) {
  const line = JSON.stringify({
    timestamp: now,
    author: 'AI (m00944 authorized)',
    file,
    key,
    before,
    after,
    reason
  }) + '\n';
  fs.appendFileSync(logPath, line, 'utf8');
}

const p = 'data/voice-index.json';
const vIdx = JSON.parse(fs.readFileSync(p, 'utf8'));
let count = 0;

for (const v of vIdx) {
  if (!v.translation) continue;
  const orig = v.translation;
  let fixed = orig;

  if (fixed.includes('Akori')) fixed = fixed.replace(/Akori酱/g, '灯织酱').replace(/Akori/g, '灯织');
  if (fixed.includes('切子')) fixed = fixed.replace(/切子酱/g, '雾子酱').replace(/切子/g, '雾子');
  if (fixed.includes('巧克力前辈')) fixed = fixed.replace(/巧克力前辈/g, '智代子前辈');
  if (fixed.includes('你在眼球或尖端上放什么')) fixed = fixed.replace(/你在眼球或尖端上放什么[？?]/g, '荷包蛋上通常会浇什么调料？');
  if (fixed.includes('杀伤熊')) fixed = fixed.replace(/杀伤熊/g, '切磋琢磨');
  if (fixed.includes('森野同学，动的时候要安静')) fixed = '凛世同学走路的时候总是静悄悄的……像在演一场无声的精彩表演呢……';
  if (fixed.includes('该死的，内裤')) fixed = '多谢啦，透！今天多亏有你在。';
  if (fixed.includes('阅读更多我也爱你')) fixed = '嘿，快叫我的名字呀？嗯？听不到呢……再多叫几声！我也最喜欢达令了！';
  if (fixed.includes('如果你手头拮据，请阅读本文')) fixed = '遇上危机时请随时呼叫我！果穗会立刻赶过来的！';
  if (fixed.includes('我不知道我是否称你为真人')) fixed = '唔……直呼名字真不老实……以前明明还会很可爱地喊我“姐姐”的……快叫我姐姐嘛……';
  if (fixed.includes('这是一份死纸质工作')) fixed = '我来接你了……这就是死神的工作呀。对不起，但我很高兴……因为从今往后，你的灵魂就永远属于我了。';
  if (fixed.includes('蓝脸死了')) fixed = '记事本是蓝色封面的说！上面还贴了贴纸的说！';
  if (fixed.includes('该死的说！今天我就是这样从前面做的说')) fixed = '不行不行！今天我就是要这样从正面好好抱住你的说！用你的爱来叫醒我吧！';
  if (fixed.includes('我想让你读一下') && v.key.includes('0010030010010')) fixed = '巡酱！抱歉，我只是想叫叫你的名字嘛……';
  if (fixed.includes('我可以读Fuyu酱吗')) fixed = '呼呼呼……我也可以……叫你冬优酱吗？';
  if (fixed.includes('我的名字不常被这样读')) fixed = '我的名字很少被这样呼唤过，所以有些心跳加速呢……';
  if (fixed.includes('我想让你读一下') && v.key.includes('0050180010020')) fixed = '嘿嘿……好想听你喊我“冬优”呀……';
  if (fixed.includes('制作人阁下') && (v.idol.includes('凛世') || v.idol.includes('雾子'))) fixed = fixed.replace(/制作人阁下/g, '制作人大人');
  if (fixed.includes('制作人殿下') && (v.idol.includes('凛世') || v.idol.includes('雾子'))) fixed = fixed.replace(/制作人殿下/g, '制作人大人');
  if (fixed.includes('小P') && v.idol.includes('结华')) fixed = fixed.replace(/小P/g, 'P碳');
  if (fixed.includes('P亲') && v.idol.includes('结华')) fixed = fixed.replace(/P亲/g, 'P碳');

  if (fixed !== orig) {
    v.translation = fixed;
    count++;
    appendLog(p, v.key, orig, fixed, '早期ASR/机翻修复');
  }
}

fs.writeFileSync(p, JSON.stringify(vIdx, null, 2), 'utf8');
console.log('Fixed', count, 'lines in', p);
