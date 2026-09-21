# Família Forte PPV

Painel de orquestração do lançamento pago **Família Forte — O Começo** (Dra. Paula Campozandória): cronograma dia a dia, funil, réguas de WhatsApp API e e-mail, tráfego, roteiro da imersão e registro de decisões compartilhado com a equipe.

## Estrutura

```
index.html                    # o app inteiro (HTML + CSS + JS, sem build)
netlify/functions/state.mjs   # API /api/state — banco compartilhado (Netlify Blobs)
netlify.toml                  # configuração de publicação e headers
package.json                  # dependência da função (@netlify/blobs)
```

## Subir no GitHub

```bash
git init
git add .
git commit -m "Painel Família Forte PPV"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/ppv-familia-forte.git
git push -u origin main
```

## Publicar no Netlify

1. Netlify → **Add new site → Import an existing project → GitHub** → escolha o repositório.
2. Build command: deixe **vazio**. Publish directory: `.` (o `netlify.toml` já define).
3. Deploy. A cada `git push` na `main` o site é republicado.

O banco compartilhado (Netlify Blobs) é criado automaticamente no primeiro uso — não precisa configurar nada. Toda a equipe que abrir o link vê as mesmas marcações, decisões e registros (sincroniza a cada 10 s).

### Proteger a escrita (opcional)

Em **Site configuration → Environment variables** crie `PPV_TOKEN` com uma senha. Sem o token, as escritas passam a ser recusadas. (O `index.html` ainda não envia o token — quando a grade de logins for criada, ele entra aí.)

### Rodar localmente

```bash
npm install
npx netlify dev
```

## Como o app decide onde salvar

1. Dentro do claude.ai (artifact) → banco do próprio artifact.
2. No Netlify → `/api/state` (Blobs).
3. Sem nenhum dos dois (arquivo aberto direto) → só o navegador (`localStorage`).
