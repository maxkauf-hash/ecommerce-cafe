import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateOrderBody } from '@monorepo/shared';
import type { OrderService } from '../services/order.service.js';

export interface OrderParams {
  id: string;
}

export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * Handles POST /orders — creates a pending order with stock reservation.
   */
  async createOrder(
    request: FastifyRequest<{ Body: CreateOrderBody }>,
    reply: FastifyReply,
  ) {
    const order = await this.orderService.createOrder(request.body);
    return reply.status(201).send(order);
  }

  /**
   * Handles GET /orders/:id — returns an order with its items.
   */
  async getOrder(request: FastifyRequest<{ Params: OrderParams }>, reply: FastifyReply) {
    const order = await this.orderService.getOrder(request.params.id);
    return reply.status(200).send(order);
  }
}
