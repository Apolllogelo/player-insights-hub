import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ensurePlayersUidColumn = createServerFn({
  method: "POST",
}).handler(async () => {
  const projectId = process.env["SUPABASE_PROJECT_ID"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!projectId || !serviceRoleKey) {
    return { ok: false, reason: "credentials not configured" };
  }

  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/sql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "ALTER TABLE public.players ADD COLUMN IF NOT EXISTS uid TEXT;",
      }),
    });

    if (response.ok) return { ok: true };

    const text = await response.text();
    return { ok: false, reason: text };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
});
