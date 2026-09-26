import { db, env } from './http.ts';
import { orderKeyboard, orderMessage } from './format.ts';

export async function tg(method: string, payload: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) console.error(`telegram ${method}`, data);
  return data;
}

// Нове замовлення → повідомлення в чат кав’ярні; id повідомлення зберігаємо для редагування
export async function notifyNewOrder(order: any) {
  const res = await tg('sendMessage', {
    chat_id: env('TELEGRAM_CHAT_ID'),
    text: '🔔 Нове замовлення!\n\n' + orderMessage(order),
    parse_mode: 'HTML',
    reply_markup: orderKeyboard(order),
  });
  if (res.ok) await db.from('orders').update({ tg_message_id: res.result.message_id }).eq('id', order.id);
}

export async function refreshOrderMessage(order: any) {
  if (!order.tg_message_id) return;
  await tg('editMessageText', {
    chat_id: env('TELEGRAM_CHAT_ID'),
    message_id: order.tg_message_id,
    text: orderMessage(order),
    parse_mode: 'HTML',
    reply_markup: orderKeyboard(order),
  });
}
