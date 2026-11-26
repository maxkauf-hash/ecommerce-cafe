import { gt, sql, type SQL } from 'drizzle-orm';
import { productVariants, products } from '../db/schema';
import type { CatalogListFilters } from '../interfaces/catalog-repository.interface';
import type { FilterStrategy } from '../interfaces/filter-strategy.interface';

export class InStockStrategy implements FilterStrategy {
  applies(filters: CatalogListFilters) {
    return filters.inStockOnly === true;
  }
  build(filters: CatalogListFilters): SQL | undefined {
    if (!this.applies(filters)) {
      return undefined;
    }
    return sql`exists (select 1 from ${productVariants} where ${productVariants.productId} = ${products.id} and ${gt(productVariants.availableStock, 0)})`;
  }
}
