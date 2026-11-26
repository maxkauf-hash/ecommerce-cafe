import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CatalogQuery } from '@monorepo/shared';
import type { CatalogService } from '../services/catalog.service.js';

export interface ProductSlugParams {
  slug: string;
}

export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  async listProducts(request: FastifyRequest<{ Querystring: CatalogQuery }>, reply: FastifyReply) {
    const result = await this.catalogService.listProducts(request.query);
    return reply.status(200).send(result);
  }

  async getProductBySlug(
    request: FastifyRequest<{ Params: ProductSlugParams }>,
    reply: FastifyReply,
  ) {
    const product = await this.catalogService.getProductBySlug(request.params.slug);
    return reply.status(200).send({ product });
  }
}
