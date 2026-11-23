const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'guide.html',
  'card-gallery.html',
  'voice-gallery.html',
  'model-picker.html',
  'custom-story.html',
  'music.html'
];

for (const file of files) {
  const filePath = path.join(__dirname, '../public', file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add fonts.css right after <head> if not present
  if (!content.includes('fonts.css')) {
    content = content.replace('<head>', '<head><link rel="stylesheet" href="/fonts.css">');
  }

  // 2. Add ui-upgrade.css right before </head> if not present
  if (!content.includes('ui-upgrade.css')) {
    content = content.replace('</head>', '<link rel="stylesheet" href="/ui-upgrade.css"></head>');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched head for:', file);
}
