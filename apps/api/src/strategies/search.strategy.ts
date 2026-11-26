import { ilike, or, sql } from 'drizzle-orm';
import { products } from '../db/schema';
import type { CatalogListFilters } from '../interfaces/catalog-repository.interface';
import type { FilterStrategy } from '../interfaces/filter-strategy.interface';

export class SearchStrategy implements FilterStrategy {
  applies(filters: CatalogListFilters) {
    return Boolean(filters.search);
  }
  build(filters: CatalogListFilters) {
    const pattern = `%${filters.search}%`;
    return or(
      ilike(products.title, pattern),
      ilike(products.description, pattern),
      ilike(products.origin, pattern),
      sql`array_to_string(${products.tastingNotes}, ' ') ILIKE ${pattern}`,
    );
  }
}
