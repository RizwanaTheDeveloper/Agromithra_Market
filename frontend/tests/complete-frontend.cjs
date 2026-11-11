const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../dist');
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) && file !== root) return response.writeHead(403).end();
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  response.setHeader('Content-Type', ({ '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    page.setDefaultTimeout(15000);
    const errors = [], network = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => network.push(request.url()));
    await page.goto(url, { waitUntil: 'networkidle' });
    const action = async (name, id) => {
      const locator = page.locator(`[data-action="${name}"]${id ? `[data-id="${id}"]` : ''}`).filter({ visible:true }).first();
      await locator.click();
    };
    const go = (route, params = {}) => page.evaluate(({ route, params }) => window.MarketApp.go(route, params), { route, params });
    const state = () => page.evaluate(() => JSON.parse(JSON.stringify(window.MarketApp.state)));
    const submit = async (name, values = {}) => {
      for (const [key, value] of Object.entries(values)) {
        const input = page.locator(`form[data-form="${name}"] [name="${key}"]`).first();
        const tag = await input.evaluate(el => el.tagName);
        if (tag === 'SELECT') await input.selectOption(String(value));
        else if (await input.getAttribute('type') === 'checkbox') await input.setChecked(Boolean(value));
        else await input.fill(String(value));
      }
      const invalid = await page.locator(`form[data-form="${name}"]`).evaluate(form => [...form.elements].filter(el => el.willValidate && !el.checkValidity()).map(el => ({name:el.name,error:el.validationMessage})));
      assert.deepEqual(invalid, [], `Invalid ${name} form`);
      await page.locator(`form[data-form="${name}"]`).evaluate(form => form.requestSubmit());
      const error = (await page.locator('#form-error').allTextContents()).filter(Boolean).join('; ');
      assert(!error, `${name}: ${error}`);
    };

    await action('onboard');
    await submit('onboard', { name:'Frontend QA', agree:true });
    assert.equal((await state()).profile.onboarded, true);
    await go('browse');
    await page.locator('#browse-search').fill('Sona');
    assert.equal(await page.locator('.product').count(), 1);
    await action('save-listing','L101');
    assert((await state()).saved.includes('L101'));
    console.log('PASS onboarding, search and saved listings');

    await action('comfort-nav','seller-home');
    await action('start-sell');
    await action('sell-category','crops');
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      const context = canvas.getContext('2d'); context.fillStyle = '#73965a'; context.fillRect(0,0,640,480);
      context.fillStyle = '#dec66b'; context.fillRect(100,100,350,230); return canvas.toDataURL('image/png').split(',')[1];
    });
    await page.locator('input[data-media-kind="photo"]').setInputFiles({ name:'qa-crop.png', mimeType:'image/png', buffer:Buffer.from(png,'base64') });
    await page.waitForFunction(() => window.MarketApp.ui.draft.media.length === 1 && !window.MarketApp.comfort.mediaBusy);
    await submit('easy-listing', { title:'QA paddy harvest', price:'2700', quantity:'10', location:'Guntur', shareContacts:false });
    await submit('sell-publish', { confirmed:true });
    const listing = (await state()).listings.find(item => item.title === 'QA paddy harvest');
    assert(listing?.own && listing.media.length === 1);
    await page.reload({ waitUntil:'networkidle' });
    assert((await state()).listings.some(item => item.id === listing.id));
    await go('detail', { id:listing.id });
    await page.waitForFunction(() => [...document.images].some(image => image.src.startsWith('blob:') && image.complete && image.naturalWidth > 0));
    console.log('PASS listing wizard, real image upload, IndexedDB media and reload persistence');

    await go('verification');
    await submit('buyer-phone', { phone:'9999999999' });
    await submit('buyer-otp', { code:'123456' });
    await submit('buyer-details', { name:'Frontend QA', purpose:'Resale', consent:true });
    assert.equal((await state()).buyerVerification.status, 'pending');
    await go('buyer-review'); await action('approve-buyer');
    assert.equal((await state()).buyerVerification.status,'approved');
    await go('detail',{id:'L101'}); await action('contact-whatsapp','L101');
    assert((await state()).contactHistory.length > 0);
    await action('close-modal');
    console.log('PASS demo verification and permitted contact preview');

    await go('deal',{id:'D301'}); await action('accept-quote','D301');
    await action('book-inspection','D301'); await submit('inspection');
    await action('inspection-results','D301'); await submit('inspection-results',{ack:true});
    await action('agreement','D301'); await submit('agreement',{buyerAgree:true,sellerAgree:true});
    await action('payment','D301'); await submit('payment',{ack:true});
    await action('transport','D301'); await submit('transport',{check0:true,check1:true,check2:true});
    await action('pickup','D301'); await action('receipt','D301');
    await submit('receipt',{accepted:true,settled:true});
    const deal = (await state()).deals.find(item=>item.id==='D301');
    assert.equal(deal.stage,'complete'); assert.equal(deal.payments.length,2);
    assert.equal(deal.delivery.phase,'Delivered');
    console.log('PASS complete trade: quote, inspection, report, agreement, advance, transport, pickup and settlement');

    await go('chat',{id:'C301'}); await submit('chat',{message:'Can I arrange a farm visit?'});
    assert((await state()).chats[0].messages.some(item=>item.text==='Can I arrange a farm visit?'));
    await go('ticket'); await submit('ticket',{subject:'QA listing issue',description:'A frontend-only support test with sample data.'});
    assert((await state()).tickets.some(item=>item.subject==='QA listing issue'));
    console.log('PASS messaging and support');

    await go('smart-center'); await action('smart-analysis','L101');
    await page.locator('form[data-form="smart-profile"]').waitFor();
    await action('smart-report','L101');
    await page.locator('main').waitFor();
    assert((await page.locator('main').innerText()).length > 200);
    const estimate = await page.evaluate(()=>window.MarketApp.smartEstimate(window.MarketApp.state.listings.find(item=>item.id==='L101')));
    assert(estimate.available && estimate.range.length===3);
    console.log('PASS listing analysis and price engine');

    await go('smart-analysis',{id:listing.id});
    await action('smart-scan',listing.id);
    await page.waitForFunction(id => !!window.MarketApp.state.listings.find(item=>item.id===id)?.mediaReport, listing.id);
    assert(await page.evaluate(id=>window.MarketApp.reportCurrent(window.MarketApp.state.listings.find(item=>item.id===id)),listing.id));
    await go('smart-data');
    const csv='productId,state,district,market,variety,grade,unit,date,min_price,modal_price,max_price\nP101,Andhra Pradesh,Guntur,QA market,Sona Masoori,Unspecified,quintal,2026-11-06,2400,2600,2800';
    await page.locator('input[data-smart-import]').setInputFiles({name:'qa-prices.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
    await page.locator('form[data-form="smart-import"]').waitFor();
    await submit('smart-import',{sourceName:'QA local fixture',confirmed:true});
    await action('smart-commit-import');
    assert.equal((await state()).smartSettings.mode,'imported');
    assert.equal((await state()).smartPrices.length,1);
    await action('smart-mode','demo');
    console.log('PASS real local media checks and CSV import with source confirmation');

    // Render every actual APK route with valid identifiers at all target breakpoints.
    for (const width of [360,768,1440]) {
      await page.setViewportSize({width,height:1000});
      const audit = await page.evaluate(() => {
        const a=window.MarketApp; a.handleAction('start-sell');
        const failures=[];
        for(const route of a.routes) {
          let params={id:'L101',step:2};
          if(['deal','inspection','inspection-results','agreement','payment','transport','receipt','document'].includes(route))params={id:'D301',type:'agreement'};
          if(route.startsWith('request-'))params={id:a.state.requests[0].id};
          if(route==='chat')params={id:'C301'};
          try { a.go(route,params); if(!document.querySelector('main'))throw Error('Missing screen'); if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Horizontal overflow'); }
          catch(error){ failures.push({route,error:error.message}); }
        }
        return {count:a.routes.length,failures};
      });
      assert.equal(audit.count,52); assert.deepEqual(audit.failures,[]);
      const overlaps = await page.evaluate(() => {
        const items=[...document.querySelectorAll('.nav > button')].map(el=>el.getBoundingClientRect());
        return items.some((a,i)=>items.some((b,j)=>i!==j && Math.min(a.right,b.right)-Math.max(a.left,b.left)>2 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2));
      });
      assert.equal(overlaps,false,'Navigation buttons overlap');
      await go('home'); await page.screenshot({path:path.resolve(__dirname,`../preview/complete-home-${width}.png`),fullPage:true});
      console.log(`PASS all ${audit.count} routes at ${width}px`);
    }
    await go('account');
    assert.equal(await page.locator('.menu-icon').count(),await page.locator('.menu-icon > svg').count(),'Account icons must render inside SVG elements');
    await go('detail',{id:'L101'});
    const centered=await page.locator('main').evaluate(el=>Math.abs((el.getBoundingClientRect().left+el.getBoundingClientRect().right)/2-innerWidth/2)<2);
    assert(centered,'Desktop details without a sidebar must be centered');
    await page.setViewportSize({width:360,height:900});
    await go('smart-report',{id:'L101'});
    assert(await page.locator('.smart-tabs').evaluate(el=>[...el.children].every(tab=>tab.getBoundingClientRect().right<=innerWidth && tab.getBoundingClientRect().left>=0)),'Report tabs must all fit the phone viewport');
    assert.equal(await page.locator('.smart-price-table td').count(),await page.locator('.smart-price-table td[data-label]').count(),'Mobile price cells need translated labels');
    await go('browse'); await action('filters');
    assert(await page.locator('#app').evaluate(el=>el.inert),'Modal must disable the background');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#app').evaluate(el=>el.inert),false);
    await page.setViewportSize({width:1440,height:1000});
    console.log('PASS restored icons, desktop centering, phone report tabs/labels and modal keyboard behavior');
    await go('smart-center'); await page.screenshot({path:path.resolve(__dirname,'../preview/complete-insights-desktop.png'),fullPage:true});
    await go('flow-guide'); await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#app').getAttribute('data-route'),'flow-guide');
    await page.evaluate(()=>window.MarketApp.handleAction('language','te'));
    assert.equal(await page.locator('html').getAttribute('lang'),'te');
    const incomplete = await browser.newPage();
    incomplete.on('pageerror',error=>errors.push(error.message));
    await incomplete.addInitScript(()=>localStorage.setItem('agromitra.market.prototype.v1',JSON.stringify({version:1,listings:[]})));
    await incomplete.goto(url);
    await incomplete.waitForFunction(()=>!!window.MarketApp);
    assert.equal(await incomplete.locator('#app').getAttribute('data-route'),'welcome');
    await incomplete.close();
    const blocked = await browser.newPage();
    blocked.on('pageerror',error=>errors.push(error.message));
    await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage blocked','SecurityError');}}));
    await blocked.goto(url);
    await blocked.waitForFunction(()=>!!window.MarketApp);
    await blocked.close();
    console.log('PASS startup with incomplete or blocked browser storage');
    assert.deepEqual(errors,[]);
    assert(!network.some(address=>/\/api\/|:5000|:3000/.test(address)),'Unexpected backend request');
    console.log('PASS deep-link refresh, Telugu, no runtime errors or backend requests');
  } finally { if(browser)await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
