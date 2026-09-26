// Валідація замовлення і розрахунок суми. Без залежностей — тестується в Node.
// Ціни беруться лише з бази (menu), ціни з браузера ігноруються.

export const DELIVERY_FEE = 60;
export const FREE_DELIVERY_FROM = 500;

export type MenuItem = { id: string; name: string; price: number; image: string | null; active: boolean };
export type OrderItem = { id: string; name: string; price: number; qty: number; image: string | null };

export type NewOrder = {
  customer_name: string;
  phone: string;
  method: 'pickup' | 'delivery';
  address: string | null;
  comment: string | null;
  change_from: number | null;
  pay: 'card' | 'cash';
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
};

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function normalizePhone(v: unknown): string | null {
  const d = String(v ?? '').replace(/\D/g, '');
  return /^380\d{9}$/.test(d) ? '+' + d : null;
}

export function buildOrder(body: any, menu: Map<string, MenuItem>):
  { ok: true; order: NewOrder } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const b = body && typeof body === 'object' ? body : {};

  const name = str(b.name, 50);
  if (name.length < 2) errors.name = 'Вкажіть ім’я';

  const phone = normalizePhone(b.phone);
  if (!phone) errors.phone = 'Невірний номер телефону';

  const method = b.method === 'delivery' ? 'delivery' : b.method === 'pickup' ? 'pickup' : null;
  if (!method) errors.method = 'Невірний спосіб отримання';

  const address = method === 'delivery' ? str(b.address, 200) : '';
  if (method === 'delivery' && address.length < 5) errors.address = 'Вкажіть адресу доставки';

  const pay = b.pay === 'card' ? 'card' : b.pay === 'cash' ? 'cash' : null;
  if (!pay) errors.pay = 'Невірний спосіб оплати';

  // об'єднуємо дублікати й перевіряємо кожну позицію
  const qtyById = new Map<string, number>();
  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 30) {
    errors.items = 'Кошик порожній';
  } else {
    for (const it of b.items) {
      const id = typeof it?.id === 'string' ? it.id : '';
      const qty = Number(it?.qty);
      const m = menu.get(id);
      if (!m || !m.active || !Number.isInteger(qty) || qty < 1 || qty > 20) {
        errors.items = 'Деякі позиції недоступні';
        break;
      }
      qtyById.set(id, Math.min(20, (qtyById.get(id) ?? 0) + qty));
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const items: OrderItem[] = [...qtyById].map(([id, qty]) => {
    const m = menu.get(id)!;
    return { id, name: m.name, price: m.price, qty, image: m.image };
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery_fee = method === 'delivery' && subtotal < FREE_DELIVERY_FROM ? DELIVERY_FEE : 0;
  const change = Number(String(b.change ?? '').replace(/\D/g, ''));

  return {
    ok: true,
    order: {
      customer_name: name,
      phone: phone!,
      method: method!,
      address: method === 'delivery' ? address : null,
      comment: str(b.comment, 300) || null,
      change_from: pay === 'cash' && change > 0 ? Math.min(change, 100000) : null,
      pay: pay!,
      items,
      subtotal,
      delivery_fee,
      total: subtotal + delivery_fee,
    },
  };
}

// Дозволені переходи статусів (кнопки в Telegram)
export const NEXT_STATUS: Record<string, string[]> = {
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['done'],
};

export const canTransition = (from: string, to: string) => (NEXT_STATUS[from] ?? []).includes(to);
