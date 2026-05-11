import { supabase } from "@/integrations/supabase/client";

export type SponsorTier = "none" | "bronze" | "silver" | "gold" | "s_tier";

export type Town = {
  id: string;
  slug: string;
  name: string;
  county: string;
  state: string;
  zip_codes: string[];
  latitude: number;
  longitude: number;
  hero_blurb: string | null;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  display_order: number;
};

export type Business = {
  id: string;
  town_id: string;
  category_id: string;
  name: string;
  subcategory: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  coupon_text: string | null;
  coupon_expires: string | null;
  sponsor_tier: SponsorTier;
  featured_order: number;
};

export const tierPriority: Record<SponsorTier, number> = {
  s_tier: 100,
  gold: 80,
  silver: 60,
  bronze: 40,
  none: 0,
};

export type TownPage = {
  town: Town;
  categories: Category[];
  businesses: Business[];
};

export async function fetchTownPage(slug: string): Promise<TownPage | null> {
  const { data: town, error } = await supabase
    .from("towns")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!town) return null;

  const [{ data: categories }, { data: businesses }] = await Promise.all([
    supabase.from("categories").select("*").order("display_order"),
    supabase.from("businesses").select("*").eq("town_id", town.id),
  ]);

  return {
    town: town as Town,
    categories: (categories ?? []) as Category[],
    businesses: (businesses ?? []) as Business[],
  };
}

export async function listTowns(): Promise<Pick<Town, "slug" | "name" | "zip_codes">[]> {
  const { data, error } = await supabase
    .from("towns")
    .select("slug, name, zip_codes")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function resolveTown(opts: {
  lat?: number;
  lng?: number;
  zip?: string;
}): Promise<{ slug: string; name: string } | null> {
  if (opts.zip) {
    const { data } = await supabase.rpc("town_by_zip", { zip: opts.zip });
    if (data && data.length) return { slug: data[0].slug, name: data[0].name };
  }
  if (opts.lat != null && opts.lng != null) {
    const { data } = await supabase.rpc("nearest_town", {
      lat: opts.lat,
      lng: opts.lng,
      max_km: 30,
    });
    if (data && data.length && data[0].distance_km <= 40) {
      return { slug: data[0].slug, name: data[0].name };
    }
  }
  return null;
}
