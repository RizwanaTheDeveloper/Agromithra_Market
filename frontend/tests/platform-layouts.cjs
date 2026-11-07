const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(path.join(root,'.expo/browsers'))) process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(root,'.expo/browsers');
const { chromium, webkit } = require('playwright');
const dist = path.join(root,'dist');
const server = http.createServer((request,response)=>{
  let file=path.resolve(dist,'.'+new URL(request.url,'http://localhost').pathname);
  if(file!==dist&&!file.startsWith(dist+path.sep))return response.writeHead(403).end();
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(dist,'index.html');
  response.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  try {
    for(const [name,type] of [['Chrome',chromium],['WebKit',webkit]]) {
      const chrome=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe';
      const browser=await type.launch({headless:true,...(name==='Chrome'&&fs.existsSync(chrome)?{executablePath:chrome}:{})});
      try {
        const page=await browser.newPage(); page.setDefaultTimeout(15000);
        const errors=[]; page.on('pageerror',error=>errors.push(error.message));
        await page.goto(url); await page.waitForFunction(()=>!!window.MarketApp);
        await page.evaluate(()=>window.MarketApp.handleAction('start-sell'));
        for(const [width,height] of [[320,568],[393,852],[412,915],[844,390],[768,1024],[1024,768],[1440,900]]) {
          await page.setViewportSize({width,height});
          // Each size represents a new device load, avoiding Safari's history
          // rate limit when hundreds of route checks run in a single document.
          await page.reload(); await page.waitForFunction(()=>!!window.MarketApp);
          const failures=await page.evaluate(()=>{
            const a=window.MarketApp, failures=[];
            for(const route of a.routes) {
              let params={id:'L101',step:2};
              if(['deal','inspection','inspection-results','agreement','payment','transport','receipt','document'].includes(route))params={id:'D301',type:'agreement'};
              if(route.startsWith('request-'))params={id:a.state.requests[0].id};
              if(route==='chat')params={id:'C301'};
              try {
                a.go(route,params);
                if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Horizontal page overflow');
                if(!document.querySelector('main'))throw Error('Missing screen');
              } catch(error){failures.push({route,error:error.message});}
            }
            return failures;
          });
          assert.deepEqual(failures,[],`${name} ${width}x${height}`);
          console.log(`PASS ${name}: all 49 routes at ${width}x${height}`);
        }
        await page.setViewportSize({width:412,height:915});
        await page.evaluate(()=>window.MarketApp.go('home'));
        await page.evaluate(()=>window.dispatchEvent(new CustomEvent('market-native-keyboard',{detail:true})));
        await page.waitForFunction(()=>document.documentElement.dataset.keyboardOpen==='true');
        assert.equal(await page.locator('.nav').isVisible(),false,'Bottom navigation must hide for the keyboard');
        await page.evaluate(()=>window.dispatchEvent(new CustomEvent('market-native-keyboard',{detail:false})));
        await page.waitForFunction(()=>document.documentElement.dataset.keyboardOpen==='false');
        assert(await page.locator('.nav').isVisible());
        await page.setViewportSize({width:844,height:390});
        await page.evaluate(()=>{document.documentElement.style.setProperty('--safe-left','44px');document.documentElement.style.setProperty('--safe-right','44px');});
        const safe=await page.locator('main').evaluate(el=>({left:parseFloat(getComputedStyle(el).paddingLeft),right:parseFloat(getComputedStyle(el).paddingRight)}));
        assert(safe.left>=44&&safe.right>=44,'Landscape notch padding must be honored');
        assert.deepEqual(errors,[]);
        console.log(`PASS ${name}: keyboard transitions, rotation and landscape safe areas`);
      } finally {await browser.close();}
    }
  } finally {await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
