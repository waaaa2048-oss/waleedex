export type StoreType = "SLAUGHTERHOUSE" | "CLOTHING" | "GROCERY" | "FROZEN";
export type StoreStatus = "PRIVATE" | "DRAFT" | "PUBLISHED";

export type StoreSeed = {
  name: string;
  slug: string;
  storeType: StoreType;
  status: StoreStatus;
  logoUrl?: string;
};

export const MULTI_STORE_SEED: StoreSeed[] = [
  {
    name: "أهل الكرم",
    slug: "ahl-alkaram",
    storeType: "SLAUGHTERHOUSE",
    status: "PUBLISHED",
    logoUrl: "https://images.pexels.com/photos/36850048/pexels-photo-36850048.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=600",
  },
  {
    name: "متجر الملابس والأحذية",
    slug: "fashion-store",
    storeType: "CLOTHING",
    status: "PUBLISHED",
    logoUrl: "https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=600",
  },
  {
    name: "متجر المواد الغذائية",
    slug: "grocery-store",
    storeType: "GROCERY",
    status: "PUBLISHED",
    logoUrl: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=600",
  },
  {
    name: "متجر المجمدات",
    slug: "frozen-store",
    storeType: "FROZEN",
    status: "PUBLISHED",
    logoUrl: "https://images.pexels.com/photos/616401/pexels-photo-616401.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=400&w=600",
  },
];

export function getStoreBySlug(slug: string | undefined): StoreSeed | undefined {
  if (!slug) return undefined;
  const normalized = slug.trim().toLowerCase();
  return MULTI_STORE_SEED.find((store) => store.slug.trim().toLowerCase() === normalized);
}

export function getVisibleStores(): StoreSeed[] {
  return MULTI_STORE_SEED.filter((store) => store.status !== "PRIVATE");
}

export function getStorePublicUrl(slug: string | undefined): string {
  const resolved = (slug ?? "").trim().toLowerCase();
  return resolved ? `/${encodeURIComponent(resolved)}` : "/";
}
