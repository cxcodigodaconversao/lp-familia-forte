# Família Forte PPV

Painel de orquestração do lançamento pago **Família Forte — O Começo** (Dra. Paula Campozandória), com login, papéis por função, tarefas interligadas, justificativa de atraso, registro de tudo e gestão de usuários.

**Como configurar: leia `SUPABASE.md` (passo a passo completo).**

## Estrutura

```
index.html                         # tela de login + painel
app.js                             # lógica do painel (Supabase)
seed.js                            # cronograma padrão (160 tarefas interligadas) e seções
styles.css                         # visual (paleta dourado/azul-escuro, Montserrat + Playfair)
config.js                          # URL e chave anon do Supabase (preencher)
supabase/schema.sql                # tabelas, regras de acesso, gatilhos, tempo real, e-mails dos admins
scripts/create-admins.mjs          # cria os dois administradores com a senha que você escolher
netlify/functions/admin-users.mjs  # API de usuários (só administradores; usa a chave service_role)
netlify.toml                       # publicação e headers
package.json                       # dependência da função
```

## Publicar

1. Supabase: rode `supabase/schema.sql`; crie os usuários everton@comercial10x.com.br e jezreel@comercial10x.com.br (já nascem como administradores — ver `SUPABASE.md`).
2. Preencha `config.js`.
3. `git push` → Netlify publica sozinho.
4. Netlify → Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` → Trigger deploy.
5. Entre no site → Configurações → Importar cronograma padrão → cadastrar equipe.

## Rodar localmente

```bash
npm install
npx netlify dev
```
