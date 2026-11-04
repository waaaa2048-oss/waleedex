import type { MetadataRoute } from "next";
import { getStoreSettings } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getStoreSettings();
  const appIcon = settings.logoUrl || "/icon.svg";
  const iconType = appIcon.startsWith("data:image/")
    ? appIcon.slice(5, appIcon.indexOf(";"))
    : appIcon.endsWith(".png")
      ? "image/png"
      : appIcon.endsWith(".jpg") || appIcon.endsWith(".jpeg")
        ? "image/jpeg"
        : appIcon.endsWith(".webp")
          ? "image/webp"
          : appIcon.endsWith(".svg")
            ? "image/svg+xml"
            : undefined;

  return {
    name: `${settings.storeName} | ${settings.tagline}`,
    short_name: settings.storeName,
    description: settings.about,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: settings.backgroundColor,
    theme_color: settings.primaryColor,
    lang: "ar",
    dir: "rtl",
    categories: ["shopping", "business"],
    icons: [
      { src: appIcon, sizes: "260x260", purpose: "any", ...(iconType ? { type: iconType } : {}) },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
