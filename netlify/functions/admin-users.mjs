import { createClient } from "@supabase/supabase-js";

// API de usuários do painel (aba Configurações). Só administradores ativos podem chamar.
// Ações: create · update (name / role / active) · password · delete. Tudo fica no Registro (tabela logs).
// Roda no servidor do Netlify com a chave service_role (variável SUPABASE_SERVICE_ROLE_KEY) — ela nunca vai ao navegador.

const ROLES = ["admin", "gestor_projetos", "gestor_trafego", "copywriter", "expert", "operacao", "visualizador"];

export default async (req) => {
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);
  const url = process.env.SUPABASE_URL, anon = process.env.SUPABASE_ANON_KEY, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return json({ error: "Variáveis do Supabase não configuradas no Netlify (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY). Crie-as e refaça o deploy." }, 500);

  // quem está chamando
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "não autenticado" }, 401);
  const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: me, error: meErr } = await caller.auth.getUser(token);
  if (meErr || !me?.user) return json({ error: "sessão inválida — entre de novo" }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: prof } = await admin.from("profiles").select("role,active,name").eq("id", me.user.id).single();
  if (!prof || !prof.active || prof.role !== "admin") return json({ error: "só administradores gerenciam usuários" }, 403);

  let body; try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const action = body?.action;
  const log = (act, entityId, title, detail) => admin.from("logs").insert({ user_id: me.user.id, user_name: prof.name, action: act, entity: "usuario", entity_id: entityId || "", title, detail: detail || {} });

  try {
    /* ---------- criar ---------- */
    if (action === "create") {
      const name = String(body.name || "").trim(), email = String(body.email || "").trim().toLowerCase(), password = String(body.password || ""), role = body.role || "visualizador";
      if (!name) return json({ error: "informe o nome" }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "e-mail inválido" }, 400);
      if (password.length < 8) return json({ error: "senha com no mínimo 8 caracteres" }, 400);
      if (!ROLES.includes(role)) return json({ error: "papel inválido" }, 400);
      const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role } });
      if (error) return json({ error: /already|registered|exists/i.test(error.message) ? "já existe um usuário com esse e-mail" : error.message }, 400);
      // o gatilho handle_new_user já cria o perfil; garante nome/papel caso o e-mail esteja em admin_emails ou o gatilho não exista
      const { data: p } = await admin.from("profiles").select("role").eq("id", created.user.id).maybeSingle();
      const finalRole = p?.role === "admin" ? "admin" : role;
      await admin.from("profiles").upsert({ id: created.user.id, email, name, role: finalRole, active: true });
      await log("user_create", created.user.id, `${name} (${email})`, { papel: finalRole });
      return json({ ok: true, id: created.user.id, role: finalRole });
    }

    /* ---------- alterar nome / papel / ativo ---------- */
    if (action === "update") {
      const id = String(body.id || ""); if (!id) return json({ error: "id obrigatório" }, 400);
      const { data: target } = await admin.from("profiles").select("id,email,name,role,active").eq("id", id).single();
      if (!target) return json({ error: "usuário não encontrado" }, 404);
      const patch = {}, campos = [];
      if (body.name != null) { const n = String(body.name).trim(); if (!n) return json({ error: "nome não pode ficar vazio" }, 400); patch.name = n; campos.push(`nome: ${target.name} → ${n}`); }
      if (body.role != null) {
        if (!ROLES.includes(body.role)) return json({ error: "papel inválido" }, 400);
        if (target.role === "admin" && body.role !== "admin") { const g = await guardLastAdmin(admin, id); if (g) return json({ error: g }, 400); }
        if (id === me.user.id && body.role !== "admin") return json({ error: "você não pode tirar o seu próprio papel de administrador" }, 400);
        patch.role = body.role; campos.push(`papel: ${target.role} → ${body.role}`);
      }
      if (body.active != null) {
        const act = !!body.active;
        if (id === me.user.id && !act) return json({ error: "você não pode desativar a si mesmo" }, 400);
        if (!act && target.role === "admin") { const g = await guardLastAdmin(admin, id); if (g) return json({ error: g }, 400); }
        patch.active = act; campos.push(act ? "ativado" : "desativado");
      }
      if (!campos.length) return json({ error: "nada para alterar" }, 400);
      const { error } = await admin.from("profiles").update(patch).eq("id", id); if (error) throw error;
      if (patch.name || patch.role) await admin.auth.admin.updateUserById(id, { user_metadata: { name: patch.name || target.name, role: patch.role || target.role } });
      await log("user_update", id, `${patch.name || target.name} (${target.email})`, { campos });
      return json({ ok: true });
    }

    /* ---------- trocar senha ---------- */
    if (action === "password") {
      const id = String(body.id || ""), password = String(body.password || "");
      if (!id) return json({ error: "id obrigatório" }, 400);
      if (password.length < 8) return json({ error: "senha com no mínimo 8 caracteres" }, 400);
      const { data: target } = await admin.from("profiles").select("name,email").eq("id", id).single();
      if (!target) return json({ error: "usuário não encontrado" }, 404);
      const { error } = await admin.auth.admin.updateUserById(id, { password }); if (error) throw error;
      await log("user_password", id, `${target.name} (${target.email})`, {});
      return json({ ok: true });
    }

    /* ---------- excluir ---------- */
    if (action === "delete") {
      const id = String(body.id || ""); if (!id) return json({ error: "id obrigatório" }, 400);
      if (id === me.user.id) return json({ error: "você não pode excluir a si mesmo" }, 400);
      const { data: target } = await admin.from("profiles").select("name,email,role").eq("id", id).single();
      if (!target) return json({ error: "usuário não encontrado" }, 404);
      if (target.role === "admin") { const g = await guardLastAdmin(admin, id); if (g) return json({ error: g }, 400); }
      // tarefas atribuídas à pessoa voltam para o papel (owner_id = null); registros antigos mantêm o nome (user_id vira null)
      const { count } = await admin.from("tasks").select("id", { count: "exact", head: true }).eq("owner_id", id);
      await admin.from("tasks").update({ owner_id: null }).eq("owner_id", id);
      // o registro da exclusão entra ANTES de apagar, com o id da pessoa ainda válido
      await log("user_delete", id, `${target.name} (${target.email})`, { papel: target.role, tarefas_devolvidas: count || 0 });
      const { error } = await admin.auth.admin.deleteUser(id); if (error) throw error; // profiles cai em cascata
      return json({ ok: true, tarefas_devolvidas: count || 0 });
    }

    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: e?.message || String(e) }, 500);
  }
};

// Impede ficar sem administrador ativo.
async function guardLastAdmin(admin, exceptId) {
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").eq("active", true).neq("id", exceptId);
  return count > 0 ? null : "este é o único administrador ativo — promova outra pessoa antes";
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
export const config = { path: "/api/admin-users" };
