# ☕ Maria — сайт кав’ярні

Мобільний сайт кав’ярні «Maria» у стилі мобільного застосунку. Це демо-проєкт для портфоліо на чистих **HTML, CSS і JavaScript**, без фреймворків і збирання.

**Демо:** https://olegzubastik.github.io/maria-coffee/

## Можливості

- **Головна**: привітання залежно від часу доби, статус «відчинено/зачинено» за реальними годинами роботи, популярні позиції.
- **Меню**: 16 позицій у трьох категоріях (кава, десерти, сніданки), фільтр-чипси, картка товару в нижній шторці (закривається свайпом униз).
- **Кошик**: зміна кількості, видалення з анімацією, підсумок. Кошик зберігається в `localStorage`.
- **Оформлення замовлення**: самовивіз або доставка (безкоштовно від 500 ₴), маска телефону `+380`, демо-оплата карткою (перевірка номера за алгоритмом Луна, живий прев’ю картки) або готівкою.
- **Екран «Замовлення оформлено»**: номер замовлення та анімована галочка.
- **Відгуки**: середній рейтинг, розподіл оцінок, форма із зірками 1–5. Відгуки зберігаються в `localStorage`, свої відгуки можна видалити.
- **Контакти**: мапа OpenStreetMap, телефон, пошта, години роботи з підсвіченим сьогоднішнім днем.

> 💳 Оплата **демонстраційна**: дані нікуди не надсилаються. Тестова картка: `4242 4242 4242 4242`, будь-яка майбутня дата та будь-який CVC.

## Деталі

- Mobile-first верстка. На комп’ютері сайт показується по центру, як екран телефона.
- Нижня навігація як у застосунку, з бейджем кількості товарів у кошику.
- Анімації: поява карток по черзі, «політ» товару в кошик, тости, шторка, валідація з «трусінням» поля.
- Підтримка `safe-area` для iPhone і `prefers-reduced-motion`.
- Захист від XSS: текст користувача екранується.
- SPA на hash-роутингу (`#menu`, `#cart`…), тому працює на GitHub Pages без налаштувань.

## Бекенд: реальні замовлення, оплата monobank і Telegram-бот

Без бекенду сайт працює в демо-режимі. Якщо в `js/config.js` вказати адресу Supabase, вмикаються реальні замовлення:

```
Сайт ──POST create-order──▶ Supabase Edge Function ──▶ таблиця orders (ціни з menu_items)
  │                                   │
  │ готівка ─────────────────────────┼──▶ Telegram: «🔔 Нове замовлення» + кнопки статусу
  │ картка ◀── pageUrl ── monobank ◀─┘
  ▼                          │ оплата
сторінка оплати monobank ────┴──▶ mono-webhook (перевірка підпису X-Sign) ──▶ paid ──▶ Telegram
  │
  ▼ redirect
#order/<id> — клієнт бачить статус: Оплата → Прийнято → Готується → Готово → Видано
                             ▲
Бариста натискає кнопки в Telegram ── telegram-webhook ──┘
```

**Безпека**
- Суму рахує сервер за цінами з бази; ціни з браузера ігноруються.
- Таблиці закриті RLS, браузер працює лише через Edge Functions.
- Вебхук monobank перевіряється за ECDSA-підписом, а статус оплати додатково запитується в monobank.
- Вебхук Telegram приймає лише запити із секретним заголовком, кнопки працюють тільки в чаті кав’ярні.
- Не більше 3 замовлень з одного номера за 10 хвилин.

**Файли бекенду**
```
supabase/
├── migrations/…_orders.sql       # таблиці menu_items і orders
└── functions/
    ├── create-order/             # створення замовлення + рахунку monobank
    ├── order-status/             # статус для сторінки #order/<id>
    ├── mono-webhook/             # підтвердження оплати від monobank
    ├── telegram-webhook/         # кнопки статусу в боті, /start → chat_id
    └── _shared/                  # валідація, підпис ECDSA, повідомлення Telegram
tests/backend.test.ts             # node --test tests/backend.test.ts
```

**Розгортання**
1. Створіть проєкт на [supabase.com](https://supabase.com) (регіон Frankfurt).
2. Створіть бота в [@BotFather](https://t.me/BotFather) і отримайте тестовий токен еквайрингу на [api.monobank.ua](https://api.monobank.ua/).
3. Виконайте:
   ```bash
   npx supabase login
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase db push
   npx supabase secrets set MONO_TOKEN=<токен monobank> TELEGRAM_BOT_TOKEN=<токен бота> TELEGRAM_WEBHOOK_SECRET=<випадковий рядок> SITE_URL=https://olegzubastik.github.io/maria-coffee/
   npx supabase functions deploy
   curl "https://api.telegram.org/bot<токен бота>/setWebhook?url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-webhook&secret_token=<той самий випадковий рядок>"
   ```
4. Напишіть боту `/start` (або додайте його в групу бариста). Він відповість `chat_id`, збережіть його:
   ```bash
   npx supabase secrets set TELEGRAM_CHAT_ID=<chat_id>
   ```
5. У `js/config.js` вкажіть `window.MARIA_API = 'https://<PROJECT_REF>.supabase.co/functions/v1';`

> Ціни змінюються у двох місцях: `js/data.js` (відображення) і таблиця `menu_items` (оплата).

## Структура

```
maria-coffee/
├── index.html      # каркас: шапка, контейнер сторінок, таб-бар, шторка
├── css/style.css   # стилі та анімації (токени кольорів у :root)
└── js/
    ├── data.js     # меню та стартові відгуки
    └── app.js      # роутер, кошик, оформлення замовлення, відгуки
```

## Локальний запуск

Відкрийте `index.html` у браузері або запустіть локальний сервер:

```bash
python -m http.server 8000
```

Потім відкрийте http://localhost:8000.

## Публікація на GitHub Pages

1. Створіть репозиторій `maria-coffee` на GitHub і завантажте в нього код.
2. Відкрийте **Settings → Pages → Source: Deploy from a branch**, гілка `main`, тека `/ (root)`.
3. За хвилину сайт буде доступний за адресою `https://olegzubastik.github.io/maria-coffee/`.

## Подяки

Фото: [Unsplash](https://unsplash.com). Шрифти: Playfair Display і Manrope (Google Fonts). Мапа: © учасники OpenStreetMap.
