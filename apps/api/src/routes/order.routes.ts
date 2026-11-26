import {
  apiErrorSchema,
  createOrderBodySchema,
  orderParamsSchema,
  orderSchema,
} from '@monorepo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { OrderRoutesOptions } from '../interfaces/order-routes.interface.js';

export const orderRoutes: FastifyPluginAsyncZod<OrderRoutesOptions> = async (app, opts) => {
  const { controller } = opts;
  app.post('/orders', {
    schema: {
      tags: ['Orders'],
      body: createOrderBodySchema, // validation du body
      response: {
        201: orderSchema, // sérialisation de la réponse
        400: apiErrorSchema, // erreurs de validation auto
        500: apiErrorSchema,
      },
    },
    handler: (request, reply) => controller.createOrder(request, reply),
  });

  app.get('/orders/:id', {
    schema: {
      tags: ['Orders'],
      params: orderParamsSchema, // validation des params
      response: {
        200: orderSchema,
        400: apiErrorSchema,
        404: apiErrorSchema,
      },
    },
    handler: (request, reply) => controller.getOrder(request, reply),
  });
};
