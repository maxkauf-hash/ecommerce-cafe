import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import type {
  CatalogListFilters,
  CatalogRepository,
} from '../interfaces/catalog-repository.interface';
import type { DrizzleDb } from '../interfaces/drizzle.interface';
import { categories, products, productVariants } from '../db/schema';
import type { Product, ProductVariant } from '@monorepo/shared';
import { countCatalogProducts } from '../queries/catalog.query';
import { buildCatalogWhere } from '../registries/filter-strategy.registry';

export class DrizzleProductRepository implements CatalogRepository {
  constructor(private readonly db: DrizzleDb) {}

  /**
   * Lists active products matching the given catalog filters, with their
   * category and variants, along with the total match count for pagination.
   * @param filters The catalog filters, including pagination and sort options.
   * @returns The page of products in domain form and the total item count.
   */
  async findPaginatedProducts(filters: CatalogListFilters): Promise<{
    items: Product[];
    totalItems: number;
  }> {
    const whereCondition = buildCatalogWhere(filters);

    // 1. Compte total des produits correspondant aux filtres
    const totalItems = await countCatalogProducts(this.db, whereCondition);

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 12;

    // 2. Une seule requête : page de produits + catégorie + variantes (pas de N+1)
    const rows = await this.db.query.products.findMany({
      where: whereCondition,
      orderBy: this.buildOrderByClauses(filters.sort),
      limit: pageSize,
      offset: (page - 1) * pageSize,
      with: {
        category: true,
        variants: {
          orderBy: [asc(productVariants.weightGrams), asc(productVariants.priceCents)],
        },
      },
    });

    return {
      items: rows.map((row) => this.toDomainProduct(row)),
      totalItems,
    };
  }

  /**
   * Finds an active product by its slug, including its category and variants.
   * @param slug The product slug.
   * @returns The product in domain form, or null if not found or inactive.
   */
  async findActiveProductBySlug(slug: string): Promise<Product | null> {
    const row = await this.db.query.products.findFirst({
      where: and(eq(products.slug, slug), eq(products.isActive, true)),
      with: {
        category: true,
        variants: {
          orderBy: [asc(productVariants.weightGrams), asc(productVariants.priceCents)],
        },
      },
    });

    if (!row) {
      return null;
    }

    return this.toDomainProduct(row);
  }

  private buildOrderByClauses(sort: CatalogListFilters['sort']): SQL[] {
    const minPrice = sql`(select min(${productVariants.priceCents}) from ${productVariants} where ${productVariants.productId} = ${products.id})`;
    const maxPrice = sql`(select max(${productVariants.priceCents}) from ${productVariants} where ${productVariants.productId} = ${products.id})`;

    switch (sort) {
      case 'price_asc':
        return [asc(minPrice), asc(products.title), asc(products.id)];
      case 'price_desc':
        return [desc(maxPrice), asc(products.title), asc(products.id)];
      case 'newest':
        return [desc(products.createdAt), asc(products.id)];
      case 'featured':
      default:
        return [desc(products.createdAt), asc(products.title), asc(products.id)];
    }
  }

  private toDomainProduct(
    row: typeof products.$inferSelect & {
      category: typeof categories.$inferSelect;
      variants: Array<typeof productVariants.$inferSelect>;
    },
  ): Product {
    const mappedVariants: ProductVariant[] = row.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      label: variant.label,
      weightGrams: variant.weightGrams,
      grind: variant.grind,
      priceCents: variant.priceCents,
      availableStock: variant.availableStock,
      reservedStock: variant.reservedStock,
    }));

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      tastingNotes: row.tastingNotes,
      origin: row.origin,
      isActive: row.isActive,
      category: {
        id: row.category.id,
        name: row.category.name,
        slug: row.category.slug,
      },
      variants: mappedVariants,
    };
  }
}
