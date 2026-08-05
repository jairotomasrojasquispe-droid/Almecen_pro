
-- BRAHMCO V4 PRO - SCHEMA COMPLETO PARA VENDER A S/2500
-- Ejecuta esto en Supabase > SQL Editor

-- 1. Habilitar UUID
create extension if not exists "uuid-ossp";

-- 2. Tabla de perfiles extendida (ligada a auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text default 'almacenero', -- admin, jefe, almacenero
  avatar_url text,
  created_at timestamp default now()
);

-- 3. Productos / Herramientas
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  sku text unique not null,
  nombre text not null,
  categoria text not null, -- Herramienta, EPP, Material, Insumo
  stock int default 0,
  stock_minimo int default 1,
  costo numeric default 0,
  ubicacion text,
  proveedor text,
  imagen_url text, -- url de supabase storage bucket productos
  created_by uuid references auth.users(id),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- 4. Movimientos con foto trabajador (entregado a)
create table public.movements (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade,
  tipo text not null check (tipo in ('ENTRADA','SALIDA')),
  cantidad int not null,
  entregado_a text, -- nombre trabajador
  trabajador_foto_url text, -- foto del trabajador en storage
  area_destino text,
  motivo text,
  costo_unit numeric,
  proveedor text,
  factura text,
  estado text default 'ENTREGADO' check (estado in ('ENTREGADO','PRESTADO','DEVUELTO')),
  usuario_id uuid references auth.users(id),
  created_at timestamp default now()
);

-- 5. RLS (Row Level Security) - Activar para multi-usuario real
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.movements enable row level security;

-- Politicas abiertas para usuarios autenticados (para vender simple, luego puedes restringir por empresa_id)
create policy "Permitir todo a autenticados" on public.products for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Permitir todo a autenticados" on public.movements for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Ver y editar propio perfil" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
-- Permitir insertar perfil al registrarse
create policy "Insertar perfil al registrarse" on public.profiles for insert with check (true);

-- 6. Storage buckets
insert into storage.buckets (id, name, public) values ('productos', 'productos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('trabajadores', 'trabajadores', true) on conflict (id) do nothing;

-- Politicas storage publico para leer
create policy "Publico puede ver productos" on storage.objects for select using (bucket_id = 'productos');
create policy "Autenticados suben productos" on storage.objects for insert with check (bucket_id = 'productos' and auth.role() = 'authenticated');
create policy "Publico puede ver trabajadores" on storage.objects for select using (bucket_id = 'trabajadores');
create policy "Autenticados suben trabajadores" on storage.objects for insert with check (bucket_id = 'trabajadores' and auth.role() = 'authenticated');

-- 7. Trigger para crear perfil automatico al registrarse
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name) values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- 8. Funcion para tiempo real: notificar stock bajo
-- Ya viene con realtime de supabase, solo activa en Dashboard > Realtime

--Email: admin@brahmco.com
--Password: Brahmco123

