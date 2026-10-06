-- =====================================================================
-- Campo "Responsável" (pessoa) em cada tarefa, separado da área (owner_role).
-- Não apaga nada: só adiciona a coluna, preenche onde está vazia e cria
-- a função "Assumir". Rode uma vez no Supabase → SQL Editor.
-- Pessoas: everton (Everton Rodrigues), jez (Jezreel Soares), viviane (Viviane Dias), paula (Paula Campozandória).
-- =====================================================================

alter table public.tasks add column if not exists assignee text;

do $$ begin
  alter table public.tasks add constraint tasks_assignee_chk
    check (assignee is null or assignee in ('everton','jez','viviane','paula'));
exception when duplicate_object then null; end $$;

-- Preenchimento inicial (só onde ainda não há responsável):
-- Gestor de projetos → Viviane; Expert → Paula; Copywriter, Gestor de tráfego e Operação ficam sem responsável.
update public.tasks set assignee = 'viviane' where assignee is null and owner_role = 'gestor_projetos';
update public.tasks set assignee = 'paula'   where assignee is null and owner_role = 'expert';

-- Qual das quatro pessoas é o usuário logado (pelo início do e-mail ou do nome no perfil).
create or replace function public.my_person_key()
returns text language sql stable security definer set search_path = public as $$
  select case
    when lower(p.email) like 'everton%' or lower(p.name) like 'everton%' then 'everton'
    when lower(p.email) like 'jez%'     or lower(p.name) like 'jez%'     then 'jez'
    when lower(p.email) like 'viviane%' or lower(p.name) like 'viviane%' then 'viviane'
    when lower(p.email) like 'paula%'   or lower(p.name) like 'paula%'   then 'paula'
  end
  from public.profiles p where p.id = auth.uid() and p.active;
$$;

-- "Assumir": a pessoa logada vira responsável pela tarefa (admin troca livremente pelo painel).
create or replace function public.assume_task(p_task_id text)
returns text language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if coalesce(public.my_role(), 'visualizador') = 'visualizador' then
    raise exception 'Sem permissão para assumir tarefas.';
  end if;
  k := public.my_person_key();
  if k is null then
    raise exception 'Seu usuário não corresponde a Everton, Jez, Viviane ou Paula.';
  end if;
  update public.tasks set assignee = k, updated_at = now() where id = p_task_id;
  if not found then raise exception 'Tarefa não existe'; end if;
  return k;
end $$;

grant execute on function public.assume_task(text) to authenticated;
