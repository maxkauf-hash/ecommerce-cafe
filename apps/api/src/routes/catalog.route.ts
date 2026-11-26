import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { apiErrorSchema, catalogQuerySchema, productSchema } from '@monorepo/shared';
import type { CatalogController } from '../controllers/catalog.controller.js';

const productSlugParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .describe('Slug unique du produit café (ex. : ethiopie-yirgacheffe)'),
});

const catalogListResponseSchema = z.object({
  items: z.array(productSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalItems: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

const productDetailResponseSchema = z.object({
  product: productSchema,
});

export interface CatalogRoutesOptions {
  controller: CatalogController;
}

export const catalogRoutes: FastifyPluginAsyncZod<CatalogRoutesOptions> = async (app, opts) => {
  const { controller } = opts;

  app.get('/products', {
    schema: {
      tags: ['Catalogue'],
      summary: 'Lister les produits café',
      description:
        'Recherche textuelle, filtres combinés (catégorie, mouture, fourchette de prix, stock), tri et pagination.',
      querystring: catalogQuerySchema,
      response: {
        200: catalogListResponseSchema,
        400: apiErrorSchema,
        500: apiErrorSchema,
      },
    },
    handler: (request, reply) => controller.listProducts(request, reply),
  });

  app.get('/products/:slug', {
    schema: {
      tags: ['Catalogue'],
      summary: 'Récupérer le détail complet d’un produit café',
      description:
        'Retourne le produit actif, sa catégorie et toutes ses variantes (conditionnement, mouture, prix en centimes, stocks).',
      params: productSlugParamsSchema,
      response: {
        200: productDetailResponseSchema,
        400: apiErrorSchema,
        404: apiErrorSchema,
        500: apiErrorSchema,
      },
    },
    handler: (request, reply) => controller.getProductBySlug(request, reply),
  });
};
