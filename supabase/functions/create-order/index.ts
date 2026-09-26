// POST /functions/v1/create-order
// Тіло: { name, phone, method, address?, pay, comment?, change?, items: [{id, qty}] }
// Відповідь: { id, number, pageUrl? } — pageUrl є лише для оплати карткою
import { cors, db, json } from '../_shared/http.ts';
import { buildOrder, type MenuItem } from '../_shared/order.ts';
import { createInvoice } from '../_shared/mono.ts';
import { notifyNewOrder } from '../_shared/telegram.ts';

const MAX_ORDERS_PER_PHONE = 3;   // захист від спаму: не більше 3 замовлень
const WINDOW_MINUTES = 10;         // з одного номера за 10 хвилин

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
  const { count } = await db.from('orders').select('id', { count: 'exact', head: true })
    .eq('phone', o.phone).gte('created_at', since);
  if ((count ?? 0) >= MAX_ORDERS_PER_PHONE) {
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
    await db.from('orders').update({ invoice_id: invoiceId, page_url: pageUrl }).eq('id', order.id);
    return json({ id: order.id, number: order.number, pageUrl });
  } catch (e) {
    console.error(e);
    await db.from('orders').update({ status: 'cancelled', payment_status: 'failed' }).eq('id', order.id);
    return json({ error: 'Не вдалося створити платіж. Спробуйте ще раз або оберіть готівку.' }, 502);
  }
});
