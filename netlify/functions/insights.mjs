import { createClient } from "@supabase/supabase-js";

// IA da Pesquisa: recebe os NÚMEROS agregados da base (nunca nomes, e-mails ou telefones),
// chama a API da Anthropic e devolve dores, temas de Reels/lives, frases, objeções e propostas de tarefas.
// Roda no servidor do Netlify. Só administradores. Precisa da variável ANTHROPIC_API_KEY.

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
  if (!prof || prof.role !== "admin" || !prof.active) return json({ error: "somente administradores" }, 403);

  let body; try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const { stats, context, question } = body || {};
  if (!stats) return json({ error: "stats obrigatório" }, 400);

  const system = `Você é o estrategista de lançamento da Dra. Paula Campozandória (educação de filhos para mães cristãs, 30–45 anos, filhos de 2 a 10).
Lançamento: imersão online paga "Família Forte — O Começo" (07 e 08/11/2026), ingresso em 3 lotes (Lote 1 R$27,90 05→31/10 · Lote 2 01→05/11 · Lote 3 06 e 07/11), depois oferta do Família Forte 2.0.
Narrativa em 3 atos: Ato 1 (05→14/10) reconhecimento · Ato 2 (15→25/10) quebra de crença · Ato 3 (26/10→06/11) possibilidade/prova.
Regras: linguagem da mãe, zero termos técnicos; nunca culpar a mãe nem vilanizar a criança; não prometer filho perfeito; não usar medo extremo.
A base de conteúdo do Instagram da Paula NÃO muda — você sugere TEMAS e ÂNGULOS dentro dos formatos que ela já usa, sempre terminando com a CTA da palavra-chave (ManyChat → link do ingresso).
Responda SOMENTE com JSON válido (sem markdown), no formato:
{"resumo": "3–5 frases sobre o que a base revela",
 "dores": [{"dor":"…","peso":0-100,"onde_aparece":"segmento onde é mais forte","como_a_mae_fala":"frase na 1ª pessoa"}],
 "temas_reels": [{"tema":"…","gancho":"primeira frase do vídeo","ato":"ato1|ato2|ato3","dor":"…","cta":"…"}],
 "temas_lives": [{"tema":"…","promessa":"o que a mãe sai sabendo","ato":"ato1|ato2|ato3","dor":"…"}],
 "frases_mae": ["frases curtas na linguagem da mãe, extraídas das respostas"],
 "objecoes": [{"objecao":"…","resposta":"como a narrativa desmonta"}],
 "segmentos": [{"segmento":"…","o_que_dizer":"…","o_que_evitar":"…"}],
 "propostas_tarefas": [{"k":"AAAA-MM-DD","f":"cont|traf|copy|wa|tech|ev","t":"título","s":"detalhe","r":"por quê","owner_role":"expert|gestor_trafego|copywriter|operacao|gestor_projetos"}]}
Mínimo: 6 dores, 12 temas de Reels (4 por ato), 6 temas de lives (2 por ato), 8 frases, 6 objeções, 4 segmentos, 5 propostas de tarefas com datas entre 2026-09-28 e 2026-11-07.`;

  const user = `NÚMEROS AGREGADOS DA PESQUISA (sem dados pessoais):\n${JSON.stringify(stats)}\n\nCONTEXTO ATUAL DO PAINEL (temas já programados, para não repetir):\n${JSON.stringify(context || {})}\n\n${question ? "PERGUNTA ESPECÍFICA DO ADMINISTRADOR: " + question : "Gere a análise completa."}`;

  let lastErr = null;
  for (const model of MODELS) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 6000, temperature: 0.4, system, messages: [{ role: "user", content: user }] })
      });
      const j = await r.json();
      if (!r.ok) { lastErr = j?.error?.message || `erro ${r.status}`; if (r.status === 404 || /model/i.test(lastErr)) continue; return json({ error: lastErr }, 502); }
      const text = (j.content || []).map(c => c.text || "").join("");
      const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      let out; try { out = JSON.parse(clean); } catch { const m = clean.match(/\{[\s\S]*\}/); out = m ? JSON.parse(m[0]) : null; }
      if (!out) return json({ error: "A IA respondeu fora do formato. Tente de novo." }, 502);
      out._meta = { model, at: new Date().toISOString(), by: prof.name, tokens: j.usage };
      await admin.from("logs").insert({ user_id: me.user.id, user_name: prof.name, action: "ai_insights", entity: "pesquisa", entity_id: "main", title: question ? `IA respondeu: ${question.slice(0, 80)}` : "IA analisou a pesquisa", detail: { model } });
      return json(out);
    } catch (e) { lastErr = e.message || String(e); }
  }
  return json({ error: "Não consegui chamar a IA: " + lastErr }, 502);
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
export const config = { path: "/api/insights" };
