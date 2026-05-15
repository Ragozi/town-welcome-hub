import type { SponsorTier } from "@/lib/towns";

export type PublicRealtor = {
  full_name: string | null;
  brokerage_name: string | null;
  brokerage_logo_url: string | null;
  headshot_url: string | null;
  email_public: string | null;
  phone: string | null;
  referral_slug: string | null;
};

export type PublicTown = {
  id: string;
  name: string;
  state: string;
  hero_blurb: string | null;
};

export type PublicBusiness = {
  id: string;
  name: string;
  category_id: string;
  subcategory: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  coupon_text: string | null;
  sponsor_tier: SponsorTier;
  featured_order: number;
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  icon: string | null;
};

export type PublicPacket = {
  slug: string;
  buyer_first_name: string;
  buyer_has_partner: boolean;
  welcome_note: string | null;
  home_photo_url: string | null;
  location_label: string | null;
  realtor: PublicRealtor | null;
  town: PublicTown | null;
  categories: PublicCategory[];
  businesses: PublicBusiness[];
};
