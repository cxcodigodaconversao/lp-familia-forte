import { createClient } from "@supabase/supabase-js";

// IA da aba Pesquisa: recebe só NÚMEROS AGREGADOS da base de leads (nunca nome, e-mail ou telefone) e devolve um JSON
// com dores, segmentos, temas de Reels e lives, frases-mãe, objeções e propostas de tarefas. Só administradores.
// Tudo que ela propõe só entra no painel quando um administrador aprova. Precisa de ANTHROPIC_API_KEY no Netlify.

const MODELS = [process.env.ANTHROPIC_MODEL, "claude-sonnet-5", "claude-sonnet-4-5", "claude-sonnet-4-5-20250929"].filter(Boolean);

export default async (req) => {
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);
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
  if (!prof || !prof.active || prof.role !== "admin") return json({ error: "só administradores usam a IA da pesquisa" }, 403);

  let body; try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const { stats, context, question } = body || {};
  if (!stats || typeof stats !== "object") return json({ error: "stats obrigatório" }, 400);
  if (!stats.total) return json({ error: "a base filtrada está vazia — ajuste os filtros ou importe o CSV" }, 400);

  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const system = `Você é o estrategista de pesquisa do lançamento "Família Forte — O Começo" (Dra. Paula Campozandória: educação de filhos para mães cristãs, 30–45 anos, filhos de 2 a 10). Hoje: ${hoje}.

O LANÇAMENTO
- Imersão online paga em 07 e 08/11/2026. Ingresso em 3 lotes: Lote 1 R$ 27,90 (05/10 → 31/10) · Lote 2 (01/11 → 05/11) · Lote 3 (06 e 07/11). Depois, oferta do Família Forte 2.0 ao vivo no Dia 2 (carrinho 08 → 12/11).
- Narrativa em 3 atos: Ato 1 05→14/10 (reconhecimento: "não é só comigo") · Ato 2 15→25/10 (quebra de crença: "o problema não é o seu filho, é o método") · Ato 3 26/10→06/11 (possibilidade/prova: "dá para mudar em dias").
- A base de conteúdo do Instagram da Paula NÃO muda; todo post termina com a CTA da palavra-chave (ManyChat → link do ingresso). Entram lives chamando para o evento. Stories: inimigo → cena da dor → virada → bastidor → convite.
- Regras de produção: linguagem da mãe, zero termos técnicos; nunca culpar a mãe nem vilanizar a criança; sem medo extremo; sem prometer filho perfeito; sem depender de desconto.

O QUE VOCÊ RECEBE
Só números agregados da base de leads (distribuições de motivo/dor, renda, idade, filhos, investimento anterior, compromisso, cruzamento renda × dor, respostas do quiz, compradoras do ingresso) e o contexto do painel (lives já programadas, frases-mãe e objeções já cadastradas, decisões, filtro aplicado). Não invente números: use os que vierem. Quando o filtro estiver aplicado, fale do segmento filtrado.

COMO RESPONDER
Português do Brasil, concreto, na linguagem da mãe. Prefira o que a base mostra ao que você supõe. Não repita frases-mãe nem objeções que já existem no contexto — traga novas.`;

  const schema = `Responda SOMENTE com um JSON válido (sem markdown, sem texto fora do JSON) exatamente neste formato:
{
 "resumo": "3–6 frases: quem é a mãe que chega, a dor dominante, o que isso pede do conteúdo até a imersão",
 "dores": [{"dor":"nome curto","peso":"alta|média|baixa","onde_aparece":"em qual segmento/renda/idade pesa mais, com o número","como_a_mae_fala":"uma frase na boca da mãe"}],
 "segmentos": [{"segmento":"ex.: renda R$ 3–5 mil, 2 filhos","o_que_dizer":"ângulo que converte","o_que_evitar":"o que afasta"}],
 "temas_reels": [{"tema":"título do reel","ato":"ato1|ato2|ato3","gancho":"primeira frase","dor":"dor que ataca","cta":"CTA com a palavra-chave"}],
 "temas_lives": [{"tema":"título da live","ato":"ato1|ato2|ato3","promessa":"o que a mãe leva","dor":"dor que ataca"}],
 "frases_mae": ["frase curta como a mãe diria", "..."],
 "objecoes": [{"objecao":"objeção real","resposta":"como responder sem desconto e sem medo"}],
 "propostas_tarefas": [{"k":"AAAA-MM-DD","f":"cont|traf|copy|wa|tech|ev","t":"título curto","s":"detalhe","r":"por quê (ligado a um número da base)","owner_role":"expert|gestor_trafego|copywriter|operacao|gestor_projetos"}]
}
Quantidades: dores 4–6 · segmentos 3–4 · temas_reels 6–9 (2–3 por ato) · temas_lives 4–6 · frases_mae 6–10 · objecoes 4–6 · propostas_tarefas 2–5 (datas entre ${hoje} e 2026-11-06; nunca mexa em lotes, atos ou imersão).
Frentes: cont=Conteúdo & Lives (expert) · traf=Tráfego (gestor_trafego) · copy=Copy & E-mail (copywriter) · wa=WhatsApp & ManyChat (operacao) · tech=Páginas & Ferramentas (gestor_projetos) · ev=Evento & Oferta (gestor_projetos).`;

  const schemaQ = `Responda SOMENTE com um JSON válido (sem markdown, sem texto fora do JSON) neste formato:
{"resumo": "resposta direta à pergunta, em texto corrido (pode usar quebras de linha), citando os números da base que sustentam a resposta"}`;

  const user = `NÚMEROS DA BASE (agregados):\n${JSON.stringify(stats).slice(0, 50000)}\n\nCONTEXTO DO PAINEL:\n${JSON.stringify(context || {}).slice(0, 20000)}\n\n${question ? `PERGUNTA DO ADMINISTRADOR: ${String(question).slice(0, 2000)}\n\n${schemaQ}` : `TAREFA: analise a base completa.\n\n${schema}`}`;

  let lastErr = null;
  for (const model of MODELS) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 6000, temperature: 0.5, system, messages: [{ role: "user", content: user }] })
      });
      const j = await r.json();
      if (!r.ok) { lastErr = j?.error?.message || `erro ${r.status}`; if (r.status === 404 || /model/i.test(lastErr)) continue; return json({ error: lastErr }, 502); }
      const text = (j.content || []).map(c => c.text || "").join("");
      const parsed = parseJson(text);
      if (!parsed) { lastErr = "a IA não devolveu JSON válido"; continue; }
      const out = question ? { resumo: String(parsed.resumo || text).trim() } : normalize(parsed);
      out._meta = { at: new Date().toISOString(), by: prof.name, model, filtro: context?.filtro || null, total: stats.total, pergunta: question || null };
      await admin.from("logs").insert({ user_id: me.user.id, user_name: prof.name, action: "ai_insights", entity: "pesquisa", entity_id: question ? "pergunta" : "analise", title: question ? String(question).slice(0, 90) : `Analisou a base (${stats.total} leads)`, detail: { model, filtro: context?.filtro || null } });
      return json(out);
    } catch (e) { lastErr = e.message || String(e); }
  }
  return json({ error: "Não consegui chamar a IA: " + lastErr }, 502);
};

function parseJson(text) {
  const t = String(text || "").trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fence ? fence[1] : null, t, t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)].filter(Boolean);
  for (const c of candidates) { try { const o = JSON.parse(c); if (o && typeof o === "object") return o; } catch { /* tenta o próximo */ } }
  return null;
}

// Garante os campos e tipos que a aba Pesquisa espera, mesmo que a IA omita algo.
function normalize(p) {
  const arr = x => Array.isArray(x) ? x : [];
  const str = x => x == null ? "" : String(x);
  const ato = a => ["ato1", "ato2", "ato3"].includes(a) ? a : (/2/.test(str(a)) ? "ato2" : /3/.test(str(a)) ? "ato3" : "ato1");
  const F = ["cont", "traf", "copy", "wa", "tech", "ev"], R = ["expert", "gestor_trafego", "copywriter", "operacao", "gestor_projetos"];
  return {
    resumo: str(p.resumo),
    dores: arr(p.dores).map(d => ({ dor: str(d.dor), peso: str(d.peso || "média"), onde_aparece: str(d.onde_aparece), como_a_mae_fala: str(d.como_a_mae_fala) })).filter(d => d.dor),
    segmentos: arr(p.segmentos).map(s => ({ segmento: str(s.segmento), o_que_dizer: str(s.o_que_dizer), o_que_evitar: str(s.o_que_evitar) })).filter(s => s.segmento),
    temas_reels: arr(p.temas_reels).map(t => ({ tema: str(t.tema), ato: ato(t.ato), gancho: str(t.gancho), dor: str(t.dor), cta: str(t.cta) })).filter(t => t.tema),
    temas_lives: arr(p.temas_lives).map(t => ({ tema: str(t.tema), ato: ato(t.ato), promessa: str(t.promessa), dor: str(t.dor) })).filter(t => t.tema),
    frases_mae: arr(p.frases_mae).map(str).filter(Boolean),
    objecoes: arr(p.objecoes).map(o => ({ objecao: str(o.objecao), resposta: str(o.resposta) })).filter(o => o.objecao),
    propostas_tarefas: arr(p.propostas_tarefas).map(t => ({ k: str(t.k).slice(0, 10), f: F.includes(t.f) ? t.f : "ev", t: str(t.t), s: str(t.s), r: str(t.r), owner_role: R.includes(t.owner_role) ? t.owner_role : null })).filter(t => t.t && /^\d{4}-\d{2}-\d{2}$/.test(t.k))
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
export const config = { path: "/api/insights" };
