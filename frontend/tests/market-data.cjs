const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

// API fixtures stay in this browser test and are never inserted into a database.
const records = [
  { id:'price-1', product:'Paddy', variety:'Sona Masoori', grade:'Unspecified', unit:'quintal', state:'Andhra Pradesh', district:'Guntur', market:'Guntur market', reportedAt:'2026-11-08T00:00:00.000Z', minimum:'2400.00', modal:'2600.00', maximum:'2800.00', basis:'mandi', sourceName:'Market bulletin', sourceUrl:'https://example.com/bulletin', provenance:'admin-imported-unverified' },
  { id:'price-2', product:'Turmeric', variety:'Local', grade:'Unspecified', unit:'kg', state:'Telangana', district:'Nizamabad', market:'Nizamabad market', reportedAt:'2026-11-07T00:00:00.000Z', minimum:'110.00', modal:'120.00', maximum:'130.00', basis:'mandi', sourceName:'Regional bulletin', sourceUrl:'https://example.com/regional', provenance:'admin-imported-unverified' },
];

(async () => {
  const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({ headless:true, ...(fs.existsSync(chrome) ? { executablePath:chrome } : {}) });
  try {
    const page = await browser.newPage({ viewport:{width:390,height:844} });
    const errors = [], requests = [];
    let mode = 'records', release;
    const firstRequest = new Promise(resolve => { release = resolve; });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://api.test/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/market/observations')) {
        requests.push(url);
        assert.equal(route.request().headers().authorization, undefined);
        if (requests.length === 1) await firstRequest;
        if (mode === 'error') return route.abort('failed');
        const items = mode === 'empty' ? [] : records.filter(record =>
          [...url.searchParams].every(([key,value]) => record[key] === value));
        return route.fulfill({ json:{items} });
      }
      // Market prices must still work when the independent listing request fails.
      return route.fulfill(url.pathname.endsWith('/listings') ? {status:500,json:{message:'Listing service unavailable'}} : {json:{items:[]}});
    });
    await page.route('http://market.test/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      const file = path.resolve(root, 'public', pathname === '/' ? 'market/index.html' : '.' + pathname);
      if (!fs.existsSync(file)) return route.fulfill({status:404,body:''});
      if (pathname === '/market/app.js') return route.fulfill({ contentType:'application/javascript',
        body:fs.readFileSync(file,'utf8').replace(/window\.MARKET_CONFIG=.*?;/, 'window.MARKET_CONFIG={"apiUrl":"http://api.test/v1"};') });
      return route.fulfill({path:file});
    });
    await page.goto('http://market.test/#/smart-data', {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => !!window.MarketApp);
    await page.evaluate(() => { MarketApp.state.profile.onboarded=true; MarketApp.go('smart-data'); });
    await page.getByText('Loading market prices', {exact:false}).waitFor();
    release();
    await page.getByRole('cell', {name:'Guntur market',exact:false}).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 2);
    assert.match(await page.locator('main').innerText(), /2026-11-08/);
    assert.equal(await page.getByRole('link', {name:'Market bulletin'}).getAttribute('href'), records[0].sourceUrl);
    await page.evaluate(() => MarketApp.go('smart-market'));
    await page.locator('select[name="product"]').selectOption('Paddy');
    await page.locator('input[name="district"]').fill('Guntur');
    await page.locator('form[data-form="server-market-filter"] button[type="submit"]').click();
    await page.waitForFunction(() => !MarketApp.remote.market.loading && MarketApp.remote.market.items.length === 1);
    assert.equal(requests.at(-1).searchParams.get('product'), 'Paddy');
    assert.equal(requests.at(-1).searchParams.get('district'), 'Guntur');
    assert.equal(await page.locator('tbody tr').count(), 1);
    await page.locator('[data-action="clear-market-filters"]').click();
    await page.waitForFunction(() => !MarketApp.remote.market.loading && MarketApp.remote.market.items.length === 2);
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:844});
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
    }
    mode = 'error';
    await page.locator('[data-action="refresh-market"]').click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(), /server could not be reached/i);
    assert.equal(await page.locator('tbody tr').count(), 2, 'Retain the last successful data on failure');
    mode = 'empty';
    await page.locator('[data-action="refresh-market"]').click();
    await page.getByText('No market prices have been published yet.', {exact:false}).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS market loading, independent fetch, records, source/date/unit, filters, responsive table, network failure, retry and empty state');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
