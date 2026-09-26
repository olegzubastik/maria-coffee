// POST /functions/v1/create-order
// Тіло: { name, phone, method, address?, pay, comment?, change?, items: [{id, qty}] }
// Відповідь: { id, number, pageUrl? } — pageUrl є лише для оплати карткою
import { cors, db, json } from '../_shared/http.ts';
import { buildOrder, type MenuItem } from '../_shared/order.ts';
import { createInvoice } from '../_shared/mono.ts';
import { notifyNewOrder } from '../_shared/telegram.ts';

// Захист від спаму (вікно 10 хвилин на один номер):
// — не більше 3 замовлень, які дійшли до бариста (готівка або оплачені);
// — не більше 10 спроб загалом (невдалі й покинуті оплати карткою теж рахуються).
const MAX_REAL_ORDERS = 3;
const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const body = await req.json().catch(() => null);

  const { data: menuRows, error: menuErr } = await db.from('menu_items').select();
  if (menuErr) return json({ error: 'Сервіс тимчасово недоступний' }, 500);
  const menu = new Map<string, MenuItem>(menuRows.map((m: MenuItem) => [m.id, m]));

  const built = buildOrder(body, menu);
  if (!built.ok) return json({ error: 'Перевірте дані замовлення', fields: built.errors }, 400);
  const o = built.order;

  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { data: recent, error: recentErr } = await db.from('orders')
    .select('pay, payment_status').eq('phone', o.phone).gte('created_at', since);
  if (recentErr) return json({ error: 'Сервіс тимчасово недоступний' }, 500);
  const reachedBarista = recent.filter((r) => r.pay === 'cash' || r.payment_status === 'paid').length;
  if (reachedBarista >= MAX_REAL_ORDERS || recent.length >= MAX_ATTEMPTS) {
    return json({ error: 'Забагато замовлень. Спробуйте за кілька хвилин.' }, 429);
  }

  const isCard = o.pay === 'card';
  const { data: order, error } = await db.from('orders').insert({
    ...o,
    status: isCard ? 'awaiting_payment' : 'accepted',
    payment_status: isCard ? 'pending' : 'unpaid',
  }).select().single();
  if (error) {
    console.error(error);
    return json({ error: 'Не вдалося створити замовлення' }, 500);
  }

  if (!isCard) {
    await notifyNewOrder(order);
    return json({ id: order.id, number: order.number });
  }

  try {
    const { invoiceId, pageUrl } = await createInvoice(order);
    const { error: linkErr } = await db.from('orders').update({ invoice_id: invoiceId, page_url: pageUrl }).eq('id', order.id);
    // не критично: mono-webhook знайде замовлення за reference (= id замовлення)
    if (linkErr) console.error('link invoice', order.id, invoiceId, linkErr);
    return json({ id: order.id, number: order.number, pageUrl });
  } catch (e) {
    console.error(e);
    await db.from('orders').update({ status: 'cancelled', payment_status: 'failed' }).eq('id', order.id);
    return json({ error: 'Не вдалося створити платіж. Спробуйте ще раз або оберіть готівку.' }, 502);
  }
});
