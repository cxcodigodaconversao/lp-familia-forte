/* ===================================================================
   Família Forte PPV — app com Supabase (login, papéis, tarefas interligadas,
   justificativa de atraso, registro de tudo e gestão de usuários)
   =================================================================== */
const EVENT = new Date(2026, 10, 7);
const FRONTS = {
  cont: { n: "Conteúdo & Lives", c: "var(--f1)" },
  traf: { n: "Tráfego", c: "var(--f2)" },
  copy: { n: "Copy & E-mail", c: "var(--f3)" },
  wa: { n: "WhatsApp API", c: "var(--f4)" },
  tech: { n: "Páginas & Ferramentas", c: "var(--f5)" },
  ev: { n: "Evento & Oferta", c: "var(--f6)" }
};
const ROLES = { admin: "Administrador", gestor_projetos: "Gestor de projetos", gestor_trafego: "Gestor de tráfego", copywriter: "Copywriter", expert: "Expert (Paula)", operacao: "Operação / WhatsApp", visualizador: "Visualizador" };
const PHASES = [
  { id: "prep", n: "Preparação", d: "28/09 → 04/10", from: "2026-09-28", to: "2026-10-04", c: "var(--f5)", goal: "Semana 28/09 → 04/10: páginas, checkout do ingresso, API oficial aprovada, criativos e programação — tudo pronto antes da captação abrir em 05/10." },
  { id: "ato1", n: "Ato 1 — O espelho", d: "05/10 → 14/10", from: "2026-10-05", to: "2026-10-14", c: "var(--f1)", goal: "Reconhecimento: “Ela está falando da minha casa.” Lote 1 do ingresso aberto (R$ 27,90)." },
  { id: "ato2", n: "Ato 2 — A descoberta", d: "15/10 → 25/10", from: "2026-10-15", to: "2026-10-25", c: "var(--f3)", goal: "Quebra de crença: “Talvez eu esteja resolvendo do jeito errado.” Virada para o Lote 2." },
  { id: "ato3", n: "Ato 3 — O futuro possível", d: "26/10 → 06/11", from: "2026-10-26", to: "2026-11-06", c: "var(--f2)", goal: "Esperança concreta: provas, antes/depois. Convite intensifica. Lote 3 e última chamada." },
  { id: "ato4", n: "Ato 4 — Imersão + Oferta", d: "07/11 → 13/11", from: "2026-11-07", to: "2026-11-13", c: "var(--f6)", goal: "Dois dias que organizam tudo → Família Forte 2.0 vitalício (Black Friday antecipada) → fechamento e debrief." }
];
const DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const pad = n => String(n).padStart(2, "0");
const kd = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtK = k => k ? `${k.slice(8, 10)}/${k.slice(5, 7)}` : "";
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const $ = s => document.querySelector(s);
const fmtDT = iso => iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
function toast(m, bad) { const t = document.createElement("div"); t.className = "toast"; if (bad) t.style.background = "var(--bad)", t.style.color = "#fff"; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), bad ? 4000 : 1800); }

/* ---------------- estado ---------------- */
let sb = null, ME = null, PROFILES = [], TASKS = {}, STATUS = {}, C = null, DEC = {}, LOGS = [];
const isAdmin = () => ME && ME.role === "admin";
const isViewer = () => !ME || ME.role === "visualizador";
const profName = id => (PROFILES.find(p => p.id === id) || {}).name || "—";
const roleName = r => ROLES[r] || r || "—";
const ownerLabel = t => t.owner_id ? profName(t.owner_id) : roleName(t.owner_role);
const canWork = t => isAdmin() || (!isViewer() && (t.owner_id === ME.id || (!t.owner_id && t.owner_role === ME.role)));
const isDone = id => !!(STATUS[id] && STATUS[id].done);
const pendingDeps = t => (t.depends_on || []).filter(d => TASKS[d] && !isDone(d));
const sortedTasks = () => Object.values(TASKS).sort((a, b) => a.k < b.k ? -1 : a.k > b.k ? 1 : a.t.localeCompare(b.t));
const progress = list => { const n = list.length, d = list.filter(t => isDone(t.id)).length; return { n, d, p: n ? Math.round(d / n * 100) : 0 }; };
const phaseOfK = k => PHASES.find(p => k >= p.from && k <= p.to);

/* ---------------- registro (log) ---------------- */
async function log(action, entity, entity_id, title, detail) {
  try { await sb.from("logs").insert({ user_id: ME.id, user_name: ME.name, action, entity, entity_id: String(entity_id || ""), title: title || "", detail: detail || {} }); } catch (e) { }
}

/* ---------------- login ---------------- */
async function boot() {
  const cfg = window.PPV_CONFIG || {};
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("SEU-PROJETO")) { $("#loginErr").textContent = "Configure o arquivo config.js com a URL e a chave anon do Supabase."; return; }
  sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  $("#loginForm").onsubmit = async e => {
    e.preventDefault(); $("#loginErr").textContent = ""; $("#loginBtn").disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value });
    $("#loginBtn").disabled = false;
    if (error) { $("#loginErr").textContent = /Invalid login/i.test(error.message) ? "E-mail ou senha incorretos." : error.message; return; }
  };
  $("#logout").onclick = async () => { await log("logout", "sessao", ME.id, "saiu"); await sb.auth.signOut(); location.reload(); };
  sb.auth.onAuthStateChange((ev, session) => { if (session && !ME) enter(session); });
  const { data: { session } } = await sb.auth.getSession();
  if (session) enter(session);
}

async function enter(session) {
  const { data: prof, error } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
  if (error || !prof) { $("#loginErr").textContent = "Perfil não encontrado. Peça ao administrador para rodar o schema.sql e liberar seu acesso."; await sb.auth.signOut(); return; }
  if (!prof.active) { $("#loginErr").textContent = "Usuário desativado."; await sb.auth.signOut(); return; }
  ME = prof;
  $("#login").hidden = true; $("#app").hidden = false;
  $("#meName").textContent = ME.name || ME.email; $("#meRole").textContent = roleName(ME.role);
  await log("login", "sessao", ME.id, "entrou");
  await loadAll();
  renderTabs(); renderAll(); showTab();
  subscribe();
}

/* ---------------- dados ---------------- */
async function loadAll() {
  const [p, t, s, c, d, l] = await Promise.all([
    sb.from("profiles").select("id,email,name,role,active").order("name"),
    sb.from("tasks").select("*"),
    sb.from("task_status").select("*"),
    sb.from("content").select("*").eq("id", "main").maybeSingle(),
    sb.from("decisions").select("*").eq("id", "main").maybeSingle(),
    sb.from("logs").select("*").order("at", { ascending: false }).limit(500)
  ]);
  PROFILES = p.data || [];
  TASKS = {}; (t.data || []).forEach(r => TASKS[r.id] = r);
  STATUS = {}; (s.data || []).forEach(r => STATUS[r.task_id] = r);
  C = c.data && c.data.data && Object.keys(c.data.data).length ? c.data.data : null;
  DEC = d.data ? d.data.data || {} : {};
  LOGS = l.data || [];
  setSync(true, "Conectado");
}
let refreshTimer = null;
function scheduleRefresh() { clearTimeout(refreshTimer); refreshTimer = setTimeout(async () => { await loadAll(); renderAll(); }, 400); }
function subscribe() {
  sb.channel("ppv").on("postgres_changes", { event: "*", schema: "public" }, () => scheduleRefresh()).subscribe(st => setSync(st === "SUBSCRIBED", st === "SUBSCRIBED" ? "Tempo real ativo" : "Conectado"));
  setInterval(() => { if (!document.hidden) scheduleRefresh(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) scheduleRefresh(); });
}
function setSync(on, txt) { $("#sync").classList.toggle("on", on); $("#syncTxt").textContent = txt; }
function err(e) { const m = (e && (e.message || e.error_description)) || String(e); toast(m.replace(/^.*?exception:?\s*/i, ""), true); console.error(e); }

/* ---------------- ações de tarefa ---------------- */
async function saveStatus(id, patch) {
  const cur = STATUS[id] || { task_id: id, done: false, note: "", justification: "" };
  const row = Object.assign({}, cur, patch, { task_id: id });
  delete row.updated_at;
  const { error } = await sb.from("task_status").upsert(row);
  if (error) throw error;
}

/* ---------------- modal ---------------- */
function modal(html, onOpen) { $("#modal").innerHTML = `<div class="ov" id="ov"><div class="md" role="dialog" aria-modal="true">${html}</div></div>`; $("#ov").addEventListener("click", e => { if (e.target.id === "ov") closeModal(); }); if (onOpen) onOpen(); const f = $("#modal").querySelector("input,textarea,select"); if (f) f.focus(); }
function closeModal() { $("#modal").innerHTML = ""; }
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

/* ---------------- seções editáveis ---------------- */
const SEC = {
  lives: { t: "Programação de lives", f: ["data (AAAA-MM-DD)", "hora", "tema", "ato (ato1/ato2/ato3)", "CTA"], get: () => C.lives.map(l => [l.d, l.h, l.tema, l.ato, l.cta]), set: r => C.lives = r.map(x => ({ d: x[0], h: x[1], tema: x[2], ato: x[3], cta: x[4] })) },
  "funil.topo": { t: "Funil — Topo", f: ["canal/formato", "o que é", "objetivo", "métrica"], get: () => C.funil.topo, set: r => C.funil.topo = r },
  "funil.meio": { t: "Funil — Meio", f: ["canal/formato", "o que é", "objetivo", "métrica"], get: () => C.funil.meio, set: r => C.funil.meio = r },
  "funil.fundo": { t: "Funil — Fundo", f: ["canal/formato", "o que é", "objetivo", "métrica"], get: () => C.funil.fundo, set: r => C.funil.fundo = r },
  wa: { t: "Régua WhatsApp (API)", f: ["gatilho/data", "hora", "mensagem", "conteúdo", "tipo"], get: () => C.wa, set: r => C.wa = r },
  waRules: { t: "Regras da API", f: ["regra", "observação"], get: () => C.waRules, set: r => C.waRules = r },
  em: { t: "Régua de e-mail", f: ["data", "e-mail", "observação"], get: () => C.em, set: r => C.em = r },
  trafCards: { t: "Campanhas de tráfego", f: ["título", "descrição", "período/observação"], get: () => C.trafCards, set: r => C.trafCards = r },
  trafMeta: { t: "Rotina Meta", f: ["item"], get: () => C.trafMeta.map(x => [x]), set: r => C.trafMeta = r.map(x => x[0]) },
  trafGoogle: { t: "Rotina Google", f: ["item"], get: () => C.trafGoogle.map(x => [x]), set: r => C.trafGoogle = r.map(x => x[0]) },
  d1: { t: "Imersão — Dia 1", f: ["bloco", "conteúdo"], get: () => C.d1, set: r => C.d1 = r },
  d2: { t: "Imersão — Dia 2", f: ["bloco", "conteúdo"], get: () => C.d2, set: r => C.d2 = r },
  ingressos: { t: "Ingresso — lotes", f: ["item", "detalhe"], get: () => C.ingressos, set: r => C.ingressos = r },
  ofertaFF: { t: "Oferta Família Forte 2.0", f: ["item", "detalhe"], get: () => C.ofertaFF, set: r => C.ofertaFF = r },
  tensao: { t: "Tensão dramática", f: ["frase", "explicação"], get: () => [C.tensao], set: r => C.tensao = r[0] || ["", ""] },
  conclusoes: { t: "As 4 conclusões", f: ["frase", "etapa"], get: () => C.conclusoes, set: r => C.conclusoes = r },
  linguagem: { t: "Linguagem zero técnica", f: ["fundamento", "como a mãe fala"], get: () => C.linguagem, set: r => C.linguagem = r },
  frases: { t: "Frases-mãe", f: ["frase"], get: () => C.frases.map(x => [x]), set: r => C.frases = r.map(x => x[0]) },
  obj: { t: "Objeções", f: ["objeção", "resposta"], get: () => C.obj, set: r => C.obj = r },
  nao: { t: "O que NÃO fazer", f: ["item"], get: () => C.nao.map(x => [x]), set: r => C.nao = r.map(x => x[0]) },
  canais: { t: "Função de cada canal", f: ["canal", "função"], get: () => C.canais, set: r => C.canais = r },
  marks: { t: "Marcos do calendário", f: ["data (AAAA-MM-DD)", "marco"], get: () => Object.entries(C.marks), set: r => { C.marks = {}; r.forEach(x => { if (x[0]) C.marks[x[0]] = x[1]; }); } }
};
const editBtn = (sec, label) => isAdmin() ? `<button class="ed corner" data-sec="${sec}" title="Editar seção">✎ ${label || "Editar"}</button>` : "";
async function saveContent(secId) {
  const { error } = await sb.from("content").upsert({ id: "main", v: window.PPV_SEED.CONTENT_V, data: C, updated_at: new Date().toISOString(), updated_by: ME.id });
  if (error) throw error;
  await log("section_edit", "secao", secId, (SEC[secId] || {}).t || secId, {});
}
function openSec(id) {
  const s = SEC[id]; const txt = s.get().map(r => r.map(x => String(x == null ? "" : x)).join(" | ")).join("\n");
  modal(`<h3>${s.t}</h3><p class="hint">Uma linha por item. Campos separados por <b>|</b> na ordem: ${s.f.join(" | ")}. Apague uma linha para remover, adicione linhas para incluir.</p><div class="field"><textarea id="secTxt">${esc(txt)}</textarea></div><div class="row"><button class="btn" id="secSave">Salvar</button><button class="btn ghost" id="secCancel">Cancelar</button><button class="btn ghost" id="secReset" style="margin-left:auto">Restaurar padrão</button></div>`, () => {
    $("#secCancel").onclick = closeModal;
    $("#secReset").onclick = async () => { const tmp = C; C = JSON.parse(JSON.stringify(window.PPV_SEED.content)); const rows = s.get(); C = tmp; s.set(rows); try { await saveContent(id); closeModal(); renderAll(); toast("Seção restaurada"); } catch (e) { err(e); } };
    $("#secSave").onclick = async () => { const rows = $("#secTxt").value.split("\n").map(l => l.trim()).filter(Boolean).map(l => { const p = l.split("|").map(x => x.trim()); while (p.length < s.f.length) p.push(""); return p; }); s.set(rows); try { await saveContent(id); closeModal(); renderAll(); toast("Salvo para a equipe"); } catch (e) { err(e); } };
  });
}

/* ---------------- tarefa: criar/editar (admin) ---------------- */
function openTask(id, presetK) {
  const t = id ? TASKS[id] : { id: "n" + Date.now().toString(36), k: presetK || todayKey(), f: "ev", t: "", s: "", r: "", owner_role: "gestor_projetos", owner_id: null, depends_on: [] };
  const others = sortedTasks().filter(x => x.id !== t.id);
  modal(`<h3>${id ? "Editar tarefa" : "Nova tarefa"}</h3>
    <div class="grid g2"><div class="field"><label for="tk">Data prevista</label><input id="tk" type="date" value="${t.k}"></div><div class="field"><label for="tf">Frente</label><select id="tf">${Object.entries(FRONTS).map(([k, f]) => `<option value="${k}" ${t.f === k ? "selected" : ""}>${f.n}</option>`).join("")}</select></div></div>
    <div class="grid g2"><div class="field"><label for="tor">Papel responsável</label><select id="tor">${Object.entries(ROLES).filter(([k]) => k !== "visualizador").map(([k, n]) => `<option value="${k}" ${t.owner_role === k ? "selected" : ""}>${n}</option>`).join("")}</select></div><div class="field"><label for="toi">Pessoa específica (opcional)</label><select id="toi"><option value="">— qualquer pessoa do papel —</option>${PROFILES.filter(p => p.active && p.role !== "visualizador").map(p => `<option value="${p.id}" ${t.owner_id === p.id ? "selected" : ""}>${esc(p.name)} · ${roleName(p.role)}</option>`).join("")}</select></div></div>
    <div class="field"><label for="tt">Tarefa</label><input id="tt" value="${esc(t.t)}"></div>
    <div class="field"><label for="ts">Detalhe</label><textarea id="ts" style="min-height:70px;font-family:var(--body)">${esc(t.s)}</textarea></div>
    <div class="field"><label for="tr">Regra / por quê (dourado)</label><input id="tr" value="${esc(t.r)}"></div>
    <div class="field"><label for="td">Depende de (segure Ctrl/Cmd para escolher várias)</label><select id="td" multiple>${others.map(o => `<option value="${o.id}" ${(t.depends_on || []).includes(o.id) ? "selected" : ""}>${fmtK(o.k)} · ${esc(o.t)}</option>`).join("")}</select></div>
    <div class="row"><button class="btn" id="tSave">Salvar</button><button class="btn ghost" id="tCancel">Cancelar</button>${id ? `<button class="btn danger" id="tDel" style="margin-left:auto">Excluir</button>` : ""}</div>`, () => {
    $("#tCancel").onclick = closeModal;
    if (id) $("#tDel").onclick = async () => { if (!confirm("Excluir esta tarefa? Isso apaga também o status dela.")) return; const { error } = await sb.from("tasks").delete().eq("id", id); if (error) return err(error); await log("task_delete", "tarefa", id, t.t, {}); closeModal(); scheduleRefresh(); };
    $("#tSave").onclick = async () => {
      const nt = { id: t.id, k: $("#tk").value || t.k, f: $("#tf").value, t: $("#tt").value.trim(), s: $("#ts").value.trim(), r: $("#tr").value.trim(), owner_role: $("#tor").value, owner_id: $("#toi").value || null, depends_on: Array.from($("#td").selectedOptions).map(o => o.value), updated_at: new Date().toISOString() };
      if (!nt.t) return; if (!id) nt.created_by = ME.id;
      const { error } = await sb.from("tasks").upsert(nt); if (error) return err(error);
      const changed = id ? Object.keys(nt).filter(k => k !== "updated_at" && JSON.stringify(nt[k]) !== JSON.stringify(t[k])) : [];
      await log(id ? "task_update" : "task_create", "tarefa", nt.id, nt.t, id ? { campos: changed, antes: Object.fromEntries(changed.map(k => [k, t[k]])), depois: Object.fromEntries(changed.map(k => [k, nt[k]])) } : { k: nt.k, owner_role: nt.owner_role });
      closeModal(); scheduleRefresh(); toast("Tarefa salva");
    };
  });
}

/* ---------------- tarefa: concluir ---------------- */
function openDone(id, cb) {
  const t = TASKS[id]; const st = STATUS[id] || {}; const deps = pendingDeps(t); const tk = todayKey();
  if (deps.length && !isAdmin()) { cb.checked = false; return modal(`<h3>Tarefa bloqueada</h3><p>Ela depende de tarefas que ainda não foram concluídas:</p><ul class="plain">${deps.map(d => `<li><b>${esc(TASKS[d].t)}</b><span class="s">${fmtK(TASKS[d].k)} · ${esc(ownerLabel(TASKS[d]))}</span></li>`).join("")}</ul><p class="hint">Fale com o responsável — o processo só anda quando a etapa anterior é entregue.</p><div class="row"><button class="btn ghost" id="bOk">Entendi</button></div>`, () => { $("#bOk").onclick = closeModal; }); }
  modal(`<h3>Concluir: ${esc(t.t)}</h3><p class="hint">Previsto para ${fmtK(t.k)} · responsável: ${esc(ownerLabel(t))}${deps.length ? ` · <span style="color:var(--warn)">como administrador você pode concluir mesmo com ${deps.length} dependência(s) pendente(s)</span>` : ""}</p>
    <div class="field"><label for="dn">O que foi decidido / feito</label><textarea id="dn" style="min-height:110px;font-family:var(--body)" placeholder="ex.: Lote 2 fechado em R$ 47, vira dia 15/10 às 00h. Checkout já atualizado.">${esc(st.note || "")}</textarea></div>
    <div class="field"><label for="dd">Data da entrega</label><input id="dd" type="date" value="${st.delivered_on || tk}"></div>
    <div class="field" id="justWrap" ${(st.delivered_on || tk) > t.k ? "" : "hidden"}><label for="dj" style="color:var(--bad)">Justificativa do atraso (obrigatória)</label><textarea id="dj" style="min-height:80px;font-family:var(--body)" placeholder="O que aconteceu e o que muda para quem depende desta entrega.">${esc(st.justification || "")}</textarea></div>
    <div class="row"><button class="btn" id="dSave">Concluir e registrar</button><button class="btn ghost" id="dCancel">Cancelar</button></div>`, () => {
    $("#dd").onchange = () => { $("#justWrap").hidden = !($("#dd").value > t.k); };
    $("#dCancel").onclick = () => { closeModal(); cb.checked = !!st.done; };
    $("#dSave").onclick = async () => {
      const delivered_on = $("#dd").value || tk, late = delivered_on > t.k, justification = late ? $("#dj").value.trim() : "";
      if (late && justification.length < 5) { toast("Escreva a justificativa do atraso.", true); return; }
      try {
        await saveStatus(id, { done: true, done_at: new Date().toISOString(), done_by: ME.id, delivered_on, note: $("#dn").value.trim(), justification });
        await log("task_done", "tarefa", id, t.t, { note: $("#dn").value.trim(), delivered_on, late, justification, previsto: t.k });
        closeModal(); scheduleRefresh(); toast("Registrado");
      } catch (e) { cb.checked = false; err(e); }
    };
  });
}
async function undoTask(id, cb) {
  const t = TASKS[id];
  if (!confirm(`Reabrir "${t.t}"? Tarefas que dependem dela voltam a ficar bloqueadas.`)) { cb.checked = true; return; }
  try { await saveStatus(id, { done: false, done_at: null, done_by: null }); await log("task_undone", "tarefa", id, t.t, {}); scheduleRefresh(); } catch (e) { cb.checked = true; err(e); }
}

/* ---------------- render ---------------- */
function TABS() { const t = [["visao", "Visão geral"], ["cronograma", "Cronograma"], ["funil", "Funil & Lives"], ["reguas", "Réguas"], ["trafego", "Tráfego"], ["imersao", "Imersão & Oferta"], ["narrativa", "Narrativa"], ["decisoes", "Decisões"], ["registro", "Registro"]]; if (isAdmin()) t.push(["config", "Configurações"]); return t; }
let cur = lsGet("ff_tab") || "visao";
function renderTabs() { if (!TABS().some(([id]) => id === cur)) cur = "visao"; $("#tabs").innerHTML = TABS().map(([id, n]) => `<button role="tab" aria-selected="${cur === id}" data-t="${id}">${n}</button>`).join(""); $("#tabs").onclick = e => { const b = e.target.closest("button"); if (!b) return; cur = b.dataset.t; lsSet("ff_tab", cur); renderTabs(); showTab(); }; }
function showTab() { ["visao", "cronograma", "funil", "reguas", "trafego", "imersao", "narrativa", "decisoes", "registro", "config"].forEach(id => { $("#v-" + id).hidden = cur !== id; }); window.scrollTo({ top: 0 }); }

function taskRow(t) {
  const f = FRONTS[t.f] || FRONTS.ev, st = STATUS[t.id] || {}, done = !!st.done, deps = pendingDeps(t), work = canWork(t), late = done && st.delivered_on && st.delivered_on > t.k;
  const mine = ME && (t.owner_id === ME.id || (!t.owner_id && t.owner_role === ME.role));
  return `<div class="task ${done ? "done" : ""} ${deps.length && !done ? "blocked" : ""}" style="--c:${f.c}">
    <input type="checkbox" data-id="${t.id}" ${done ? "checked" : ""} ${work ? "" : "disabled"} aria-label="Concluir">
    <span class="stripe"></span>
    <label><span class="t">${esc(t.t)}</span>${t.s ? `<div class="s">${esc(t.s)}</div>` : ""}
      <div class="who">${f.n} · ${esc(ownerLabel(t))}${mine && !isAdmin() ? " · SUA" : ""}${t.k !== todayKey() ? " · " + fmtK(t.k) : ""}</div>
      ${t.r ? `<div class="rule">${esc(t.r)}</div>` : ""}
      ${(t.depends_on || []).length ? `<div class="deps">Depende de: ${t.depends_on.filter(d => TASKS[d]).map(d => `<b style="${isDone(d) ? "color:var(--ok)" : "color:var(--warn)"}">${isDone(d) ? "✓" : "○"} ${esc(TASKS[d].t)}</b>`).join(" · ")}</div>` : ""}
      ${deps.length && !done ? `<div class="lock">🔒 Bloqueada — aguardando ${deps.length} entrega(s) de ${[...new Set(deps.map(d => ownerLabel(TASKS[d])))].join(", ")}</div>` : ""}
      ${done ? `<div class="note"><b>${esc(profName(st.done_by))} · entregue ${fmtK(st.delivered_on)}${late ? ` <span class="late">(previsto ${fmtK(t.k)} — atraso)</span>` : ""}:</b> ${st.note ? esc(st.note) : "<i>sem anotação</i>"}${st.justification ? `<div style="margin-top:4px"><b style="color:var(--bad)">Justificativa:</b> ${esc(st.justification)}</div>` : ""}</div>` : ""}
    </label>
    ${isAdmin() ? `<button class="ed" data-edit="${t.id}">✎</button>` : ""}</div>`;
}

function renderVisao() {
  const all = Object.values(TASKS), pr = progress(all), tk = todayKey();
  const days = Math.ceil((EVENT - new Date(new Date().setHours(0, 0, 0, 0))) / 864e5); $("#cd").textContent = days >= 0 ? days : 0;
  const ph = phaseOfK(tk); const late = sortedTasks().filter(t => t.k < tk && !isDone(t.id)); const todays = sortedTasks().filter(t => t.k === tk);
  const mine = sortedTasks().filter(t => !isDone(t.id) && !isAdmin() && (t.owner_id === ME.id || (!t.owner_id && t.owner_role === ME.role)));
  const blockedMine = mine.filter(t => pendingDeps(t).length);
  $("#v-visao").innerHTML = `
    <h2>Uma família forte não acontece por acaso.</h2>
    <p class="lead">Preparação (28/09 → 04/10) → aquecimento (05/10 → 06/11) → imersão online paga (07 e 08/11) → Família Forte 2.0 vitalício na Black Friday antecipada.</p>
    ${!all.length && isAdmin() ? `<div class="banner"><b>O cronograma ainda está vazio.</b><span class="status">Importe o cronograma padrão em Configurações para começar.</span><button class="btn" id="goConfig">Ir para Configurações</button></div>` : ""}
    <div class="grid g4 mt">
      <div class="card kpi"><div class="v">${pr.p}%</div><div class="k">${pr.d} de ${pr.n} tarefas concluídas</div></div>
      <div class="card kpi"><div class="v">${ph ? ph.n.split(" — ")[0] : "—"}</div><div class="k">Fase atual · ${ph ? ph.d : "fora do calendário"}</div></div>
      <div class="card kpi"><div class="v" style="color:${late.length ? "var(--bad)" : "var(--ok)"}">${late.length}</div><div class="k">Tarefas atrasadas</div></div>
      <div class="card kpi"><div class="v">${todays.length}</div><div class="k">Tarefas de hoje (${fmtK(tk)})</div></div>
    </div>
    ${!isAdmin() && !isViewer() ? `<div class="card mt2 soft"><span class="eyebrow">Suas próximas tarefas (${roleName(ME.role)})</span>${mine.length ? mine.slice(0, 8).map(taskRow).join("") : '<p class="status" style="margin-top:8px">Nada pendente para você.</p>'}${blockedMine.length ? `<p class="status" style="padding:10px 16px">${blockedMine.length} delas estão bloqueadas aguardando outra pessoa.</p>` : ""}</div>` : ""}
    <div class="mt2"><span class="eyebrow">Linha do tempo</span>
      <div class="tl">${PHASES.map(p => { const x = progress(all.filter(t => t.k >= p.from && t.k <= p.to)); return `<div class="ph ${ph && ph.id === p.id ? "now" : ""}" style="--c:${p.c}"><b>${p.n}</b><span class="d">${p.d}</span><p>${p.goal}</p><span class="pg">${x.d}/${x.n} · ${x.p}%</span><div class="bar"><i style="width:${x.p}%"></i></div></div>`; }).join("")}</div>
    </div>
    <div class="grid g2 mt2">
      <div class="card soft"><span class="eyebrow">Progresso por frente</span>${Object.entries(FRONTS).map(([id, f]) => { const x = progress(all.filter(t => t.f === id)); return `<div style="margin-top:12px"><div class="row" style="justify-content:space-between"><span class="chip"><i class="dot" style="background:${f.c}"></i>${f.n}</span><span class="status">${x.d}/${x.n}</span></div><div class="bar" style="margin-top:6px"><i style="width:${x.p}%;background:${f.c}"></i></div></div>`; }).join("")}</div>
      <div class="card soft"><span class="eyebrow">Progresso por pessoa</span>${PROFILES.filter(p => p.active && p.role !== "visualizador").map(p => { const list = all.filter(t => t.owner_id === p.id || (!t.owner_id && t.owner_role === p.role)); const x = progress(list); const l8 = list.filter(t => t.k < tk && !isDone(t.id)).length; return `<div style="margin-top:12px"><div class="row" style="justify-content:space-between"><span><b>${esc(p.name)}</b> <span class="status">· ${roleName(p.role)}</span></span><span class="status">${x.d}/${x.n}${l8 ? ` · <span style="color:var(--bad)">${l8} atrasada(s)</span>` : ""}</span></div><div class="bar" style="margin-top:6px"><i style="width:${x.p}%"></i></div></div>`; }).join("") || '<p class="status" style="margin-top:8px">Cadastre a equipe em Configurações.</p>'}</div>
    </div>
    ${late.length ? `<div class="card mt2" style="border-color:var(--bad)"><span class="eyebrow" style="color:var(--bad)">Atrasadas</span>${late.slice(0, 8).map(taskRow).join("")}${late.length > 8 ? `<p class="status" style="padding:10px 16px">+ ${late.length - 8} no cronograma</p>` : ""}</div>` : ""}
    <div class="card mt2 soft"><span class="eyebrow">Hoje · ${DOW[kd(tk).getDay()]} ${fmtK(tk)}</span>${todays.length ? todays.map(taskRow).join("") : '<p class="status" style="margin-top:8px">Nada marcado para hoje.</p>'}${isAdmin() ? `<div class="addrow"><button class="sbtn" data-add="${tk}">+ tarefa para hoje</button></div>` : ""}</div>`;
  const g = $("#goConfig"); if (g) g.onclick = () => { cur = "config"; lsSet("ff_tab", cur); renderTabs(); showTab(); };
}

let filt = lsGet("ff_filt") || { f: "all", only: false, mine: false };
function renderCron() {
  const tk = todayKey();
  const list = sortedTasks().filter(t => (filt.f === "all" || t.f === filt.f) && (!filt.only || !isDone(t.id)) && (!filt.mine || t.owner_id === ME.id || (!t.owner_id && t.owner_role === ME.role)));
  const byDay = {}; list.forEach(t => { (byDay[t.k] = byDay[t.k] || []).push(t); }); if (C) Object.keys(C.marks || {}).forEach(k => { if (!byDay[k] && filt.f === "all" && !filt.only && !filt.mine) byDay[k] = []; });
  const keys = Object.keys(byDay).sort();
  $("#v-cronograma").innerHTML = `
    <h2>Cronograma dia a dia</h2>
    <p class="lead">De 28/09 a 13/11. Cada tarefa tem um responsável e pode depender de outras: enquanto a etapa anterior não é entregue, a próxima fica bloqueada. Ao concluir, registre o que foi feito; se entregar depois da data, a justificativa é obrigatória.</p>
    <div class="filters"><button data-f="all" aria-pressed="${filt.f === "all"}">Todas as frentes</button>${Object.entries(FRONTS).map(([id, f]) => `<button data-f="${id}" aria-pressed="${filt.f === id}"><i class="dot" style="background:${f.c}"></i>${f.n}</button>`).join("")}<button data-only="1" aria-pressed="${filt.only}">Só pendentes</button>${!isViewer() && !isAdmin() ? `<button data-mine="1" aria-pressed="${filt.mine}">Só as minhas</button>` : ""}<button data-go="today">Ir para hoje</button>${isAdmin() ? `<button data-addany="1">+ Nova tarefa</button><button data-sec="marks">✎ Marcos</button>` : ""}</div>
    ${keys.map(k => { const d = kd(k), ph = phaseOfK(k), pr = progress(byDay[k]); return `<div class="day ${k === tk ? "today" : ""}" id="d-${k}"><header><b>${DOW[d.getDay()]} · ${fmtK(k)}</b>${ph ? `<span class="ph-tag" style="color:${ph.c}">${ph.n}</span>` : ""}${C && C.marks && C.marks[k] ? `<span class="mark">★ ${esc(C.marks[k])}</span>` : ""}<span class="pg">${pr.d}/${pr.n}</span></header>${byDay[k].map(taskRow).join("")}${isAdmin() ? `<div class="addrow"><button class="sbtn" data-add="${k}">+ tarefa em ${fmtK(k)}</button></div>` : ""}</div>`; }).join("") || '<p class="status mt">Nenhuma tarefa.</p>'}`;
  $("#v-cronograma .filters").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.f) filt.f = b.dataset.f; else if (b.dataset.only) filt.only = !filt.only; else if (b.dataset.mine) filt.mine = !filt.mine;
    else if (b.dataset.go) { const el = document.getElementById("d-" + tk) || document.querySelector(".day"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    else if (b.dataset.addany) { openTask(null); return; } else if (b.dataset.sec) { openSec(b.dataset.sec); return; }
    lsSet("ff_filt", filt); renderCron();
  };
}

function renderFunil() {
  if (!C) { $("#v-funil").innerHTML = emptyC(); return; }
  const col = (id, title, sub, c, rows) => `<div class="card" style="--c:${c}">${editBtn("funil." + id)}<span class="sub">${sub}</span><h3>${title}</h3><ul class="plain">${rows.map(r => `<li><b>${esc(r[0])}</b><span class="s">${esc(r[1])}</span><span class="s"><b style="color:var(--gold)">Objetivo:</b> ${esc(r[2])} · <b style="color:var(--gold)">Métrica:</b> ${esc(r[3])}</span></li>`).join("")}</ul></div>`;
  const lives = (C.lives || []).slice().sort((a, b) => a.d < b.d ? -1 : 1);
  $("#v-funil").innerHTML = `
    <h2>Funil da Paula: topo, meio e fundo</h2>
    <p class="lead">Os vídeos virais que a Paula já produz são o topo. Lives e relacionamento (cortes, e-mail, WhatsApp) são o meio. Página, provas, imersão e oferta são o fundo. Cada peça segue o ato da semana.</p>
    <div class="funil">${col("topo", "Topo", "Descoberta · vídeos virais", "var(--f1)", C.funil.topo)}${col("meio", "Meio", "Consciência · lives e relacionamento", "var(--f3)", C.funil.meio)}${col("fundo", "Fundo", "Decisão · página, imersão, oferta", "var(--f6)", C.funil.fundo)}</div>
    <h3 class="mt2">Programação de lives</h3>
    <p class="lead">Proposta: 2 lives por semana (terça e quinta, 20h), tema seguindo o ato.</p>
    <div class="tw rel mt">${editBtn("lives")}<table><thead><tr><th>Data</th><th>Hora</th><th>Tema</th><th>Ato</th><th>CTA</th></tr></thead><tbody>${lives.map(l => { const ph = PHASES.find(p => p.id === l.ato); return `<tr><td class="n">${DOW[kd(l.d).getDay()]} ${fmtK(l.d)}</td><td class="n">${esc(l.h)}</td><td><b>${esc(l.tema)}</b></td><td><span class="tag" style="color:${ph ? ph.c : "var(--txt)"}">${ph ? ph.n.split(" — ")[0] : esc(l.ato)}</span></td><td><span class="s">${esc(l.cta)}</span></td></tr>`; }).join("")}</tbody></table></div>`;
}
const emptyC = () => `<div class="banner"><b>Conteúdo ainda não importado.</b><span class="status">${isAdmin() ? "Vá em Configurações → Importar cronograma padrão." : "Aguarde o administrador importar o conteúdo."}</span></div>`;

function renderReguas() {
  if (!C) { $("#v-reguas").innerHTML = emptyC(); return; }
  $("#v-reguas").innerHTML = `
    <h2>Réguas de mensagens</h2>
    <p class="lead">WhatsApp pela API oficial: cada mensagem é um template aprovado pela Meta. A compra do ingresso registra o consentimento — deixe isso escrito no checkout.</p>
    <div class="card soft mt">${editBtn("waRules")}<span class="eyebrow">Regras da API que entram no cronograma</span><ul class="plain">${C.waRules.map(r => `<li>${esc(r[0])}${r[1] ? `<span class="s">${esc(r[1])}</span>` : ""}</li>`).join("")}</ul></div>
    <h3 class="mt2">WhatsApp (API oficial)</h3>
    <div class="tw rel mt">${editBtn("wa")}<table><thead><tr><th>Gatilho / data</th><th>Hora</th><th>Mensagem</th><th>Conteúdo</th><th>Tipo</th></tr></thead><tbody>${C.wa.map(r => `<tr><td class="n">${esc(r[0])}</td><td class="n">${esc(r[1])}</td><td><b>${esc(r[2])}</b></td><td><span class="s">${esc(r[3])}</span></td><td><span class="tag">${esc(r[4])}</span></td></tr>`).join("")}</tbody></table></div>
    <h3 class="mt2">E-mail</h3>
    <div class="tw rel mt">${editBtn("em")}<table><thead><tr><th>Data</th><th>E-mail</th><th>Observação</th></tr></thead><tbody>${C.em.map(r => `<tr><td class="n">${esc(r[0])}</td><td><b>${esc(r[1])}</b></td><td><span class="s">${esc(r[2])}</span></td></tr>`).join("")}</tbody></table></div>`;
}
function renderTrafego() {
  if (!C) { $("#v-trafego").innerHTML = emptyC(); return; }
  $("#v-trafego").innerHTML = `
    <h2>Tráfego</h2>
    <p class="lead">A métrica-mãe é <b>CPA de ingresso</b> por lote. Captação 05/10 → 06/11; remarketing de carrinho do FF 2.0 de 08/11 a 12/11.</p>
    <div class="grid g3 mt">${C.trafCards.map((r, i) => `<div class="card">${i === 0 ? editBtn("trafCards") : ""}<span class="eyebrow">${esc(r[0])}</span><p style="margin-top:8px">${esc(r[1])}</p><p class="status" style="margin-top:8px">${esc(r[2])}</p></div>`).join("")}</div>
    <div class="grid g2 mt2">
      <div class="card soft">${editBtn("trafMeta")}<span class="eyebrow">Rotina semanal (Meta)</span><ul class="plain">${C.trafMeta.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="card soft">${editBtn("trafGoogle")}<span class="eyebrow">Rotina semanal (Google / YouTube)</span><ul class="plain">${C.trafGoogle.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
    </div>`;
}
function renderImersao() {
  if (!C) { $("#v-imersao").innerHTML = emptyC(); return; }
  const blk = r => r.map(([h, s]) => `<div class="block"><span class="h">${esc(h)}</span><span>${esc(s)}</span></div>`).join("");
  const li = r => r.map(x => `<li><b>${esc(x[0])}</b>${x[1] ? `<span class="s">${esc(x[1])}</span>` : ""}</li>`).join("");
  $("#v-imersao").innerHTML = `
    <h2>Imersão · 07 e 08 de novembro</h2>
    <p class="lead">100% online e paga. Não pode parecer palestra longa nem curso de birra: é a experiência em que a mãe organiza o cenário da família, entende os fundamentos e sai sabendo o que precisa começar.</p>
    <div class="dayplan">
      <div class="card">${editBtn("d1")}<span class="eyebrow">Sábado 07/11 — Dia 1</span><h3 style="margin:6px 0 10px">Reconhecer → entender → descobrir</h3>${blk(C.d1)}</div>
      <div class="card">${editBtn("d2")}<span class="eyebrow">Domingo 08/11 — Dia 2</span><h3 style="margin:6px 0 10px">Aplicar → método → Família Forte 2.0</h3>${blk(C.d2)}</div>
    </div>
    <div class="grid g2 mt2">
      <div class="card soft">${editBtn("ingressos")}<span class="eyebrow">Ingresso — 3 lotes</span><ul class="plain">${li(C.ingressos)}</ul>${DEC.lote2 || DEC.lote3 ? `<p class="status" style="margin-top:8px">Decidido: Lote 2 ${esc(DEC.lote2 || "—")} · Lote 3 ${esc(DEC.lote3 || "—")}</p>` : ""}</div>
      <div class="card soft">${editBtn("ofertaFF")}<span class="eyebrow">Oferta Família Forte 2.0</span><ul class="plain">${li(C.ofertaFF)}</ul>${DEC.precoFF || DEC.fechaCarrinho ? `<p class="status" style="margin-top:8px">Decidido: ${esc(DEC.precoFF || "")} ${DEC.fechaCarrinho ? "· fecha " + esc(DEC.fechaCarrinho) : ""}</p>` : ""}</div>
    </div>`;
}
function renderNarrativa() {
  if (!C) { $("#v-narrativa").innerHTML = emptyC(); return; }
  $("#v-narrativa").innerHTML = `
    <h2>Narrativa & regras de produção</h2>
    <p class="lead">Antes de produzir qualquer peça: <b>“Em qual ato estamos e qual conclusão essa mãe precisa ter depois de consumir isso?”</b> Sem resposta clara, a peça não entra.</p>
    <div class="grid g2 mt">
      <div class="card">${editBtn("tensao")}<span class="eyebrow">Tensão dramática</span><p class="quote" style="margin-top:10px">${esc(C.tensao[0])}</p><p class="status" style="margin-top:10px">${esc(C.tensao[1])}</p></div>
      <div class="card">${editBtn("conclusoes")}<span class="eyebrow">As 4 conclusões, nesta ordem</span><ul class="plain">${C.conclusoes.map(x => `<li><b>${esc(x[0])}</b> — ${esc(x[1])}</li>`).join("")}</ul></div>
    </div>
    <div class="card soft mt">${editBtn("linguagem")}<span class="eyebrow">Linguagem: zero técnica na entrada</span><div class="grid g3" style="margin-top:10px">${C.linguagem.map(x => `<div><b style="color:var(--gold)">${esc(x[0])}</b><br><span class="status">${esc(x[1])}</span></div>`).join("")}</div></div>
    <div class="row mt2" style="justify-content:space-between"><h3>Frases-mãe</h3>${isAdmin() ? `<button class="ed" data-sec="frases">✎ Editar</button>` : ""}</div>
    <div class="grid g2 mt">${C.frases.map(f => `<p class="quote" style="font-size:17px">${esc(f)}</p>`).join("")}</div>
    <h3 class="mt2">Objeções que a narrativa desmonta antes da oferta</h3>
    <div class="card soft mt">${editBtn("obj")}${C.obj.map(([q, a]) => `<div class="obj"><span class="q">${esc(q)}</span><span>${esc(a)}</span></div>`).join("")}</div>
    <div class="grid g2 mt2">
      <div class="card" style="border-color:var(--bad)">${editBtn("nao")}<span class="eyebrow" style="color:var(--bad)">O que NÃO fazer</span><ul class="plain">${C.nao.map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>
      <div class="card soft">${editBtn("canais")}<span class="eyebrow">Função de cada canal</span><ul class="plain">${C.canais.map(([c, f]) => `<li><b>${esc(c)}</b> — ${esc(f)}</li>`).join("")}</ul></div>
    </div>`;
}

const DECF = [["nome", "Nome definitivo da imersão", "Família Forte — O Começo (provisório)"], ["horario", "Horários dos dois dias", "ex.: sáb 9h–12h · dom 9h–13h"], ["plataforma", "Plataforma de transmissão e acesso", ""], ["livesSemana", "Lives por semana (dias e horários fixos)", "ex.: ter e qui, 20h"], ["lote2", "Lote 2 — preço e data", "ex.: R$ 47 a partir de 15/10"], ["lote3", "Lote 3 — preço e data", "ex.: R$ 67 a partir de 26/10"], ["precoFF", "Família Forte 2.0 — preço vitalício (BF antecipada)", ""], ["bonusVivo", "Bônus de quem decide ao vivo", ""], ["fechaCarrinho", "Fechamento do carrinho FF 2.0", "proposta: 12/11 à meia-noite"], ["bsp", "Provedor da API oficial (BSP) e número", ""]];
function renderDecisoes() {
  if (document.activeElement && $("#v-decisoes").contains(document.activeElement) && document.activeElement.tagName === "INPUT") return;
  const feed = LOGS.filter(l => ["task_done", "note", "decisions_save"].includes(l.action));
  $("#v-decisoes").innerHTML = `
    <h2>Decisões</h2>
    <p class="lead">À esquerda, as decisões estruturais (só administradores editam). À direita, em sequência, tudo que foi decidido ao concluir tarefas — com quem decidiu e quando.</p>
    <div class="grid g2 mt" style="align-items:start">
      <div class="card"><span class="eyebrow">Decisões estruturais</span><div class="grid" style="margin-top:12px">${DECF.map(([id, l, p]) => `<div class="field"><label for="dec-${id}">${l}</label><input id="dec-${id}" placeholder="${esc(p)}" value="${esc(DEC[id] || "")}" ${isAdmin() ? "" : "readonly"}></div>`).join("")}</div>${isAdmin() ? `<div class="row mt"><button class="btn" id="saveDec">Salvar decisões</button><span class="status" id="decStatus"></span></div>` : ""}</div>
      <div class="card soft"><div class="row" style="justify-content:space-between"><span class="eyebrow">Registro de decisões</span>${!isViewer() ? `<button class="sbtn" id="addNote">+ registro</button>` : ""}</div>${feedHtml(feed)}</div>
    </div>`;
  if (isAdmin()) $("#saveDec").onclick = async () => {
    const o = {}; DECF.forEach(([id]) => { o[id] = document.getElementById("dec-" + id).value.trim(); });
    const changed = DECF.filter(([id]) => (DEC[id] || "") !== o[id]).map(([id, l]) => `${l}: ${o[id]}`);
    const { error } = await sb.from("decisions").upsert({ id: "main", data: o, updated_at: new Date().toISOString(), updated_by: ME.id }); if (error) return err(error);
    DEC = o; await log("decisions_save", "decisoes", "main", "Decisões estruturais", { alteradas: changed }); $("#decStatus").textContent = "Salvo."; toast("Decisões salvas"); scheduleRefresh();
  };
  const a = $("#addNote"); if (a) a.onclick = () => modal(`<h3>Novo registro</h3><p class="hint">Uma decisão, mudança de rota ou informação que entrou no meio do caminho.</p><div class="field"><label for="lt">Título</label><input id="lt"></div><div class="field"><label for="ln">Registro</label><textarea id="ln" style="min-height:110px;font-family:var(--body)"></textarea></div><div class="row"><button class="btn" id="lSave">Salvar</button><button class="btn ghost" id="lCancel">Cancelar</button></div>`, () => { $("#lCancel").onclick = closeModal; $("#lSave").onclick = async () => { const t = $("#lt").value.trim(); if (!t) return; await log("note", "registro", "", t, { note: $("#ln").value.trim() }); closeModal(); scheduleRefresh(); toast("Registrado"); }; });
}
function feedHtml(list) {
  if (!list.length) return '<p class="status" style="margin-top:8px">Nenhum registro ainda.</p>';
  return `<div class="log">${list.map(i => { const d = i.detail || {}; const t = TASKS[i.entity_id]; const c = t ? (FRONTS[t.f] || FRONTS.ev).c : "var(--gold)"; return `<div class="it" style="--c:${c}"><div class="when">${fmtDT(i.at)} · ${esc(i.user_name || "—")} · ${ACTN[i.action] || i.action}${d.previsto ? " · previsto " + fmtK(d.previsto) : ""}</div><div class="tt">${esc(i.title)}</div>${d.note ? `<div class="nt">${esc(d.note)}</div>` : ""}${d.late ? `<div class="nt" style="color:var(--bad)">Atraso — entregue ${fmtK(d.delivered_on)}. Justificativa: ${esc(d.justification)}</div>` : ""}${d.alteradas && d.alteradas.length ? `<div class="nt">${d.alteradas.map(esc).join("<br>")}</div>` : ""}${d.campos && d.campos.length ? `<div class="nt">Campos: ${d.campos.map(esc).join(", ")}</div>` : ""}</div>`; }).join("")}</div>`;
}
const ACTN = { login: "entrou", logout: "saiu", task_done: "concluiu tarefa", task_undone: "reabriu tarefa", task_create: "criou tarefa", task_update: "editou tarefa", task_delete: "excluiu tarefa", section_edit: "editou seção", decisions_save: "salvou decisões", note: "registro", user_create: "criou usuário", user_update: "alterou usuário", user_password: "trocou senha", user_delete: "excluiu usuário", seed_import: "importou cronograma" };

let logFilt = { who: "all", act: "all" };
function renderRegistro() {
  const who = [...new Set(LOGS.map(l => l.user_name).filter(Boolean))];
  const list = LOGS.filter(l => (logFilt.who === "all" || l.user_name === logFilt.who) && (logFilt.act === "all" || l.action === logFilt.act));
  $("#v-registro").innerHTML = `
    <h2>Registro de atividades</h2>
    <p class="lead">Tudo que cada pessoa fez no painel: entradas, tarefas concluídas (com anotação e justificativa), edições, decisões, usuários. Ninguém consegue apagar ou editar o registro.</p>
    <div class="filters"><select class="mini" id="lfWho"><option value="all">Todas as pessoas</option>${who.map(w => `<option ${logFilt.who === w ? "selected" : ""}>${esc(w)}</option>`).join("")}</select><select class="mini" id="lfAct"><option value="all">Todas as ações</option>${Object.entries(ACTN).map(([k, n]) => `<option value="${k}" ${logFilt.act === k ? "selected" : ""}>${n}</option>`).join("")}</select><span class="status">${list.length} registro(s)</span></div>
    <div class="card soft mt">${feedHtml(list.slice(0, 300))}</div>`;
  $("#lfWho").onchange = e => { logFilt.who = e.target.value; renderRegistro(); };
  $("#lfAct").onchange = e => { logFilt.act = e.target.value; renderRegistro(); };
}

/* ---------------- configurações (admin) ---------------- */
async function adminApi(body) {
  const { data: { session } } = await sb.auth.getSession();
  const r = await fetch("/api/admin-users", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + session.access_token }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "erro " + r.status); return j;
}
function renderConfig() {
  if (!isAdmin()) { $("#v-config").innerHTML = ""; return; }
  const nT = Object.keys(TASKS).length;
  $("#v-config").innerHTML = `
    <h2>Configurações</h2>
    <p class="lead">Só administradores veem esta aba. Aqui você cadastra a equipe, troca senhas, define papéis e importa o cronograma padrão.</p>
    <div class="grid g2 mt" style="align-items:start">
      <div class="card"><span class="eyebrow">Novo usuário</span>
        <div class="grid" style="margin-top:12px">
          <div class="field"><label for="uName">Nome</label><input id="uName" placeholder="como vai aparecer nos registros"></div>
          <div class="field"><label for="uEmail">E-mail</label><input id="uEmail" type="email"></div>
          <div class="field"><label for="uPass">Senha inicial (mín. 8)</label><input id="uPass" type="text" autocomplete="off"></div>
          <div class="field"><label for="uRole">Papel</label><select id="uRole">${Object.entries(ROLES).map(([k, n]) => `<option value="${k}" ${k === "visualizador" ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        </div>
        <div class="row mt"><button class="btn" id="uCreate">Criar usuário</button><span class="status" id="uStatus"></span></div>
        <p class="hint" style="margin-top:12px">Papéis: <b>Administrador</b> faz tudo. Os demais concluem só as tarefas do seu papel (ou atribuídas a eles), registram entrega e justificativa, e não alteram datas nem excluem. <b>Visualizador</b> só lê.</p>
      </div>
      <div class="card soft"><span class="eyebrow">Cronograma</span>
        <p style="margin-top:8px">${nT} tarefa(s) no banco${C ? " · conteúdo importado" : " · conteúdo ainda não importado"}.</p>
        <div class="row mt"><button class="btn" id="seedBtn">Importar cronograma padrão</button><span class="status" id="seedStatus"></span></div>
        <p class="hint" style="margin-top:10px">Insere as tarefas e seções que ainda não existem (não sobrescreve o que já foi editado). Pode rodar de novo com segurança.</p>
        <div class="row mt"><button class="btn ghost" id="seedForce">Restaurar TODO o conteúdo padrão (seções)</button></div>
      </div>
    </div>
    <h3 class="mt2">Equipe</h3>
    <div class="users">${PROFILES.map(p => `<div class="user"><div><b>${esc(p.name || "(sem nome)")}</b> <span class="rolepill">${roleName(p.role)}</span>${!p.active ? ' <span class="tag" style="color:var(--bad)">desativado</span>' : ""}<div class="em">${esc(p.email)}</div></div><div class="acts"><select class="mini" data-role="${p.id}">${Object.entries(ROLES).map(([k, n]) => `<option value="${k}" ${p.role === k ? "selected" : ""}>${n}</option>`).join("")}</select><button class="ed" data-rename="${p.id}">nome</button><button class="ed" data-pass="${p.id}">senha</button><button class="ed" data-toggle="${p.id}">${p.active ? "desativar" : "ativar"}</button>${p.id !== ME.id ? `<button class="ed" data-udel="${p.id}" style="color:var(--bad)">excluir</button>` : ""}</div></div>`).join("")}</div>`;
  $("#uCreate").onclick = async () => { const b = { action: "create", name: $("#uName").value.trim(), email: $("#uEmail").value.trim(), password: $("#uPass").value, role: $("#uRole").value }; $("#uStatus").textContent = "Criando…"; try { await adminApi(b); $("#uStatus").textContent = "Criado. Envie e-mail e senha para a pessoa."; toast("Usuário criado"); scheduleRefresh(); } catch (e) { $("#uStatus").textContent = ""; err(e); } };
  $("#seedBtn").onclick = () => importSeed(false);
  $("#seedForce").onclick = () => { if (confirm("Isso substitui TODAS as seções editáveis (funil, réguas, roteiro, narrativa…) pelo padrão. As tarefas não são tocadas. Continuar?")) importSeed(true); };
  $("#v-config .users").onclick = async e => {
    const b = e.target.closest("button"); if (!b) return;
    try {
      if (b.dataset.rename) { const p = PROFILES.find(x => x.id === b.dataset.rename); const n = prompt("Novo nome:", p.name); if (n == null) return; await adminApi({ action: "update", id: p.id, name: n }); }
      if (b.dataset.pass) { const n = prompt("Nova senha (mín. 8 caracteres):"); if (n == null) return; await adminApi({ action: "password", id: b.dataset.pass, password: n }); toast("Senha alterada"); }
      if (b.dataset.toggle) { const p = PROFILES.find(x => x.id === b.dataset.toggle); await adminApi({ action: "update", id: p.id, active: !p.active }); }
      if (b.dataset.udel) { const p = PROFILES.find(x => x.id === b.dataset.udel); if (!confirm(`Excluir ${p.name} (${p.email})? As tarefas atribuídas a essa pessoa voltam para o papel.`)) return; await adminApi({ action: "delete", id: p.id }); }
      scheduleRefresh();
    } catch (ex) { err(ex); }
  };
  $("#v-config .users").onchange = async e => { const s = e.target; if (!s.dataset.role) return; try { await adminApi({ action: "update", id: s.dataset.role, role: s.value }); toast("Papel alterado"); scheduleRefresh(); } catch (ex) { err(ex); } };
}
async function importSeed(force) {
  const seed = window.PPV_SEED; const st = $("#seedStatus"); st.textContent = "Importando…";
  try {
    const missing = seed.tasks.filter(t => !TASKS[t.id]).map(t => Object.assign({}, t, { created_by: ME.id }));
    for (let i = 0; i < missing.length; i += 100) { const { error } = await sb.from("tasks").upsert(missing.slice(i, i + 100)); if (error) throw error; }
    if (force || !C) { const { error } = await sb.from("content").upsert({ id: "main", v: seed.CONTENT_V, data: seed.content, updated_at: new Date().toISOString(), updated_by: ME.id }); if (error) throw error; }
    await log("seed_import", "cronograma", "", `Importou cronograma padrão (${missing.length} tarefas novas${force ? ", conteúdo restaurado" : ""})`, {});
    st.textContent = `Pronto: ${missing.length} tarefa(s) adicionada(s).`; toast("Cronograma importado"); scheduleRefresh();
  } catch (e) { st.textContent = ""; err(e); }
}

function renderAll() { renderVisao(); renderCron(); renderFunil(); renderReguas(); renderTrafego(); renderImersao(); renderNarrativa(); renderDecisoes(); renderRegistro(); renderConfig(); $("#brandName").textContent = DEC.nome || "Família Forte — O Começo"; }

/* ---------------- eventos delegados ---------------- */
document.addEventListener("change", e => {
  const cb = e.target; if (!cb.matches || !cb.matches("input[type=checkbox][data-id]")) return;
  if (cb.checked) openDone(cb.dataset.id, cb); else undoTask(cb.dataset.id, cb);
});
document.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.sec && !b.closest(".filters")) openSec(b.dataset.sec);
  else if (b.dataset.edit) openTask(b.dataset.edit);
  else if (b.dataset.add) openTask(null, b.dataset.add);
});

boot();
