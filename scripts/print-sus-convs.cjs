const fs = require('fs');

const convs = JSON.parse(fs.readFileSync('public/home-assets/conversations.json', 'utf8'));
const susList = JSON.parse(fs.readFileSync('translation-work/suspicious-home-dialogues.json', 'utf8'));

// Group by convId
const byConv = {};
for (const item of susList) {
  if (!byConv[item.convId]) {
    byConv[item.convId] = convs[item.convId];
  }
}

console.log(`Unique suspicious conversations: ${Object.keys(byConv).length}`);

for (const [cid, c] of Object.entries(byConv)) {
  console.log(`\n================ Conv ${cid}: ${c.title} ================`);
  for (const s of (c.sequence || [])) {
    console.log(`[${s.speaker}] (${s.id})`);
    console.log(`  JP: ${s.original}`);
    console.log(`  ZH: ${s.translation}`);
  }
}
