import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EventTypeSchema = z.enum([
  "landing_view",
  "qr_scanned",
  "business_click",
  "referral_click",
  "sponsor_click",
  "share_click",
  "pdf_downloaded",
]);

const InputSchema = z.object({
  packet_slug: z.string().min(1).max(64).optional(),
  event_type: EventTypeSchema,
  source: z.enum(["qr", "direct", "referral", "search", "unknown"]).optional(),
  referrer: z.string().max(2000).optional(),
  session_id: z.string().min(1).max(64).optional(),
  utm: z.record(z.string().max(50), z.string().max(200)).optional(),
  metadata: z.record(z.string().max(50), z.any()).optional(),
});

function detectDevice(ua: string | null | undefined): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!ua) return "unknown";
  const s = ua.toLowerCase();
  if (/ipad|tablet/.test(s)) return "tablet";
  if (/mobile|iphone|android|phone/.test(s)) return "mobile";
  return "desktop";
}

export const logEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const req = getRequest();
    const headers = req?.headers;

    const ua = headers?.get("user-agent") ?? null;
    const country = headers?.get("cf-ipcountry") ?? headers?.get("x-vercel-ip-country") ?? null;
    const region = headers?.get("cf-region") ?? headers?.get("x-vercel-ip-region") ?? null;
    const city = headers?.get("cf-ipcity") ?? headers?.get("x-vercel-ip-city") ?? null;

    let packet_id: string | null = null;
    let realtor_id: string | null = null;
    let town_id: string | null = null;

    if (data.packet_slug) {
      const { data: packet } = await supabaseAdmin
        .from("packets")
        .select("id, realtor_id, town_id")
        .eq("slug", data.packet_slug)
        .maybeSingle();
      if (packet) {
        packet_id = packet.id;
        realtor_id = packet.realtor_id;
        town_id = packet.town_id ?? null;
      }
    }

    const { error } = await supabaseAdmin.from("packet_events").insert({
      packet_id,
      realtor_id,
      town_id,
      event_type: data.event_type,
      source: data.source ?? "unknown",
      referrer: data.referrer ?? null,
      user_agent: ua,
      ip_country: country,
      ip_region: region,
      ip_city: city,
      device: detectDevice(ua),
      session_id: data.session_id ?? null,
      utm: data.utm ?? {},
      metadata: data.metadata ?? {},
    });

    if (error) {
      console.error("[tracking] insert failed", error);
      return { ok: false };
    }
    return { ok: true };
  });
