
-- Tabela de Webhooks por Tenant
create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  url text not null,
  events text[] not null default '{}',
  is_active boolean not null default true,
  secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilitar RLS
alter table public.webhooks enable row level security;

-- Políticas por Tenant
create policy "Users can view webhooks in their tenant"
  on public.webhooks for select
  using (tenant_id = public.get_user_tenant_id());

create policy "Users can create webhooks in their tenant"
  on public.webhooks for insert
  with check (tenant_id = public.get_user_tenant_id());

create policy "Users can update webhooks in their tenant"
  on public.webhooks for update
  using (tenant_id = public.get_user_tenant_id());

create policy "Users can delete webhooks in their tenant"
  on public.webhooks for delete
  using (tenant_id = public.get_user_tenant_id());

-- Índice por tenant
create index if not exists webhooks_tenant_id_idx on public.webhooks(tenant_id);

-- Trigger de updated_at
create or replace function public.update_webhooks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_webhooks_updated_at on public.webhooks;
create trigger update_webhooks_updated_at
  before update on public.webhooks
  for each row execute function public.update_webhooks_updated_at();
