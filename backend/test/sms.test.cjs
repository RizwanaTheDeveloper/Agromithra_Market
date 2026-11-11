const test = require('node:test');
const assert = require('node:assert/strict');
const { sendSms } = require('../dist/integrations/otp/sms');

const cfg = values => ({ get: key => values[key] });
const full = { TWILIO_ACCOUNT_SID: 'AC123', TWILIO_AUTH_TOKEN: 'secret', TWILIO_FROM: '+15550001111' };

test('SMS sender refuses to run without credentials', async () => {
  await assert.rejects(() => sendSms(cfg({}), '+919876543210', 'x'), /not configured/);
  await assert.rejects(() => sendSms(cfg({ TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 't' }), '+919876543210', 'x'), /not configured/);
});

test('SMS sender posts the message to Twilio with basic auth and reports provider failures', async () => {
  const original = global.fetch;
  try {
    let call;
    global.fetch = async (url, init) => { call = { url, init }; return { ok: true }; };
    await sendSms(cfg(full), '+919876543210', 'Your code is 123456');
    assert.match(call.url, /api\.twilio\.com\/2010-04-01\/Accounts\/AC123\/Messages\.json$/);
    assert.equal(call.init.headers.Authorization, 'Basic ' + Buffer.from('AC123:secret').toString('base64'));
    assert.equal(call.init.body.get('To'), '+919876543210');
    assert.equal(call.init.body.get('From'), '+15550001111');
    global.fetch = async () => ({ ok: false, status: 400 });
    await assert.rejects(() => sendSms(cfg(full), '+919876543210', 'x'), /could not be sent/);
    global.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(() => sendSms(cfg(full), '+919876543210', 'x'), /could not be reached/);
  } finally { global.fetch = original; }
});
