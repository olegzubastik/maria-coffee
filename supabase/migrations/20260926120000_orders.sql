-- Меню (джерело правди для цін) і замовлення.
-- Браузер не має прямого доступу до таблиць: RLS увімкнено без політик,
-- усі операції йдуть через Edge Functions із service role ключем.

create table public.menu_items (
  id     text primary key,
  name   text not null,
  price  integer not null check (price > 0),   -- у гривнях
  image  text,
  active boolean not null default true
);

insert into public.menu_items (id, name, price, image) values
  ('espresso',    'Еспресо',          55,  '1511920170033-f8396924c348'),
  ('americano',   'Американо',        65,  '1514432324607-a09d9b4aefdd'),
  ('cappuccino',  'Капучино',         85,  '1572442388796-11668a67e53d'),
  ('latte',       'Лате',             90,  '1541167760496-1628856ab772'),
  ('flatwhite',   'Флет вайт',        95,  '1534778101976-62847782c213'),
  ('icelatte',    'Айс-лате',         100, '1517701604599-bb29b565090c'),
  ('tiramisu',    'Тірамісу',         145, '1571115177098-24ec42ed204d'),
  ('chococake',   'Шоколадний торт',  150, '1578985545062-69928b1d9587'),
  ('pannacotta',  'Панакота',         120, '1488477181946-6428a0291777'),
  ('brownie',     'Брауні',           95,  '1606313564200-e75d5e30476c'),
  ('donut',       'Пончик',           70,  '1551024601-bec78aea704b'),
  ('croissant',   'Круасан',          75,  '1555507036-ab1f4038808a'),
  ('eggtoast',    'Тост з яйцем',     175, '1525351484163-7529414344d8'),
  ('frenchtoast', 'Французькі тости', 185, '1484723091739-30a097e8f929'),
  ('pancakes',    'Панкейки',         165, '1528207776546-365bb710ee93'),
  ('bowl',        'Боул з авокадо',   210, '1482049016688-2d3e1b311543');

create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  number         bigint generated always as identity (start with 1001) unique,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  customer_name  text not null,
  phone          text not null,
  method         text not null check (method in ('pickup', 'delivery')),
  address        text,
  comment        text,
  change_from    integer,

  items          jsonb not null,               -- [{id, name, price, qty}]
  subtotal       integer not null,
  delivery_fee   integer not null default 0,
  total          integer not null,

  pay            text not null check (pay in ('card', 'cash')),
  payment_status text not null default 'unpaid'
                 check (payment_status in ('unpaid', 'pending', 'paid', 'failed')),
  invoice_id     text unique,
  page_url       text,

  status         text not null
                 check (status in ('awaiting_payment', 'accepted', 'preparing', 'ready', 'done', 'cancelled')),

  tg_message_id  bigint
);

create index orders_phone_created_idx on public.orders (phone, created_at desc);

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger orders_touch before update on public.orders
for each row execute function public.touch_updated_at();

alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
