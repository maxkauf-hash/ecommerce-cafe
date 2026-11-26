import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { DrizzleDb } from './interfaces/drizzle.interface';
import { DrizzleProductRepository } from './repositories/catalog.repository.js';
import { CatalogService } from './services/catalog.service.js';
import { CatalogController } from './controllers/catalog.controller.js';
import { catalogRoutes } from './routes/catalog.route.js';
import { errorHandler } from './errors/error-handler.js';
import { OrderService } from './services/order.service';
import { OrderRepository } from './repositories/order.repository';
import { OrderController } from './controllers/order.controller';
import { orderRoutes } from './routes/order.routes';

export interface BuildAppOptions {
  db: DrizzleDb;
  corsOrigin?: string | string[] | boolean;
}

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({
    logger: true,
  }).withTypeProvider<ZodTypeProvider>();

  // 1. Compilateurs Zod pour validation (query/params/body) et sérialisation (response)
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // 2. CORS (utile pour apps/web sur http://localhost:3000)
  await app.register(cors, {
    origin: options.corsOrigin ?? true,
  });

  // 3. Documentation OpenAPI & Swagger UI (/docs)
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'API Catalogue Café — Semaine 1',
        description:
          'API REST Fastify typée avec Zod pour le catalogue café (produits, variantes, filtres, pagination).',
        version: '0.1.0',
      },
      tags: [
        { name: 'Catalogue', description: 'Endpoints de consultation du catalogue café' },
        { name: 'Orders', description: 'Création et consultation des commandes' },
      ],
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // 4. Gestionnaire d'erreurs centralisé
  app.setErrorHandler(errorHandler);

  // 5. Composition des couches (SOLID / Dependency Inversion)
  const productRepository = new DrizzleProductRepository(options.db);
  const catalogService = new CatalogService(productRepository);
  const catalogController = new CatalogController(catalogService);

  // 6. Enregistrement des routes
  await app.register(catalogRoutes, {
    controller: catalogController,
  });

  const orderRepository = new OrderRepository(options.db);
  const orderService = new OrderService(orderRepository);
  const orderController = new OrderController(orderService);

  await app.register(orderRoutes, { controller: orderController });

  return app;
}
