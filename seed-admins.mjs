import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const NEW_ADMINS = [
  { email: "eric@hearthhandbook.com", full_name: "Eric" },
  { email: "ted@hearthhandbook.com", full_name: "Ted" },
];
const TEMP_PW = "ChangeMe!HH2026";

async function ensureAdmin({ email, full_name }) {
  // find existing
  const { data: list, error: lerr } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (lerr) throw lerr;
  let user = list.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());

  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password: TEMP_PW,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (error) throw new Error(`${email}: ${error.message}`);
    user = data.user;
    console.log(`created ${email} -> ${user.id}`);
  } else {
    console.log(`exists ${email} -> ${user.id}`);
  }

  await sb.from("profiles").upsert(
    {
      user_id: user.id,
      full_name,
      email_public: email,
      referral_slug: `r-${user.id.replace(/-/g, "").slice(0, 8)}`,
    },
    { onConflict: "user_id" },
  );
  await sb.from("user_roles").upsert({ user_id: user.id, role: "realtor" }, { onConflict: "user_id,role" });
  await sb.from("user_roles").upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
  return user.id;
}

const newIds = [];
for (const a of NEW_ADMINS) newIds.push(await ensureAdmin(a));

// Remove admin role from anyone NOT in newIds
const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin");
for (const a of admins ?? []) {
  if (!newIds.includes(a.user_id)) {
    await sb.from("user_roles").delete().eq("user_id", a.user_id).eq("role", "admin");
    console.log(`removed admin from ${a.user_id}`);
  }
}

console.log("done. temp password:", TEMP_PW);
