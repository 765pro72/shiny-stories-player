const { chromium } = require('playwright-core');
const fs = require('fs');

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }
  const page = await browser.newPage();
  
  const cgBase64 = fs.readFileSync('public/images/franchise-logos/logo-cg.jpg').toString('base64');
  
  await page.setContent('<html><body><canvas id="cv"></canvas></body></html>');
  
  const pngBase64 = await page.evaluate(async (b64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.getElementById('cv');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i+1], b = d[i+2];
          const brightness = (r + g + b) / 3;
          if (brightness > 240) {
            d[i+3] = 0;
          } else if (brightness > 220) {
            const alphaFactor = (240 - brightness) / 20;
            d[i+3] = Math.round(d[i+3] * alphaFactor);
          }
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.src = 'data:image/jpeg;base64,' + b64;
    });
  }, cgBase64);
  
  fs.writeFileSync('public/images/franchise-logos/logo-cg.png', Buffer.from(pngBase64, 'base64'));
  console.log('Saved transparent logo-cg.png, size:', fs.statSync('public/images/franchise-logos/logo-cg.png').size);
  await browser.close();
})();
