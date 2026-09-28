-- =====================================================================
--  PESQUISA / BASE DE LEADS — cole no SQL Editor do Supabase e clique em RUN.
--  Pode rodar mais de uma vez (idempotente). Requer o schema.sql já executado.
-- =====================================================================

create table if not exists public.leads (
  id            text primary key,                -- projeto|e-mail (minúsculo)
  email         text not null,
  name          text not null default '',
  phone         text not null default '',
  project       text not null default '',        -- DOMUS FORTIS · Leads - Resposta do formulario · QUIZZ LIVRO
  crm_status    text not null default '',        -- new · contact …
  created_at    timestamptz,
  age           text not null default '',
  income        text not null default '',
  children_raw  text not null default '',
  children_n    integer,
  children_ages integer[] not null default '{}',
  reason        text not null default '',        -- motivo principal (dor)
  investment    text not null default '',
  commitment    text not null default '',
  quiz          jsonb not null default '{}'::jsonb,  -- respostas do Quiz do Livro (pergunta → resposta)
  outcome       text not null default '',        -- resultado do quiz
  qualified     boolean,
  bought        boolean not null default false,  -- comprou o ingresso
  bought_at     timestamptz,
  raw           jsonb not null default '{}'::jsonb,
  imported_at   timestamptz not null default now(),
  imported_by   uuid references public.profiles(id)
);
create index if not exists leads_email_idx   on public.leads(lower(email));
create index if not exists leads_project_idx on public.leads(project);
create index if not exists leads_reason_idx  on public.leads(reason);

alter table public.leads enable row level security;

-- todos os logados leem (o painel esconde telefone/e-mail de quem não é admin); só admin grava.
drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select to authenticated using (true);
drop policy if exists leads_admin on public.leads;
create policy leads_admin on public.leads for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- marcar compradoras por e-mail (chamado pelo painel: "Importar compradoras")
create or replace function public.mark_bought(p_emails text[])
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'somente administradores'; end if;
  update public.leads set bought = true, bought_at = coalesce(bought_at, now())
    where lower(email) = any (select lower(unnest(p_emails)));
  get diagnostics n = row_count;
  return n;
end $$;

do $$ begin
  begin alter publication supabase_realtime add table public.leads; exception when duplicate_object then null; end;
end $$;
