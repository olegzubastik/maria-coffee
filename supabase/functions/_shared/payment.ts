import { db } from './http.ts';
import { getInvoiceStatus } from './mono.ts';
import { notifyNewOrder } from './telegram.ts';

// Звіряє оплату з monobank (джерело правди) і оновлює замовлення.
// Оновлення умовне (payment_status = 'pending'), тому навіть якщо вебхук
// і опитування статусу прийдуть одночасно, повідомлення в Telegram буде одне.
export async function syncPayment(order: any) {
  if (order.pay !== 'card' || order.payment_status !== 'pending' || !order.invoice_id) return order;

  const { status } = await getInvoiceStatus(order.invoice_id);

  let patch: Record<string, string> | null = null;
  if (status === 'success') patch = { payment_status: 'paid', status: 'accepted' };
  else if (['failure', 'expired', 'reversed'].includes(status)) patch = { payment_status: 'failed', status: 'cancelled' };
  if (!patch) return order; // created / processing / hold — ще чекаємо

  const { data: updated } = await db
    .from('orders')
    .update(patch)
    .eq('id', order.id)
    .eq('payment_status', 'pending')
    .select()
    .maybeSingle();

  if (!updated) {
    const { data } = await db.from('orders').select().eq('id', order.id).single();
    return data;
  }
  if (updated.payment_status === 'paid') await notifyNewOrder(updated);
  return updated;
}
