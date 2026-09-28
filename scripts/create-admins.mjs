// Cria (ou atualiza a senha) dos dois administradores no Supabase Auth.
// Uso:  SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/create-admins.mjs "SenhaDoEverton" "SenhaDoJezreel"
// Rode só na sua máquina. A chave service_role nunca vai para o GitHub.
import { createClient } from "@supabase/supabase-js";

const ADMINS = [
  { email: "everton@comercial10x.com.br", name: "Everton Rodrigues" },
  { email: "jezreel@comercial10x.com.br", name: "Jezreel Soares" }
];

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const [p1, p2] = process.argv.slice(2);
if (!url || !key || !p1 || !p2) {
  console.error("Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-admins.mjs \"senha-everton\" \"senha-jezreel\"");
  process.exit(1);
}
if (p1.length < 8 || p2.length < 8) { console.error("Senhas com no mínimo 8 caracteres."); process.exit(1); }

const sb = createClient(url, key, { auth: { persistSession: false } });
const passwords = [p1, p2];

for (let i = 0; i < ADMINS.length; i++) {
  const a = ADMINS[i], password = passwords[i];
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const existing = (list?.users || []).find(u => u.email?.toLowerCase() === a.email);
  if (existing) {
    const { error } = await sb.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata: { name: a.name, role: "admin" } });
    if (error) throw error;
    await sb.from("profiles").upsert({ id: existing.id, email: a.email, name: a.name, role: "admin", active: true });
    console.log(`✓ ${a.email} já existia — senha atualizada, papel admin garantido`);
  } else {
    const { data, error } = await sb.auth.admin.createUser({ email: a.email, password, email_confirm: true, user_metadata: { name: a.name, role: "admin" } });
    if (error) throw error;
    await sb.from("profiles").upsert({ id: data.user.id, email: a.email, name: a.name, role: "admin", active: true });
    console.log(`✓ ${a.email} criado como administrador`);
  }
}
console.log("Pronto. Entre no painel com esses e-mails e senhas.");
