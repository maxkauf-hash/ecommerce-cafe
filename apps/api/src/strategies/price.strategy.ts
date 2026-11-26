import { and, gte, lte, sql, type SQL } from 'drizzle-orm';
import { productVariants, products } from '../db/schema';
import type { CatalogListFilters } from '../interfaces/catalog-repository.interface';
import type { FilterStrategy } from '../interfaces/filter-strategy.interface';

export class PriceRangeStrategy implements FilterStrategy {
  applies(filters: CatalogListFilters) {
    return filters.minPriceCents !== undefined || filters.maxPriceCents !== undefined;
  }
  build(filters: CatalogListFilters): SQL | undefined {
    const conds: SQL[] = [];
    if (filters.minPriceCents !== undefined) {
      conds.push(gte(productVariants.priceCents, filters.minPriceCents));
    }
    if (filters.maxPriceCents !== undefined) {
      conds.push(lte(productVariants.priceCents, filters.maxPriceCents));
    }
    if (conds.length === 0) {
      return undefined;
    }
    // Les deux bornes doivent être satisfaites par la MÊME variante
    return sql`exists (select 1 from ${productVariants} where ${productVariants.productId} = ${products.id} and ${and(...conds)})`;
  }
}
