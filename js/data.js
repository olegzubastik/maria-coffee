// Дані меню та стартові відгуки. Фото — Unsplash.
const IMG = (id) => `https://images.unsplash.com/photo-${id}?w=600&h=600&fit=crop&q=75`;

const CATEGORIES = [
  { id: 'all', name: 'Усе' },
  { id: 'coffee', name: 'Кава' },
  { id: 'desserts', name: 'Десерти' },
  { id: 'breakfast', name: 'Сніданки' },
];

const MENU = [
  // Кава
  { id: 'espresso', cat: 'coffee', name: 'Еспресо', price: 55, weight: '40 мл', img: IMG('1511920170033-f8396924c348'),
    desc: 'Щільний і яскравий, із зерен Ефіопія Іргачеффе середнього обсмаження.' },
  { id: 'americano', cat: 'coffee', name: 'Американо', price: 65, weight: '250 мл', img: IMG('1514432324607-a09d9b4aefdd'),
    desc: 'Подвійний еспресо та гаряча вода. Класика для неквапливого ранку.' },
  { id: 'cappuccino', cat: 'coffee', name: 'Капучино', price: 85, weight: '300 мл', img: IMG('1572442388796-11668a67e53d'), popular: true,
    desc: 'Еспресо та ніжна молочна піна. Можна на вівсяному молоці.' },
  { id: 'latte', cat: 'coffee', name: 'Лате', price: 90, weight: '350 мл', img: IMG('1541167760496-1628856ab772'),
    desc: 'Більше молока, м’який смак і лате-арт від нашого баристи.' },
  { id: 'flatwhite', cat: 'coffee', name: 'Флет вайт', price: 95, weight: '200 мл', img: IMG('1534778101976-62847782c213'), popular: true,
    desc: 'Подвійна порція еспресо та тонкий шар оксамитового молока.' },
  { id: 'icelatte', cat: 'coffee', name: 'Айс-лате', price: 100, weight: '350 мл', img: IMG('1517701604599-bb29b565090c'),
    desc: 'Холодне молоко, лід і еспресо. За бажанням додамо карамельний сироп.' },

  // Десерти
  { id: 'tiramisu', cat: 'desserts', name: 'Тірамісу', price: 145, weight: '150 г', img: IMG('1571115177098-24ec42ed204d'), popular: true,
    desc: 'Маскарпоне, савоярді та еспресо. Готуємо самі щоранку.' },
  { id: 'chococake', cat: 'desserts', name: 'Шоколадний торт', price: 150, weight: '160 г', img: IMG('1578985545062-69928b1d9587'),
    desc: 'Вологий бісквіт на бельгійському шоколаді з ганашем.' },
  { id: 'pannacotta', cat: 'desserts', name: 'Панакота', price: 120, weight: '140 г', img: IMG('1488477181946-6428a0291777'),
    desc: 'Вершкова ваніль і соус зі свіжої полуниці.' },
  { id: 'brownie', cat: 'desserts', name: 'Брауні', price: 95, weight: '100 г', img: IMG('1606313564200-e75d5e30476c'),
    desc: 'Тягучий усередині, з хрусткою скоринкою та волоським горіхом.' },
  { id: 'donut', cat: 'desserts', name: 'Пончик', price: 70, weight: '90 г', img: IMG('1551024601-bec78aea704b'),
    desc: 'Повітряне тісто, глазур і різнокольорова посипка.' },

  // Сніданки
  { id: 'croissant', cat: 'breakfast', name: 'Круасан', price: 75, weight: '80 г', img: IMG('1555507036-ab1f4038808a'), popular: true,
    desc: 'Листковий, на французькому вершковому маслі. З печі кожні 2 години.' },
  { id: 'eggtoast', cat: 'breakfast', name: 'Тост з яйцем', price: 175, weight: '220 г', img: IMG('1525351484163-7529414344d8'),
    desc: 'Хліб на заквасці, яйце, авокадо та мікрозелень.' },
  { id: 'frenchtoast', cat: 'breakfast', name: 'Французькі тости', price: 185, weight: '250 г', img: IMG('1484723091739-30a097e8f929'),
    desc: 'Бріош, ягоди, банан і кленовий сироп.' },
  { id: 'pancakes', cat: 'breakfast', name: 'Панкейки', price: 165, weight: '230 г', img: IMG('1528207776546-365bb710ee93'),
    desc: 'Три пишні панкейки з чорницею та сиропом.' },
  { id: 'bowl', cat: 'breakfast', name: 'Боул з авокадо', price: 210, weight: '280 г', img: IMG('1482049016688-2d3e1b311543'),
    desc: 'Яйця пашот, авокадо, шпинат, томати та насіння.' },
];

const SEED_REVIEWS = [
  { id: 's1', name: 'Анна', rating: 5, text: 'Найкращий флет вайт у районі! Дуже затишно, приємна музика, бариста пам’ятає моє замовлення.', date: '2026-09-18' },
  { id: 's2', name: 'Дмитро', rating: 4, text: 'Сніданки чудові, особливо боул з авокадо. Уранці у вихідні буває черга.', date: '2026-09-11' },
  { id: 's3', name: 'Катерина', rating: 5, text: 'Тірамісу — як в Італії. Замовляла з собою, все акуратно запакували.', date: '2026-09-02' },
  { id: 's4', name: 'Ігор', rating: 5, text: 'Зручно замовляти з телефона й забирати без очікування. Круасани найсвіжіші.', date: '2026-08-27' },
];
