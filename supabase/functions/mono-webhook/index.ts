// POST /functions/v1/mono-webhook — monobank надсилає сюди зміни статусу рахунку.
// 1) перевіряємо підпис X-Sign; 2) статус беремо не з тіла, а запитом до monobank.
import { db, json } from '../_shared/http.ts';
import { verifyWebhook } from '../_shared/mono.ts';
import { syncPayment } from '../_shared/payment.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const raw = new Uint8Array(await req.arrayBuffer());
  if (!(await verifyWebhook(req.headers.get('x-sign'), raw))) {
    return json({ error: 'Bad signature' }, 401);
  }

  let payload: any;
  try { payload = JSON.parse(new TextDecoder().decode(raw)); } catch { return json({ ok: true }); }

  const { data: order } = await db.from('orders').select().eq('invoice_id', payload.invoiceId).maybeSingle();
  if (!order) return json({ ok: true }); // невідомий рахунок — 200, щоб monobank не повторював

  try {
    await syncPayment(order);
  } catch (e) {
    console.error(e);
    return json({ error: 'retry' }, 500); // monobank повторить спробу
  }
  return json({ ok: true });
});
