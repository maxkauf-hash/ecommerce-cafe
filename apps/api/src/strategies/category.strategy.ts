import { sql, type SQL } from 'drizzle-orm';
import { categories, products } from '../db/schema';
import type { CatalogListFilters } from '../interfaces/catalog-repository.interface';
import type { FilterStrategy } from '../interfaces/filter-strategy.interface';

export class CategoryStrategy implements FilterStrategy {
  applies(filters: CatalogListFilters) {
    return Boolean(filters.category);
  }
  build(filters: CatalogListFilters): SQL | undefined {
    if (!filters.category) {
      return undefined;
    }
    return sql`exists (select 1 from ${categories} where ${categories.id} = ${products.categoryId} and ${categories.slug} = ${filters.category})`;
  }
}
