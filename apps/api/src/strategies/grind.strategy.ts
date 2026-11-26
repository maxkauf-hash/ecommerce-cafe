import { sql, type SQL } from 'drizzle-orm';
import { productVariants, products } from '../db/schema';
import type { CatalogListFilters } from '../interfaces/catalog-repository.interface';
import type { FilterStrategy } from '../interfaces/filter-strategy.interface';

export class GrindStrategy implements FilterStrategy {
  applies(filters: CatalogListFilters) {
    return Boolean(filters.grind);
  }
  build(filters: CatalogListFilters): SQL | undefined {
    if (!filters.grind) {
      return undefined;
    }
    return sql`exists (select 1 from ${productVariants} where ${productVariants.productId} = ${products.id} and ${productVariants.grind} = ${filters.grind})`;
  }
}
