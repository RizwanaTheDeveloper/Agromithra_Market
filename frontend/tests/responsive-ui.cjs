const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

// Run after: node scripts/build-web.cjs --standalone --offline
// Include Expo's document reset: the standalone server alone cannot catch
// regressions that prevent browser wheel scrolling when hosted by Expo.
const root = path.resolve(__dirname, '..');
const origin = 'http://market.test';
const sizes = [[320,568],[360,640],[390,844],[600,800],[768,1024],
  [844,390],[1024,768],[1100,768],[1440,900],[1920,1080]];

(async () => {
  const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({ headless:true,
    ...(fs.existsSync(chrome) ? { executablePath:chrome } : {}) });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(origin + '/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      const file = path.resolve(root, 'dist', '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(path.join(root, 'dist') + path.sep) || !fs.existsSync(file))
        return route.fulfill({ status:404, body:'' });
      if (pathname !== '/') return route.fulfill({ path:file });
      const html = fs.readFileSync(file, 'utf8').replace('<head>',
        '<head><style>#root,body,html{height:100%}body{overflow:hidden}#root{display:flex}</style>')
        .replace('<div id="app"></div>', '<div id="root"><div id="app"></div></div>');
      return route.fulfill({ contentType:'text/html', body:html });
    });
    await page.setViewportSize({ width:320, height:568 });
    await page.goto(origin + '/#/welcome');
    await page.waitForFunction(() => !!window.MarketApp);
    await page.mouse.move(160, 300);
    await page.mouse.wheel(0, 900);
    await page.waitForFunction(() => scrollY > 0);
    await page.locator('[data-action="onboard"]').click();
    await page.locator('form[data-form="onboard"]').waitFor();
    await page.evaluate(() => {
      MarketApp.state.profile.onboarded = true;
      MarketApp.state.profile.role = 'seller';
      MarketApp.handleAction('start-sell');
    });
    for (const [width,height] of sizes) {
      await page.setViewportSize({ width,height });
      for (const language of ['en','te']) {
        const failures = await page.evaluate(language => {
          const app = MarketApp, failures = [];
          app.state.profile.language = language;
          for (const route of app.routes) {
            let params = { id:'L101', step:2 };
            if (['deal','inspection','inspection-results','agreement','payment','transport','receipt','document'].includes(route))
              params = { id:'D301', type:'agreement' };
            if (route.startsWith('request-')) params = { id:app.state.requests[0].id };
            if (route === 'chat') params = { id:'C301' };
            try {
              app.go(route, params);
              if (!document.querySelector('main')) throw Error('Missing screen');
              if (document.documentElement.scrollWidth > innerWidth + 1) throw Error('Horizontal overflow');
              const hero = document.querySelector('.comfort-hero');
              if (hero) {
                const container = hero.getBoundingClientRect();
                const art = hero.querySelector('img').getBoundingClientRect();
                if (art.left < container.left || art.right > container.right + 1)
                  throw Error('Home illustration is clipped');
              }
              const nav = document.querySelector('.nav');
              if (nav) {
                const bounds = nav.getBoundingClientRect();
                if (bounds.left < -1 || bounds.right > innerWidth + 1 || bounds.bottom > innerHeight + 1)
                  throw Error('Navigation outside viewport');
                const main = document.querySelector('main').getBoundingClientRect();
                if (innerWidth >= 1100 && main.left < bounds.right)
                  throw Error('Sidebar overlaps content');
              }
            } catch (error) { failures.push({ route, error:error.message }); }
          }
          return failures;
        }, language);
        assert.deepEqual(failures, [], `${language}: ${width}x${height}`);
      }
      if ([320,768,1440].includes(width)) {
        await page.evaluate(() => {
          MarketApp.state.profile.language = 'en';
          MarketApp.go('home');
        });
        await page.screenshot({ path:path.join(root, `preview/responsive-home-${width}.png`), fullPage:true });
      }
      console.log(`PASS ${width}x${height}: all routes in English and Telugu`);
    }
    assert.deepEqual(errors, []);
    console.log('PASS Expo wheel scrolling, onboarding, hero containment and navigation placement');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
