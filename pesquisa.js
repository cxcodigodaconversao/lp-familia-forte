/* ===================================================================
   PESQUISA — base de leads da Paula: importação do CSV, painéis de
   segmentação, dores, temas sugeridos (regras) e análise com IA.
   Usa os globais do app.js (sb, C, ME, LEADS, isAdmin, $, esc, toast, log, saveContent, scheduleRefresh).
   =================================================================== */

/* ---------- ordens e rótulos ---------- */
const ORD = {
  income: ["Entre R$ 3.000,00 e R$ 5.000,00", "Entre R$ 5.000,00 e R$ 10.000,00", "Entre R$ 10.000,00 e R$ 20.000,00", "Acima de R$ 20.000,00"],
  age: ["Entre 25 e 35 anos", "Entre 35 e 45 anos", "Entre 45 e 55 anos", "Acima de 55 anos"],
  investment: ["Até R$ 1.000,00", "Entre R$ 1.000,00 e R$ 3.000,00", "Entre R$ 3.000,00 e R$ 10.000,00", "Mais de R$ 10.000,00"]
};
const SHORT = {
  "Entre R$ 3.000,00 e R$ 5.000,00": "R$ 3–5 mil", "Entre R$ 5.000,00 e R$ 10.000,00": "R$ 5–10 mil", "Entre R$ 10.000,00 e R$ 20.000,00": "R$ 10–20 mil", "Acima de R$ 20.000,00": "R$ 20 mil+",
  "Entre 25 e 35 anos": "25–35", "Entre 35 e 45 anos": "35–45", "Entre 45 e 55 anos": "45–55", "Acima de 55 anos": "55+",
  "Até R$ 1.000,00": "até R$ 1 mil", "Entre R$ 1.000,00 e R$ 3.000,00": "R$ 1–3 mil", "Entre R$ 3.000,00 e R$ 10.000,00": "R$ 3–10 mil", "Mais de R$ 10.000,00": "R$ 10 mil+",
  "Sim, estou comprometida e preciso desta ajuda": "Comprometida", "Não tenho certeza da minha agenda no momento": "Sem certeza da agenda"
};
const sh = v => SHORT[v] || (v ? String(v).split(" (")[0].trim() : "—");
const PROJ = { "DOMUS FORTIS": "Diagnóstico (Domus Fortis)", "Leads - Resposta do formulario": "Diagnóstico (formulário)", "QUIZZ LIVRO": "Quiz do Livro" };
const pj = p => PROJ[p] || p || "—";
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const fmtN = n => (n || 0).toLocaleString("pt-BR");

/* Temas sugeridos por dor (regras — a IA refina) */
const THEMES = {
  "Exaustão emocional": { reels: ["Você termina o dia como 'bombeira de crises' e sem energia? Não é falta de amor.", "A casa no modo sobrevivência: sinais de que você está apagando incêndio o dia inteiro", "Por que gritar cansa mais você do que resolve o problema"], lives: ["Exaustão não é falta de amor: é falta de direção", "O dia de uma mãe no modo sobrevivência — e como sair dele"] },
  "Desobediência constante": { reels: ["'Já tentei de tudo': o que ninguém te contou sobre por que não funcionou", "Quantas vezes você precisa pedir a mesma coisa? O problema não é a ordem, é a sequência", "Ele obedece por 5 minutos e volta: o que está faltando"], lives: ["Por que seu filho não te obedece (e não é porque ele é difícil)", "Autoridade não é grito: o que muda quando a mãe sabe conduzir"] },
  "Culpa e inconsistência": { reels: ["Você começa firme e acaba cedendo? Isso tem nome — e tem saída", "A culpa depois do grito: o ciclo que toda mãe conhece", "Ser firme sem ser dura: a diferença que a criança sente"], lives: ["Como sustentar um limite sem se sentir a vilã da casa", "Culpa não educa ninguém: clareza sim"] },
  "Vício em telas": { reels: ["Tira o tablet e vira outra criança? O que está por trás da 'guerra da tela'", "Tela não é o problema; é o que ela está substituindo na rotina", "Como reduzir tela sem transformar a casa num campo de batalha"], lives: ["Telas: por que a proibição sozinha não funciona (e o que funciona)", "Rotina que cabe na vida real: onde a tela entra e onde ela sai"] },
  "Brigas na hora de dormir": { reels: ["A hora de dormir virou tortura? 3 sinais de que o problema não é o sono", "Por que a briga da noite começa às 17h", "O que uma noite tranquila revela sobre a rotina do dia"], lives: ["A noite em paz começa de manhã: a rotina que muda o sono", "Dormir sem guerra: o que a mãe precisa decidir antes das 19h"] },
  "Perda de autoridade": { reels: ["'Meu filho manda mais que eu': como a casa chega nesse ponto sem ninguém perceber", "Autoridade não se impõe: se constrói em decisões pequenas", "Quando negociar vira perder: o limite que a criança pede"], lives: ["Recuperar a autoridade sem virar sargento", "Uma mãe que sabe conduzir: o que muda na casa em 3 semanas"] }
};
const QUIZ_KEYS = { desafio: /maior desafio/i, impacto: /principal impacto/i, reacao: /costuma reagir/i, correcao: /corrigir um comportamento/i, ciclo: /apagar inc/i, interesse: /aprofundar esse tema/i };

/* ---------- CSV ---------- */
function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false; text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { row.push(cell); cell = ""; } else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else if (ch !== "\r") cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}
const pick = (d, keys) => { for (const k of keys) { for (const [kk, v] of Object.entries(d)) { if (typeof v !== "string") continue; if (k instanceof RegExp ? k.test(kk) : kk.trim() === k) { if (v.trim()) return v.trim(); } } } return ""; };
function parseChildren(s) {
  s = String(s || "").trim(); if (!s) return { n: null, ages: [] };
  let m = s.match(/^1900-01-0(\d)/); if (m) return { n: +m[1], ages: [] };
  if (/^\d+$/.test(s)) return { n: +s, ages: [] };
  let n = null; m = s.match(/(\d+)\s*(?:filh|crian|menin|garot|beb)/i); if (m) n = +m[1];
  const W = { um: 1, uma: 1, dois: 2, duas: 2, "três": 3, tres: 3, quatro: 4, cinco: 5 };
  if (n == null) { const w = s.match(/^(um|uma|dois|duas|tr[eê]s|quatro|cinco)\b/i); if (w) n = W[w[1].toLowerCase()] || null; }
  let rest = s; if (m) rest = s.replace(m[0], " ");
  if (n == null) { const m2 = s.match(/^([1-6])\s*(?:[,\-–:(]|de)\s*(?=\d)/i); if (m2) { const k = (s.slice(m2[0].length).match(/\d{1,2}/g) || []).length; if (+m2[1] <= k + 1) { n = +m2[1]; rest = s.slice(m2[0].length); } } }
  const nums = (rest.match(/\d{1,2}/g) || []).map(Number);
  let ages = nums.filter(a => a <= 25);
  if (/(\d{1,2})\s*mes/i.test(s) || /beb[eê]|rec[eé]m/i.test(s)) { ages = ages.filter(a => !new RegExp(a + "\\s*mes", "i").test(s)); ages.push(0); }
  if (n == null && ages.length) n = ages.length;
  if (n == null) { const cw = (s.match(/\b(um|uma|dois|duas|tr[eê]s|quatro|cinco)\b/gi) || []); if (cw.length) n = cw.reduce((t, w) => t + (W[w.toLowerCase()] || 0), 0); }
  if (n != null && ages.length > n) n = ages.length;
  return { n, ages: [...new Set(ages)] };
}
function normalizeRow(h, r) {
  const o = {}; h.forEach((k, i) => o[k] = r[i] || "");
  let d = {}; try { d = JSON.parse(o.data || "{}"); } catch (e) { d = {}; }
  const email = (o.email || pick(d, ["Qual seu melhor e-mail? ", "Qual seu melhor e-mail?", "email"]) || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  const project = o.project || "";
  const quiz = d.quiz_answers_labeled && typeof d.quiz_answers_labeled === "object" ? d.quiz_answers_labeled : {};
  const ch = parseChildren(pick(d, ["Quantos filhos você tem e qual a idade deles?", "children"]));
  return {
    id: `${project}|${email}`, email, name: (o.name || pick(d, ["Qual seu nome completo?", "name"]) || "").trim(), phone: pick(d, ["Qual seu WhatsApp (com DDD)?", "phone", /^field\d+$/]),
    project, crm_status: o.status || "", created_at: o.created_at || null,
    age: pick(d, ["Sua Idade", "age"]), income: pick(d, ["Qual é sua renda média MENSAL (familiar)?", "income"]),
    children_raw: pick(d, ["Quantos filhos você tem e qual a idade deles?", "children"]), children_n: ch.n, children_ages: ch.ages,
    reason: pick(d, ["O que mais te fez buscar este diagnóstico HOJE? (Marque a principal)", "reason"]),
    investment: pick(d, [/Quanto você já investiu/, "investment"]), commitment: pick(d, [/Este diagnóstico é uma sessão/, "commitment"]),
    quiz, outcome: d.quiz_outcome_title || "", qualified: typeof d.is_qualified === "boolean" ? d.is_qualified : null,
    raw: d, imported_by: ME.id
  };
}
async function importLeadsCSV(file) {
  const st = $("#leadStatus"); st.textContent = "Lendo arquivo…";
  try {
    const rows = parseCSV(await file.text()); if (rows.length < 2) throw new Error("CSV vazio");
    const h = rows[0].map(x => x.trim()); const need = ["email", "data"]; if (!need.every(k => h.includes(k))) throw new Error("O CSV precisa das colunas: name, email, status, project, created_at, data (exportação da base de leads).");
    const leads = rows.slice(1).map(r => normalizeRow(h, r)).filter(Boolean);
    const seen = {}; leads.forEach(l => seen[l.id] = l); const uniq = Object.values(seen);
    st.textContent = `Importando ${uniq.length} registros…`;
    for (let i = 0; i < uniq.length; i += 200) { const { error } = await sb.from("leads").upsert(uniq.slice(i, i + 200), { onConflict: "id" }); if (error) throw error; st.textContent = `Importando… ${Math.min(i + 200, uniq.length)}/${uniq.length}`; }
    await log("leads_import", "pesquisa", "main", `Importou base de leads (${uniq.length} registros, ${rows.length - 1} linhas)`, {});
    st.textContent = `Pronto: ${uniq.length} registros importados/atualizados.`; toast("Base importada"); scheduleRefresh();
  } catch (e) { st.textContent = ""; err(e); }
}
async function importBuyers(text) {
  const emails = [...new Set((text.match(/[^\s,;"'<>]+@[^\s,;"'<>]+/g) || []).map(e => e.toLowerCase()))];
  if (!emails.length) { toast("Nenhum e-mail encontrado", true); return; }
  try { const { data, error } = await sb.rpc("mark_bought", { p_emails: emails }); if (error) throw error; await log("leads_bought", "pesquisa", "main", `Marcou ${data} compradora(s) a partir de ${emails.length} e-mails`, {}); toast(`${data} compradora(s) marcada(s)`); scheduleRefresh(); } catch (e) { err(e); }
}

/* ---------- estatística ---------- */
const PF = { project: "all", income: "all", age: "all", reason: "all", bought: "all", q: "" };
function filteredLeads() {
  return LEADS.filter(l => (PF.project === "all" || l.project === PF.project) && (PF.income === "all" || l.income === PF.income) && (PF.age === "all" || l.age === PF.age) && (PF.reason === "all" || sh(l.reason) === PF.reason) && (PF.bought === "all" || (PF.bought === "yes") === !!l.bought));
}
function dist(list, field, order) {
  const c = {}; list.forEach(l => { const v = l[field]; if (v) c[v] = (c[v] || 0) + 1; });
  let ent = Object.entries(c); if (order) ent.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])); else ent.sort((a, b) => b[1] - a[1]);
  const n = ent.reduce((s, e) => s + e[1], 0); return { n, rows: ent.map(([k, v]) => ({ k, v, p: pct(v, n) })) };
}
function quizDist(list, re) {
  const c = {}; let n = 0; list.forEach(l => { const q = l.quiz || {}; const key = Object.keys(q).find(k => re.test(k)); if (key && q[key]) { c[q[key]] = (c[q[key]] || 0) + 1; n++; } });
  return { n, rows: Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v, p: pct(v, n) })) };
}
function buildStats(list) {
  const uniq = new Set(list.map(l => l.email)).size;
  const form = list.filter(l => l.reason); const quiz = list.filter(l => l.quiz && Object.keys(l.quiz).length);
  const reason = dist(form, "reason"); const income = dist(form, "income", ORD.income); const age = dist(form, "age", ORD.age); const inv = dist(form, "investment", ORD.investment); const com = dist(form, "commitment");
  const cross = {}; ORD.income.forEach(i => { const sub = form.filter(l => l.income === i); cross[i] = { n: sub.length, reasons: dist(sub, "reason").rows.map(r => [sh(r.k), r.p]), avgChildren: avg(sub.map(l => l.children_n).filter(x => x)), inv1k: pct(sub.filter(l => l.investment === ORD.investment[0]).length, sub.filter(l => l.investment).length), plus3: pct(sub.filter(l => l.children_n >= 3).length, sub.filter(l => l.children_n).length) }; });
  const chN = { "1": 0, "2": 0, "3+": 0 }; list.forEach(l => { if (l.children_n) chN[l.children_n >= 3 ? "3+" : String(l.children_n)]++; });
  const ages = { "0–2": 0, "3–5": 0, "6–10": 0, "11–14": 0, "15+": 0 }; list.forEach(l => (l.children_ages || []).forEach(a => { ages[a <= 2 ? "0–2" : a <= 5 ? "3–5" : a <= 10 ? "6–10" : a <= 14 ? "11–14" : "15+"]++; }));
  const dores = reason.rows.map(r => { const s = sh(r.k); let best = null; ORD.income.forEach(i => { const c = cross[i]; const f = (c.reasons.find(x => x[0] === s) || [s, 0])[1]; if (!best || f > best.p) best = { i, p: f }; }); return { dor: s, n: r.v, p: r.p, pico: best ? `${sh(best.i)} (${best.p}%)` : "" }; });
  return {
    total: list.length, unicos: uniq, form: form.length, quiz: quiz.length, compradoras: list.filter(l => l.bought).length,
    projetos: dist(list, "project").rows.map(r => [pj(r.k), r.v]),
    motivo: reason.rows.map(r => [sh(r.k), r.v, r.p]), renda: income.rows.map(r => [sh(r.k), r.v, r.p]), idade: age.rows.map(r => [sh(r.k), r.v, r.p]), investimento: inv.rows.map(r => [sh(r.k), r.v, r.p]), compromisso: com.rows.map(r => [sh(r.k), r.v, r.p]),
    filhos: chN, idadesFilhos: ages, mediaFilhos: avg(list.map(l => l.children_n).filter(x => x)),
    cruzamento: Object.fromEntries(Object.entries(cross).map(([k, v]) => [sh(k), v])),
    dores,
    quizRespostas: Object.fromEntries(Object.entries(QUIZ_KEYS).map(([k, re]) => [k, quizDist(quiz, re).rows.map(r => [r.k, r.v, r.p])])),
    quizResultado: dist(quiz, "outcome").rows.map(r => [r.k, r.v, r.p])
  };
}
const avg = a => a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length * 100) / 100 : 0;

/* ---------- render ---------- */
const bars = (rows, color, labelFn) => rows.length ? rows.map(r => `<div style="margin-top:9px"><div class="row" style="justify-content:space-between;gap:8px"><span style="font-size:13px">${esc(labelFn ? labelFn(r.k) : r.k)}</span><span class="status" style="white-space:nowrap">${fmtN(r.v)} · ${r.p}%</span></div><div class="bar" style="margin-top:4px"><i style="width:${r.p}%;background:${color || "var(--gold)"}"></i></div></div>`).join("") : `<p class="status" style="margin-top:8px">Sem dados.</p>`;
const kpi = (v, k) => `<div class="card soft kpi"><div class="v">${v}</div><div class="k">${k}</div></div>`;
const sel = (id, label, opts, val) => `<label class="chip" style="gap:8px">${label}<select data-pf="${id}" style="background:transparent;color:var(--txt);border:0;font:inherit">${opts.map(([v, n]) => `<option value="${esc(v)}" ${val === v ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;

function renderPesquisa() {
  const el = $("#v-pesquisa"); if (!el) return;
  if (!LEADS.length) { el.innerHTML = `<h2>Pesquisa — base de leads</h2><p class="lead">Aqui entra a inteligência do lançamento: quem é a mãe que chega, o que a fez procurar ajuda, quanto já tentou, e o que isso pede de conteúdo.</p>${isAdmin() ? importBox() : `<div class="banner"><b>Base ainda não importada.</b><span class="status">Peça ao administrador para importar o CSV de leads em Pesquisa.</span></div>`}`; bindPesquisa(); return; }
  const list = filteredLeads(); const S = buildStats(list); const all = buildStats(LEADS);
  const reasonsAll = dist(LEADS.filter(l => l.reason), "reason").rows.map(r => sh(r.k));
  const ai = C && C.pesquisaAI;
  el.innerHTML = `
    <h2>Pesquisa — base de leads</h2>
    <p class="lead">${fmtN(all.total)} registros · ${fmtN(all.unicos)} mães únicas · ${fmtN(all.form)} responderam o diagnóstico · ${fmtN(all.quiz)} fizeram o Quiz do Livro${all.compradoras ? ` · <b style="color:var(--gold)">${fmtN(all.compradoras)} já compraram o ingresso</b>` : ""}. Filtre para ver como cada segmento fala.</p>
    <div class="row mt">${sel("project", "Origem", [["all", "Todas"], ...all.projetos.map(([n]) => [Object.keys(PROJ).find(k => PROJ[k] === n) || n, n])], PF.project)}${sel("income", "Renda", [["all", "Todas"], ...ORD.income.map(v => [v, sh(v)])], PF.income)}${sel("age", "Idade", [["all", "Todas"], ...ORD.age.map(v => [v, sh(v)])], PF.age)}${sel("reason", "Dor principal", [["all", "Todas"], ...reasonsAll.map(v => [v, v])], PF.reason)}${sel("bought", "Ingresso", [["all", "Todas"], ["yes", "Compraram"], ["no", "Não compraram"]], PF.bought)}<button class="ed" data-pfreset="1">limpar filtros</button></div>
    <div class="grid g4 mt">${kpi(fmtN(S.total), "registros no filtro")}${kpi(fmtN(S.unicos), "mães únicas")}${kpi(S.mediaFilhos || "—", "média de filhos")}${kpi(S.form ? S.motivo[0] ? S.motivo[0][2] + "%" : "—" : "—", S.motivo[0] ? "dor nº 1: " + S.motivo[0][0] : "dor nº 1")}${kpi(S.investimento[0] ? S.investimento[0][2] + "%" : "—", "investiu até R$ 1 mil")}${kpi(S.compradoras ? pct(S.compradoras, S.unicos) + "%" : "—", "converteram em ingresso")}</div>

    <h3 class="mt2">Maiores dores (motivo principal do diagnóstico)</h3>
    <div class="grid g2 mt">
      <div class="card">${bars(S.motivo.map(([k, v, p]) => ({ k, v, p })), "var(--f5)")}</div>
      <div class="card soft"><span class="eyebrow">Onde cada dor é mais forte</span><ul class="plain">${S.dores.map(d => `<li><b>${esc(d.dor)}</b><span class="s">${d.p}% da base · pico em ${esc(d.pico)}</span></li>`).join("")}</ul></div>
    </div>

    <h3 class="mt2">Quem é essa mãe</h3>
    <div class="grid g3 mt">
      <div class="card soft"><span class="eyebrow">Renda familiar mensal</span>${bars(S.renda.map(([k, v, p]) => ({ k, v, p })), "var(--f2)")}</div>
      <div class="card soft"><span class="eyebrow">Idade</span>${bars(S.idade.map(([k, v, p]) => ({ k, v, p })), "var(--f1)")}</div>
      <div class="card soft"><span class="eyebrow">Quanto já investiu tentando resolver</span>${bars(S.investimento.map(([k, v, p]) => ({ k, v, p })), "var(--f3)")}</div>
      <div class="card soft"><span class="eyebrow">Quantidade de filhos</span>${bars(Object.entries(S.filhos).map(([k, v]) => ({ k, v, p: pct(v, Object.values(S.filhos).reduce((a, b) => a + b, 0)) })), "var(--f4)")}</div>
      <div class="card soft"><span class="eyebrow">Idade dos filhos (quando informada)</span>${bars(Object.entries(S.idadesFilhos).map(([k, v]) => ({ k, v, p: pct(v, Object.values(S.idadesFilhos).reduce((a, b) => a + b, 0)) })), "var(--f4)")}</div>
      <div class="card soft"><span class="eyebrow">Compromisso com a sessão de diagnóstico</span>${bars(S.compromisso.map(([k, v, p]) => ({ k, v, p })), "var(--f6)")}</div>
    </div>

    <h3 class="mt2">Segmentos por renda — o que muda na mensagem</h3>
    <div class="tw mt"><table><thead><tr><th>Renda</th><th>Leads</th><th>Dor nº 1</th><th>Dor nº 2</th><th>Méd. filhos</th><th>3+ filhos</th><th>Investiu até R$ 1 mil</th></tr></thead><tbody>${Object.entries(S.cruzamento).map(([k, c]) => `<tr><td class="n"><b>${esc(k)}</b></td><td class="n">${fmtN(c.n)}</td><td>${c.reasons[0] ? `${esc(c.reasons[0][0])} <span class="tag">${c.reasons[0][1]}%</span>` : "—"}</td><td>${c.reasons[1] ? `${esc(c.reasons[1][0])} <span class="tag">${c.reasons[1][1]}%</span>` : "—"}</td><td class="n">${c.avgChildren || "—"}</td><td class="n">${c.plus3}%</td><td class="n">${c.inv1k}%</td></tr>`).join("")}</tbody></table></div>
    <p class="status" style="margin-top:8px">Leitura rápida: quanto menor a renda, mais sensível a preço (mais gente que nunca investiu) e mais forte a dor de telas; no topo, a mãe já pagou por soluções e cobra método. A mensagem do Lote 1 (R$ 27,90) fala com todas; o que muda é o argumento.</p>

    ${S.quiz ? `<h3 class="mt2">Quiz do Livro — como a mãe reage e o que ela já percebeu (${fmtN(S.quiz)} respostas)</h3>
    <div class="grid g2 mt">
      <div class="card soft"><span class="eyebrow">Maior desafio diário</span>${bars(S.quizRespostas.desafio.map(([k, v, p]) => ({ k, v, p })), "var(--f5)")}</div>
      <div class="card soft"><span class="eyebrow">Impacto na vida</span>${bars(S.quizRespostas.impacto.map(([k, v, p]) => ({ k, v, p })), "var(--f5)")}</div>
      <div class="card soft"><span class="eyebrow">Como reage quando o filho perde o controle</span>${bars(S.quizRespostas.reacao.map(([k, v, p]) => ({ k, v, p })), "var(--f3)")}</div>
      <div class="card soft"><span class="eyebrow">O que acontece depois da correção</span>${bars(S.quizRespostas.correcao.map(([k, v, p]) => ({ k, v, p })), "var(--f3)")}</div>
      <div class="card soft"><span class="eyebrow">Já percebeu que apagar incêndio não resolve?</span>${bars(S.quizRespostas.ciclo.map(([k, v, p]) => ({ k, v, p })), "var(--f2)")}</div>
      <div class="card soft"><span class="eyebrow">Interesse em aprofundar</span>${bars(S.quizRespostas.interesse.map(([k, v, p]) => ({ k, v, p })), "var(--f2)")}<div style="margin-top:12px"><span class="eyebrow">Resultado do quiz</span>${bars(S.quizResultado.map(([k, v, p]) => ({ k, v, p })), "var(--f1)")}</div></div>
    </div>` : ""}

    <h3 class="mt2">Temas sugeridos a partir das dores (regras)</h3>
    <p class="lead">Ordenados pela força da dor no filtro atual. Todo tema termina com a CTA da palavra-chave. A IA (abaixo) refina isso com a linguagem da própria base.</p>
    <div class="grid g2 mt">${S.dores.map(d => { const t = THEMES[d.dor]; if (!t) return ""; return `<div class="card soft"><span class="eyebrow">${esc(d.dor)} · ${d.p}% · pico ${esc(d.pico)}</span><p style="margin-top:8px"><b style="color:var(--gold)">Reels</b></p><ul class="plain">${t.reels.map(x => `<li>${esc(x)}</li>`).join("")}</ul><p style="margin-top:10px"><b style="color:var(--gold)">Lives</b></p><ul class="plain">${t.lives.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`; }).join("")}</div>

    <h3 class="mt2">Análise com IA</h3>
    <p class="lead">A IA recebe só os números agregados (nunca nomes, e-mails ou telefones) e devolve dores na linguagem da mãe, temas por ato, frases, objeções e propostas de tarefas. Nada entra no cronograma sem um administrador aprovar.</p>
    ${isAdmin() ? `<div class="card soft mt"><div class="row"><button class="btn" id="aiRun">Analisar a base com IA</button><span class="status" id="aiStatus">${ai && ai._meta ? `Última análise: ${new Date(ai._meta.at).toLocaleString("pt-BR")} por ${esc(ai._meta.by)}` : "Ainda não analisada."}</span></div><div class="row mt" style="align-items:stretch"><input id="aiQ" placeholder="Pergunta específica (ex.: quais 5 temas de live para a mãe de R$ 3–5 mil no Ato 2?)" style="flex:1;min-width:260px;background:var(--card2);border:1px solid var(--line);border-radius:8px;color:var(--txt);padding:9px 12px;font:inherit"><button class="btn ghost" id="aiAsk">Perguntar</button></div></div>` : ""}
    ${ai ? renderAI(ai) : ""}

    ${isAdmin() ? `<h3 class="mt2">Leads (só administradores veem contato)</h3>
    <div class="row mt"><input id="leadQ" placeholder="buscar por nome ou e-mail" value="${esc(PF.q)}" style="flex:1;min-width:220px;background:var(--card2);border:1px solid var(--line);border-radius:8px;color:var(--txt);padding:9px 12px;font:inherit"><span class="status" id="leadCount"></span></div>
    <div class="tw mt" id="leadTable">${leadTable(list)}</div>
    ${importBox()}` : ""}`;
  bindPesquisa();
}
function leadTable(list) {
  const q = PF.q.trim().toLowerCase(); const rows = (q ? list.filter(l => (l.name + " " + l.email).toLowerCase().includes(q)) : list).slice(0, 150);
  setTimeout(() => { const c = $("#leadCount"); if (c) c.textContent = `${fmtN(rows.length)} exibidos de ${fmtN(list.length)} no filtro`; }, 0);
  const quizLbl = o => /fragil/i.test(o) ? "Quiz: autoridade fragilizada" : /s[oó]lida/i.test(o) ? "Quiz: base sólida" : "Quiz";
  return `<table class="leads"><thead><tr><th>Nome</th><th>E-mail</th><th>WhatsApp</th><th>Origem</th><th>Renda</th><th>Idade</th><th>Filhos</th><th>Dor</th><th>Investiu</th><th>Ingresso</th></tr></thead><tbody>${rows.map(l => `<tr><td class="nm" title="${esc(l.name)}"><span>${esc(l.name || "—")}</span></td><td class="n em" title="${esc(l.email)}">${esc(l.email)}</td><td class="n">${esc(l.phone || "—")}</td><td><span class="tag">${esc(pj(l.project))}</span></td><td class="n">${esc(sh(l.income))}</td><td class="n">${esc(sh(l.age))}</td><td class="n" title="${esc(l.children_raw)}">${l.children_n || "—"}${l.children_ages && l.children_ages.length ? ` <span class="s">(${l.children_ages.join(", ")} a)</span>` : ""}</td><td class="dor">${esc(sh(l.reason) !== "—" ? sh(l.reason) : (l.outcome ? quizLbl(l.outcome) : "—"))}</td><td class="n">${esc(sh(l.investment))}</td><td>${l.bought ? `<span class="tag" style="color:var(--ok)">comprou</span>` : `<button class="ed" data-buy="${esc(l.email)}">marcar</button>`}</td></tr>`).join("")}</tbody></table>`;
}
function importBox() {
  return `<div class="grid g2 mt2">
    <div class="card soft"><span class="eyebrow">Importar base de leads (CSV)</span><p class="status" style="margin-top:6px">Exportação da base (colunas name, email, status, project, created_at, data). Pode importar de novo quando quiser: registros repetidos são atualizados, não duplicados.</p><div class="row mt"><input type="file" id="leadFile" accept=".csv,text/csv"><span class="status" id="leadStatus"></span></div></div>
    <div class="card soft"><span class="eyebrow">Marcar compradoras do ingresso</span><p class="status" style="margin-top:6px">Cole os e-mails (ou o CSV do checkout). Marca "comprou" em quem estiver na base e alimenta a conversão por segmento.</p><div class="row mt" style="align-items:stretch"><textarea id="buyTxt" placeholder="um e-mail por linha, ou cole o CSV inteiro" style="flex:1;min-height:70px;background:var(--card2);border:1px solid var(--line);border-radius:8px;color:var(--txt);padding:9px 12px;font:inherit"></textarea></div><div class="row mt"><button class="btn ghost" id="buyBtn">Marcar compradoras</button></div></div>
  </div>`;
}
function renderAI(ai) {
  const li = (arr, f) => `<ul class="plain">${(arr || []).map(f).join("")}</ul>`;
  const atoN = a => ({ ato1: "Ato 1", ato2: "Ato 2", ato3: "Ato 3" })[a] || a || "";
  return `<div class="card mt"><span class="eyebrow">O que a base revela</span><p style="margin-top:8px">${esc(ai.resumo || "")}</p></div>
    <div class="grid g2 mt">
      <div class="card soft"><span class="eyebrow">Dores na linguagem da mãe</span>${li(ai.dores, d => `<li><b>${esc(d.dor)}</b> <span class="tag">${d.peso}</span><span class="s">${esc(d.onde_aparece || "")}</span><span class="s"><i>“${esc(d.como_a_mae_fala || "")}”</i></span></li>`)}</div>
      <div class="card soft"><span class="eyebrow">Segmentos — o que dizer e o que evitar</span>${li(ai.segmentos, s => `<li><b>${esc(s.segmento)}</b><span class="s">Dizer: ${esc(s.o_que_dizer || "")}</span><span class="s">Evitar: ${esc(s.o_que_evitar || "")}</span></li>`)}</div>
    </div>
    <div class="grid g2 mt">
      <div class="card soft"><span class="eyebrow">Temas de Reels (mesma base de conteúdo, novo ângulo)</span>${li(ai.temas_reels, t => `<li><b>${esc(t.tema)}</b> <span class="tag">${atoN(t.ato)}</span><span class="s">Gancho: ${esc(t.gancho || "")}</span><span class="s">Dor: ${esc(t.dor || "")}${t.cta ? " · CTA: " + esc(t.cta) : ""}</span></li>`)}</div>
      <div class="card soft"><span class="eyebrow">Temas de lives chamando para o evento</span>${li(ai.temas_lives, t => `<li><b>${esc(t.tema)}</b> <span class="tag">${atoN(t.ato)}</span><span class="s">${esc(t.promessa || "")}</span><span class="s">Dor: ${esc(t.dor || "")}</span></li>`)}${isAdmin() ? `<div class="row mt"><button class="ed" data-ai="lives">+ Enviar temas para a Programação de lives (preenche as próximas lives sem tema da IA)</button></div>` : ""}</div>
    </div>
    <div class="grid g2 mt">
      <div class="card soft"><span class="eyebrow">Frases-mãe extraídas da base</span>${li(ai.frases_mae, f => `<li>“${esc(f)}”</li>`)}${isAdmin() ? `<div class="row mt"><button class="ed" data-ai="frases">+ Adicionar às Frases-mãe (Narrativa)</button></div>` : ""}</div>
      <div class="card soft"><span class="eyebrow">Objeções reais</span>${li(ai.objecoes, o => `<li><b>${esc(o.objecao)}</b><span class="s">${esc(o.resposta || "")}</span></li>`)}${isAdmin() ? `<div class="row mt"><button class="ed" data-ai="obj">+ Adicionar às Objeções (Narrativa)</button></div>` : ""}</div>
    </div>
    ${ai.propostas_tarefas && ai.propostas_tarefas.length ? `<div class="card soft mt"><span class="eyebrow">Propostas de tarefas da IA — só entram no cronograma se um administrador aprovar</span><ul class="plain">${ai.propostas_tarefas.map((p, i) => `<li${p._approved ? ' style="opacity:.55"' : ""}><b>${esc(p.k)} · ${esc(p.t)}</b><span class="s">${esc(p.s || "")}${p.r ? " — " + esc(p.r) : ""}</span><span class="s">${esc(({ cont: "Conteúdo", traf: "Tráfego", copy: "Copy", wa: "WhatsApp & ManyChat", tech: "Páginas & Ferramentas", ev: "Evento" })[p.f] || p.f)} · ${esc(p.owner_role || "")}${p._approved ? " · <b>aprovada</b>" : isAdmin() ? ` · <button class="ed" data-aiapprove="${i}">aprovar → criar tarefa</button>` : ""}</span></li>`).join("")}</ul></div>` : ""}
    ${ai.resposta ? `<div class="card mt"><span class="eyebrow">Resposta à pergunta</span><p style="margin-top:8px;white-space:pre-wrap">${esc(ai.resposta)}</p></div>` : ""}`;
}

/* ---------- eventos ---------- */
function bindPesquisa() {
  const el = $("#v-pesquisa"); if (!el) return;
  el.querySelectorAll("select[data-pf]").forEach(s => s.onchange = () => { PF[s.dataset.pf] = s.value; renderPesquisa(); });
  const rs = el.querySelector("[data-pfreset]"); if (rs) rs.onclick = () => { Object.assign(PF, { project: "all", income: "all", age: "all", reason: "all", bought: "all", q: "" }); renderPesquisa(); };
  const lf = $("#leadFile"); if (lf) lf.onchange = () => { if (lf.files[0]) importLeadsCSV(lf.files[0]); };
  const bb = $("#buyBtn"); if (bb) bb.onclick = () => importBuyers($("#buyTxt").value);
  const lq = $("#leadQ"); if (lq) lq.oninput = () => { PF.q = lq.value; $("#leadTable").innerHTML = leadTable(filteredLeads()); };
  el.onclick = async e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.buy) { if (confirm(`Marcar ${b.dataset.buy} como compradora do ingresso?`)) importBuyers(b.dataset.buy); }
    if (b.dataset.aiapprove != null) approveTask(+b.dataset.aiapprove);
    if (b.dataset.ai) applyAI(b.dataset.ai);
  };
  const run = $("#aiRun"); if (run) run.onclick = () => askAI("");
  const ask = $("#aiAsk"); if (ask) ask.onclick = () => { const q = $("#aiQ").value.trim(); if (!q) { toast("Escreva a pergunta", true); return; } askAI(q); };
}
async function askAI(question) {
  const st = $("#aiStatus"); const stats = buildStats(filteredLeads());
  const context = { lives: (C.lives || []).map(l => [l.d, l.tema]), frases: C.frases, objecoes: (C.obj || []).map(o => o[0]), decisoes: DEC, filtro: PF };
  st.textContent = "Analisando… (30–60 s)"; $("#aiRun").disabled = true;
  try {
    const { data: { session } } = await sb.auth.getSession();
    const r = await fetch("/api/insights", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + session.access_token }, body: JSON.stringify({ stats, context, question: question || undefined }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "erro " + r.status);
    if (question) { const prev = C.pesquisaAI || {}; C.pesquisaAI = Object.assign({}, prev, { resposta: j.resumo, _meta: j._meta }); } else C.pesquisaAI = j;
    await saveContent("pesquisaAI"); toast("Análise salva"); renderPesquisa();
  } catch (e) { st.textContent = ""; $("#aiRun").disabled = false; err(e); }
}
async function approveTask(i) {
  const p = (C.pesquisaAI.propostas_tarefas || [])[i]; if (!p || p._approved) return;
  const id = "ai-" + Date.now().toString(36) + "-" + i;
  try {
    const { error } = await sb.from("tasks").insert({ id, k: p.k, f: ["cont", "traf", "copy", "wa", "tech", "ev"].includes(p.f) ? p.f : "ev", t: p.t, s: p.s || "", r: p.r || "", owner_role: p.owner_role || null, depends_on: [], created_by: ME.id }); if (error) throw error;
    p._approved = true; await saveContent("pesquisaAI"); await log("task_create", "tarefa", id, p.t, { origem: "IA da pesquisa" }); toast("Tarefa criada no cronograma"); scheduleRefresh();
  } catch (e) { err(e); }
}
async function applyAI(kind) {
  const ai = C.pesquisaAI || {};
  try {
    if (kind === "frases") { const add = (ai.frases_mae || []).filter(f => !C.frases.includes(f)); C.frases = C.frases.concat(add); await saveContent("frases"); toast(`${add.length} frase(s) adicionada(s)`); }
    if (kind === "obj") { const have = new Set((C.obj || []).map(o => o[0])); const add = (ai.objecoes || []).filter(o => !have.has(o.objecao)).map(o => [o.objecao, o.resposta || ""]); C.obj = (C.obj || []).concat(add); await saveContent("obj"); toast(`${add.length} objeção(ões) adicionada(s)`); }
    if (kind === "lives") { if (!confirm("Isso troca o tema das PRÓXIMAS lives (a partir de hoje) pelos temas sugeridos pela IA, por ato. Os temas atuais ficam registrados no CTA. Continuar?")) return; const pool = { ato1: [], ato2: [], ato3: [] }; (ai.temas_lives || []).forEach(t => (pool[t.ato] || pool.ato3).push(t)); let n = 0; C.lives = C.lives.map(l => { const q = pool[l.ato]; if (q && q.length && l.d >= todayKey()) { const t = q.shift(); n++; return Object.assign({}, l, { tema: t.tema, cta: `Convite + palavra-chave · ${t.promessa || ""}${l.tema && !/\(IA\)/.test(l.cta || "") ? " · antes: " + l.tema : ""} (IA)` }); } return l; }); await saveContent("lives"); toast(`${n} live(s) receberam tema da IA`); }
    renderAll();
  } catch (e) { err(e); }
}
