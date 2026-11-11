const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('../dist/app.module');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { PrismaFilter } = require('../dist/common/prisma.filter');

test('PostgreSQL API: OTP replay, ownership, contact, stock reservation and cancellation', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  // Dedicated disposable database only. Never point TEST_DATABASE_URL at production.
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.OTP_MODE = 'development';
  process.env.NODE_ENV = 'test';
  process.env.OTP_SECRET = randomUUID() + randomUUID();
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new PrismaFilter());
  await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService);
  const base = await app.getUrl();
  const users = [];
  async function call(method, path, body, token) {
    const response = await fetch(base + '/api/v1' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  }
  async function login() {
    const phone = '+919' + String(BigInt('0x' + randomUUID().replaceAll('-', '').slice(0, 12)) % 1000000000n).padStart(9, '0');
    const challenge = await call('POST', '/auth/otp/request', { phone });
    assert.equal(challenge.status, 201);
    const payload = { challengeId: challenge.body.challengeId, code: challenge.body.developmentCode };
    const result = await call('POST', '/auth/otp/verify', payload);
    assert.equal(result.status, 201);
    users.push({ id: result.body.userId, phone });
    assert.equal((await call('POST', '/auth/otp/verify', payload)).status, 401);
    return { id: result.body.userId, token: result.body.accessToken };
  }
  try {
    const seller = await login(), buyer = await login(), secondBuyer = await login();
    const listing = await call('POST', '/listings', { title: 'Integration paddy lot', description: 'Test stock for buyer inspection.', category: 'crops', product: 'Paddy', variety: 'Sona Masoori', grade: 'Unspecified', unit: 'quintal', price: 100, quantity: 10, minimumOrder: 1, city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', expiresAt: new Date(Date.now() + 86400000).toISOString() }, seller.token);
    assert.equal(listing.status, 201);
    const id = listing.body.id;
    assert.equal((await call('GET', '/listings/' + id)).status, 404);
    assert.equal((await call('PATCH', `/listings/${id}/status`, { status: 'active' }, buyer.token)).status, 404);
    assert.equal((await call('PATCH', `/listings/${id}/status`, { status: 'active' }, seller.token)).status, 200);
    const publicListing = await call('GET', '/listings/' + id);
    assert.equal(publicListing.status, 200);
    assert.equal(JSON.stringify(publicListing.body).includes(users[0].phone), false);
    assert.equal((await call('POST', `/listings/${id}/contact`, { channel: 'call' }, buyer.token)).status, 403);
    for (const person of [buyer, secondBuyer]) await db.buyerVerification.create({ data: { userId: person.id, business: 'Test buyer', purpose: 'Integration test buying', status: 'approved' } });
    await call('PATCH', `/listings/${id}/contact-settings`, { allowCall: true, allowWhatsapp: false }, seller.token);
    assert.equal((await call('POST', `/listings/${id}/contact`, { channel: 'call' }, buyer.token)).status, 201);
    assert.equal((await call('POST', `/listings/${id}/contact`, { channel: 'whatsapp' }, buyer.token)).status, 403);
    await call('POST', '/listings/blocks/' + buyer.id, {}, seller.token);
    assert.equal((await call('POST', `/listings/${id}/contact`, { channel: 'call' }, buyer.token)).status, 403);
    await call('DELETE', '/listings/blocks/' + buyer.id, null, seller.token);
    const payload = { listingId: id, quantity: 8, idempotencyKey: randomUUID() };
    const first = await call('POST', '/deals', payload, buyer.token);
    assert.equal(first.status, 201);
    assert.equal((await call('POST', '/deals', payload, buyer.token)).body.id, first.body.id);
    assert.equal((await call('GET', '/deals/' + first.body.id, null, secondBuyer.token)).status, 404);
    const second = await call('POST', '/deals', { ...payload, idempotencyKey: randomUUID() }, secondBuyer.token);
    const accepted = await Promise.all([first, second].map(deal => call('PATCH', `/deals/${deal.body.id}/stage`, { stage: 'agreed', version: 1 }, seller.token)));
    assert.deepEqual(accepted.map(item => item.status).sort(), [200, 409]);
    assert.equal((await db.listing.findUnique({ where: { id } })).quantity.toString(), '2');
    const success = accepted.find(item => item.status === 200);
    assert.equal((await call('PATCH', `/deals/${success.body.id}/stage`, { stage: 'cancelled', version: 1 }, seller.token)).status, 409);
    assert.equal((await call('PATCH', `/deals/${success.body.id}/stage`, { stage: 'cancelled', version: 2 }, seller.token)).status, 200);
    assert.equal((await db.listing.findUnique({ where: { id } })).quantity.toString(), '10');
    await call('DELETE', '/auth/session', null, buyer.token);
    assert.equal((await call('GET', '/users/me', null, buyer.token)).status, 401);
  } finally {
    const ids = users.map(user => user.id);
    await db.$transaction(async tx => {
      await tx.dealEvent.deleteMany({ where: { deal: { buyerId: { in: ids } } } });
      await tx.deal.deleteMany({ where: { buyerId: { in: ids } } });
      await tx.contactEvent.deleteMany({ where: { buyerId: { in: ids } } });
      await tx.listing.deleteMany({ where: { sellerId: { in: ids } } });
      await tx.otpChallenge.deleteMany({ where: { phone: { in: users.map(user => user.phone) } } });
      await tx.user.deleteMany({ where: { id: { in: ids } } });
    });
    await app.close();
  }
});
