// Данные меню и стартовые отзывы. Фото — Unsplash.
const IMG = (id) => `https://images.unsplash.com/photo-${id}?w=600&h=600&fit=crop&q=75`;

const CATEGORIES = [
  { id: 'all', name: 'Всё' },
  { id: 'coffee', name: 'Кофе' },
  { id: 'desserts', name: 'Десерты' },
  { id: 'breakfast', name: 'Завтраки' },
];

const MENU = [
  // Кофе
  { id: 'espresso', cat: 'coffee', name: 'Эспрессо', price: 150, weight: '40 мл', img: IMG('1511920170033-f8396924c348'),
    desc: 'Плотный и яркий, из зёрен Эфиопия Иргачефф средней обжарки.' },
  { id: 'americano', cat: 'coffee', name: 'Американо', price: 190, weight: '250 мл', img: IMG('1514432324607-a09d9b4aefdd'),
    desc: 'Двойной эспрессо и горячая вода. Классика для неспешного утра.' },
  { id: 'cappuccino', cat: 'coffee', name: 'Капучино', price: 240, weight: '300 мл', img: IMG('1572442388796-11668a67e53d'), popular: true,
    desc: 'Эспрессо и нежная молочная пена. Можно на овсяном молоке.' },
  { id: 'latte', cat: 'coffee', name: 'Латте', price: 260, weight: '350 мл', img: IMG('1541167760496-1628856ab772'),
    desc: 'Больше молока, мягкий вкус, латте-арт от нашего бариста.' },
  { id: 'flatwhite', cat: 'coffee', name: 'Флэт уайт', price: 270, weight: '200 мл', img: IMG('1534778101976-62847782c213'), popular: true,
    desc: 'Двойная порция эспрессо и тонкий слой бархатного молока.' },
  { id: 'icelatte', cat: 'coffee', name: 'Айс-латте', price: 280, weight: '350 мл', img: IMG('1517701604599-bb29b565090c'),
    desc: 'Холодное молоко, лёд и эспрессо. Добавим карамельный сироп по желанию.' },

  // Десерты
  { id: 'tiramisu', cat: 'desserts', name: 'Тирамису', price: 320, weight: '150 г', img: IMG('1571115177098-24ec42ed204d'), popular: true,
    desc: 'Маскарпоне, савоярди и эспрессо. Готовим сами каждое утро.' },
  { id: 'chococake', cat: 'desserts', name: 'Шоколадный торт', price: 340, weight: '160 г', img: IMG('1578985545062-69928b1d9587'),
    desc: 'Влажный бисквит на бельгийском шоколаде с ганашем.' },
  { id: 'pannacotta', cat: 'desserts', name: 'Панна-котта', price: 270, weight: '140 г', img: IMG('1488477181946-6428a0291777'),
    desc: 'Сливочная ваниль и соус из свежей клубники.' },
  { id: 'brownie', cat: 'desserts', name: 'Брауни', price: 220, weight: '100 г', img: IMG('1606313564200-e75d5e30476c'),
    desc: 'Тягучий внутри, с хрустящей корочкой и грецким орехом.' },
  { id: 'donut', cat: 'desserts', name: 'Пончик', price: 160, weight: '90 г', img: IMG('1551024601-bec78aea704b'),
    desc: 'Воздушное тесто, глазурь и разноцветная посыпка.' },

  // Завтраки
  { id: 'croissant', cat: 'breakfast', name: 'Круассан', price: 190, weight: '80 г', img: IMG('1555507036-ab1f4038808a'), popular: true,
    desc: 'Слоёный, на французском сливочном масле. Из печи каждые 2 часа.' },
  { id: 'eggtoast', cat: 'breakfast', name: 'Тост с яйцом', price: 360, weight: '220 г', img: IMG('1525351484163-7529414344d8'),
    desc: 'Хлеб на закваске, яйцо, авокадо и микрозелень.' },
  { id: 'frenchtoast', cat: 'breakfast', name: 'Французские тосты', price: 390, weight: '250 г', img: IMG('1484723091739-30a097e8f929'),
    desc: 'Бриошь, ягоды, банан и кленовый сироп.' },
  { id: 'pancakes', cat: 'breakfast', name: 'Панкейки', price: 350, weight: '230 г', img: IMG('1528207776546-365bb710ee93'),
    desc: 'Три пышных панкейка с черникой и сиропом.' },
  { id: 'bowl', cat: 'breakfast', name: 'Боул с авокадо', price: 420, weight: '280 г', img: IMG('1482049016688-2d3e1b311543'),
    desc: 'Яйца пашот, авокадо, шпинат, томаты и семена.' },
];

const SEED_REVIEWS = [
  { id: 's1', name: 'Анна', rating: 5, text: 'Лучший флэт уайт в районе! Очень уютно, приятная музыка, бариста помнит мой заказ.', date: '2026-09-18' },
  { id: 's2', name: 'Дмитрий', rating: 4, text: 'Завтраки отличные, особенно боул с авокадо. Утром в выходные бывает очередь.', date: '2026-09-11' },
  { id: 's3', name: 'Екатерина', rating: 5, text: 'Тирамису — как в Италии. Заказывала навынос, всё аккуратно упаковали.', date: '2026-09-02' },
  { id: 's4', name: 'Игорь', rating: 5, text: 'Удобно заказывать с телефона и забирать без ожидания. Круассаны свежайшие.', date: '2026-08-27' },
];
