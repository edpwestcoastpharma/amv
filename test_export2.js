import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.type(), msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err);
  });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  console.log("Clicking Load Sample Data...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const loadBtn = btns.find(b => b.textContent.includes('Load Sample Data'));
    if (loadBtn) loadBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Clicking Export Word...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const exportBtn = btns.find(b => b.textContent.includes('Export Word'));
    if (exportBtn) exportBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 6000));
  
  console.log("Done.");
  await browser.close();
})();
