// monobank acquiring API: https://api.monobank.ua/docs/acquiring.html
import { env } from './http.ts';
import { importMonoPubKey, verifyMonoSignature } from './ecdsa.ts';

const API = 'https://api.monobank.ua/api/merchant';
const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?w=200&h=200&fit=crop`;

async function mono(path: string, init: RequestInit = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: { 'X-Token': env('MONO_TOKEN'), 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`monobank ${path} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// Суми в monobank — у копійках, ccy 980 = UAH
export async function createInvoice(order: any): Promise<{ invoiceId: string; pageUrl: string }> {
  const basketOrder = order.items.map((i: any) => ({
    name: i.name,
    qty: i.qty,
    sum: i.price * 100,
    total: i.price * i.qty * 100,
    code: i.id,
    unit: 'шт.',
    ...(i.image ? { icon: IMG(i.image) } : {}),
  }));
  if (order.delivery_fee) {
    basketOrder.push({ name: 'Доставка', qty: 1, sum: order.delivery_fee * 100, total: order.delivery_fee * 100, code: 'delivery', unit: 'послуга' });
  }
  const site = env('SITE_URL').replace(/\/?$/, '/');
  return mono('/invoice/create', {
    method: 'POST',
    body: JSON.stringify({
      amount: order.total * 100,
      ccy: 980,
      merchantPaymInfo: {
        reference: order.id,
        destination: `Замовлення №${order.number} у кав’ярні Maria`,
        basketOrder,
      },
      redirectUrl: `${site}#order/${order.id}`,
      webHookUrl: `${env('SUPABASE_URL')}/functions/v1/mono-webhook`,
      validity: 3600,
    }),
  });
}

// status: created | processing | hold | success | failure | reversed | expired
export async function getInvoiceStatus(invoiceId: string): Promise<{ status: string }> {
  return mono(`/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`);
}

// Публічний ключ кешується; банк зрідка його змінює — тоді перезавантажуємо й пробуємо ще раз
let cachedKey: CryptoKey | null = null;
async function pubKey(force = false) {
  if (!cachedKey || force) {
    const { key } = await mono('/pubkey');
    cachedKey = await importMonoPubKey(key);
  }
  return cachedKey;
}

export async function verifyWebhook(sign: string | null, body: Uint8Array<ArrayBuffer>): Promise<boolean> {
  if (!sign) return false;
  if (await verifyMonoSignature(await pubKey(), sign, body)) return true;
  return verifyMonoSignature(await pubKey(true), sign, body);
}
