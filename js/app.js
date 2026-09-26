(() => {
  'use strict';

  /* ---------- Хранилище (localStorage с защитой от ошибок) ---------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('maria:' + key);
        return raw ? JSON.parse(raw) : fallback;
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('maria:' + key, JSON.stringify(value)); } catch { /* приватный режим */ }
    },
  };

  const state = {
    cart: store.get('cart', {}),            // { itemId: qty }
    reviews: store.get('reviews', []),      // отзывы пользователя
    lastOrder: store.get('lastOrder', null),
    menuCat: 'all',
  };

  const byId = Object.fromEntries(MENU.map((m) => [m.id, m]));
  // убираем из корзины позиции, которых больше нет в меню
  for (const id of Object.keys(state.cart)) if (!byId[id]) delete state.cart[id];

  /* ---------- Утилиты ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const rub = (n) => n.toLocaleString('ru-RU') + ' ₽';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, [one, few, many]) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  };
  const view = $('#view');

  const ICON = {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8L12 2.5Z"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  };

  const stars = (n) => `<span class="stars" aria-label="${n} из 5">${[1, 2, 3, 4, 5].map((i) => ICON.star.replace('<svg', `<svg class="${i <= n ? '' : 'off'}"`)).join('')}</span>`;

  /* ---------- Часы работы ---------- */
  const HOURS = [ // индекс = getDay() (0 — воскресенье)
    [9, 23], [8, 22], [8, 22], [8, 22], [8, 22], [8, 23], [9, 23],
  ];
  const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  function openStatus() {
    const now = new Date();
    const [from, to] = HOURS[now.getDay()];
    const h = now.getHours() + now.getMinutes() / 60;
    if (h >= from && h < to) return { open: true, text: `Открыто до ${to}:00` };
    const nextFrom = h < from ? from : HOURS[(now.getDay() + 1) % 7][0];
    return { open: false, text: `Закрыто · откроемся в ${nextFrom}:00` };
  }

  /* ---------- Корзина ---------- */
  const cartCount = () => Object.values(state.cart).reduce((a, b) => a + b, 0);
  const cartSubtotal = () => Object.entries(state.cart).reduce((s, [id, q]) => s + byId[id].price * q, 0);
  const DELIVERY_FEE = 150;
  const FREE_DELIVERY_FROM = 1000;

  function setQty(id, qty) {
    if (qty <= 0) delete state.cart[id];
    else state.cart[id] = Math.min(qty, 20);
    store.set('cart', state.cart);
    updateBadges();
  }

  function updateBadges(bump = false) {
    const n = cartCount();
    $$('[data-cart-count]').forEach((b) => {
      b.textContent = n;
      b.hidden = n === 0;
      if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    });
  }

  function addToCart(id, qty = 1, fromEl) {
    setQty(id, (state.cart[id] || 0) + qty);
    if (fromEl) flyToCart(fromEl);
    else updateBadges(true);
    toast(`«${byId[id].name}» в корзине`);
  }

  function flyToCart(fromEl) {
    const target = $('.tabbar [data-tab="cart"] svg');
    const a = fromEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const dot = document.createElement('div');
    dot.className = 'fly';
    document.body.appendChild(dot);
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
    const x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
    dot.animate([
      { left: x0 + 'px', top: y0 + 'px', transform: 'scale(1)' },
      { left: (x0 + x1) / 2 + 'px', top: Math.min(y0, y1) - 80 + 'px', transform: 'scale(1.3)', offset: 0.5 },
      { left: x1 + 'px', top: y1 + 'px', transform: 'scale(.4)', opacity: 0.6 },
    ], { duration: 650, easing: 'cubic-bezier(.5,0,.5,1)' }).onfinish = () => {
      dot.remove();
      updateBadges(true);
    };
  }

  /* ---------- Тосты ---------- */
  function toast(msg, icon = '☕') {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${icon}</span><span>${esc(msg)}</span>`;
    box.appendChild(el);
    while (box.children.length > 2) box.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2200);
  }

  /* ---------- Шторка ---------- */
  const sheet = $('#sheet');
  function openSheet(html) {
    $('#sheet-body').innerHTML = html;
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    $('.sheet__panel').scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  // свайп вниз для закрытия
  (() => {
    const panel = $('.sheet__panel');
    let startY = null, dy = 0;
    panel.addEventListener('touchstart', (e) => {
      if (panel.scrollTop > 0) return;
      startY = e.touches[0].clientY; dy = 0;
      panel.style.transition = 'none';
    }, { passive: true });
    panel.addEventListener('touchmove', (e) => {
      if (startY === null) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      panel.style.transform = `translate(-50%, ${dy}px)`;
    }, { passive: true });
    panel.addEventListener('touchend', () => {
      if (startY === null) return;
      panel.style.transition = '';
      panel.style.transform = '';
      if (dy > 110) closeSheet();
      startY = null;
    });
  })();

  function openItem(id) {
    const m = byId[id];
    let qty = 1;
    openSheet(`
      <div class="detail">
        <div class="detail__img"><img src="${m.img}" alt="${esc(m.name)}"></div>
        <h2>${esc(m.name)}</h2>
        <span class="muted">${m.weight}</span>
        <p class="detail__desc">${esc(m.desc)}</p>
        <div class="detail__buy">
          <div class="qty qty--lg">
            <button type="button" data-d="-1" aria-label="Меньше">−</button>
            <output>1</output>
            <button type="button" data-d="1" aria-label="Больше">+</button>
          </div>
          <button class="btn" data-sheet-add>В корзину · <span data-sum>${rub(m.price)}</span></button>
        </div>
      </div>`);
    const body = $('#sheet-body');
    body.onclick = (e) => {
      const d = e.target.closest('[data-d]');
      if (d) {
        qty = Math.max(1, Math.min(20, qty + Number(d.dataset.d)));
        $('output', body).textContent = qty;
        $('[data-sum]', body).textContent = rub(m.price * qty);
      }
      if (e.target.closest('[data-sheet-add]')) {
        closeSheet();
        addToCart(id, qty);
      }
    };
  }

  /* ---------- Шаблоны ---------- */
  const itemCard = (m) => `
    <article class="item card" data-open="${m.id}" tabindex="0" role="button" aria-label="${esc(m.name)}, ${rub(m.price)}">
      <div class="item__img">
        <img src="${m.img}" alt="" loading="lazy" onload="this.classList.add('loaded')">
        ${m.popular ? '<span class="item__hit">Хит</span>' : ''}
      </div>
      <div class="item__body">
        <span class="item__name">${esc(m.name)}</span>
        <span class="item__weight">${m.weight}</span>
        <div class="item__foot">
          <span class="price">${rub(m.price)}</span>
          <button class="add" data-add="${m.id}" aria-label="Добавить ${esc(m.name)}">${ICON.plus}</button>
        </div>
      </div>
    </article>`;

  const empty = (icon, title, text, href, cta) => `
    <div class="empty">
      <div class="empty__icon">${icon}</div>
      <h2>${title}</h2>
      <p>${text}</p>
      <a class="btn" href="${href}">${cta}</a>
    </div>`;

  /* ---------- Страницы ---------- */
  const pages = {};

  pages.home = () => {
    const st = openStatus();
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
    return `
      <section class="hero">
        <img class="hero__img" src="${IMG('1509042239860-f550ce710b93').replace('w=600&h=600', 'w=900&h=1000')}" alt="">
        <span class="hero__tag">${greet} ✦</span>
        <h1>Кофе, который<br>хочется <em>смаковать</em></h1>
        <p>Свежая обжарка, домашние десерты и завтраки весь день.</p>
        <a href="#menu" class="btn">Смотреть меню</a>
      </section>

      <div class="card status">
        <span class="status__dot ${st.open ? '' : 'closed'}"></span>
        <div><b>${st.text}</b><span>ул. Садовая, 12 · заберите заказ без очереди</span></div>
      </div>

      <section class="section">
        <div class="section__head"><h2 class="h2">Популярное</h2><a href="#menu" class="link">Всё меню</a></div>
        <div class="hscroll stagger">${MENU.filter((m) => m.popular).map(itemCard).join('')}</div>
      </section>

      <section class="section">
        <div class="features stagger">
          <div class="card feature"><div>🌱</div><b>Своя обжарка</b><span>каждую неделю</span></div>
          <div class="card feature"><div>🥐</div><b>Выпечка</b><span>каждые 2 часа</span></div>
          <div class="card feature"><div>🛵</div><b>Доставка</b><span>от 30 минут</span></div>
        </div>
      </section>

      <section class="section">
        <div class="section__head"><h2 class="h2">Нам доверяют</h2><a href="#reviews" class="link">Отзывы</a></div>
        ${reviewCard(allReviews()[0])}
      </section>`;
  };

  pages.menu = () => {
    const list = state.menuCat === 'all' ? MENU : MENU.filter((m) => m.cat === state.menuCat);
    return `
      <h1 class="title">Меню</h1>
      <p class="muted">${MENU.length} ${plural(MENU.length, ['позиция', 'позиции', 'позиций'])} · готовим при вас</p>
      <div class="chips" role="tablist">
        ${CATEGORIES.map((c) => `<button class="chip ${c.id === state.menuCat ? 'active' : ''}" data-cat="${c.id}" role="tab" aria-selected="${c.id === state.menuCat}">${c.name}</button>`).join('')}
      </div>
      <div class="grid stagger" id="menu-grid">${list.map(itemCard).join('')}</div>`;
  };

  pages.cart = () => {
    const entries = Object.entries(state.cart);
    if (!entries.length) return empty('🛍️', 'Корзина пуста', 'Загляните в меню — там много вкусного.', '#menu', 'Перейти в меню');
    return `
      <h1 class="title">Корзина</h1>
      <p class="muted">${cartCount()} ${plural(cartCount(), ['товар', 'товара', 'товаров'])}</p>
      <div class="cart-list stagger">
        ${entries.map(([id, q]) => {
          const m = byId[id];
          return `
          <div class="cart-row card" data-row="${id}">
            <img src="${m.img}" alt="">
            <div class="cart-row__info"><b>${esc(m.name)}</b><span>${rub(m.price)} · ${m.weight}</span></div>
            <div class="cart-row__right">
              <b data-line="${id}">${rub(m.price * q)}</b>
              <div class="qty">
                <button data-dec="${id}" aria-label="Меньше">−</button>
                <output data-q="${id}">${q}</output>
                <button data-inc="${id}" aria-label="Больше">+</button>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="card summary" id="summary">${summaryHtml('pickup')}
        <a href="#checkout" class="btn btn--block">Оформить заказ</a>
      </div>`;
  };

  function summaryHtml(method) {
    const sub = cartSubtotal();
    const fee = method === 'delivery' && sub < FREE_DELIVERY_FROM ? DELIVERY_FEE : 0;
    return `
      <div data-sum-rows>
        <div class="summary__row"><span>Товары</span><span>${rub(sub)}</span></div>
        ${method === 'delivery' ? `<div class="summary__row"><span>Доставка</span><span>${fee ? rub(fee) : 'бесплатно'}</span></div>` : ''}
        <div class="summary__row summary__row--total"><span>Итого</span><span>${rub(sub + fee)}</span></div>
      </div>`;
  }

  pages.checkout = () => {
    if (!cartCount()) { location.hash = '#cart'; return ''; }
    return `
      <a href="#cart" class="link" style="display:inline-flex;align-items:center;gap:4px">${ICON.back} Корзина</a>
      <h1 class="title" style="margin-top:10px">Оформление</h1>

      <form class="form" id="checkout" novalidate style="margin-top:18px">
        <div class="field" data-f="name">
          <label for="c-name">Имя</label>
          <input class="input" id="c-name" name="name" autocomplete="given-name" placeholder="Как к вам обращаться">
          <div class="field__err">Введите имя</div>
        </div>
        <div class="field" data-f="phone">
          <label for="c-phone">Телефон</label>
          <input class="input" id="c-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__">
          <div class="field__err">Введите номер полностью</div>
        </div>

        <div class="field">
          <label>Получение</label>
          <div class="segmented">
            <label class="option"><input type="radio" name="method" value="pickup" checked><span class="ico">🏃</span>Самовывоз</label>
            <label class="option"><input type="radio" name="method" value="delivery"><span class="ico">🛵</span>Доставка</label>
          </div>
          <div class="collapse" id="delivery-box"><div><div class="form">
            <div class="field" data-f="address">
              <label for="c-addr">Адрес</label>
              <input class="input" id="c-addr" name="address" autocomplete="street-address" placeholder="Улица, дом, квартира">
              <div class="field__err">Укажите адрес доставки</div>
            </div>
            <p class="muted" style="font-size:13px">Бесплатно от ${rub(FREE_DELIVERY_FROM)}, иначе ${rub(DELIVERY_FEE)}.</p>
          </div></div></div>
        </div>

        <div class="field">
          <label>Оплата</label>
          <div class="segmented">
            <label class="option"><input type="radio" name="pay" value="card" checked><span class="ico">💳</span>Картой</label>
            <label class="option"><input type="radio" name="pay" value="cash"><span class="ico">💵</span>Наличными</label>
          </div>
        </div>

        <div class="collapse open" id="card-box"><div><div class="form">
          <div class="bank-card" aria-hidden="true">
            <div class="bank-card__top"><span>Maria</span><span class="bank-card__chip"></span></div>
            <div class="bank-card__num" data-prev="num">•••• •••• •••• ••••</div>
            <div class="bank-card__bottom"><span data-prev="holder">Имя владельца</span><span data-prev="exp">ММ/ГГ</span></div>
          </div>
          <div class="demo-note">🔒 <span>Демо-оплата, деньги не списываются. Тестовая карта: <code>4242 4242 4242 4242</code>, любая будущая дата и CVC.</span></div>
          <div class="field" data-f="num">
            <label for="c-num">Номер карты</label>
            <input class="input" id="c-num" name="num" inputmode="numeric" autocomplete="off" placeholder="0000 0000 0000 0000">
            <div class="field__err">Неверный номер карты</div>
          </div>
          <div class="row2">
            <div class="field" data-f="exp">
              <label for="c-exp">Срок</label>
              <input class="input" id="c-exp" name="exp" inputmode="numeric" autocomplete="off" placeholder="ММ/ГГ">
              <div class="field__err">Неверный срок</div>
            </div>
            <div class="field" data-f="cvc">
              <label for="c-cvc">CVC</label>
              <input class="input" id="c-cvc" name="cvc" inputmode="numeric" autocomplete="off" placeholder="•••" maxlength="3">
              <div class="field__err">3 цифры</div>
            </div>
          </div>
          <div class="field" data-f="holder">
            <label for="c-holder">Владелец карты</label>
            <input class="input" id="c-holder" name="holder" autocomplete="off" placeholder="IVAN PETROV" style="text-transform:uppercase">
            <div class="field__err">Латиницей, как на карте</div>
          </div>
        </div></div></div>

        <div class="collapse" id="cash-box"><div><div class="form">
          <div class="field">
            <label for="c-change">Сдача с (необязательно)</label>
            <input class="input" id="c-change" name="change" inputmode="numeric" placeholder="Например, 2000">
          </div>
        </div></div></div>

        <div class="field">
          <label for="c-comment">Комментарий</label>
          <input class="input" id="c-comment" name="comment" placeholder="Без сахара, на овсяном молоке…">
        </div>

        <div class="card summary" id="summary" style="margin-top:6px">${summaryHtml('pickup')}
          <button class="btn btn--block" type="submit" id="pay-btn">Оплатить ${rub(cartSubtotal())}</button>
          <p class="hint">Это портфолио-проект: заказ никуда не отправляется.</p>
        </div>
      </form>`;
  };

  pages.success = () => {
    const o = state.lastOrder;
    if (!o) { location.hash = '#home'; return ''; }
    return `
      <div class="success">
        <div class="success__check">
          <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45"/><path d="M30 52l13 13 27-29"/></svg>
        </div>
        <h1>Заказ оформлен!</h1>
        <p class="muted">${esc(o.name)}, спасибо! ${o.method === 'delivery' ? 'Курьер привезёт заказ примерно через 30–40 минут.' : 'Заказ будет готов через 10–15 минут.'}</p>
        <div class="success__num">№ ${o.number}</div>
        <div class="card">
          <div><span>Позиции</span><span>${o.count} шт.</span></div>
          <div><span>${o.method === 'delivery' ? 'Доставка' : 'Самовывоз'}</span><span>${o.method === 'delivery' ? esc(o.address) : 'ул. Садовая, 12'}</span></div>
          <div><span>Оплата</span><span>${o.pay === 'card' ? 'Картой •••• ' + o.last4 : 'Наличными'}</span></div>
          <div><span>Сумма</span><b>${rub(o.total)}</b></div>
        </div>
        <div class="actions">
          <a href="#reviews" class="btn btn--block">Оставить отзыв</a>
          <a href="#menu" class="btn btn--ghost btn--block">Вернуться в меню</a>
        </div>
      </div>`;
  };

  /* ---------- Отзывы ---------- */
  const allReviews = () => [...state.reviews, ...SEED_REVIEWS];
  const AVATAR_COLORS = ['#d6a676', '#c7b299', '#e3b58f', '#b89f7e', '#e9cfae'];
  const fmtDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  function reviewCard(r, isNew = false) {
    const color = AVATAR_COLORS[r.name.charCodeAt(0) % AVATAR_COLORS.length];
    const mine = state.reviews.some((x) => x.id === r.id);
    return `
      <article class="card review ${isNew ? 'new' : ''}">
        <div class="review__head">
          <div class="avatar" style="background:${color}">${esc(r.name[0].toUpperCase())}</div>
          <div><b>${esc(r.name)}</b><div class="review__meta">${stars(r.rating)}<span>${fmtDate(r.date)}</span></div></div>
          ${mine ? `<button class="review__del" data-del-review="${r.id}">Удалить</button>` : ''}
        </div>
        <p>${esc(r.text)}</p>
      </article>`;
  }

  const RATING_LABELS = ['', 'Плохо', 'Так себе', 'Нормально', 'Хорошо', 'Отлично!'];

  pages.reviews = () => {
    const list = allReviews();
    const avg = list.reduce((s, r) => s + r.rating, 0) / list.length;
    const dist = [5, 4, 3, 2, 1].map((n) => [n, list.filter((r) => r.rating === n).length]);
    return `
      <h1 class="title">Отзывы</h1>
      <div class="card rating-summary">
        <div class="rating-summary__big"><b>${avg.toFixed(1).replace('.', ',')}</b>${stars(Math.round(avg))}<br><span>${list.length} ${plural(list.length, ['отзыв', 'отзыва', 'отзывов'])}</span></div>
        <div class="bars">
          ${dist.map(([n, c]) => `<div class="bar"><span>${n}</span><div class="bar__track"><div class="bar__fill" data-w="${(c / list.length) * 100}"></div></div><span>${c}</span></div>`).join('')}
        </div>
      </div>

      <section class="section">
        <h2 class="h2" style="margin-bottom:14px">Оставить отзыв</h2>
        <form class="card form" id="review-form" novalidate style="padding:18px">
          <div class="field" data-f="rating">
            <div class="star-input" role="radiogroup" aria-label="Оценка">
              ${[1, 2, 3, 4, 5].map((i) => `<button type="button" data-star="${i}" role="radio" aria-checked="false" aria-label="${i}">${ICON.star}</button>`).join('')}
            </div>
            <div class="star-input__label" id="star-label">Нажмите на звезду</div>
            <div class="field__err">Поставьте оценку</div>
          </div>
          <div class="field" data-f="name">
            <label for="r-name">Имя</label>
            <input class="input" id="r-name" name="name" maxlength="30" placeholder="Ваше имя">
            <div class="field__err">Введите имя</div>
          </div>
          <div class="field" data-f="text">
            <label for="r-text">Отзыв</label>
            <textarea class="input" id="r-text" name="text" maxlength="500" placeholder="Что понравилось, что улучшить?"></textarea>
            <div class="field__err">Минимум 10 символов</div>
          </div>
          <button class="btn btn--block" type="submit">Опубликовать</button>
        </form>
      </section>

      <section class="section">
        <div class="reviews" id="review-list">${list.map((r) => reviewCard(r)).join('')}</div>
      </section>`;
  };

  /* ---------- Контакты ---------- */
  pages.contacts = () => {
    const today = new Date().getDay();
    const order = [1, 2, 3, 4, 5, 6, 0];
    return `
      <h1 class="title">Контакты</h1>
      <div class="card map">
        <iframe title="Карта" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=37.6105%2C55.7555%2C37.6245%2C55.7615&amp;layer=mapnik&amp;marker=55.7585%2C37.6175"></iframe>
      </div>
      <div class="card contact-list stagger">
        <a class="contact" href="https://www.openstreetmap.org/?mlat=55.7585&mlon=37.6175#map=17/55.7585/37.6175" target="_blank" rel="noopener">
          <span class="contact__ico">${ICON.pin}</span><div>ул. Садовая, 12<small>Москва · 3 минуты от метро</small></div>
        </a>
        <a class="contact" href="tel:+74950000000">
          <span class="contact__ico">${ICON.phone}</span><div>+7 (495) 000-00-00<small>Позвонить</small></div>
        </a>
        <a class="contact" href="mailto:hello@maria-coffee.example">
          <span class="contact__ico">${ICON.mail}</span><div>hello@maria-coffee.example<small>Написать нам</small></div>
        </a>
      </div>

      <section class="section">
        <h2 class="h2" style="margin-bottom:14px">Часы работы</h2>
        <div class="card hours">
          ${order.map((d) => `<div class="${d === today ? 'today' : ''}"><span>${DAY_NAMES[d]}</span><span>${HOURS[d][0]}:00 – ${HOURS[d][1]}:00</span></div>`).join('')}
        </div>
      </section>

      <section class="section">
        <h2 class="h2" style="margin-bottom:14px">Мы в соцсетях</h2>
        <div class="socials">
          <a class="card" href="#contacts">Telegram</a>
          <a class="card" href="#contacts">VK</a>
          <a class="card" href="#contacts">Instagram</a>
        </div>
      </section>
      <p class="footer-note">© ${new Date().getFullYear()} Maria coffee · демо-проект для портфолио</p>`;
  };

  /* ---------- Роутер ---------- */
  const TAB_OF = { checkout: 'cart', success: 'cart' };
  const TITLES = { home: 'Maria — кофейня', menu: 'Меню', cart: 'Корзина', checkout: 'Оформление', success: 'Заказ оформлен', reviews: 'Отзывы', contacts: 'Контакты' };

  function render() {
    const route = location.hash.slice(1) || 'home';
    const page = pages[route] ? route : 'home';
    closeSheet();
    view.innerHTML = pages[page]();
    view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
    window.scrollTo(0, 0);
    document.title = page === 'home' ? TITLES.home : `${TITLES[page]} · Maria`;
    const tab = TAB_OF[page] || page;
    $$('.tabbar a').forEach((a) => {
      const on = a.dataset.tab === tab;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    afterRender[page]?.();
  }

  const afterRender = {
    reviews() {
      requestAnimationFrame(() => $$('.bar__fill').forEach((b) => { b.style.width = b.dataset.w + '%'; }));
      initReviewForm();
    },
    checkout: initCheckout,
  };

  /* ---------- Делегирование кликов ---------- */
  view.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) { e.stopPropagation(); addToCart(add.dataset.add, 1, add); return; }

    const open = e.target.closest('[data-open]');
    if (open) { openItem(open.dataset.open); return; }

    const cat = e.target.closest('[data-cat]');
    if (cat) {
      state.menuCat = cat.dataset.cat;
      $$('.chip').forEach((c) => {
        const on = c === cat;
        c.classList.toggle('active', on);
        c.setAttribute('aria-selected', on);
      });
      const list = state.menuCat === 'all' ? MENU : MENU.filter((m) => m.cat === state.menuCat);
      const grid = $('#menu-grid');
      grid.innerHTML = list.map(itemCard).join('');
      grid.classList.remove('stagger'); void grid.offsetWidth; grid.classList.add('stagger');
      return;
    }

    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    if (inc || dec) {
      const id = (inc || dec).dataset.inc || (inc || dec).dataset.dec;
      const next = (state.cart[id] || 0) + (inc ? 1 : -1);
      if (next <= 0) {
        const row = $(`[data-row="${id}"]`);
        row.classList.add('removing');
        setTimeout(() => { setQty(id, 0); render(); }, 280);
        toast(`«${byId[id].name}» удалён`, '🗑️');
        return;
      }
      setQty(id, next);
      $(`[data-q="${id}"]`).textContent = state.cart[id];
      $(`[data-line="${id}"]`).textContent = rub(byId[id].price * state.cart[id]);
      $('[data-sum-rows]').outerHTML = summaryHtml('pickup');
      $('.muted', view).textContent = `${cartCount()} ${plural(cartCount(), ['товар', 'товара', 'товаров'])}`;
      return;
    }

    const del = e.target.closest('[data-del-review]');
    if (del) {
      state.reviews = state.reviews.filter((r) => r.id !== del.dataset.delReview);
      store.set('reviews', state.reviews);
      render();
      toast('Отзыв удалён', '🗑️');
    }
  });

  view.addEventListener('keydown', (e) => {
    const open = e.target.closest?.('[data-open]');
    if (open && e.target === open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openItem(open.dataset.open); }
  });

  /* ---------- Валидация ---------- */
  function setInvalid(form, name, bad) {
    const f = $(`[data-f="${name}"]`, form);
    if (!f) return;
    f.classList.remove('invalid');
    if (bad) { void f.offsetWidth; f.classList.add('invalid'); }
  }
  const luhn = (num) => {
    let sum = 0;
    [...num].reverse().forEach((d, i) => {
      let n = +d;
      if (i % 2) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
    });
    return sum % 10 === 0;
  };

  /* ---------- Оформление заказа ---------- */
  function initCheckout() {
    const form = $('#checkout');
    if (!form) return;
    const val = (n) => form.elements[n].value.trim();
    const method = () => form.elements.method.value;
    const pay = () => form.elements.pay.value;

    const updateTotals = () => {
      $('[data-sum-rows]').outerHTML = summaryHtml(method());
      const sub = cartSubtotal();
      const total = sub + (method() === 'delivery' && sub < FREE_DELIVERY_FROM ? DELIVERY_FEE : 0);
      $('#pay-btn').textContent = pay() === 'card' ? `Оплатить ${rub(total)}` : `Заказать · ${rub(total)}`;
    };

    form.addEventListener('change', (e) => {
      if (e.target.name === 'method') $('#delivery-box').classList.toggle('open', method() === 'delivery');
      if (e.target.name === 'pay') {
        $('#card-box').classList.toggle('open', pay() === 'card');
        $('#cash-box').classList.toggle('open', pay() === 'cash');
      }
      updateTotals();
    });

    // маски ввода + живое превью карты
    form.addEventListener('input', (e) => {
      const t = e.target;
      t.closest('.field')?.classList.remove('invalid');
      if (t.name === 'phone') {
        let d = t.value.replace(/\D/g, '');
        if (d[0] === '8') d = '7' + d.slice(1);
        if (d && d[0] !== '7') d = '7' + d;
        d = d.slice(0, 11);
        const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
        t.value = !d ? '' : '+7' + (p[0] ? ` (${p[0]}` : '') + (p[1] ? `) ${p[1]}` : '') + (p[2] ? `-${p[2]}` : '') + (p[3] ? `-${p[3]}` : '');
      }
      if (t.name === 'num') {
        t.value = t.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
        $('[data-prev="num"]').textContent = (t.value + '•••• •••• •••• ••••'.slice(t.value.length)) || '•••• •••• •••• ••••';
      }
      if (t.name === 'exp') {
        const d = t.value.replace(/\D/g, '').slice(0, 4);
        t.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
        $('[data-prev="exp"]').textContent = t.value || 'ММ/ГГ';
      }
      if (t.name === 'cvc' || t.name === 'change') t.value = t.value.replace(/\D/g, '');
      if (t.name === 'holder') {
        t.value = t.value.replace(/[^a-zA-Z\s]/g, '');
        $('[data-prev="holder"]').textContent = t.value || 'Имя владельца';
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const errors = {
        name: val('name').length < 2,
        phone: val('phone').replace(/\D/g, '').length !== 11,
        address: method() === 'delivery' && val('address').length < 5,
      };
      if (pay() === 'card') {
        const num = val('num').replace(/\s/g, '');
        const [mm, yy] = val('exp').split('/').map(Number);
        const now = new Date();
        const expOk = mm >= 1 && mm <= 12 && yy >= 0 &&
          (2000 + yy > now.getFullYear() || (2000 + yy === now.getFullYear() && mm >= now.getMonth() + 1));
        Object.assign(errors, {
          num: num.length !== 16 || !luhn(num),
          exp: !expOk,
          cvc: val('cvc').length !== 3,
          holder: val('holder').length < 3,
        });
      }
      let first = null;
      for (const [k, bad] of Object.entries(errors)) {
        setInvalid(form, k, bad);
        if (bad && !first) first = k;
      }
      if (first) {
        $(`[data-f="${first}"] .input`, form).focus({ preventScroll: true });
        $(`[data-f="${first}"]`, form).scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast('Проверьте выделенные поля', '⚠️');
        return;
      }

      const btn = $('#pay-btn');
      btn.disabled = true;
      btn.innerHTML = `<span class="loader"></span> ${pay() === 'card' ? 'Проводим оплату…' : 'Оформляем…'}`;

      const sub = cartSubtotal();
      state.lastOrder = {
        number: String(Math.floor(1000 + Math.random() * 9000)),
        name: val('name'),
        method: method(),
        address: val('address'),
        pay: pay(),
        last4: val('num').slice(-4),
        count: cartCount(),
        total: sub + (method() === 'delivery' && sub < FREE_DELIVERY_FROM ? DELIVERY_FEE : 0),
      };
      setTimeout(() => {
        store.set('lastOrder', state.lastOrder);
        state.cart = {};
        store.set('cart', state.cart);
        updateBadges();
        location.hash = '#success';
      }, 1600);
    });
  }

  /* ---------- Форма отзыва ---------- */
  function initReviewForm() {
    const form = $('#review-form');
    let rating = 0;
    const paint = (n) => $$('[data-star]', form).forEach((b) => b.classList.toggle('on', +b.dataset.star <= n));

    form.addEventListener('click', (e) => {
      const s = e.target.closest('[data-star]');
      if (!s) return;
      rating = +s.dataset.star;
      paint(rating);
      $$('[data-star]', form).forEach((b) => b.setAttribute('aria-checked', +b.dataset.star === rating));
      $('#star-label').textContent = RATING_LABELS[rating];
      setInvalid(form, 'rating', false);
    });
    form.addEventListener('mouseover', (e) => { const s = e.target.closest('[data-star]'); if (s) paint(+s.dataset.star); });
    form.querySelector('.star-input').addEventListener('mouseleave', () => paint(rating));
    form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('invalid'));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.elements.name.value.trim();
      const text = form.elements.text.value.trim();
      const errors = { rating: !rating, name: name.length < 2, text: text.length < 10 };
      Object.entries(errors).forEach(([k, bad]) => setInvalid(form, k, bad));
      if (Object.values(errors).some(Boolean)) return;

      const d = new Date();
      const review = {
        id: 'u' + Date.now(), name, rating, text,
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      };
      state.reviews.unshift(review);
      store.set('reviews', state.reviews);
      render();
      const list = $('#review-list');
      list.firstElementChild.classList.add('new');
      list.firstElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast('Спасибо за отзыв!', '💛');
    });
  }

  /* ---------- Старт ---------- */
  window.addEventListener('hashchange', render);
  updateBadges();
  render();
})();
