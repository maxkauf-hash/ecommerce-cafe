import type { CatalogQuery, Product } from '@monorepo/shared';

export interface CatalogListFilters {
  search?: string | undefined;
  category?: string | undefined;
  grind?: CatalogQuery['grind'] | undefined;
  minPriceCents?: number | undefined;
  maxPriceCents?: number | undefined;
  inStockOnly?: boolean | undefined;
  sort: CatalogQuery['sort'] | undefined;
  page: number | undefined;
  pageSize: number | undefined;
}

export interface CatalogListResult {
  items: Product[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CatalogRepository {
  findPaginatedProducts(filters: CatalogListFilters): Promise<{
    items: Product[];
    totalItems: number;
  }>;
  findActiveProductBySlug(slug: string): Promise<Product | null>;
}
