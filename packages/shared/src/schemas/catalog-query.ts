import { z } from 'zod';
import { grindOptionSchema } from './product.js';

export const catalogSortSchema = z.enum(['featured', 'price_asc', 'price_desc', 'newest']);

export const catalogQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).optional(),
  grind: grindOptionSchema.optional(),
  minPriceCents: z.coerce.number().int().nonnegative().optional(),
  maxPriceCents: z.coerce.number().int().nonnegative().optional(),
  inStockOnly: z.coerce.boolean().optional(),
  sort: catalogSortSchema.default('featured'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export type CatalogSort = z.infer<typeof catalogSortSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
