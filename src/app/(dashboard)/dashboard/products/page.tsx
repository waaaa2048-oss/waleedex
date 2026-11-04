import type { Metadata } from "next";
import { ProductsView } from "@/components/products/products-view";
import { getProductsByStore } from "@/lib/data";
import { getProductAnimalTypes, getStoreCategories } from "@/lib/admin-data";
import { requireUser } from "@/lib/auth";
import { roleCan } from "@/lib/roles";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { asc } from "drizzle-orm";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "إدارة المنتجات | لوحة التحكم" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}) {
  await ensureSeeded();
  const [{ storeId: storeIdParam }, user, storeRows] = await Promise.all([
    searchParams,
    requireUser(),
    db.select({ id: stores.id, name: stores.name, storeType: stores.storeType }).from(stores).orderBy(asc(stores.createdAt), asc(stores.id)),
  ]);
  const requestedStoreId = Number(storeIdParam);
  const selectedStore = storeRows.find((store) => store.id === requestedStoreId) ?? storeRows[0];
  if (!selectedStore) throw new Error("لا توجد متاجر لإدارة المنتجات");
  const [allProducts, allCategories, animalTypes] = await Promise.all([
    getProductsByStore(selectedStore.id),
    getStoreCategories(selectedStore.id),
    getProductAnimalTypes(selectedStore.id),
  ]);
  const products = user.role === "category_manager"
    ? allProducts.filter((product) => user.allowedCategories.includes(product.category))
    : allProducts;
  const categories = user.role === "category_manager"
    ? allCategories.filter((category) => user.allowedCategories.includes(category.name))
    : allCategories;
  return (
    <ProductsView
      key={selectedStore.id}
      initialProducts={products}
      initialStoreId={String(selectedStore.id)}
      selectedStoreName={selectedStore.name}
      storeType={selectedStore.storeType}
      categories={categories}
      animalTypes={animalTypes}
      canWrite={roleCan(user.role, user.permissions, "products.write")}
      canDelete={roleCan(user.role, user.permissions, "products.delete")}
      canManageCategories={roleCan(user.role, user.permissions, "categories.write")}
    />
  );
}
