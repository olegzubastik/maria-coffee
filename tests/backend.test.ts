// Тести чистої логіки бекенду. Запуск: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { buildOrder, canTransition, normalizePhone, type MenuItem } from '../supabase/functions/_shared/order.ts';
import { importMonoPubKey, verifyMonoSignature } from '../supabase/functions/_shared/ecdsa.ts';
import { orderKeyboard, orderMessage } from '../supabase/functions/_shared/format.ts';

const menu = new Map<string, MenuItem>([
  ['latte', { id: 'latte', name: 'Лате', price: 90, image: null, active: true }],
  ['bowl', { id: 'bowl', name: 'Боул', price: 210, image: null, active: true }],
  ['old', { id: 'old', name: 'Старе', price: 10, image: null, active: false }],
]);
const base = { name: 'Олег', phone: '+380 (50) 111-22-33', method: 'pickup', pay: 'cash', items: [{ id: 'latte', qty: 2 }] };

test('ціни беруться з меню, а не з запиту', () => {
  const r = buildOrder({ ...base, items: [{ id: 'latte', qty: 2, price: 1 }] }, menu);
  assert.ok(r.ok);
  assert.equal(r.order.total, 180);
  assert.equal(r.order.phone, '+380501112233');
});

test('доставка платна до 500 ₴ і безкоштовна від 500 ₴', () => {
  const cheap = buildOrder({ ...base, method: 'delivery', address: 'вул. Хрещатик, 1' }, menu);
  assert.ok(cheap.ok);
  assert.equal(cheap.order.delivery_fee, 60);
  assert.equal(cheap.order.total, 240);
  const big = buildOrder({ ...base, method: 'delivery', address: 'вул. Хрещатик, 1', items: [{ id: 'bowl', qty: 3 }] }, menu);
  assert.ok(big.ok);
  assert.equal(big.order.delivery_fee, 0);
});

test('дублікати позицій об’єднуються', () => {
  const r = buildOrder({ ...base, items: [{ id: 'latte', qty: 1 }, { id: 'latte', qty: 2 }] }, menu);
  assert.ok(r.ok);
  assert.deepEqual(r.order.items.map((i) => [i.id, i.qty]), [['latte', 3]]);
});

test('некоректні дані відхиляються', () => {
  const bad = (patch: object) => {
    const r = buildOrder({ ...base, ...patch }, menu);
    assert.equal(r.ok, false);
    return (r as any).errors;
  };
  assert.ok(bad({ phone: '12345' }).phone);
  assert.ok(bad({ name: ' ' }).name);
  assert.ok(bad({ method: 'delivery' }).address);
  assert.ok(bad({ items: [] }).items);
  assert.ok(bad({ items: [{ id: 'old', qty: 1 }] }).items);
  assert.ok(bad({ items: [{ id: 'hack', qty: 1 }] }).items);
  assert.ok(bad({ items: [{ id: 'latte', qty: 0 }] }).items);
  assert.ok(bad({ items: [{ id: 'latte', qty: 1.5 }] }).items);
  assert.ok(bad({ pay: 'bitcoin' }).pay);
  assert.equal(buildOrder(null, menu).ok, false);
});

test('нормалізація телефону', () => {
  assert.equal(normalizePhone('0501112233'), null);
  assert.equal(normalizePhone('380501112233'), '+380501112233');
});

test('переходи статусів', () => {
  assert.ok(canTransition('accepted', 'preparing'));
  assert.ok(canTransition('ready', 'done'));
  assert.ok(!canTransition('awaiting_payment', 'preparing'));
  assert.ok(!canTransition('done', 'cancelled'));
  assert.ok(!canTransition('accepted', 'done'));
});

test('підпис monobank (ECDSA P-256, DER) перевіряється', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  // monobank віддає ключ як base64 від PEM
  const pemB64 = Buffer.from(publicKey.export({ type: 'spki', format: 'pem' })).toString('base64');
  const key = await importMonoPubKey(pemB64);

  // багато ітерацій, щоб покрити r/s із провідними нулями та короткі значення
  for (let n = 0; n < 300; n++) {
    const body = Buffer.from(JSON.stringify({ invoiceId: 'inv' + n, status: 'success' }));
    const signature = sign('sha256', body, privateKey).toString('base64'); // DER за замовчуванням
    assert.equal(await verifyMonoSignature(key, signature, new Uint8Array(body)), true, `iteration ${n}`);
    const tampered = Buffer.from(body.toString().replace('success', 'failure'));
    assert.equal(await verifyMonoSignature(key, signature, new Uint8Array(tampered)), false);
  }
  assert.equal(await verifyMonoSignature(key, 'not-base64!!', new Uint8Array([1])), false);
});

test('повідомлення Telegram екранує HTML і має правильні кнопки', () => {
  const o = {
    id: '11111111-2222-3333-4444-555555555555', number: 1001, created_at: '2026-09-26T09:30:00Z',
    pay: 'card', payment_status: 'paid', total: 240, change_from: null, method: 'delivery',
    address: '<script>', customer_name: 'Олег & Ко', phone: '+380501112233',
    items: [{ name: 'Лате', qty: 2, price: 90 }], delivery_fee: 60, comment: null, status: 'accepted',
  };
  const text = orderMessage(o);
  assert.match(text, /№1001<\/b> · 12:30/);          // час за Києвом
  assert.match(text, /&lt;script&gt;/);
  assert.match(text, /Олег &amp; Ко/);
  assert.match(text, /Оплачено карткою/);
  const kb = orderKeyboard(o).inline_keyboard.flat();
  assert.deepEqual(kb.map((b) => b.callback_data.split(':')[2]), ['preparing', 'cancelled']);
  assert.ok(kb.every((b) => Buffer.byteLength(b.callback_data) <= 64)); // ліміт Telegram
  assert.deepEqual(orderKeyboard({ ...o, status: 'done' }).inline_keyboard, []);
});
