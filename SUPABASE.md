# Passo a passo — Supabase + Netlify + GitHub
 
Faça na ordem. Cada passo leva poucos minutos.
 
---
 
## PASSO 1 — Criar o projeto no Supabase
 
1. Entre em https://supabase.com/dashboard e clique em **New project**.
2. Nome: `ppv-familia-forte`. Escolha uma senha forte para o banco (guarde — não vai precisar dela no dia a dia). Região: **South America (São Paulo)**.
3. Espere o projeto ficar verde (1–2 min).
## PASSO 2 — Criar a estrutura do banco
 
1. No menu lateral, clique em **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/schema.sql` deste repositório, copie **tudo** e cole no editor.
3. Clique em **Run**. Deve aparecer "Success. No rows returned".
Isso cria as tabelas `profiles`, `tasks`, `task_status`, `content`, `decisions`, `logs`, as regras de acesso (RLS), o gatilho que bloqueia tarefas dependentes e exige justificativa de atraso, e liga o tempo real.
 
## PASSO 3 — Criar os dois administradores
 
Os e-mails já estão gravados na estrutura (tabela `admin_emails`): **everton@comercial10x.com.br** (Everton Rodrigues) e **jezreel@comercial10x.com.br** (Jezreel Soares). Qualquer usuário criado com um desses e-mails nasce como administrador — não precisa de SQL extra. Só falta criar os usuários com a senha. Escolha UMA das formas:
 
**Forma A — pelo painel do Supabase (mais simples)**
1. Menu lateral → **Authentication** → **Users** → **Add user** → **Create new user**.
2. E-mail: `everton@comercial10x.com.br`. Senha: escolha. Marque **Auto Confirm User** → **Create user**.
3. Repita com `jezreel@comercial10x.com.br`.
4. Confira em **Table Editor → profiles**: os dois aparecem com `role = admin` e os nomes preenchidos.
**Forma B — pelo script (cria os dois de uma vez)**
No seu computador, dentro da pasta do projeto, depois de `npm install`:
```bash
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/create-admins.mjs "SenhaDoEverton" "SenhaDoJezreel"
```
(No Windows/PowerShell: `$env:SUPABASE_URL="..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/create-admins.mjs "senha1" "senha2"`.) O mesmo comando serve para trocar a senha depois.
 
> A senha nunca fica em arquivo: ela só existe no Supabase. Depois de entrar, cada administrador pode trocar a própria senha em **Configurações → Equipe → senha**.
 
> Se um dia quiser mais administradores fixos, adicione o e-mail na tabela `admin_emails` (Table Editor) antes de criar o usuário — ou simplesmente mude o papel dele em Configurações.
 
## PASSO 4 — Pegar as chaves
 
Menu lateral → **Project Settings** (engrenagem) → **API**. Você vai usar três coisas:
 
| O que | Onde vai |
|---|---|
| **Project URL** (`https://xxxx.supabase.co`) | `config.js` **e** Netlify (`SUPABASE_URL`) |
| **anon public** key | `config.js` **e** Netlify (`SUPABASE_ANON_KEY`) |
| **service_role** key (secreta) | **só** no Netlify (`SUPABASE_SERVICE_ROLE_KEY`) — nunca no código |
 
## PASSO 5 — Preencher o `config.js`
 
Abra `config.js` e coloque a Project URL e a chave anon:
 
```js
window.PPV_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJ..."
};
```
 
## PASSO 6 — Subir no GitHub
 
Substitua os arquivos do repositório pelos desta pasta (os antigos `netlify/functions/state.mjs` sai; entram `app.js`, `seed.js`, `styles.css`, `config.js`, `supabase/schema.sql`, `netlify/functions/admin-users.mjs`, e o `index.html` novo).
 
```bash
git add .
git commit -m "Supabase: login, papéis, tarefas interligadas, registro e usuários"
git push
```
 
## PASSO 7 — Variáveis no Netlify
 
No site do Netlify → **Site configuration → Environment variables → Add a variable**. Crie as três:
 
| Key | Value |
|---|---|
| `SUPABASE_URL` | a Project URL |
| `SUPABASE_ANON_KEY` | a chave anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | a chave service_role |
 
Depois **Deploys → Trigger deploy → Deploy site** (as variáveis só valem em um deploy novo).
 
## PASSO 8 — Liberar o domínio no Supabase
 
**Authentication → URL Configuration**:
- **Site URL**: a URL do seu site no Netlify (ex.: `https://ppv-familia-forte.netlify.app`).
- **Redirect URLs**: a mesma URL.
## PASSO 9 — Primeiro acesso
 
1. Abra o site no Netlify e entre com o seu e-mail e senha.
2. Aba **Configurações → Importar cronograma padrão** (cria as 182 tarefas interligadas e todas as seções).
> **Já tinha importado a versão anterior?** Use **Configurações → Atualizar tarefas do cronograma padrão (novas + alteradas)**: ele acrescenta as tarefas novas (páginas A/B, ManyChat, viradas de lote) e corrige datas/textos das antigas, sem apagar o que já foi concluído. Depois clique em **Restaurar TODO o conteúdo padrão (seções)** para atualizar lotes, réguas, funil e campanhas — atenção: isso substitui as seções editadas à mão.
3. Ainda em Configurações, cadastre a equipe: nome, e-mail, senha inicial e papel. Envie e-mail e senha para cada pessoa.
Pronto. Cada pessoa entra com o próprio login, vê o próprio nome no cabeçalho e tudo que fizer fica no **Registro**.
 
---
 
## Papéis e o que cada um pode fazer
 
| Papel | Pode |
|---|---|
| **Administrador** (Everton e Jezreel) | Tudo: criar, editar e excluir tarefas, mudar datas e dependências, editar todas as seções, decisões, usuários, concluir qualquer tarefa mesmo bloqueada |
| Gestor de projetos · Gestor de tráfego · Copywriter · Expert (Paula) · Operação/WhatsApp | Concluir **só as tarefas do seu papel** (ou atribuídas a ele): registrar o que foi feito, a data de entrega e — se entregou depois da data prevista — a justificativa (obrigatória). Não altera datas, não exclui, não edita seções. Vê tudo. |
| Visualizador | Só lê |
 
## Tarefas interligadas
 
Cada tarefa pode **depender** de outras. Enquanto a anterior não é concluída, a seguinte aparece **bloqueada** (🔒) com o nome de quem está travando. O banco também recusa a conclusão — não é só visual. O cronograma padrão já vem com as cadeias principais:
 
- copy da semana (sexta anterior) → posts com CTA, lives, e-mail e WhatsApp da semana → conferência do ManyChat → distribuição paga na segunda seguinte
- oferta do ingresso → copy da página A (sem VSL) → página A publicada → pixel → campanhas → captação (05/10)
- roteiro da VSL → expert grava a VSL → página B (com VSL) publicada → teste A/B (05→11/10) → decisão da vencedora (12/10)
- palavra-chave → copies do ManyChat → fluxos → teste ponta a ponta → checklist final
- copies dos criativos → expert grava → tráfego troca os criativos (a cada ato; o preço só muda nas viradas de lote)
- copies das viradas de lote → avisos (29/10 · 03/11) → virada do checkout + páginas + ManyChat + anúncios (01/11 · 06/11) → última chamada (07/11) → fechamento
- roteiro Dia 1 → Dia 2 → pitch → expert valida → e-mails de lançamento / templates do evento → ensaio → imersão
## Lotes × atos (regra fixa)
 
| | Datas |
|---|---|
| Ato 1 · 2 · 3 (narrativa) | 05→14/10 · 15→25/10 · 26/10→06/11 — **não mudam** |
| Lote 1 (R$ 27,90) | 05/10 → 31/10 |
| Lote 2 | **01/11** → 05/11 (não vira antes) |
| Lote 3 | **06 e 07/11 apenas** |
 
Duas páginas de venda (A sem VSL · B com VSL) com o mesmo checkout. A base de conteúdo da Paula no Instagram não muda: todo post ganha a CTA da palavra-chave (ManyChat → link do ingresso) e entram lives chamando para o evento.
 
Administradores editam as dependências de qualquer tarefa pelo ✎ (campo "Depende de").
 
## Se algo der errado
 
- **"Perfil não encontrado"** ao entrar: o `schema.sql` não rodou antes de criar o usuário. Rode o `schema.sql` de novo — o bloco final promove automaticamente os administradores que já existirem no Auth.
- **Criar usuário dá erro 500**: falta alguma variável no Netlify (passo 7) ou o deploy não foi refeito.
- **Nada sincroniza em tempo real**: **Database → Replication** — confira que as tabelas estão na publicação `supabase_realtime` (o schema já faz isso; a página também atualiza sozinha a cada 60 s).
