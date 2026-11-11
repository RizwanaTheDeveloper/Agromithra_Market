const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src/data/marketplace.json'), 'utf8'));

(async () => {
  const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({headless:true, ...(fs.existsSync(chrome) ? {executablePath:chrome} : {})});
  try {
    const page = await browser.newPage({viewport:{width:320,height:546}});
    const errors = [], apiRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://api.test/**', route => { apiRequests.push(route.request().url()); return route.abort(); });
    await page.route('http://market.test/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      const file = path.join(root, 'public', pathname === '/' ? 'market/index.html' : pathname);
      if (!fs.existsSync(file)) return route.fulfill({status:404,body:''});
      if (pathname === '/market/app.js') return route.fulfill({contentType:'application/javascript', body:
        fs.readFileSync(file,'utf8').replace(/window\.MARKET_CONFIG=.*?;/,
          'window.MARKET_CONFIG={"apiUrl":"http://api.test/v1","dataSource":"local"};')});
      return route.fulfill({path:file});
    });
    // Simulate the previously saved empty API result that caused the blank screen.
    await page.addInitScript(() => {
      if (!localStorage.getItem('agromitra.market.prototype.v1'))
        localStorage.setItem('agromitra.market.prototype.v1', JSON.stringify({version:1,
          profile:{name:'Existing profile',onboarded:true,language:'en'},listings:[],requests:[],saved:['L102']}));
    });
    await page.goto('http://market.test/#/browse');
    await page.waitForFunction(() => !!window.MarketApp);
    assert.equal(await page.locator('.product').count(), data.listings.length);
    assert.equal(await page.evaluate(() => MarketApp.state.profile.name), 'Existing profile');
    assert(await page.evaluate(() => MarketApp.state.saved.includes('L102')));
    await page.locator('[data-action="browse-cat"][data-id="crops"]').click();
    assert.equal(await page.locator('.product').count(), data.listings.filter(row => row.cat === 'crops').length);
    await page.locator('#browse-search').fill('Sona');
    assert.equal(await page.locator('.product').count(), 1);
    await page.locator('[data-action="save-listing"][data-id="L101"]').click();
    await page.reload();
    await page.waitForFunction(() => !!window.MarketApp);
    assert.equal(await page.locator('.product').count(), data.listings.length);
    assert(await page.evaluate(() => MarketApp.state.saved.includes('L101') && MarketApp.state.saved.includes('L102')));
    await page.screenshot({path:path.join(root,'preview/local-marketplace-320.png'),fullPage:true});
    assert.deepEqual(apiRequests, []);
    assert.deepEqual(errors, []);
    console.log(`PASS ${data.listings.length} JSON listings, empty-store recovery, profile and saved-item preservation, categories, search and reload without backend requests`);
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
