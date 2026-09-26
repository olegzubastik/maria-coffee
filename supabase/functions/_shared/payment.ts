import { db } from './http.ts';
import { getInvoiceStatus } from './mono.ts';
import { notifyNewOrder } from './telegram.ts';

// Звіряє оплату з monobank (джерело правди) і оновлює замовлення.
// Оновлення умовне (payment_status = 'pending'), тому навіть якщо вебхук
// і опитування статусу прийдуть одночасно, повідомлення в Telegram буде одне.
// Опитування статусу з сайту (кожні 5 с з кожної вкладки) не повинно щоразу смикати monobank:
// основний шлях — вебхук, а це лише запасна перевірка не частіше ніж раз на 15 с.
// Мапа живе в межах одного інстансу функції — цього достатньо як обмежувача.
const THROTTLE_MS = 15_000;
const lastCheck = new Map<string, number>();

export async function syncPayment(order: any, { throttle = false } = {}) {
  if (order.pay !== 'card' || order.payment_status !== 'pending' || !order.invoice_id) return order;

  if (throttle) {
    const now = Date.now();
    if (now - (lastCheck.get(order.invoice_id) ?? 0) < THROTTLE_MS) return order;
    lastCheck.set(order.invoice_id, now);
    if (lastCheck.size > 1000) lastCheck.clear();
  }

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
