/* ===================================================================
   ASSISTENTE DE IA — botão flutuante em todas as abas.
   Conversa com contexto do que está na tela (aba, tarefa aberta, próximas tarefas,
   atrasos, decisões, pesquisa). Propõe ações; só executa depois que um admin aprova.
   Usa os globais do app.js / pesquisa.js.
   =================================================================== */

const AI = { open: false, busy: false, task: null, msgs: [], prefill: "" };
const AI_KEY = () => "ff_chat_" + (ME ? ME.id : "anon");
const AI_QUICK = ["O que está atrasado e o que faço primeiro?", "O que a equipe precisa entregar esta semana?", "Qual a melhor opção para a live desta semana?", "O que a pesquisa diz sobre a mãe de R$ 3–5 mil?", "Crie as tarefas que faltam para a virada do Lote 2"];

/* ---------- contexto enviado à IA ---------- */
function aiContext() {
  const today = todayKey(); const in14 = (() => { const d = kd(today); d.setDate(d.getDate() + 14); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
  const all = sortedTasks();
  const row = t => ({ id: t.id, k: t.k, f: t.f, t: t.t, resp: ownerLabel(t), done: isDone(t.id), bloqueada_por: pendingDeps(t).map(d => TASKS[d].t).slice(0, 3) });
  const atrasadas = all.filter(t => !isDone(t.id) && t.k < today).map(row);
  const proximas = all.filter(t => !isDone(t.id) && t.k >= today && t.k <= in14).map(row).slice(0, 80);
  const recentes = all.filter(t => isDone(t.id) && STATUS[t.id].done_at && STATUS[t.id].done_at.slice(0, 10) >= (() => { const d = kd(today); d.setDate(d.getDate() - 3); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })()).map(t => ({ t: t.t, nota: (STATUS[t.id].note || "").slice(0, 200), atraso: STATUS[t.id].delivered_on > t.k ? STATUS[t.id].justification : "" })).slice(0, 30);
  const tarefa = AI.task && TASKS[AI.task] ? Object.assign(row(TASKS[AI.task]), { s: TASKS[AI.task].s, r: TASKS[AI.task].r, depends_on: TASKS[AI.task].depends_on, status: STATUS[AI.task] || null }) : null;
  const fase = phaseOfK(today);
  let pesquisa = null;
  try { if (typeof LEADS !== "undefined" && LEADS.length && typeof buildStats === "function") { const S = buildStats(typeof filteredLeads === "function" ? filteredLeads() : LEADS); pesquisa = { total: S.total, unicos: S.unicos, compradoras: S.compradoras, motivo: S.motivo, renda: S.renda, idade: S.idade, investimento: S.investimento, filhos: S.filhos, mediaFilhos: S.mediaFilhos, dores: S.dores, cruzamento: S.cruzamento, filtro: typeof PF !== "undefined" ? PF : null }; } } catch (e) { }
  const ia = C && C.pesquisaAI ? { resumo: C.pesquisaAI.resumo, dores: (C.pesquisaAI.dores || []).slice(0, 6).map(d => d.dor), temas_lives: (C.pesquisaAI.temas_lives || []).slice(0, 6).map(t => t.tema) } : null;
  return {
    hoje: today, tela: cur, fase: fase ? fase.n : "", dias_ate_imersao: Math.ceil((EVENT - kd(today)) / 86400000),
    usuario: { nome: ME.name, papel: ME.role },
    tarefa_aberta: tarefa, atrasadas, proximas_14_dias: proximas, concluidas_ultimos_3_dias: recentes,
    progresso: (() => { const p = progress(all); return `${p.d}/${p.n} (${p.p}%)`; })(),
    decisoes: DEC, lives_futuras: C ? (C.lives || []).filter(l => l.d >= today).slice(0, 8) : [],
    ingressos: C ? C.ingressos : null, pesquisa, analise_ia: ia,
    ids_de_tarefas_para_dependencias: all.filter(t => !isDone(t.id)).slice(0, 200).map(t => t.id)
  };
}

/* ---------- UI ---------- */
function aiMount() {
  if ($("#aiFab") || !ME || ME.role === "visualizador") return;
  const fab = document.createElement("button"); fab.id = "aiFab"; fab.title = "Conversar com a IA"; fab.innerHTML = `<span class="ico">✦</span><span class="lbl">IA</span>`; fab.onclick = () => aiToggle(); document.body.appendChild(fab);
  const p = document.createElement("div"); p.id = "aiPanel"; p.hidden = true; p.innerHTML = `
    <div class="aiHead"><div><b>Assistente do lançamento</b><small id="aiSub">contexto: aba atual</small></div><div class="row"><button class="ed" id="aiClear" title="Limpar conversa">limpar</button><button class="ed" id="aiClose" title="Fechar">✕</button></div></div>
    <div class="aiMsgs" id="aiMsgs"></div>
    <div class="aiQuick" id="aiQuick"></div>
    <form class="aiForm" id="aiForm"><textarea id="aiIn" rows="2" placeholder="Pergunte, peça uma opinião ou diga o que precisa ser criado…"></textarea><button class="btn" id="aiSend" type="submit">Enviar</button></form>`;
  document.body.appendChild(p);
  $("#aiClose").onclick = () => aiToggle(false);
  $("#aiClear").onclick = () => { if (confirm("Limpar a conversa?")) { AI.msgs = []; aiSave(); aiRender(); } };
  $("#aiForm").onsubmit = e => { e.preventDefault(); aiSend($("#aiIn").value); };
  $("#aiIn").onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); aiSend($("#aiIn").value); } };
  $("#aiMsgs").onclick = e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.act != null) aiApply(+b.dataset.msg, +b.dataset.act); if (b.dataset.actall != null) aiApplyAll(+b.dataset.actall); };
  $("#aiQuick").onclick = e => { const b = e.target.closest("button"); if (b) aiSend(b.textContent); };
  try { AI.msgs = JSON.parse(localStorage.getItem(AI_KEY()) || "[]"); } catch (e) { AI.msgs = []; }
  aiRender();
}
function aiToggle(force) {
  AI.open = force == null ? !AI.open : force; $("#aiPanel").hidden = !AI.open; $("#aiFab").classList.toggle("on", AI.open);
  if (AI.open) { aiSub(); if (AI.prefill) { $("#aiIn").value = AI.prefill; AI.prefill = ""; } $("#aiIn").focus(); const m = $("#aiMsgs"); m.scrollTop = m.scrollHeight; }
}
function aiSub() { const s = $("#aiSub"); if (!s) return; const tab = (TABS().find(([id]) => id === cur) || [])[1] || cur; s.textContent = `contexto: ${tab}${AI.task && TASKS[AI.task] ? " · tarefa: " + TASKS[AI.task].t.slice(0, 40) : ""}${isAdmin() ? " · pode propor ações" : " · só consulta"}`; }
function aiSave() { try { localStorage.setItem(AI_KEY(), JSON.stringify(AI.msgs.slice(-40))); } catch (e) { } }
const aiMd = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/^### (.+)$/gm, "<b>$1</b>").replace(/^## (.+)$/gm, "<b>$1</b>").replace(/^[-•] (.+)$/gm, "<li>$1</li>").replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`).replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
const ACT_LBL = { criar_tarefa: "Criar tarefa", alterar_tarefa: "Alterar tarefa", decisao: "Registrar decisão", registro: "Anotar no registro" };
function aiActionCard(a, mi, ai) {
  const F = { cont: "Conteúdo & Lives", traf: "Tráfego", copy: "Copy & E-mail", wa: "WhatsApp & ManyChat", tech: "Páginas & Ferramentas", ev: "Evento & Oferta" };
  let body = "";
  if (a.tipo === "criar_tarefa") body = `<b>${esc(a.k)} · ${esc(a.t)}</b><span class="s">${esc(a.s || "")}${a.r ? " — " + esc(a.r) : ""}</span><span class="s">${esc(F[a.f] || a.f)} · ${esc(a.owner_role || "")}${a.depends_on && a.depends_on.length ? " · depende de " + a.depends_on.map(d => TASKS[d] ? TASKS[d].t : d).map(esc).join(", ") : ""}</span>`;
  else if (a.tipo === "alterar_tarefa") { const t = TASKS[a.id]; body = `<b>${t ? esc(t.t) : esc(a.id)}</b><span class="s">${["k", "t", "s", "r", "owner_role", "f"].filter(k => a[k] != null && (!t || a[k] !== t[k])).map(k => `${k === "k" ? "data" : k === "t" ? "título" : k === "s" ? "detalhe" : k === "r" ? "por quê" : k === "f" ? "frente" : "responsável"}: ${esc(a[k])}`).join(" · ") || "sem mudanças"}</span>${t ? "" : `<span class="s" style="color:var(--bad)">tarefa não encontrada</span>`}`; }
  else if (a.tipo === "decisao") body = `<b>${esc(a.campo)}</b><span class="s">${esc(a.valor)}</span>`;
  else if (a.tipo === "registro") body = `<b>${esc(a.titulo || "Registro")}</b><span class="s">${esc(a.texto || "")}</span>`;
  else body = `<span class="s">${esc(JSON.stringify(a))}</span>`;
  return `<div class="aiAct ${a._done ? "done" : ""}"><span class="eyebrow">${ACT_LBL[a.tipo] || a.tipo}${a._done ? " · feito" : ""}</span>${body}${!a._done && isAdmin() ? `<button class="ed" data-msg="${mi}" data-act="${ai}">aprovar</button>` : ""}</div>`;
}
function aiRender() {
  const m = $("#aiMsgs"); if (!m) return;
  m.innerHTML = AI.msgs.length ? AI.msgs.map((x, i) => `<div class="aiMsg ${x.role}">${x.role === "assistant" ? aiMd(x.content) : esc(x.content)}${x.actions && x.actions.length ? `<div class="aiActs">${x.actions.map((a, j) => aiActionCard(a, i, j)).join("")}${x.actions.some(a => !a._done) && isAdmin() ? `<button class="btn ghost" data-actall="${i}" style="margin-top:6px">Aprovar todas</button>` : ""}</div>` : ""}</div>`).join("") + (AI.busy ? `<div class="aiMsg assistant typing">pensando…</div>` : "") : `<div class="aiMsg assistant">Oi, ${esc((ME.name || "").split(" ")[0])}. Eu vejo o que está na sua tela: a aba, a tarefa aberta, o que está atrasado, as decisões e a pesquisa. Pergunte qualquer coisa — ou peça para eu criar o que falta.</div>`;
  $("#aiQuick").innerHTML = AI.msgs.length ? "" : AI_QUICK.map(q => `<button class="chip">${esc(q)}</button>`).join("");
  m.scrollTop = m.scrollHeight;
}
async function aiSend(text) {
  text = (text || "").trim(); if (!text || AI.busy) return;
  $("#aiIn").value = ""; AI.msgs.push({ role: "user", content: text }); AI.busy = true; aiRender(); $("#aiSend").disabled = true;
  try {
    const { data: { session } } = await sb.auth.getSession();
    const r = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + session.access_token }, body: JSON.stringify({ messages: AI.msgs.filter(x => x.role !== "error").map(x => ({ role: x.role, content: x.content })), context: aiContext() }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "erro " + r.status);
    AI.msgs.push({ role: "assistant", content: j.text || "(sem resposta)", actions: j.actions || [] });
  } catch (e) { AI.msgs.push({ role: "assistant", content: "Não consegui responder: " + (e.message || e) }); }
  AI.busy = false; $("#aiSend").disabled = false; aiSave(); aiRender();
}

/* ---------- aplicar ações (só admin) ---------- */
async function aiApply(mi, ai) {
  const a = AI.msgs[mi] && AI.msgs[mi].actions && AI.msgs[mi].actions[ai]; if (!a || a._done || !isAdmin()) return;
  try {
    if (a.tipo === "criar_tarefa") {
      const id = "ai-" + Date.now().toString(36) + "-" + ai; const f = ["cont", "traf", "copy", "wa", "tech", "ev"].includes(a.f) ? a.f : "ev";
      const deps = (a.depends_on || []).filter(d => TASKS[d]);
      const { error } = await sb.from("tasks").insert({ id, k: a.k, f, t: a.t, s: a.s || "", r: a.r || "", owner_role: a.owner_role || null, depends_on: deps, created_by: ME.id, updated_at: new Date().toISOString() }); if (error) throw error;
      await log("task_create", "tarefa", id, a.t, { k: a.k, owner_role: a.owner_role, origem: "assistente IA" });
    } else if (a.tipo === "alterar_tarefa") {
      const t = TASKS[a.id]; if (!t) throw new Error("Tarefa não encontrada: " + a.id);
      const patch = {}; ["k", "t", "s", "r", "owner_role", "f"].forEach(k => { if (a[k] != null && a[k] !== t[k]) patch[k] = a[k]; });
      if (!Object.keys(patch).length) throw new Error("Nada para alterar");
      const { error } = await sb.from("tasks").update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq("id", a.id); if (error) throw error;
      await log("task_update", "tarefa", a.id, t.t, { campos: Object.keys(patch), antes: Object.fromEntries(Object.keys(patch).map(k => [k, t[k]])), depois: patch, origem: "assistente IA" });
    } else if (a.tipo === "decisao") {
      const o = Object.assign({}, DEC, { [a.campo]: a.valor });
      const { error } = await sb.from("decisions").upsert({ id: "main", data: o, updated_at: new Date().toISOString(), updated_by: ME.id }); if (error) throw error;
      DEC = o; await log("decisions_save", "decisoes", "main", "Decisões estruturais", { alteradas: [`${a.campo}: ${a.valor}`], origem: "assistente IA" });
    } else if (a.tipo === "registro") {
      await log("note", "assistente", "", a.titulo || "Registro do assistente", { note: a.texto || "" });
    } else throw new Error("Ação desconhecida: " + a.tipo);
    a._done = true; aiSave(); aiRender(); toast(ACT_LBL[a.tipo] + ": feito"); scheduleRefresh();
  } catch (e) { err(e); }
}
async function aiApplyAll(mi) { const acts = (AI.msgs[mi] || {}).actions || []; for (let i = 0; i < acts.length; i++) if (!acts[i]._done) await aiApply(mi, i); }

/* ---------- ganchos no app ---------- */
(function hook() {
  const _openTask = openTask, _openDone = openDone, _closeModal = closeModal, _renderTabs = renderTabs, _enter = enter;
  const addBtn = (id, label) => { const h = document.querySelector("#modal .md h3"); if (!h || !TASKS[id]) return; const b = document.createElement("button"); b.className = "ed aiAsk"; b.textContent = "✦ Perguntar à IA sobre esta tarefa"; b.onclick = () => { AI.task = id; AI.prefill = `Sobre a tarefa "${TASKS[id].t}" (${fmtK(TASKS[id].k)}): ${label}`; aiToggle(true); }; h.insertAdjacentElement("afterend", b); };
  openTask = function (id, k) { AI.task = id || null; const r = _openTask(id, k); if (id) addBtn(id, "como executo isso da melhor forma e o que não pode faltar?"); aiSub(); return r; };
  openDone = function (id, cb) { AI.task = id; const r = _openDone(id, cb); addBtn(id, "o que eu devo registrar como entregue e o que muda para quem depende dela?"); aiSub(); return r; };
  closeModal = function () { _closeModal(); AI.task = null; aiSub(); };
  renderTabs = function () { _renderTabs(); aiSub(); };
  enter = async function (s) { await _enter(s); aiMount(); };
  if (ME) aiMount();
})();
