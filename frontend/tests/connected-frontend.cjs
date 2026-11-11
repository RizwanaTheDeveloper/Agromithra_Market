/* End-to-end check of the frontend against the real backend and a disposable PostgreSQL database.
   Requires TEST_DATABASE_URL (migrations applied). Never point it at production data. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) { console.log('SKIP connected frontend test: set TEST_DATABASE_URL to a disposable migrated database.'); process.exit(0); }

const frontend = path.resolve(__dirname, '..');
const backend = path.resolve(frontend, '../backend');
const apiPort = 5055, webPort = 4185;
const apiUrl = `http://127.0.0.1:${apiPort}/api/v1`, origin = `http://127.0.0.1:${webPort}`;
const dist = path.join(frontend, '.expo/connected-test');

const build = spawnSync(process.execPath, ['scripts/build-web.cjs', '--standalone'], { cwd: frontend, env: { ...process.env, MARKET_API_URL: apiUrl, MARKET_DATA_SOURCE: 'server' }, encoding: 'utf8' });
assert.equal(build.status, 0, build.stderr || build.stdout);
fs.mkdirSync(dist,{recursive:true});
fs.cpSync(path.join(frontend,'dist'),dist,{recursive:true});
// Keep the user's running frontend pointed at its configured API while this
// test serves a separate artifact against the disposable test database.
const restore = spawnSync(process.execPath,['scripts/build-web.cjs','--standalone'],{cwd:frontend,env:process.env,encoding:'utf8'});
assert.equal(restore.status,0,restore.stderr || restore.stdout);
assert.match(fs.readFileSync(path.join(dist, 'market/app.js'), 'utf8'), /127\.0\.0\.1:5055/);

const web = http.createServer((request, response) => {
  const pathname = new URL(request.url, origin).pathname;
  let file = path.resolve(dist, '.' + pathname);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
  response.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});

let api, browser;
const stop = () => { api?.kill(); web.close(); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function startBackend() {
  api = spawn(process.execPath, ['dist/main.js'], { cwd: backend, env: { ...process.env, DATABASE_URL: databaseUrl, PORT: String(apiPort), CORS_ORIGIN: origin, NODE_ENV: 'development', OTP_MODE: 'development', OTP_SECRET: 'x'.repeat(64), ADMIN_PHONES: '+91' + adminDigits }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; api.stdout.on('data', d => output += d); api.stderr.on('data', d => output += d);
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(apiUrl + '/health')).ok) return; } catch { /* still starting */ }
    await sleep(500);
  }
  throw new Error('Backend did not start:\n' + output);
}

const phoneFor = n => '9' + String(Date.now() % 1e8).padStart(8, '0') + n;
const adminDigits = phoneFor(9);

async function newClient() {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin, { waitUntil: 'networkidle' });
  const app = {
    page, errors,
    state: () => page.evaluate(() => JSON.parse(JSON.stringify(window.MarketApp.state))),
    go: (route, params = {}) => page.evaluate(({ route, params }) => window.MarketApp.go(route, params), { route, params }),
    form: (type, values, meta = {}) => page.evaluate(({ type, values, meta }) => window.MarketApp.handleForm(type, values, meta), { type, values, meta }),
    action: (name, id = '') => page.evaluate(({ name, id }) => window.MarketApp.handleAction(name, id), { name, id }),
    idle: () => page.waitForFunction(() => !window.MarketApp.remote.busy),
    // Errors appear in the open form when there is one, otherwise as a toast.
    toast: async () => (await page.locator('#form-error').first().textContent().catch(() => '')) || page.locator('#toast').textContent(),
  };
  // Sign in through the real screens: mobile number, then the one-time code the dev server returns.
  app.signIn = async phone => {
    await app.go('verification');
    await page.locator('form[data-form="buyer-phone"] [name="phone"]').fill(phone);
    await page.locator('form[data-form="buyer-phone"] button[type="submit"]').click();
    const dialog = page.locator('#modal-root form[data-form="buyer-otp"]');
    await dialog.waitFor();
    const code = (await dialog.locator('strong').textContent()).trim();
    await dialog.locator('[name="code"]').fill(code);
    await dialog.locator('button[type="submit"]').click();
    await page.waitForFunction(() => window.MarketApp.remote.session && !window.MarketApp.remote.busy);
    return (await app.state()).profile.phone;
  };
  return app;
}

const draft = (over = {}) => ({
  cat: 'crops', title: 'Connected test paddy', price: 2600, quantity: 100, min: 10, unit: 'quintal', image: 'paddy', location: 'Guntur', state: 'Andhra Pradesh',
  expires: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), specValues: ['Sona Masoori', 'Ready for pickup', '13% declared', '50 kg bags'],
  description: 'Cleaned paddy lot. Buyer can inspect a sample first.', shareContacts: true, allowCall: true, allowWhatsApp: false, ...over,
});

(async () => {
  await new Promise(resolve => web.listen(webPort, '127.0.0.1', resolve));
  await startBackend();
  const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
  browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
  const { PrismaClient } = require(path.join(backend, 'node_modules/@prisma/client'));
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const seller = await newClient(), buyer = await newClient();

    // Visitors see no fictional sample records.
    let s = await seller.state();
    assert.equal(s.listings.length >= 0 && s.listings.every(p => /^[0-9a-f-]{36}$/.test(p.id)), true);
    assert.equal(s.deals.length, 0);

    // A wrong code is rejected with a clear message and signs nobody in.
    await seller.go('verification');
    await seller.page.locator('form[data-form="buyer-phone"] [name="phone"]').fill(phoneFor(1));
    await seller.page.locator('form[data-form="buyer-phone"] button[type="submit"]').click();
    const otp = seller.page.locator('#modal-root form[data-form="buyer-otp"]');
    await otp.waitFor();
    await otp.locator('[name="code"]').fill('000000');
    await otp.locator('button[type="submit"]').click();
    await seller.page.locator('#modal-root #form-error').filter({ hasText: /invalid or expired/i }).waitFor();
    assert.equal(await seller.page.evaluate(() => !!window.MarketApp.remote.session), false);
    await seller.page.evaluate(() => window.MarketApp.handleAction('close-modal'));
    console.log('PASS visitor view and rejected one-time code');

    // Seller signs in with the real code, then publishes with contact sharing.
    const sellerPhone = '+91' + phoneFor(2);
    await seller.signIn(phoneFor(2));
    assert.equal((await seller.state()).profile.phone, sellerPhone);
    await seller.go('sell', { step: 4 });
    await seller.page.evaluate(d => { window.MarketApp.ui.draft = d; }, draft({ description: 'Call me on 9876543210 for the best price.' }));
    await seller.form('sell-publish', { confirmed: 'on' });
    assert.match(await seller.toast(), /contact details/i, 'public text with a phone number is refused by the server');
    await seller.go('sell', { step: 4 });
    // A real photo stored on the device is uploaded to the server when the listing is published.
    const photo = await seller.page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 8;
      canvas.getContext('2d').fillRect(0, 0, 8, 8);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      await window.MarketApp.mediaStore('Mtest1', blob);
      return { id: 'Mtest1', kind: 'photo', name: 'paddy.png', size: blob.size, type: 'image/png', local: true };
    });
    // Recover a listing created by the old local-only app, then publish through
    // the actual preview form. Its image still lives in this device's IndexedDB.
    await seller.page.evaluate(d => {
      localStorage.setItem('agromitra.market.local-backup.v1',JSON.stringify({listings:[{...d,id:'LDEVICE_OLD',own:true,specs:d.specValues.map((value,i)=>['Detail '+i,value])}]}));
    }, draft({media:[photo]}));
    await seller.go('manage-listings');
    await seller.page.locator('[data-action="sync-device-listing"][data-id="LDEVICE_OLD"]').click();
    await seller.page.locator('form[data-form="sell-publish"] [name="confirmed"]').check();
    await seller.page.locator('form[data-form="sell-publish"] button[type="submit"]').click();
    await seller.page.waitForFunction(()=>MarketApp.ui.route==='success' && !MarketApp.remote.busy);
    assert.equal(await seller.page.evaluate(()=>JSON.parse(localStorage.getItem('agromitra.market.local-backup.v1')).listings.length),0,'remove the local archive only after successful server publication');
    s = await seller.state();
    assert.equal((await db.listingMedia.count({ where: { listingId: s.listings.find(p => p.own).id, kind: 'photo' } })), 1, 'photo reaches the server');
    assert.equal(s.listings.find(p => p.own).media[0].remoteId.length, 36);
    // The file is stored on disk, the table keeps only its location, and the API still serves it.
    const row = await db.listingMedia.findFirst({ where: { listingId: s.listings.find(p => p.own).id } });
    assert.ok(row.path && row.data === null, 'database keeps a location, not the bytes');
    assert.ok(fs.existsSync(path.join(process.env.UPLOAD_DIR, row.path)), 'file exists on disk');
    const served = await fetch(apiUrl + '/media/' + row.id);
    assert.equal(served.status, 200); assert.equal(served.headers.get('content-type'), 'image/png');
    assert.equal(Buffer.from(await served.arrayBuffer()).subarray(1, 4).toString(), 'PNG');
    const mine = s.listings.find(p => p.own);
    assert.ok(mine && mine.status === 'active' && mine.price === 2600 && mine.quantity === 100 && mine.specs[0][1] === 'Sona Masoori');
    assert.equal(s.privateContacts[mine.id].call, true);
    assert.equal(s.privateContacts[mine.id].whatsapp, false);
    console.log('PASS seller sign-in, local listing recovery, photo upload, Prisma write and publishing');

    // A second person browses the real listing without signing in, and cannot reach the seller yet.
    await buyer.page.evaluate(() => window.MarketApp.handleAction('refresh-remote'));
    await buyer.idle();
    let b = await buyer.state();
    const seen = b.listings.find(p => p.id === mine.id);
    assert.ok(seen && !seen.own && JSON.stringify(b).includes(sellerPhone) === false, 'no seller phone before approval');
    await buyer.page.evaluate(id => window.MarketApp.handleAction('contact-call', id), mine.id);
    assert.equal(await buyer.page.evaluate(() => window.MarketApp.ui.route), 'verification');
    await buyer.signIn(phoneFor(3));
    await buyer.form('buyer-details', { name: 'Test Buyer', city: 'Guntur', business: 'Trader', purpose: 'Resale', consent: 'on' });
    b = await buyer.state();
    assert.equal(b.buyerVerification.status, 'pending');
    await buyer.page.evaluate(id => window.MarketApp.handleAction('contact-call', id), mine.id);
    assert.equal(await buyer.page.evaluate(() => window.MarketApp.ui.route), 'verification', 'pending buyers stay on the verification screen');
    await buyer.form('offer', { quantity: '10', price: '2600', location: 'Guntur', date: new Date().toISOString().slice(0, 10) }, { id: mine.id });
    assert.match(await buyer.toast(), /approved buyer/i);
    console.log('PASS buyer is gated until approval');

    // A number listed in ADMIN_PHONES signs in on the login screen and approves the buyer through the app.
    const admin = await newClient();
    await admin.go('login');
    assert.equal(await admin.page.locator('form[data-form="buyer-phone"]').count(), 1, 'login screen shows the phone form');
    await admin.signIn(adminDigits);
    assert.equal(await admin.page.evaluate(() => !!window.MarketApp.remote.me.isAdmin), true, 'ADMIN_PHONES grants administrator');
    assert.equal(await buyer.page.evaluate(() => !!window.MarketApp.remote.me.isAdmin), false);
    await admin.action('admin-verifications'); await admin.idle();
    await admin.page.locator('article.card', { hasText: 'Test Buyer' }).waitFor();
    await admin.page.locator('article.card', { hasText: 'Test Buyer' }).locator('[data-action="admin-approve"]').click();
    await admin.page.locator('#toast', { hasText: /approved/i }).waitFor();
    assert.equal(await admin.page.locator('article.card', { hasText: 'Test Buyer' }).count(), 0, 'approved buyer leaves the queue');
    await admin.page.evaluate(() => window.MarketApp.handleAction('logout')); await admin.idle();
    assert.equal(await admin.page.evaluate(() => !!window.MarketApp.remote.session), false, 'logout ends the session');
    assert.deepEqual(admin.errors, []);
    await buyer.action('refresh-remote'); await buyer.idle();
    b = await buyer.state();
    assert.equal(b.buyerVerification.status, 'approved');
    await buyer.page.evaluate(id => window.MarketApp.handleAction('contact-call', id), mine.id);
    await buyer.idle();
    const contact = await buyer.page.locator('#modal-root .contact-number').textContent();
    assert.equal(contact.trim(), sellerPhone);
    await buyer.page.evaluate(id => window.MarketApp.handleAction('contact-whatsapp', id), mine.id);
    await buyer.idle();
    assert.match(await buyer.toast(), /not authorized|authoriz/i, 'whatsapp stays off because the seller did not allow it');
    await buyer.page.evaluate(() => window.MarketApp.handleAction('close-modal'));
    console.log('PASS approval unlocks only the contact channels the seller allowed');

    const buyerId=await buyer.page.evaluate(()=>MarketApp.remote.session.userId);
    await buyer.action('save-listing',mine.id);await buyer.idle();
    assert.ok(await db.savedListing.findUnique({where:{userId_listingId:{userId:buyerId,listingId:mine.id}}}));
    await buyer.action('chat-listing',mine.id);await buyer.idle();
    const conversationId=await buyer.page.evaluate(()=>MarketApp.ui.params.id);
    await buyer.form('chat',{message:'Can we inspect the lot tomorrow?'},{id:conversationId});
    assert.equal(await db.message.count({where:{conversationId}}),1,'only the real message is saved');
    await seller.action('refresh-remote');await seller.idle();
    assert.equal((await seller.state()).chats.find(row=>row.id===conversationId).messages[0].mine,false);
    await seller.form('chat',{message:'Yes, please visit in the morning.'},{id:conversationId});
    await buyer.action('refresh-remote');await buyer.idle();
    assert.equal((await buyer.state()).chats.find(row=>row.id===conversationId).messages.length,2);
    console.log('PASS database saved listings and two-way enquiries without simulated replies');

    // Quote, accept (reserving stock), dispatch, receive.
    await buyer.form('offer', { quantity: '10', price: '2600', location: 'Guntur', date: new Date().toISOString().slice(0, 10) }, { id: mine.id });
    await buyer.idle();
    b = await buyer.state();
    assert.equal(b.deals.length, 1, await buyer.toast());
    const dealId = b.deals[0].id;
    assert.equal(b.deals[0].serverStage, 'quote');
    assert.equal(await buyer.page.evaluate(() => window.MarketApp.ui.route), 'deal');
    await buyer.go('deals');
    assert.match(await buyer.page.locator('#app').textContent(), /Quote requested/);
    await seller.action('refresh-remote'); await seller.idle();
    await seller.go('deal', { id: dealId });
    assert.match(await seller.page.locator('#app').textContent(), /Accept and reserve stock/);
    await seller.action('server-deal', `${dealId}:agreed`); await seller.idle();
    s = await seller.state();
    assert.equal(s.deals[0].serverStage, 'agreed');
    assert.equal(s.listings.find(p => p.id === mine.id).quantity, 90, 'stock is reserved on acceptance');
    await seller.action('server-deal', `${dealId}:dispatched`); await seller.idle();
    await buyer.action('refresh-remote'); await buyer.idle();
    await buyer.go('deal', { id: dealId });
    assert.match(await buyer.page.locator('#app').textContent(), /Confirm goods received/);
    await buyer.action('server-deal', `${dealId}:completed`); await buyer.idle();
    b = await buyer.state();
    assert.equal(b.deals[0].serverStage, 'completed');
    assert.equal(b.deals[0].stage, 'complete');
    // A finished deal cannot be changed again.
    await seller.action('server-deal', `${dealId}:cancelled`); await seller.idle();
    assert.equal((await seller.state()).deals[0].serverStage, "completed");
    console.log('PASS quote, reservation, dispatch and receipt');

    // Buyer requirements.
    await buyer.go('request-form');
    const requirement={cat:'crops',title:'Need Sona Masoori paddy',quantity:'50',unit:'quintal',budget:'2700',location:'Guntur',purpose:'Milling',note:'Sample grade to be agreed.',expires:new Date(Date.now()+5*86400000).toISOString().slice(0,10)};
    for (const [key,value] of Object.entries(requirement)) {
      const field=buyer.page.locator(`form[data-form="request"] [name="${key}"]`);
      if (await field.evaluate(element=>element.tagName)==='SELECT') await field.selectOption(value);
      else await field.fill(value);
    }
    await buyer.page.locator('form[data-form="request"] button[type="submit"]').click();
    await buyer.page.waitForFunction(()=>MarketApp.ui.route==='request-detail' && !MarketApp.remote.busy);
    b = await buyer.state();
    const request = b.requests.find(r => r.own);
    assert.ok(request && request.budget === 2700 && request.purpose === 'Milling' && request.buyer === 'Test Buyer');
    const requestRow=await db.buyerRequest.findUnique({where:{id:request.id}});
    assert.equal(requestRow.buyerId,buyerId);
    assert.equal(Number(requestRow.quantity),50);
    assert.equal(Number(requestRow.budget),2700);
    await buyer.page.reload({waitUntil:'networkidle'});
    await buyer.page.waitForFunction(()=>MarketApp.remote.synced);
    b=await buyer.state();
    assert.ok(b.requests.some(row=>row.id===request.id),'requirement reloads from the database');
    assert.ok(b.saved.includes(mine.id),'saved listing reloads from the database');
    assert.equal(b.chats.find(row=>row.id===conversationId).messages.length,2);
    await seller.action('refresh-remote'); await seller.idle();
    assert.equal((await seller.state()).requests.some(r => r.id === request.id && !r.own), true);
    await buyer.action('close-request', request.id); await buyer.idle();
    assert.equal((await buyer.state()).requests.some(r => r.id === request.id), false);
    console.log('PASS BuyerRequest Prisma row, API response, reload persistence and closing requirement');

    // Sign out clears the session and private data.
    await buyer.action('logout'); await buyer.idle();
    b = await buyer.state();
    assert.equal(await buyer.page.evaluate(() => window.MarketApp.remote.session), null);
    assert.equal(b.deals.length, 0);
    assert.equal(b.profile.phone, '');
    for (const client of [seller, buyer]) assert.deepEqual(client.errors, [], 'no runtime errors');
    console.log('PASS sign-out and no runtime errors');
  } finally {
    await db.$disconnect();
    await browser?.close();
    stop();
  }
})().catch(error => { console.error(error); stop(); process.exit(1); });
