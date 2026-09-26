// Текст повідомлення та кнопки для Telegram. Без залежностей — тестується в Node.

export const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: '⏳ Очікує оплати',
  accepted: '🆕 Прийнято',
  preparing: '👨‍🍳 Готується',
  ready: '✅ Готово',
  done: '📦 Видано',
  cancelled: '❌ Скасовано',
};

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
const uah = (n: number) => n.toLocaleString('uk-UA').replace(/\s/g, ' ') + ' ₴';

export function orderMessage(o: any): string {
  const time = new Date(o.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' });
  const payLine = o.pay === 'card'
    ? `💳 ${o.payment_status === 'paid' ? 'Оплачено карткою' : 'Картка (не оплачено)'} — <b>${uah(o.total)}</b>`
    : `💵 Готівка при отриманні — <b>${uah(o.total)}</b>${o.change_from ? ` (решта з ${uah(o.change_from)})` : ''}`;
  const lines = [
    `<b>Замовлення №${o.number}</b> · ${time}`,
    payLine,
    o.method === 'delivery' ? `🛵 Доставка: ${esc(o.address ?? '')}` : '🏃 Самовивіз',
    `👤 ${esc(o.customer_name)} · ${o.phone}`,
    '',
    ...o.items.map((i: any) => `• ${esc(i.name)} × ${i.qty} — ${uah(i.price * i.qty)}`),
  ];
  if (o.delivery_fee) lines.push(`• Доставка — ${uah(o.delivery_fee)}`);
  if (o.comment) lines.push('', `💬 ${esc(o.comment)}`);
  lines.push('', `Статус: <b>${STATUS_LABEL[o.status] ?? o.status}</b>`);
  if (o.status === 'cancelled' && o.pay === 'card' && o.payment_status === 'paid') {
    lines.push('⚠️ Замовлення оплачене — поверніть кошти в кабінеті monobank.');
  }
  return lines.join('\n');
}

export function orderKeyboard(o: any) {
  const btn = (text: string, to: string) => ({ text, callback_data: `st:${o.id}:${to}` });
  const rows: Record<string, any[][]> = {
    accepted: [[btn('👨‍🍳 Готується', 'preparing')], [btn('❌ Скасувати', 'cancelled')]],
    preparing: [[btn('✅ Готово', 'ready')], [btn('❌ Скасувати', 'cancelled')]],
    ready: [[btn(o.method === 'delivery' ? '🛵 Передано кур’єру' : '📦 Видано', 'done')]],
  };
  return { inline_keyboard: rows[o.status] ?? [] };
}
