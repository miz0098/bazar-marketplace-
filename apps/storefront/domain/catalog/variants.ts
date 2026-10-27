import type { ProductSummary } from '@/services/contracts/catalog';
export const cartKey = (product: ProductSummary) =>
  product.variantId ?? product.id;
export function selectVariant(
  product: ProductSummary,
  variantId?: string,
): ProductSummary | undefined {
  const variants = product.variants;
  if (!variants?.length)
    return variantId && variantId !== product.id ? undefined : product;
  const variant =
    variants.find((v) => v.id === (variantId ?? product.id)) ??
    (!variantId ? variants[0] : undefined);
  if (!variant) return undefined;
  return {
    ...product,
    title: variant.productTitle ?? product.title,
    variantId: variant.id,
    offerId:variant.id,
    variantLabel: variant.title,
    price: variant.price,
    stock: variant.stock,
    available: variant.available ?? false,
    requiresVariantSelection:false,
    compareAtPrice:
      variant.id === product.id ? product.compareAtPrice : undefined,
  };
}
