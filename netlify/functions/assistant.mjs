import { createClient } from "@supabase/supabase-js";

// Assistente flutuante do painel: conversa com contexto do lançamento (cronograma, decisões, pesquisa, tela atual).
// Responde em texto e, quando faz sentido, PROPÕE ações (criar/alterar tarefa, decisão, registro) — o painel só executa
// depois que um administrador aprova. Roda no servidor do Netlify. Precisa de ANTHROPIC_API_KEY.

const MODELS = [process.env.ANTHROPIC_MODEL, "claude-sonnet-5", "claude-sonnet-4-5", "claude-sonnet-4-5-20250929"].filter(Boolean);

export default async (req) => {
  if (req.method !== "POST") return new Response("método não permitido", { status: 405 });
  const url = process.env.SUPABASE_URL, anon = process.env.SUPABASE_ANON_KEY, service = process.env.SUPABASE_SERVICE_ROLE_KEY, key = process.env.ANTHROPIC_API_KEY;
  if (!url || !anon || !service) return json({ error: "Variáveis do Supabase não configuradas no Netlify." }, 500);
  if (!key) return json({ error: "A IA ainda não está ligada: crie a variável ANTHROPIC_API_KEY no Netlify (Site configuration → Environment variables) e refaça o deploy." }, 500);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "não autenticado" }, 401);
  const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: me, error: meErr } = await caller.auth.getUser(token);
  if (meErr || !me?.user) return json({ error: "sessão inválida" }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: prof } = await admin.from("profiles").select("role,active,name").eq("id", me.user.id).single();
  if (!prof || !prof.active) return json({ error: "usuário sem acesso" }, 403);
  if (prof.role === "visualizador") return json({ error: "visualizadores não usam o assistente" }, 403);

  let body; try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const { messages, context } = body || {};
  if (!Array.isArray(messages) || !messages.length) return json({ error: "messages obrigatório" }, 400);

  const isAdmin = prof.role === "admin";
  const system = `Você é o assistente de lançamento embutido no painel "Família Forte — O Começo" (Dra. Paula Campozandória: educação de filhos para mães cristãs, 30–45 anos, filhos de 2 a 10).
Quem fala com você: ${prof.name} (papel: ${prof.role}). Hoje: ${context?.hoje || "?"}.

O LANÇAMENTO
- Imersão online paga: 5 noites ao vivo de 02 a 06/11/2026 (20h–22h) + encerramento no sábado 07/11 (8h–12h). Ingresso em 2 lotes: Lote 1 R$ 27,90 (11/10 → 31/10) · Lote 2 só 01 e 02/11 (nunca antes de 01/11); vendas encerram 02/11. A oferta do Família Forte 2.0 abre ao vivo no encerramento de 07/11 (carrinho 07 → 11/11, proposta).
- Narrativa em 3 atos, datas fixas: Ato 1 11→17/10 (reconhecimento) · Ato 2 18→24/10 (quebra de crença) · Ato 3 25/10→01/11 (possibilidade/prova). Tudo o que estava atrasado foi redistribuído a partir de 09/10. Os lotes NÃO acompanham os atos.
- Duas páginas de venda (A sem VSL, já publicada; B com VSL), mesmo checkout. ManyChat: comentário/DM com a palavra-chave → link do ingresso. WhatsApp pela API oficial, 1:1, sem grupos.
- A base de conteúdo do Instagram da Paula NÃO muda; todo post termina com a CTA da palavra-chave; entram lives chamando para o evento. Stories seguem o arco inimigo → cena da dor → virada → bastidor → convite; reta final: prova → dor ampliada → para quem é → fechamento.
- Regras de produção: linguagem da mãe, zero termos técnicos; nunca culpar a mãe nem vilanizar a criança; sem medo extremo; sem prometer filho perfeito; sem depender de desconto.

COMO RESPONDER
- Português do Brasil, direto, prático, curto. Use o CONTEXTO abaixo (tela atual, tarefa aberta, próximas tarefas, atrasos, decisões, pesquisa). Cite datas e nomes de tarefas reais quando existirem.
- Quando pedirem opinião ("qual a melhor opção?"), escolha uma, diga por quê em 2–4 frases e o risco da alternativa.
- Quando o pedido implicar mudar o painel (criar tarefa, mudar data/texto/responsável de tarefa, registrar decisão, anotar no registro), ${isAdmin ? "PROPONHA as ações no bloco abaixo — elas só executam depois que o administrador aprova." : "explique o que deveria ser feito e diga que só um administrador pode aplicar (o usuário atual não é administrador); NÃO inclua bloco de ações."}
- Nunca proponha mudar as datas fixas (lotes, atos, imersão) — se pedirem, explique que são decisões fixadas pela gestão.
- Não invente números da base; use os do contexto.

${isAdmin ? `FORMATO DAS AÇÕES (opcional, só quando fizer sentido): depois da resposta em texto, acrescente UM bloco exatamente assim:
\`\`\`acoes
[{"tipo":"criar_tarefa","k":"AAAA-MM-DD","f":"cont|traf|copy|wa|tech|ev","t":"título curto","s":"detalhe","r":"por quê","owner_role":"expert|gestor_trafego|copywriter|operacao|gestor_projetos","depends_on":["id-existente"]},
 {"tipo":"alterar_tarefa","id":"id-existente","k":"AAAA-MM-DD","t":"…","s":"…","r":"…","owner_role":"…"},
 {"tipo":"decisao","campo":"nome|horario|plataforma|livesSemana|lote2|precoFF|bonusVivo|fechaCarrinho|bsp|palavraChave|paginaVencedora|linkIngresso|dominio","valor":"…"},
 {"tipo":"registro","titulo":"…","texto":"…"}]
\`\`\`
Em alterar_tarefa inclua só os campos que mudam. Datas entre ${context?.hoje || "2026-09-28"} e 2026-11-13. Frentes: cont=Conteúdo & Lives (expert), traf=Tráfego, copy=Copy & E-mail, wa=WhatsApp & ManyChat (operacao), tech=Páginas & Ferramentas, ev=Evento & Oferta (gestor_projetos).` : ""}

CONTEXTO DO PAINEL AGORA:
${JSON.stringify(context || {}).slice(0, 60000)}`;

  const msgs = messages.slice(-16).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 8000) }));
  let lastErr = null;
  for (const model of MODELS) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 2500, temperature: 0.4, system, messages: msgs })
      });
      const j = await r.json();
      if (!r.ok) { lastErr = j?.error?.message || `erro ${r.status}`; if (r.status === 404 || /model/i.test(lastErr)) continue; return json({ error: lastErr }, 502); }
      const full = (j.content || []).map(c => c.text || "").join("");
      let text = full, actions = [];
      const m = full.match(/```acoes\s*([\s\S]*?)```/i);
      if (m) { text = full.replace(m[0], "").trim(); try { const a = JSON.parse(m[1]); if (Array.isArray(a)) actions = a.filter(x => x && x.tipo); } catch { actions = []; } }
      if (!isAdmin) actions = [];
      await admin.from("logs").insert({ user_id: me.user.id, user_name: prof.name, action: "ai_chat", entity: "assistente", entity_id: context?.tela || "", title: (msgs[msgs.length - 1].content || "").slice(0, 90), detail: { model, acoes: actions.length } });
      return json({ text, actions, model });
    } catch (e) { lastErr = e.message || String(e); }
  }
  return json({ error: "Não consegui chamar a IA: " + lastErr }, 502);
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
export const config = { path: "/api/assistant" };
