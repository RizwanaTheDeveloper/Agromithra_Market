const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dev = process.argv.includes('--dev');
const root = path.resolve(__dirname, dev ? '../public' : '../dist');
const entry = path.join(root, dev ? 'market/index.html' : 'index.html');
const clients = new Set();
const portArg = process.argv.indexOf('--port');
const port = Number(portArg < 0 ? process.env.PORT || 4173 : process.argv[portArg + 1]);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.mp4':'video/mp4' };
const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end('Invalid URL'); return; }
  if (pathname === '/__frontend_status') {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ app:'agromitra-market', mode:dev?'development':'preview' }));
    return;
  }
  if (dev && pathname === '/__frontend_events') {
    response.writeHead(200, { 'Content-Type':'text/event-stream', 'Cache-Control':'no-cache', Connection:'keep-alive' });
    response.write(': connected\n\n'); clients.add(response);
    request.on('close',()=>clients.delete(response)); return;
  }
  const candidate = path.resolve(root, '.' + pathname);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  let file = candidate;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) && !path.extname(pathname)) file = entry;
  if (!fs.existsSync(file)) { response.writeHead(404).end('Not found'); return; }
  response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  response.setHeader('Cache-Control', 'no-cache');
  if (dev && path.extname(file) === '.html') {
    response.end(fs.readFileSync(file,'utf8').replace('</body>', '<script>new EventSource("/__frontend_events").onmessage=function(){location.reload();};</script></body>'));
    return;
  }
  fs.createReadStream(file).pipe(response);
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Open http://localhost:${port}, or run npm run web -- --port 4174.` : error.message);
  process.exit(1);
});
server.listen(port, '0.0.0.0', () => console.log(`Complete frontend: http://localhost:${port}`));
if (dev) {
  let timer;
  const watchedFolders = new Set(['components','core','data','features','lib','styles','utils','manifest.json']);
  const watcher=fs.watch(path.resolve(__dirname,'../src'),{recursive:true},(_event, filename)=>{
    if (!filename || !watchedFolders.has(String(filename).split(/[\\/]/)[0])) return;
    clearTimeout(timer);
    timer=setTimeout(()=>{
      const result=spawnSync(process.execPath,[path.join(__dirname,'build-web.cjs')],{stdio:'inherit'});
      if(result.status===0)for(const client of clients)client.write('data: reload\n\n');
    },200);
  });
  server.on('close',()=>{watcher.close();clearTimeout(timer);for(const client of clients)client.end();});
}
