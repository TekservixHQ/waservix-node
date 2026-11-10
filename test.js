'use strict';
const assert = require('assert');
const WAservix = require('./index');
const { verifyWebhook, WAservixError } = WAservix;

const calls = [];
const mockFetch = (status, json, headers = {}) => async (url, opts) => {
  calls.push({ url, opts });
  return { ok: status < 400, status, text: async () => JSON.stringify(json), headers: { get: (k) => headers[k.toLowerCase()] || null } };
};

(async () => {
  const c = new WAservix({ apiKey: 'wpk_test', fetch: mockFetch(200, { success: true, data: { msgId: 5, jid: 'x', status: 'in_progress' } }) });
  const r = await c.sendText('+15551234567', 'hi');
  assert.strictEqual(r.msgId, 5);
  assert.strictEqual(calls[0].url, 'https://tekservix.com/waservix/api/send-message');
  assert.strictEqual(calls[0].opts.headers.Authorization, 'Bearer wpk_test');
  assert.deepStrictEqual(JSON.parse(calls[0].opts.body), { to: '+15551234567', text: 'hi' });

  await c.sendDocument('+1', 'https://a.test/i.pdf', 'i.pdf', 'Invoice');
  assert.deepStrictEqual(JSON.parse(calls[1].opts.body), { to: '+1', documentUrl: 'https://a.test/i.pdf', fileName: 'i.pdf', text: 'Invoice' });
  await c.getMessageInfo(58213);
  assert.strictEqual(calls[2].url, 'https://tekservix.com/waservix/api/messages/58213/info');
  await c.onWhatsApp('+15551234567');
  assert.strictEqual(calls[3].url, 'https://tekservix.com/waservix/api/on-whatsapp/%2B15551234567');
  await c.editMessage(9, 'fixed');
  assert.strictEqual(calls[4].opts.method, 'PUT');
  assert.deepStrictEqual(JSON.parse(calls[4].opts.body), { text: 'fixed' });
  await c.connectSession(12);
  assert.deepStrictEqual(JSON.parse(calls[5].opts.body), { method: 'qr' });
  assert.throws(() => c.sendMessage({ text: 'no to' }), /to/);

  const bad = new WAservix({ apiKey: 'k', fetch: mockFetch(400, { success: false, message: '"to" is required', errors: { to: ['required'] } }) });
  await assert.rejects(bad.getStatus(), (e) => e instanceof WAservixError && e.status === 400 && e.errors.to[0] === 'required');

  assert.strictEqual(verifyWebhook('abc123', 'abc123'), true);
  assert.strictEqual(verifyWebhook('abc124', 'abc123'), false);
  assert.strictEqual(verifyWebhook('', 'abc123'), false);
  assert.throws(() => new WAservix({}), /apiKey/);
  console.log('waservix: all tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
