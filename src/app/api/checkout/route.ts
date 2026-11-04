import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { customers, orderItems, orders, productModifiers, products, stores } from '@/db/schema';
import { getGlobalPaymentMethods } from '@/lib/payment-methods';
import { getStoreSettings } from '@/lib/admin-data';
import { getPaymentCredentialStatus } from '@/lib/payment-credentials';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const phoneFromCookie = cookieStore.get('user_phone')?.value;
    const body = await request.json().catch(() => ({}));
    const { phone, items, paymentMethod, fulfillment, city, district, street, locationDetails, notes, deliveryDate, timeSlot, storeId, storeSlug, cuttingType, coldShippingAccepted } = body as Record<string, unknown>;
    const targetPhone = typeof phoneFromCookie === 'string' ? phoneFromCookie : typeof phone === 'string' ? phone : '';

    if (!targetPhone) {
      return NextResponse.json({ error: 'يلزم تسجيل الدخول لإتمام الطلب' }, { status: 401 });
    }

    const [customer] = await db.select().from(customers).where(eq(customers.phone, targetPhone)).limit(1);
    if (!customer) {
      return NextResponse.json({ error: 'حساب العميل غير موجود' }, { status: 404 });
    }

    const addressParts = [`المدينة: ${typeof city === 'string' ? city : 'الرياض'}`];
    if (typeof district === 'string' && district.trim()) addressParts.push(`الحي: ${district}`);
    if (typeof street === 'string' && street.trim()) addressParts.push(`الشارع: ${street}`);
    if (typeof locationDetails === 'string' && locationDetails.trim()) addressParts.push(`الموقع: ${locationDetails}`);
    const fullAddress = addressParts.join(' | ');

    const rawItems = Array.isArray(items) ? items : [];
    if (rawItems.length === 0) {
      return NextResponse.json({ error: 'سلة المشتريات فارغة' }, { status: 400 });
    }
    const productIds = [...new Set(rawItems
      .map((item) => Number((item as Record<string, unknown>).productId ?? (item as Record<string, unknown>).id ?? 0))
      .filter((id) => Number.isFinite(id) && id > 0))];
    if (productIds.length === 0) {
      return NextResponse.json({ error: 'المنتجات المحددة غير صالحة' }, { status: 400 });
    }

    const productRows = productIds.length > 0 ? await db.select().from(products).where(inArray(products.id, productIds)) : [];
    const byId = new Map(productRows.map((product) => [product.id, product]));

    const storeIds = [...new Set(productRows.map((product) => Number(product.storeId)).filter((id) => Number.isFinite(id)))];
    if (storeIds.length !== 1 || productRows.length !== productIds.length) {
      return NextResponse.json({ error: 'لا يمكن دمج منتجات من متاجر مختلفة في طلب واحد.' }, { status: 400 });
    }
    const uniqueStoreId = storeIds[0];
    if (productIds.length > 0 && productRows.length > 0 && productRows.some((product) => Number(product.storeId) !== uniqueStoreId)) {
      return NextResponse.json({ error: 'لا يمكن دمج منتجات من متاجر مختلفة في طلب واحد.' }, { status: 400 });
    }

    if (storeId !== undefined && Number(storeId) !== uniqueStoreId) {
      return NextResponse.json({ error: 'متجر السلة لا يطابق المتجر المرتبط بالمنتجات.' }, { status: 400 });
    }

    const [store] = await db.select().from(stores).where(eq(stores.id, uniqueStoreId)).limit(1);
    if (!store || (typeof storeSlug === 'string' && storeSlug !== store.slug)) {
      return NextResponse.json({ error: 'المتجر المحدد غير موجود أو غير مطابق للسلة.' }, { status: 400 });
    }
    if (store.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'هذا المتجر غير متاح لاستقبال الطلبات حالياً.' }, { status: 409 });
    }

    const [methods, paymentSettings, credentialStatus] = await Promise.all([
      getGlobalPaymentMethods(),
      getStoreSettings(uniqueStoreId),
      getPaymentCredentialStatus(),
    ]);
    const requestedMethod = typeof paymentMethod === 'string' ? paymentMethod : '';
    const enabledMethods: Record<string, boolean> = {
      cash: methods.codEnabled,
      transfer: methods.bankTransferEnabled && /^SA\d{22}$/.test(paymentSettings.bankIban.replace(/\s/g, '').toUpperCase()),
      moyasar: methods.moyasarEnabled && credentialStatus.moyasar,
      tabby: methods.tabbyEnabled && credentialStatus.tabby,
      tamara: methods.tamaraEnabled && credentialStatus.tamara,
    };
    if (!enabledMethods[requestedMethod]) {
      return NextResponse.json({ error: 'طريقة الدفع المحددة غير مفعّلة لهذا المتجر.' }, { status: 400 });
    }
    if (store.storeType === 'SLAUGHTERHOUSE' && (typeof deliveryDate !== 'string' || !deliveryDate.trim())) {
      return NextResponse.json({ error: 'يرجى اختيار تاريخ الاستلام للذبائح.' }, { status: 400 });
    }
    if (store.storeType === 'FROZEN' && fulfillment !== 'pickup' && coldShippingAccepted !== true) {
      return NextResponse.json({ error: 'الموافقة على شروط الشحن المبرد مطلوبة.' }, { status: 400 });
    }

    const modifierRows = await db
      .select()
      .from(productModifiers)
      .where(inArray(productModifiers.productId, productIds));
    const modifiersByProduct = new Map<number, typeof modifierRows>();
    for (const modifier of modifierRows) {
      const current = modifiersByProduct.get(modifier.productId) ?? [];
      current.push(modifier);
      modifiersByProduct.set(modifier.productId, current);
    }

    let calculatedTotal = 0;
    const orderItemsData: Array<{ productId: number | null; name: string; quantity: number; animalType: string; weightKg: string; unitPrice: string; lineTotal: string }> = [];

    for (const item of rawItems) {
      const current = item as Record<string, unknown>;
      const prodId = Number(current.productId ?? current.id ?? 0);
      const qty = Number(current.quantity ?? 1);
      const product = prodId ? byId.get(prodId) ?? null : null;

      if (!product || !product.isActive) {
        return NextResponse.json({ error: 'أحد المنتجات لم يعد متاحاً للطلب.' }, { status: 409 });
      }
      if (!Number.isInteger(qty) || qty < 1 || qty > 99 || product.stock < qty) {
        return NextResponse.json({ error: `الكمية المطلوبة غير متاحة للمنتج: ${product.name}` }, { status: 409 });
      }

      const allowedModifiers = modifiersByProduct.get(product.id) ?? [];
      const requestedOptions = Array.isArray(current.selectedOptions) ? current.selectedOptions : [];
      const selectedOptions: Array<{ modifierName: string; label: string; priceDelta: number }> = [];
      for (const modifier of allowedModifiers) {
        const selected = requestedOptions.find((option) => {
          if (!option || typeof option !== 'object') return false;
          const value = (option as Record<string, unknown>).value;
          const modifierName = (option as Record<string, unknown>).modifierName;
          return modifierName === modifier.name && typeof value === 'string';
        }) as Record<string, unknown> | undefined;
        if (!selected) {
          if (modifier.required) {
            return NextResponse.json({ error: `يرجى اختيار ${modifier.name} للمنتج ${product.name}.` }, { status: 400 });
          }
          continue;
        }

        const selectedValue = String(selected.value);
        const matchingOption = modifier.options.find((option) => option.value === selectedValue);
        if (!matchingOption || typeof matchingOption.label !== 'string') {
          return NextResponse.json({ error: `خيار غير صالح للمنتج ${product.name}.` }, { status: 400 });
        }
        selectedOptions.push({
          modifierName: modifier.name,
          label: matchingOption.label,
          priceDelta: Number(matchingOption.priceDelta ?? 0) || 0,
        });
      }
      if (requestedOptions.length !== selectedOptions.length) {
        return NextResponse.json({ error: `توجد خيارات غير صالحة للمنتج ${product.name}.` }, { status: 400 });
      }

      const basePrice = Number(product.fixedPrice && Number(product.fixedPrice) > 0
        ? product.fixedPrice
        : Number(product.weightKg) * Number(product.pricePerKg));
      const optionPrice = selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);
      const unitPrice = Math.max(0, basePrice + optionPrice);
      const name = [
        `${product.name} (SKU: ${product.sku})`,
        ...selectedOptions.map((option) => `${option.modifierName}: ${option.label}`),
      ].join(' — ');
      const lineTotal = unitPrice * qty;
      calculatedTotal += lineTotal;

      orderItemsData.push({
        productId: product.id,
        name,
        quantity: qty,
        animalType: product.animalType,
        weightKg: String(product.weightKg ?? '0'),
        unitPrice: String(unitPrice),
        lineTotal: String(lineTotal),
      });
    }

    const orderCode = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const deliveryInfo = store.storeType === 'SLAUGHTERHOUSE'
      ? `موعد الاستلام: ${typeof deliveryDate === 'string' ? deliveryDate : 'غير محدد'} - الفترة: ${typeof timeSlot === 'string' ? timeSlot : 'غير محدد'}`
      : '';
    const cuttingInfo = store.storeType === 'SLAUGHTERHOUSE' && typeof cuttingType === 'string' && cuttingType.trim()
      ? `نوع التقطيع: ${cuttingType}`
      : '';
    const frozenInfo = store.storeType === 'FROZEN' && fulfillment !== 'pickup'
      ? 'الشحن المبرد: تمت الموافقة على شروط الحفاظ على سلسلة التبريد'
      : '';
    const finalNotes = [deliveryInfo, cuttingInfo, frozenInfo, typeof notes === 'string' ? notes : ''].filter(Boolean).join(' | ');

    const [newOrder] = await db
      .insert(orders)
      .values({
        code: orderCode,
        customerId: customer.id,
        storeId: uniqueStoreId,
        status: 'new',
        fulfillment: typeof fulfillment === 'string' ? fulfillment : 'delivery',
        deliveryDate: typeof deliveryDate === 'string' && deliveryDate ? deliveryDate : null,
        deliveryAddress: fullAddress,
        deliveryFee: '0',
        paymentMethod: requestedMethod,
        notes: finalNotes,
        totalAmount: String(calculatedTotal),
        paidAmount: '0',
      })
      .returning();

    if (orderItemsData.length > 0) {
      await db.insert(orderItems).values(
        orderItemsData.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          name: item.name,
          animalType: item.animalType,
          quantity: item.quantity,
          weightKg: item.weightKg,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      );
    }

    return NextResponse.json({
      success: true,
      order: { id: newOrder.id, code: newOrder.code, totalAmount: calculatedTotal },
    });
  } catch (error: unknown) {
    console.error('Error in checkout API:', error);
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الطلب';
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الطلب: ' + message }, { status: 500 });
  }
}
