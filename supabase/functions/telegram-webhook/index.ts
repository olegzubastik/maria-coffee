// POST /functions/v1/telegram-webhook — оновлення від Telegram-бота.
// /start — бот відповідає chat_id (потрібен для налаштування TELEGRAM_CHAT_ID).
// Кнопки під замовленням змінюють його статус; клієнт бачить це на сайті.
import { db, env, json, UUID_RE } from '../_shared/http.ts';
import { STATUS_LABEL } from '../_shared/format.ts';
import { canTransition } from '../_shared/order.ts';
import { refreshOrderMessage, tg } from '../_shared/telegram.ts';

Deno.serve(async (req) => {
  // Telegram надсилає секрет, заданий у setWebhook — чужі запити відкидаємо
  if (req.headers.get('x-telegram-bot-api-secret-token') !== env('TELEGRAM_WEBHOOK_SECRET')) {
    return json({ error: 'Forbidden' }, 403);
  }
  const update = await req.json().catch(() => ({}));

  const msg = update.message;
  if (msg?.text?.startsWith('/start')) {
    await tg('sendMessage', {
      chat_id: msg.chat.id,
      text: `☕ Бот кав’ярні Maria.\nchat_id цього чату: <code>${msg.chat.id}</code>`,
      parse_mode: 'HTML',
    });
    return json({ ok: true });
  }

  const cb = update.callback_query;
  if (!cb) return json({ ok: true });

  const answer = (text: string) => tg('answerCallbackQuery', { callback_query_id: cb.id, text });

  // кнопки працюють лише в чаті кав’ярні
  if (String(cb.message?.chat?.id) !== env('TELEGRAM_CHAT_ID')) {
    await answer('Немає доступу');
    return json({ ok: true });
  }

  const [kind, id, to] = String(cb.data ?? '').split(':');
  if (kind !== 'st' || !UUID_RE.test(id)) return json({ ok: true });

  const { data: order } = await db.from('orders').select().eq('id', id).maybeSingle();
  if (!order || !canTransition(order.status, to)) {
    await answer('Статус уже змінено');
    if (order) await refreshOrderMessage(order);
    return json({ ok: true });
  }

  // умова .eq('status', order.status) захищає від подвійного натискання
  const { data: updated } = await db.from('orders').update({ status: to })
    .eq('id', id).eq('status', order.status).select().maybeSingle();
  if (!updated) {
    await answer('Статус уже змінено');
    return json({ ok: true });
  }

  await refreshOrderMessage(updated);
  await answer(`№${updated.number}: ${STATUS_LABEL[to]}`);
  return json({ ok: true });
});
