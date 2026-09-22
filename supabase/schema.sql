-- =====================================================================
--  FAMÍLIA FORTE PPV — estrutura do banco (Supabase / Postgres)
--  Cole este arquivo inteiro no SQL Editor do Supabase e clique em RUN.
--  Pode ser executado mais de uma vez (é idempotente).
-- =====================================================================

-- ---------- 0. ADMINISTRADORES ----------
-- Quem estiver nesta lista vira administrador automaticamente ao ser criado no Auth.
create table if not exists public.admin_emails (
  email text primary key,
  name  text not null default ''
);
insert into public.admin_emails (email, name) values
  ('everton@comercial10x.com.br', 'Everton Rodrigues'),
  ('jezreel@comercial10x.com.br', 'Jezreel Soares')
on conflict (email) do update set name = excluded.name;

-- ---------- 1. PERFIS (um por usuário do Auth) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text not null default '',
  role       text not null default 'visualizador'
             check (role in ('admin','gestor_projetos','gestor_trafego','copywriter','expert','operacao','visualizador')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Cria o perfil automaticamente quando um usuário é criado no Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  adm public.admin_emails%rowtype;
begin
  select * into adm from public.admin_emails where lower(email) = lower(new.email);
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(adm.name,''), new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    case when adm.email is not null then 'admin' else coalesce(new.raw_user_meta_data->>'role', 'visualizador') end
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Funções auxiliares usadas pelas regras de acesso.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active;
$$;

-- ---------- 2. CONTEÚDO EDITÁVEL (seções do painel) ----------
create table if not exists public.content (
  id         text primary key,          -- 'main'
  v          integer not null default 0,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

-- ---------- 3. DECISÕES ESTRUTURAIS ----------
create table if not exists public.decisions (
  id         text primary key,          -- 'main'
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

-- ---------- 4. TAREFAS ----------
create table if not exists public.tasks (
  id          text primary key,
  k           date not null,                 -- data prevista (só admin altera)
  f           text not null,                 -- frente: cont, traf, copy, wa, tech, ev
  t           text not null,                 -- título
  s           text not null default '',      -- detalhe
  r           text not null default '',      -- regra / por quê
  owner_role  text,                          -- papel responsável (ex.: copywriter)
  owner_id    uuid references public.profiles(id) on delete set null,  -- pessoa específica (opcional)
  depends_on  text[] not null default '{}',  -- ids das tarefas que precisam estar concluídas antes
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_k_idx on public.tasks(k);

-- ---------- 5. STATUS DAS TAREFAS (o que a pessoa responsável muda) ----------
create table if not exists public.task_status (
  task_id       text primary key references public.tasks(id) on delete cascade,
  done          boolean not null default false,
  done_at       timestamptz,
  done_by       uuid references public.profiles(id),
  delivered_on  date,                        -- data em que foi entregue
  note          text not null default '',    -- o que foi decidido / feito
  justification text not null default '',    -- obrigatório se entregou depois da data prevista
  updated_at    timestamptz not null default now()
);

-- Regras de negócio: dependências e justificativa.
create or replace function public.check_task_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t         public.tasks%rowtype;
  pendente  text;
begin
  select * into t from public.tasks where id = new.task_id;
  if not found then raise exception 'Tarefa não existe'; end if;

  new.updated_at := now();

  if new.done then
    -- tarefa bloqueada: alguma dependência ainda não concluída?
    select d.id into pendente
      from unnest(t.depends_on) as dep(id)
      join public.tasks d on d.id = dep.id
      left join public.task_status ds on ds.task_id = d.id
      where coalesce(ds.done,false) = false
      limit 1;
    if pendente is not null and not public.is_admin() then
      raise exception 'Tarefa bloqueada: depende de "%" que ainda não foi concluída', (select t2.t from public.tasks t2 where t2.id = pendente);
    end if;

    if new.delivered_on is null then new.delivered_on := current_date; end if;
    if new.done_at is null then new.done_at := now(); end if;
    if new.done_by is null then new.done_by := auth.uid(); end if;

    -- entregou depois da data prevista → justificativa obrigatória
    if new.delivered_on > t.k and length(trim(new.justification)) < 5 then
      raise exception 'Entrega em atraso (previsto %, entregue %): escreva a justificativa.', to_char(t.k,'DD/MM'), to_char(new.delivered_on,'DD/MM');
    end if;
  else
    new.done_at := null;
    new.done_by := null;
  end if;
  return new;
end $$;

drop trigger if exists task_status_check on public.task_status;
create trigger task_status_check
  before insert or update on public.task_status
  for each row execute function public.check_task_status();

-- ---------- 6. REGISTRO (auditoria de tudo que cada pessoa faz) ----------
create table if not exists public.logs (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  user_id    uuid references public.profiles(id) on delete set null,
  user_name  text not null default '',
  action     text not null,          -- task_done, task_undone, task_create, task_update, task_delete, section_edit, decisions_save, user_create, user_update, user_delete, note, login
  entity     text not null default '',
  entity_id  text not null default '',
  title      text not null default '',
  detail     jsonb not null default '{}'::jsonb
);
create index if not exists logs_at_idx on public.logs(at desc);

-- ---------- 7. SEGURANÇA (RLS) ----------
alter table public.admin_emails enable row level security;
drop policy if exists admin_emails_admin on public.admin_emails;
create policy admin_emails_admin on public.admin_emails for all to authenticated using (public.is_admin()) with check (public.is_admin());
alter table public.profiles    enable row level security;
alter table public.content     enable row level security;
alter table public.decisions   enable row level security;
alter table public.tasks       enable row level security;
alter table public.task_status enable row level security;
alter table public.logs        enable row level security;

-- profiles: todos os logados leem (para mostrar nomes); só admin altera.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- content e decisions: todos leem; só admin grava.
drop policy if exists content_select on public.content;
create policy content_select on public.content for select to authenticated using (true);
drop policy if exists content_admin on public.content;
create policy content_admin on public.content for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists decisions_select on public.decisions;
create policy decisions_select on public.decisions for select to authenticated using (true);
drop policy if exists decisions_admin on public.decisions;
create policy decisions_admin on public.decisions for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- tasks: todos leem; só admin cria, edita (inclusive data) e exclui.
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated using (true);
drop policy if exists tasks_admin on public.tasks;
create policy tasks_admin on public.tasks for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- task_status: todos leem; admin ou o responsável pela tarefa grava; só admin apaga.
create or replace function public.can_work_task(p_task_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.tasks t
    where t.id = p_task_id
      and public.my_role() <> 'visualizador'
      and (t.owner_id = auth.uid() or (t.owner_id is null and t.owner_role = public.my_role()))
  );
$$;

drop policy if exists task_status_select on public.task_status;
create policy task_status_select on public.task_status for select to authenticated using (true);
drop policy if exists task_status_insert on public.task_status;
create policy task_status_insert on public.task_status for insert to authenticated with check (public.can_work_task(task_id));
drop policy if exists task_status_update on public.task_status;
create policy task_status_update on public.task_status for update to authenticated using (public.can_work_task(task_id)) with check (public.can_work_task(task_id));
drop policy if exists task_status_delete on public.task_status;
create policy task_status_delete on public.task_status for delete to authenticated using (public.is_admin());

-- logs: todos leem; qualquer logado registra a própria ação; ninguém edita ou apaga.
drop policy if exists logs_select on public.logs;
create policy logs_select on public.logs for select to authenticated using (true);
drop policy if exists logs_insert on public.logs;
create policy logs_insert on public.logs for insert to authenticated with check (user_id = auth.uid());

-- ---------- 8. TEMPO REAL ----------
do $$
begin
  begin alter publication supabase_realtime add table public.tasks;       exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.task_status; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.content;     exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.decisions;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.logs;        exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.profiles;    exception when duplicate_object then null; end;
end $$;

-- ---------- 9. GARANTIA: se os administradores já existirem no Auth, promove agora ----------
insert into public.profiles (id, email, name, role)
  select u.id, u.email, a.name, 'admin'
  from auth.users u join public.admin_emails a on lower(a.email) = lower(u.email)
on conflict (id) do update set role = 'admin', name = excluded.name, active = true;

-- =====================================================================
--  Administradores: everton@comercial10x.com.br (Everton Rodrigues)
--                   jezreel@comercial10x.com.br (Jezreel Soares)
--  Crie os dois em Authentication → Users → Add user (com a senha que escolher)
--  OU rode:  node scripts/create-admins.mjs
--  O perfil deles nasce como 'admin' automaticamente.
-- =====================================================================
