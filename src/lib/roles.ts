/**
 * roles.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. دعم دور المالك (owner / OWNER) بجانب (admin / ADMIN) ليعطي صلاحيات كاملة.
 *   2. استخدام Object.hasOwn لمنع الـ crash.
 */

export const ROLE_PRESETS = [
  { value: "admin", label: "مدير عام / مالك", description: "صلاحيات كاملة على المتجر والفريق والإعدادات" },
  { value: "manager", label: "مدير متجر", description: "إدارة الطلبات والمنتجات والعملاء والتقارير" },
  { value: "sales", label: "مسؤول مبيعات", description: "الطلبات والعملاء وإنشاء الطلبات" },
  { value: "category_manager", label: "مسؤول أقسام", description: "إدارة المنتجات ضمن تصنيفات محددة فقط" },
  { value: "inventory_manager", label: "مسؤول مخزون", description: "المنتجات والكميات والجرد" },
  { value: "marketing", label: "مسؤول تسويق", description: "الكوبونات والعروض والتصنيفات" },
  { value: "accountant", label: "محاسب", description: "التقارير والمدفوعات والفواتير" },
  { value: "support", label: "خدمة العملاء", description: "العملاء والاطلاع على الطلبات" },
  { value: "shipping", label: "مسؤول شحن", description: "الطلبات ومواعيد التجهيز والتوصيل" },
  { value: "content", label: "مسؤول محتوى", description: "الثيم وعناصر الواجهة والتصنيفات" },
] as const;

export type EmployeeRole = (typeof ROLE_PRESETS)[number]["value"];

export const PERMISSION_OPTIONS = [
  { id: "orders.read", label: "عرض الطلبات", group: "الطلبات" },
  { id: "orders.create", label: "إنشاء الطلبات", group: "الطلبات" },
  { id: "orders.update", label: "تعديل الطلبات والحالة", group: "الطلبات" },
  { id: "orders.delete", label: "حذف الطلبات", group: "الطلبات" },
  { id: "products.read", label: "عرض المنتجات", group: "المنتجات" },
  { id: "products.write", label: "إضافة وتعديل المنتجات", group: "المنتجات" },
  { id: "products.delete", label: "حذف المنتجات", group: "المنتجات" },
  { id: "inventory.write", label: "إدارة المخزون والجرد", group: "المنتجات" },
  { id: "categories.write", label: "إدارة التصنيفات", group: "المنتجات" },
  { id: "customers.read", label: "عرض العملاء", group: "العملاء" },
  { id: "customers.write", label: "إضافة وتعديل العملاء", group: "العملاء" },
  { id: "services.write", label: "إدارة الخدمات", group: "الكتالوج" },
  { id: "coupons.write", label: "إدارة العروض والكوبونات", group: "التسويق" },
  { id: "reports.read", label: "عرض التقارير", group: "التقارير" },
  { id: "payments.write", label: "إدارة الدفع والفواتير", group: "المالية" },
  { id: "shipping.write", label: "إدارة الشحن والتوصيل", group: "الشحن" },
  { id: "shipping.read", label: "عرض شركات الشحن والبوليصات", group: "الشحن" },
  { id: "theme.write", label: "تعديل تصميم المتجر", group: "المتجر" },
  { id: "integrations.write", label: "إدارة التكاملات", group: "المتجر" },
  { id: "employees.write", label: "إدارة الموظفين", group: "الإدارة" },
  { id: "settings.write", label: "إدارة إعدادات المتجر", group: "الإدارة" },
] as const;

const ROLE_DEFAULTS: Record<EmployeeRole, string[]> = {
  admin: PERMISSION_OPTIONS.map((item) => item.id),
  manager: ["orders.read", "orders.create", "orders.update", "products.read", "products.write", "inventory.write", "categories.write", "customers.read", "customers.write", "services.write", "coupons.write", "reports.read", "payments.write", "shipping.write", "shipping.read"],
  sales: ["orders.read", "orders.create", "orders.update", "products.read", "customers.read", "customers.write"],
  category_manager: ["products.read", "products.write", "inventory.write"],
  inventory_manager: ["products.read", "products.write", "inventory.write"],
  marketing: ["products.read", "categories.write", "coupons.write", "reports.read"],
  accountant: ["orders.read", "customers.read", "reports.read", "payments.write"],
  support: ["orders.read", "customers.read", "customers.write"],
  shipping: ["orders.read", "orders.update", "shipping.read", "shipping.write"],
  content: ["products.read", "categories.write", "theme.write", "integrations.write"],
};

export function defaultPermissions(role: string): string[] {
  const lowerRole = role?.toLowerCase();
  if (lowerRole === "admin" || lowerRole === "owner") return ROLE_DEFAULTS.admin;
  if (lowerRole === "staff") return ROLE_DEFAULTS.sales;
  return Object.hasOwn(ROLE_DEFAULTS, lowerRole)
    ? ROLE_DEFAULTS[lowerRole as EmployeeRole]
    : ROLE_DEFAULTS.sales;
}

export function roleLabel(role: string): string {
  const lowerRole = role?.toLowerCase();
  if (lowerRole === "admin" || lowerRole === "owner") return "مدير عام / مالك";
  if (lowerRole === "staff") return "موظف";
  return ROLE_PRESETS.find((item) => item.value === lowerRole)?.label ?? "موظف";
}

export function roleCan(role: string, permissions: string[] | null | undefined, permission: string): boolean {
  const lowerRole = role?.toLowerCase();
  if (lowerRole === "admin" || lowerRole === "owner") return true;
  const effective = permissions?.length ? permissions : defaultPermissions(role);
  if (permission === "shipping.read" && effective.includes("shipping.write")) return true;
  return effective.includes(permission) && !effective.includes("__none__");
}
