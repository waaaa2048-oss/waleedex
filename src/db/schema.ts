import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ----------------------------- Auth ----------------------------- */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: text("role").notNull().default("sales"),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  allowedCategories: jsonb("allowed_categories").$type<string[]>().notNull().default([]),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_expires_idx").on(t.expiresAt)],
);

/* --------------------------- Products --------------------------- */

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  storeType: text("store_type").notNull().default("SLAUGHTERHOUSE"),
  status: text("status").notNull().default("PUBLISHED"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  sku: text("sku").notNull().default("SKU-AUTO").unique(),
  name: text("name").notNull(),
  animalType: text("animal_type").notNull().default("خروف"),
  category: text("category").notNull().default("النعيمي الكشميري"),
  kind: text("kind").notNull().default("ready"),
  description: text("description").notNull().default(""),
  weightKg: numeric("weight_kg", { precision: 8, scale: 2 }).notNull().default("0"),
  pricePerKg: numeric("price_per_kg", { precision: 10, scale: 2 }).notNull().default("0"),
  fixedPrice: numeric("fixed_price", { precision: 10, scale: 2 }),
  stock: integer("stock").notNull().default(0),
  imageUrl: text("image_url"),
  origin: text("origin").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productModifiers = pgTable("product_modifiers", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("select"),
  required: boolean("required").notNull().default(false),
  options: jsonb("options").$type<Array<Record<string, unknown>>>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productInventoryMovements = pgTable("product_inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  reason: text("reason").notNull().default("تعديل يدوي"),
  actorName: text("actor_name").notNull().default("النظام"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* --------------------------- Services --------------------------- */

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("طبخ"),
  description: text("description").notNull().default(""),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  unit: text("unit").notNull().default("للطلب"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* --------------------------- Customers -------------------------- */

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  city: text("city").notNull().default("الرياض"),
  address: text("address"),
  notes: text("notes"),
  passwordHash: text("password_hash"),
  isVip: boolean("is_vip").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ----------------------------- Orders --------------------------- */

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("new"),
  fulfillment: text("fulfillment").notNull().default("delivery"),
  deliveryDate: date("delivery_date", { mode: "string" }),
  deliveryAddress: text("delivery_address"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method").notNull().default("cash"),
  moyasarPaymentId: text("moyasar_payment_id").unique(),
  moyasarPaymentStatus: text("moyasar_payment_status").notNull().default("not_started"),
  tabbyPaymentId: text("tabby_payment_id").unique(),
  tabbyPaymentStatus: text("tabby_payment_status").notNull().default("not_started"),
  tamaraOrderId: text("tamara_order_id").unique(),
  tamaraPaymentStatus: text("tamara_payment_status").notNull().default("not_started"),
  paymentReceiptPath: text("payment_receipt_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  animalType: text("animal_type").notNull().default("خروف"),
  quantity: integer("quantity").notNull().default(1),
  weightKg: numeric("weight_kg", { precision: 8, scale: 2 }).notNull().default("0"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const orderServices = pgTable("order_services", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").references(() => services.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0"),
});

export type UserRow = typeof users.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type ProductInventoryMovementRow = typeof productInventoryMovements.$inferSelect;
export type CustomerRow = typeof customers.$inferSelect;
export type ServiceRow = typeof services.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type OrderServiceRow = typeof orderServices.$inferSelect;

/* ----------------------- Store customization -------------------- */

export const storeSettings = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }).unique(),
  appDownloadSettings: jsonb("app_download_settings").$type<import("@/lib/store-defaults").AppDownloadSettings>().notNull().default({} as import("@/lib/store-defaults").AppDownloadSettings),
  storeName: text("store_name").notNull().default("أهل الكرم"),
  tagline: text("tagline").notNull().default("عشاك جاهز"),
  announcement: text("announcement").notNull().default("توصيل مجاني داخل الرياض"),
  heroTitle: text("hero_title").notNull().default("عشاك جاهز من أهل الكرم"),
  heroSubtitle: text("hero_subtitle").notNull().default(""),
  heroImageUrl: text("hero_image_url"),
  backgroundColor: text("background_color").notNull().default("#fbf7ef"),
  backgroundImageUrl: text("background_image_url"),
  backgroundPattern: text("background_pattern").notNull().default("none"),
  surfaceColor: text("surface_color").notNull().default("#f6efe1"),
  primaryColor: text("primary_color").notNull().default("#0b3b2e"),
  accentColor: text("accent_color").notNull().default("#c9a227"),
  phone: text("phone").notNull().default("+966500748221"),
  email: text("email").notNull().default("waaaa2048@gmail.com"),
  whatsapp: text("whatsapp").notNull().default("966500748221"),
  address: text("address").notNull().default(""),
  workingHours: text("working_hours").notNull().default("يومياً ٩:٠٠ ص — ١٢:٠٠ م"),
  about: text("about").notNull().default(""),
  freeDocNumber: text("free_doc_number").notNull().default("FL-621217211"),
  instagram: text("instagram"),
  snapchat: text("snapchat"),
  tiktok: text("tiktok"),
  freeDelivery: boolean("free_delivery").notNull().default(true),
  minOrder: numeric("min_order", { precision: 10, scale: 2 }).notNull().default("0"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  prepHours: integer("prep_hours").notNull().default(4),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("15"),
  codEnabled: boolean("cod_enabled").notNull().default(false),
  applePayEnabled: boolean("apple_pay_enabled").notNull().default(false),
  moyasarEnabled: boolean("moyasar_enabled").notNull().default(false),
  bankTransferEnabled: boolean("bank_transfer_enabled").notNull().default(true),
  bankName: text("bank_name").notNull().default(""),
  bankAccountName: text("bank_account_name").notNull().default(""),
  bankIban: text("bank_iban").notNull().default(""),
  madaEnabled: boolean("mada_enabled").notNull().default(false),
  tabbyEnabled: boolean("tabby_enabled").notNull().default(false),
  tamaraEnabled: boolean("tamara_enabled").notNull().default(false),
  showReviews: boolean("show_reviews").notNull().default(true),
  showFeatured: boolean("show_featured").notNull().default(true),
  themePreset: text("theme_preset").notNull().default("store-emerald"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  fontFamily: text("font_family").notNull().default("Tajawal"),
  fontUrl: text("font_url"),
  fontWeight: text("font_weight").notNull().default("400,500,700,800"),
  useArabicNumbers: boolean("use_arabic_numbers").notNull().default(true),
  showBreadcrumbs: boolean("show_breadcrumbs").notNull().default(true),
  uniformProductHeights: boolean("uniform_product_heights").notNull().default(true),
  autoPlayCarousel: boolean("auto_play_carousel").notNull().default(true),
  enhancedCartToast: boolean("enhanced_cart_toast").notNull().default(true),
  autoLoadMore: boolean("auto_load_more").notNull().default(false),
  themeAnimations: boolean("theme_animations").notNull().default(true),
  loadingPageEnabled: boolean("loading_page_enabled").notNull().default(false),
  loaderImageUrl: text("loader_image_url"),
  loaderBackgroundColor: text("loader_background_color").notNull().default("#ffffff"),
  loaderLogoSize: integer("loader_logo_size").notNull().default(100),
  loaderDuration: integer("loader_duration").notNull().default(2),
  loaderSkipButton: boolean("loader_skip_button").notNull().default(true),
  loaderAllPages: boolean("loader_all_pages").notNull().default(false),
  topBarDark: boolean("top_bar_dark").notNull().default(false),
  mobileSidebarDark: boolean("mobile_sidebar_dark").notNull().default(false),
  footerDark: boolean("footer_dark").notNull().default(false),
  headerMobileLogoRight: boolean("header_mobile_logo_right").notNull().default(true),
  mobileBackButton: boolean("mobile_back_button").notNull().default(false),
  enlargedHeaderIcons: boolean("enlarged_header_icons").notNull().default(false),
  bottomNavEnabled: boolean("bottom_nav_enabled").notNull().default(false),
  sidebarBackground: text("sidebar_background").notNull().default("#ffffff"),
  hideUsefulLinks: boolean("hide_useful_links").notNull().default(false),
  hideCustomerService: boolean("hide_customer_service").notNull().default(false),
  announcementAutoHide: boolean("announcement_auto_hide").notNull().default(false),
  announcementSlide: boolean("announcement_slide").notNull().default(false),
  floatingAnnouncement: boolean("floating_announcement").notNull().default(false),
  announcementIcon: text("announcement_icon").notNull().default("✦"),
  announcementTextColor: text("announcement_text_color").notNull().default("#ffffff"),
  customerChannelsEnabled: boolean("customer_channels_enabled").notNull().default(true),
  freeDocVisible: boolean("free_doc_visible").notNull().default(true),
  storeAppVisible: boolean("store_app_visible").notNull().default(true),
  productCardBackground: text("product_card_background").notNull().default("#ffffff"),
  productCardBorder: text("product_card_border").notNull().default("#e9dfcf"),
  promoTitleBackground: text("promo_title_background").notNull().default("#f87e7e"),
  productImageRatio: integer("product_image_ratio").notNull().default(9),
  productCardRadius: text("product_card_radius").notNull().default("rounded"),
  customCss: text("custom_css").notNull().default(""),
  productAddIcon: text("product_add_icon").notNull().default("plus"),
  quickProductView: boolean("quick_product_view").notNull().default(true),
  wishlistVisible: boolean("wishlist_visible").notNull().default(true),
  hideProductFrame: boolean("hide_product_frame").notNull().default(false),
  hideDiscountBadge: boolean("hide_discount_badge").notNull().default(false),
  hideProductBackground: boolean("hide_product_background").notNull().default(false),
  boldProductTitle: boolean("bold_product_title").notNull().default(true),
  oneLineProductTitle: boolean("one_line_product_title").notNull().default(false),
  centeredProductText: boolean("centered_product_text").notNull().default(false),
  hideOutOfStockButton: boolean("hide_out_of_stock_button").notNull().default(false),
  hideAddToCart: boolean("hide_add_to_cart").notNull().default(false),
  hideWishlistButton: boolean("hide_wishlist_button").notNull().default(false),
  hideProductRatings: boolean("hide_product_ratings").notNull().default(false),
  hideProductCategory: boolean("hide_product_category").notNull().default(false),
  shineProductCard: boolean("shine_product_card").notNull().default(true),
  homepageSections: jsonb("homepage_sections").$type<unknown[]>().notNull().default([]),
  productAnimalTypes: jsonb("product_animal_types").$type<string[]>().notNull().default(["عام", "خروف", "تيس", "لحم مفروم", "حاشي"]),
  customDomain: text("custom_domain"),
  domainStatus: text("domain_status").notNull().default("none"),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  maintenanceMessage: text("maintenance_message").notNull().default("نعتذر، المتجر مغلق مؤقتاً للصيانة."),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentCredentials = pgTable("payment_credentials", {
  id: integer("id").primaryKey().default(1),
  encryptedCredentials: text("encrypted_credentials"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: integer("id").primaryKey().default(1),
  codEnabled: boolean("cod_enabled").notNull().default(false),
  bankTransferEnabled: boolean("bank_transfer_enabled").notNull().default(true),
  moyasarEnabled: boolean("moyasar_enabled").notNull().default(false),
  tabbyEnabled: boolean("tabby_enabled").notNull().default(false),
  tamaraEnabled: boolean("tamara_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const platformDomainSettings = pgTable("platform_domain_settings", {
  id: integer("id").primaryKey().default(1),
  customDomain: text("custom_domain"),
  domainStatus: text("domain_status").notNull().default("none"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  blurb: text("blurb").notNull().default(""),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isHighlight: boolean("is_highlight").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  rating: integer("rating").notNull().default(5),
  comment: text("comment").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("percent"),
  value: numeric("value", { precision: 10, scale: 2 }).notNull().default("0"),
  minOrder: numeric("min_order", { precision: 10, scale: 2 }).notNull().default("0"),
  usageLimit: integer("usage_limit").notNull().default(0),
  usedCount: integer("used_count").notNull().default(0),
  description: text("description").notNull().default(""),
  expiresAt: date("expires_at", { mode: "string" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  actorName: text("actor_name").notNull().default("النظام"),
  action: text("action").notNull(),
  entity: text("entity").notNull().default("عام"),
  entityId: text("entity_id"),
  details: text("details").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customerSessions = pgTable(
  "customer_sessions",
  {
    token: text("token").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customer_sessions_expires_idx").on(t.expiresAt)],
);

export const authAttempts = pgTable(
  "auth_attempts",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_attempts_reset_idx").on(t.resetAt)],
);

export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("أدوات"),
  url: text("url").notNull().default(""),
  accountId: text("account_id"),
  isEnabled: boolean("is_enabled").notNull().default(false),
  notes: text("notes").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("integrations_store_id_key_unique_idx").on(t.storeId, t.key)]);

export const appReleases = pgTable("app_releases", {
  id: serial("id").primaryKey(),
  releaseGroup: text("release_group").notNull(),
  platform: text("platform").notNull(),
  version: text("version").notNull(),
  notes: text("notes").notNull().default(""),
  artifactUrl: text("artifact_url"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shippingCarriers = pgTable("shipping_carriers", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  apiBaseUrl: text("api_base_url"),
  credentialsCiphertext: text("credentials_ciphertext"),
  isEnabled: boolean("is_enabled").notNull().default(false),
  showAtCheckout: boolean("show_at_checkout").notNull().default(false),
  billingMode: text("billing_mode").notNull().default("carrier_account"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "restrict" }),
  carrierId: integer("carrier_id")
    .references(() => shippingCarriers.id, { onDelete: "set null" }),
  externalShipmentId: text("external_shipment_id"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  labelUrl: text("label_url"),
  status: text("status").notNull().default("pending"),
  cancellationStatus: text("cancellation_status").notNull().default("not_requested"),
  shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }),
  billingReference: text("billing_reference"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AppReleaseRow = typeof appReleases.$inferSelect;
export type ShippingCarrierRow = typeof shippingCarriers.$inferSelect;
export type ShipmentRow = typeof shipments.$inferSelect;

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(), // "staff" | "customer"
    identifier: text("identifier").notNull(), // البريد أو الهاتف
    subjectId: integer("subject_id"), // اختياري
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("otp_codes_subject_idx").on(t.kind, t.subjectId),
    index("otp_codes_identifier_idx").on(t.kind, t.identifier),
  ],
);