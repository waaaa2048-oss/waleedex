/**
 * checkout-shipping.ts
 * ─────────────────────────────────────────────
 * التعديلات في هذا الإصدار:
 *   1. getCheckoutDeliveryFee يرمي خطأً واضحاً عند option غير صالح.
 *   2. Object.freeze لمنع تعديل الرسوم في runtime.
 *   3. توثيق أن الرسوم hardcoded (وليست من storeSettings.deliveryFee).
 *
 * ⚠️ ملاحظة: هذه الرسوم ثابتة في الكود. تحقّق من
 *     api/checkout/route.ts و checkout-flow.tsx
 *     للتأكد من عدم تعارضها مع storeSettings.deliveryFee.
 */

export const CHECKOUT_DELIVERY_OPTIONS = Object.freeze({
  immediate: Object.freeze({
    label: "توصيل فوري",
    description: "خلال ٦٠–٩٠ دقيقة",
    fee: 35,
  }),
  scheduled: Object.freeze({
    label: "توصيل مجدول",
    description: "اختر اليوم والفترة الزمنية",
    fee: 25,
  }),
} as const);

export type CheckoutDeliveryOption = keyof typeof CHECKOUT_DELIVERY_OPTIONS;

/**
 * Returns the delivery fee (in SAR) for the given option.
 * Throws on unknown options — callers should use `isCheckoutDeliveryOption`
 * first when the value comes from user input.
 */
export function getCheckoutDeliveryFee(option: CheckoutDeliveryOption): number {
  const config = CHECKOUT_DELIVERY_OPTIONS[option];
  if (!config) {
    throw new Error(`Invalid delivery option: ${String(option)}`);
  }
  return config.fee;
}

export function isCheckoutDeliveryOption(value: unknown): value is CheckoutDeliveryOption {
  return value === "immediate" || value === "scheduled";
}