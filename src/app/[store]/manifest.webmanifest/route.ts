import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { getStoreSettings } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ store: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { store: slug } = await params;
  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.slug, slug.toLowerCase()))
    .limit(1);
  if (!store) return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });

  const settings = await getStoreSettings(store.id);
  const appIcon = store.logoUrl || settings.logoUrl || settings.faviconUrl || "/icon.svg";
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

  return NextResponse.json(
    {
      name: `${store.name} | ${settings.tagline}`,
      short_name: store.name,
      description: settings.about,
      start_url: `/${store.slug}/`,
      scope: `/${store.slug}/`,
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
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/manifest+json; charset=utf-8",
      },
    },
  );
}
