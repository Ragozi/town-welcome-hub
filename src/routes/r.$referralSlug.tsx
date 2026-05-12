import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/r/$referralSlug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const fromSlug = url.searchParams.get("from") ?? null;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("user_id, full_name, email_public, phone, referral_slug")
          .eq("referral_slug", params.referralSlug)
          .maybeSingle();

        if (!profile) {
          return new Response("Referral link not found", { status: 404 });
        }

        // Resolve packet (for realtor_id/town_id event context)
        let packet_id: string | null = null;
        let realtor_id: string | null = profile.user_id ?? null;
        let town_id: string | null = null;
        if (fromSlug) {
          const { data: packet } = await supabaseAdmin
            .from("packets")
            .select("id, realtor_id, town_id")
            .eq("slug", fromSlug)
            .maybeSingle();
          if (packet) {
            packet_id = packet.id;
            realtor_id = packet.realtor_id;
            town_id = packet.town_id ?? null;
          }
        }

        const ua = request.headers.get("user-agent") ?? null;
        await supabaseAdmin.from("packet_events").insert({
          packet_id,
          realtor_id,
          town_id,
          event_type: "referral_click",
          source: "referral",
          referrer: request.headers.get("referer"),
          user_agent: ua,
          ip_country: request.headers.get("cf-ipcountry"),
          ip_region: request.headers.get("cf-region"),
          ip_city: request.headers.get("cf-ipcity"),
          metadata: { referral_slug: params.referralSlug, from_packet_slug: fromSlug },
        });

        // Decide best contact target: mailto preferred, then tel, then back to site
        const subject = encodeURIComponent(`Referral from your "Welcome Home" packet`);
        const body = encodeURIComponent(
          `Hi ${profile.full_name ?? ""},\n\nI'd like to refer someone who's looking for a great realtor.\n\n— Sent via your Welcome Home packet`,
        );
        let target: string;
        if (profile.email_public) {
          target = `mailto:${profile.email_public}?subject=${subject}&body=${body}`;
        } else if (profile.phone) {
          target = `tel:${profile.phone}`;
        } else {
          target = "/";
        }

        return new Response(null, { status: 302, headers: { Location: target } });
      },
    },
  },
});
