import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const loadBtn = btns.find(b => b.textContent.includes('Load Sample Data'));
    if (loadBtn) loadBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  const result = await page.evaluate(async () => {
    try {
      const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Export Word'));
      if (exportBtn) exportBtn.click();
      return "Clicked";
    } catch(e) {
      return e.message;
    }
  });
  console.log(result);
  await new Promise(r => setTimeout(r, 6000));
  await browser.close();
})();
