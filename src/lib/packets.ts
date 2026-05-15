import { supabase } from "@/integrations/supabase/client";
import { customAlphabet } from "nanoid";

export type PacketStatus = "draft" | "generated";

export type Packet = {
  id: string;
  realtor_id: string;
  town_id: string | null;
  slug: string;
  buyer_first_name: string;
  buyer_last_name: string | null;
  buyer_email: string | null;
  address: string;
  closing_date: string | null;
  welcome_note: string | null;
  has_kids: boolean;
  has_pets: boolean;
  interests: string[];
  lifestyle_tags: string[];
  home_photo_url: string | null;
  status: PacketStatus;
  pdf_url: string | null;
  pdf_download_count: number;
  created_at: string;
  updated_at: string;
};

const slugId = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 8);

export function newPacketSlug() {
  return slugId();
}

export async function listMyPackets(userId: string) {
  const { data, error } = await supabase
    .from("packets")
    .select("*")
    .eq("realtor_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Packet[];
}

export async function getPacketBySlug(slug: string) {
  const { data, error } = await supabase.from("packets").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data as Packet | null;
}

export async function getPacketById(id: string) {
  const { data, error } = await supabase.from("packets").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Packet | null;
}

export async function createPacket(
  input: Partial<Packet> & {
    realtor_id: string;
    buyer_first_name: string;
    address: string;
  },
) {
  const slug = input.slug ?? newPacketSlug();
  const { data, error } = await supabase
    .from("packets")
    .insert({ ...input, slug })
    .select()
    .single();
  if (error) throw error;
  return data as Packet;
}

export async function updatePacket(id: string, patch: Partial<Packet>) {
  const { data, error } = await supabase
    .from("packets")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Packet;
}

export async function deletePacket(id: string) {
  const { error } = await supabase.from("packets").delete().eq("id", id);
  if (error) throw error;
}
