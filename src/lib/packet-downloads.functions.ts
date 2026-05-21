import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Increment a packet's download counter and stamp last_downloaded_at.
 * Also writes a `pdf_downloaded` event into packet_events for the analytics
 * dashboard. Owner-only — guarded by RLS-equivalent check in handler.
 */
export const recordPdfDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().min(1).max(64),
        variant: z.enum(["color", "print"]).default("color"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: packet, error: lookupErr } = await supabaseAdmin
      .from("packets")
      .select("id, realtor_id, town_id, pdf_download_count")
      .eq("slug", data.slug)
      .maybeSingle();

    if (lookupErr || !packet) {
      return { ok: false, error: "Packet not found" };
    }
    if (packet.realtor_id !== userId) {
      throw new Response("Forbidden", { status: 403 });
    }

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabaseAdmin
      .from("packets")
      .update({
        pdf_download_count: (packet.pdf_download_count ?? 0) + 1,
        last_downloaded_at: nowIso,
      })
      .eq("id", packet.id);

    if (updateErr) {
      console.error("[recordPdfDownload] update failed", updateErr);
      return { ok: false, error: updateErr.message };
    }

    await supabaseAdmin.from("packet_events").insert({
      packet_id: packet.id,
      realtor_id: packet.realtor_id,
      town_id: packet.town_id,
      event_type: "pdf_downloaded",
      source: "direct",
      metadata: { triggered_by: "realtor_dashboard", variant: data.variant },
    });

    return { ok: true, count: (packet.pdf_download_count ?? 0) + 1, at: nowIso, variant: data.variant };
  });
