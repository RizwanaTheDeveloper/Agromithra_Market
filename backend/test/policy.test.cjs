const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkContact, checkTransition, checkUnit, checkQuantity, checkExpiry, publicText } = require('../dist/common/policy');
const { validateObservation } = require('../dist/modules/market/market.service');
const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');
const { CreateListingDto } = require('../dist/modules/listings/listings.dto');
const { ImportPricesDto } = require('../dist/modules/market/market.dto');
const { AuthGuard } = require('../dist/modules/auth/auth.guard');
const { AuthService, tokenDigest } = require('../dist/modules/auth/auth.service');
const { createHmac } = require('node:crypto');

test('contact requires every authorization condition', () => {
  const allowed = { approved: true, blocked: false, enabled: true, own: false };
  assert.doesNotThrow(() => checkContact(allowed));
  for (const [key, value] of Object.entries({ approved: false, blocked: true, enabled: false, own: true }))
    assert.throws(() => checkContact({ ...allowed, [key]: value }), { status: 403 });
});
test('deal transitions prevent skipping stages and unauthorized completion', () => {
  assert.doesNotThrow(() => checkTransition('quote', 'agreed', true));
  assert.throws(() => checkTransition('quote', 'completed', false), { status: 400 });
  assert.throws(() => checkTransition('quote', 'agreed', false), { status: 403 });
  assert.throws(() => checkTransition('dispatched', 'completed', true), { status: 403 });
  assert.doesNotThrow(() => checkTransition('dispatched', 'completed', false));
  assert.throws(() => checkTransition('completed', 'cancelled', true));
});
test('category units and future expiry are checked', () => {
  assert.doesNotThrow(() => checkUnit('eggs', 'tray30'));
  assert.throws(() => checkUnit('cattle', 'kg'));
  assert.throws(() => checkQuantity('animal', 1.5));
  assert.doesNotThrow(() => checkQuantity('kg', 1.5));
  assert.throws(() => checkExpiry('2020-01-01'));
  assert.throws(() => checkExpiry(new Date(Date.now() + 91 * 86400000).toISOString()));
});
test('public text rejects ordinary contact details', () => {
  for (const text of ['call +91 98765 43210', 'https://example.com', 'user@example.com']) assert.throws(() => publicText(text));
  assert.equal(publicText('Sona Masoori paddy, 13% moisture declared'), 'Sona Masoori paddy, 13% moisture declared');
});
test('market records preserve valid dates and reject reversed prices', () => {
  const row = { reportedAt: '2024-02-29', minimum: 100, modal: 110, maximum: 120 };
  assert.equal(validateObservation(row).toISOString(), '2024-02-29T00:00:00.000Z');
  assert.throws(() => validateObservation({ ...row, reportedAt: '2024-02-30' }));
  assert.throws(() => validateObservation({ ...row, minimum: 130 }));
  assert.throws(() => validateObservation({ ...row, reportedAt: '2099-01-01' }));
});
test('DTO validation rejects invalid money, nested imports and unknown fields', async () => {
  const listing = plainToInstance(CreateListingDto, { price: -1, quantity: 0, isAdmin: true });
  const errors = await validate(listing, { whitelist: true, forbidNonWhitelisted: true });
  for (const key of ['price', 'quantity', 'isAdmin']) assert.ok(errors.some(error => error.property === key));
  const nested = await validate(plainToInstance(ImportPricesDto, { records: [{ modal: -1 }] }));
  assert.ok(nested.length > 0);
});
test('authentication rejects missing, unknown and expired bearer sessions', async () => {
  let request = { headers: {} };
  const context = { switchToHttp: () => ({ getRequest: () => request }) };
  const db = { session: { findUnique: async () => null } };
  const guard = new AuthGuard(db);
  await assert.rejects(guard.canActivate(context), { status: 401 });
  request.headers.authorization = 'Bearer ' + 'a'.repeat(43);
  await assert.rejects(guard.canActivate(context), { status: 401 });
  db.session.findUnique = async () => ({ expiresAt: new Date(0), user: { id: 'expired' } });
  await assert.rejects(guard.canActivate(context), { status: 401 });
  db.session.findUnique = async () => ({ expiresAt: new Date(Date.now() + 10000), user: { id: 'current' } });
  assert.equal(await guard.canActivate(context), true);
  assert.equal(request.user.id, 'current');
});

test('OTP failures consume attempts; successful verification stores only a token hash and prevents replay', async () => {
  const secret = 'test-secret'.repeat(8), challengeId = 'test-challenge', code = '123456';
  const challenge = { id: challengeId, phone: '+919876543210', attempts: 0, consumedAt: null, expiresAt: new Date(Date.now() + 300000), digest: createHmac('sha256', secret).update(challengeId + ':' + code).digest('hex') };
  let savedSession;
  const tx = {
    $executeRaw: async () => 1,
    otpChallenge: {
      findUnique: async () => ({ ...challenge }),
      update: async () => { challenge.attempts++; },
      updateMany: async () => { challenge.consumedAt = new Date(); },
    },
    user: { upsert: async () => ({ id: 'user-id' }) },
    session: { create: async ({ data }) => { savedSession = data; } },
  };
  const service = new AuthService({ $transaction: async callback => callback(tx) }, { getOrThrow: () => secret, get: () => undefined });
  await assert.rejects(service.verifyOtp(challengeId, '000000'), { status: 401 });
  assert.equal(challenge.attempts, 1);
  assert.equal(savedSession, undefined);
  const result = await service.verifyOtp(challengeId, code);
  assert.equal(challenge.attempts, 2);
  assert.equal(savedSession.tokenHash, tokenDigest(result.accessToken));
  assert.notEqual(savedSession.tokenHash, result.accessToken);
  await assert.rejects(service.verifyOtp(challengeId, code), { status: 401 });
  challenge.consumedAt = null; challenge.attempts = 5;
  await assert.rejects(service.verifyOtp(challengeId, code), { status: 401 });
  challenge.attempts = 0; challenge.expiresAt = new Date(0);
  await assert.rejects(service.verifyOtp(challengeId, code), { status: 401 });
});
