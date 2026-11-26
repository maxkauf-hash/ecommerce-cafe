import type { FilterStrategy } from '../interfaces/filter-strategy.interface';
import { SearchStrategy } from '../strategies/search.strategy';
import { CategoryStrategy } from '../strategies/category.strategy';
import { GrindStrategy } from '../strategies/grind.strategy';
import { PriceRangeStrategy } from '../strategies/price.strategy';
import { InStockStrategy } from '../strategies/in-stock.strategy';
import type { CatalogListFilters } from '../interfaces/catalog-repository.interface';
import { and, eq, type SQL } from 'drizzle-orm';
import { products } from '../db/schema';

const STRATEGIES: FilterStrategy[] = [
  new SearchStrategy(),
  new CategoryStrategy(),
  new GrindStrategy(),
  new PriceRangeStrategy(),
  new InStockStrategy(),
];

export function buildCatalogWhere(filters: CatalogListFilters): SQL | undefined {
  const conditions: SQL[] = [eq(products.isActive, true)];

  for (const strategy of STRATEGIES) {
    if (strategy.applies(filters)) {
      const cond = strategy.build(filters);
      if (cond) conditions.push(cond);
    }
  }

  return and(...conditions);
}
