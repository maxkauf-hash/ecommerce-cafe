export function formatPriceFromCents(
  priceCents: number,
  locale = 'fr-FR',
  currency = 'EUR',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(priceCents / 100);
}

export function getMinVariantPriceCents(
  variants: ReadonlyArray<{ priceCents: number }>,
): number | null {
  if (variants.length === 0) return null;
  return variants.reduce(
    (min, variant) => (variant.priceCents < min ? variant.priceCents : min),
    variants[0]!.priceCents,
  );
}
