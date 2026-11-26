import type { CatalogQuery, Product } from '@monorepo/shared';
import { BadRequestError, NotFoundError } from '../errors/http-error';
import type {
  CatalogListResult,
  CatalogRepository,
} from '../interfaces/catalog-repository.interface';

export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async listProducts(query: CatalogQuery): Promise<CatalogListResult> {
    if (
      query.minPriceCents !== undefined &&
      query.maxPriceCents !== undefined &&
      query.minPriceCents > query.maxPriceCents
    ) {
      throw new BadRequestError(
        'Le prix minimum ne peut pas être supérieur au prix maximum',
        {
          minPriceCents: query.minPriceCents,
          maxPriceCents: query.maxPriceCents,
        },
        'INVALID_PRICE_RANGE',
      );
    }

    const normalizedSearch = query.search?.trim() || undefined;
    const normalizedCategory = query.category?.trim().toLowerCase() || undefined;

    const { items, totalItems } = await this.catalogRepository.findPaginatedProducts({
      search: normalizedSearch,
      category: normalizedCategory,
      grind: query.grind,
      minPriceCents: query.minPriceCents,
      maxPriceCents: query.maxPriceCents,
      inStockOnly: query.inStockOnly,
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
    });

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1 && totalPages > 0,
      },
    };
  }

  async getProductBySlug(slug: string): Promise<Product> {
    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedSlug) {
      throw new BadRequestError('Le slug du produit est requis', { slug }, 'INVALID_PRODUCT_SLUG');
    }

    const product = await this.catalogRepository.findActiveProductBySlug(normalizedSlug);

    if (!product) {
      throw new NotFoundError(
        'Produit café introuvable',
        { slug: normalizedSlug },
        'PRODUCT_NOT_FOUND',
      );
    }

    return product;
  }
}
