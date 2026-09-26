// GET /functions/v1/order-status?id=<uuid>
// Повертає лише безпечні поля (без телефону й адреси). UUID неможливо вгадати,
// тож знати його може тільки той, хто створив замовлення.
import { cors, db, json, UUID_RE } from '../_shared/http.ts';
import { syncPayment } from '../_shared/payment.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!UUID_RE.test(id)) return json({ error: 'Not found' }, 404);

  let { data: order } = await db.from('orders').select().eq('id', id).maybeSingle();
  if (!order) return json({ error: 'Not found' }, 404);

  // Якщо вебхук ще не дійшов — звіряємо оплату самі
  try { order = await syncPayment(order); } catch (e) { console.error(e); }

  return json({
    id: order.id,
    number: order.number,
    status: order.status,
    payment_status: order.payment_status,
    pay: order.pay,
    method: order.method,
    total: order.total,
    items: order.items.map((i: any) => ({ name: i.name, qty: i.qty })),
    pageUrl: order.status === 'awaiting_payment' ? order.page_url : null,
    created_at: order.created_at,
  });
});
