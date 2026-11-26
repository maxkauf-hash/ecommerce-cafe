import type { SQL } from 'drizzle-orm';
import type { CatalogListFilters } from '../interfaces/catalog-repository.interface';

export interface FilterStrategy {
  applies(filters: CatalogListFilters): boolean;
  build(filters: CatalogListFilters): SQL | undefined;
}
