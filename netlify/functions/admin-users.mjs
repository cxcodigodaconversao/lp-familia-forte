import { createClient } from "@supabase/supabase-js";

// Administração de usuários (criar, alterar papel/nome, trocar senha, excluir).
// Roda no servidor do Netlify com a chave SERVICE ROLE — ela nunca vai para o navegador.
// Só atende quem estiver logado E tiver papel 'admin' na tabela profiles.

const ROLES = ["admin", "gestor_projetos", "gestor_trafego", "copywriter", "expert", "operacao", "visualizador"];

export default async (req) => {
  if (req.method !== "POST") return new Response("método não permitido", { status: 405 });

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return json({ error: "Variáveis SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY não configuradas no Netlify." }, 500);

  // 1) quem está chamando?
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "não autenticado" }, 401);

  const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: me, error: meErr } = await caller.auth.getUser(token);
  if (meErr || !me?.user) return json({ error: "sessão inválida" }, 401);

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: prof } = await admin.from("profiles").select("role,active,name").eq("id", me.user.id).single();
  if (!prof || prof.role !== "admin" || !prof.active) return json({ error: "somente administradores" }, 403);

  // 2) ação
  let body;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const { action } = body || {};

  try {
    if (action === "list") {
      const { data, error } = await admin.from("profiles").select("id,email,name,role,active,created_at").order("created_at");
      if (error) throw error;
      return json({ users: data });
    }

    if (action === "create") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const name = String(body.name || "").trim();
      const role = ROLES.includes(body.role) ? body.role : "visualizador";
      if (!email || password.length < 8) return json({ error: "e-mail e senha (mín. 8 caracteres) são obrigatórios" }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { name, role }
      });
      if (error) throw error;
      // garante o perfil com nome/papel (o trigger também cria)
      await admin.from("profiles").upsert({ id: data.user.id, email, name, role, active: true });
      await log(admin, me.user.id, prof.name, "user_create", email, { name, role });
      return json({ ok: true, id: data.user.id });
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return json({ error: "id obrigatório" }, 400);
      const patch = {};
      if (typeof body.name === "string") patch.name = body.name.trim();
      if (ROLES.includes(body.role)) patch.role = body.role;
      if (typeof body.active === "boolean") patch.active = body.active;
      if (id === me.user.id && patch.role && patch.role !== "admin") return json({ error: "você não pode tirar o seu próprio papel de administrador" }, 400);
      const { error } = await admin.from("profiles").update(patch).eq("id", id);
      if (error) throw error;
      if (patch.name !== undefined || patch.role) await admin.auth.admin.updateUserById(id, { user_metadata: patch });
      await log(admin, me.user.id, prof.name, "user_update", id, patch);
      return json({ ok: true });
    }

    if (action === "password") {
      const id = String(body.id || "");
      const password = String(body.password || "");
      if (!id || password.length < 8) return json({ error: "senha com mín. 8 caracteres" }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) throw error;
      await log(admin, me.user.id, prof.name, "user_password", id, {});
      return json({ ok: true });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return json({ error: "id obrigatório" }, 400);
      if (id === me.user.id) return json({ error: "você não pode excluir a si mesmo" }, 400);
      const { data: target } = await admin.from("profiles").select("email").eq("id", id).single();
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      await log(admin, me.user.id, prof.name, "user_delete", target?.email || id, {});
      return json({ ok: true });
    }

    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: e.message || String(e) }, 400);
  }
};

async function log(admin, user_id, user_name, action, entity_id, detail) {
  await admin.from("logs").insert({ user_id, user_name, action, entity: "usuario", entity_id, title: `${action} ${entity_id}`, detail });
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export const config = { path: "/api/admin-users" };
