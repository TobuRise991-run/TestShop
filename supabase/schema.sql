-- Chạy toàn bộ tệp này trong Supabase > SQL Editor
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null, category text not null,
  price integer not null check (price >= 0), old_price integer,
  description text, image_url text, in_stock boolean not null default true,
  created_at timestamptz not null default now()
);
create table admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null, phone text not null, address text not null, note text,
  items jsonb not null, total integer not null check (total > 0),
  status text not null default 'new', created_at timestamptz not null default now()
);
create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public
as $$ select exists (select 1 from admins where user_id = auth.uid()) $$;

alter table products enable row level security;
alter table admins enable row level security;
alter table orders enable row level security;

create policy "products_read" on products for select using (true);
create policy "products_admin" on products for all using (is_admin()) with check (is_admin());
create policy "admins_self" on admins for select using (user_id = auth.uid());
create policy "orders_create" on orders for insert with check (status = 'new');
create policy "orders_admin_read" on orders for select using (is_admin());
create policy "orders_admin_update" on orders for update using (is_admin()) with check (is_admin());
create policy "orders_admin_delete" on orders for delete using (is_admin());

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;
create policy "img_read" on storage.objects for select using (bucket_id = 'product-images');
create policy "img_insert" on storage.objects for insert with check (bucket_id = 'product-images' and is_admin());
create policy "img_update" on storage.objects for update using (bucket_id = 'product-images' and is_admin());
create policy "img_delete" on storage.objects for delete using (bucket_id = 'product-images' and is_admin());

insert into products (name, category, price, old_price, description) values
('Bình gốm Bát Tràng men xanh','Gốm sứ',320000,390000,'Men xanh ngọc, cao 28cm.'),
('Thớt gỗ xoài chống ẩm','Gỗ',159000,199000,'Gỗ xoài xử lý chống ẩm.'),
('Vỏ gối lanh tự nhiên 45cm','Vải lanh',135000,null,'Lanh mềm, giặt máy được.'),
('Nến thơm sáp đậu nành','Trang trí',119000,null,'Cháy sạch, khoảng 40 giờ.');
