const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('../dist/app.module');
const { PrismaService } = require('../dist/prisma/prisma.service');

test('public market browsing supports optional filters while estimates and imports retain validation', async () => {
  const queries = [];
  const module = await Test.createTestingModule({ imports:[AppModule] })
    .overrideProvider(PrismaService).useValue({ marketObservation: {
      findMany: async query => { queries.push(query); return []; },
    } }).compile();
  const app = module.createNestApplication({ logger:false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist:true, forbidNonWhitelisted:true, transform:true }));
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl() + '/api/v1/market';
    const all = await fetch(base + '/observations');
    assert.equal(all.status, 200);
    assert.deepEqual(await all.json(), { items:[] });
    assert.equal(queries[0].take, 100);
    const filtered = await fetch(base + '/observations?product=Paddy&district=Guntur&basis=mandi');
    assert.equal(filtered.status, 200);
    assert.deepEqual(JSON.parse(JSON.stringify(queries[1].where)), { product:'Paddy', district:'Guntur', basis:'mandi' });
    for (const query of ['unit=invalid', 'basis=invalid', 'district=x', 'product=x', 'unknown=value'])
      assert.equal((await fetch(base + '/observations?' + query)).status, 400, query);
    assert.equal((await fetch(base + '/estimate')).status, 400);
    assert.equal((await fetch(base + '/imports', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{"records":[]}' })).status, 401);
  } finally { await app.close(); }
});
