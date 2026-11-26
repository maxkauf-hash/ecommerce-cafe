import { randomInt, randomUUID } from 'node:crypto';
import type { CreateOrderBody, Order } from '@monorepo/shared';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/http-error';
import type {
  IOrderRepository,
  NewOrderItemInput,
  OrderableVariant,
} from '../interfaces/order-repository.interface';
import type { NewOrder } from '../db/schema';

const ORDER_RESERVATION_TTL_MS = 15 * 60 * 1000;

interface OrderCustomerContext {
  userId: string;
  email: string;
}

export class OrderService {
  constructor(private readonly orderRepository: IOrderRepository) {}

  /**
   * Creates a pending order: validates the requested variants, reserves the
   * stock atomically, snapshots prices/product data, then persists the order
   * and its items. Rolls back reservations if anything fails.
   * @param body The validated create-order payload.
   * @param customer Optional authenticated customer context (future session auth).
   * @returns The created order with its items.
   */
  async createOrder(
    body: CreateOrderBody,
    customer?: OrderCustomerContext | null,
  ): Promise<Order> {
    const customerEmail = body.customerEmail?.trim() || customer?.email;
    if (!customerEmail) {
      throw new BadRequestError(
        'Une adresse e-mail client est requise pour créer une commande',
        undefined,
        'CUSTOMER_EMAIL_REQUIRED',
      );
    }

    const quantities = this.mergeQuantities(body.items);
    const variants = await this.orderRepository.findVariantsByIds([...quantities.keys()]);
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));

    this.assertVariantsOrderable(quantities, variantById);

    const reservedVariantIds: string[] = [];
    try {
      for (const [variantId, quantity] of quantities) {
        const reserved = await this.orderRepository.reserveVariantStock(variantId, quantity);
        if (!reserved) {
          throw new ConflictError(
            'Stock insuffisant pour au moins une variante demandée',
            { variantId },
            'INSUFFICIENT_STOCK',
          );
        }
        reservedVariantIds.push(variantId);
      }
    } catch (error) {
      await this.releaseReservations(quantities, reservedVariantIds);
      throw error;
    }

    const items = this.buildOrderItems(quantities, variantById);
    const subtotalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);

    const orderData: NewOrder = {
      id: randomUUID(),
      orderNumber: this.generateOrderNumber(),
      userId: customer?.userId ?? null,
      customerEmail,
      status: 'PENDING',
      subtotalCents,
      shippingCents: 0,
      totalCents: subtotalCents,
      stripeSessionId: body.stripeSessionId ?? null,
      reservedUntil: new Date(Date.now() + ORDER_RESERVATION_TTL_MS),
    };

    try {
      return await this.orderRepository.createOrder(orderData, items);
    } catch (error) {
      await this.releaseReservations(quantities, [...quantities.keys()]);
      throw error;
    }
  }

  /**
   * Retrieves an order by its internal ID.
   * @param id The order ID.
   * @returns The order with its items.
   * @throws {NotFoundError} If no order exists for the given ID.
   */
  async getOrder(id: string): Promise<Order> {
    const normalizedId = id.trim();
    if (!normalizedId) {
      throw new BadRequestError('Identifiant de commande requis', { id }, 'INVALID_ORDER_ID');
    }

    const order = await this.orderRepository.findOrderById(normalizedId);
    if (!order) {
      throw new NotFoundError(
        'Commande introuvable',
        { id: normalizedId },
        'ORDER_NOT_FOUND',
      );
    }
    return order;
  }

  private mergeQuantities(items: CreateOrderBody['items']): Map<string, number> {
    const quantities = new Map<string, number>();
    for (const item of items) {
      quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
    }
    return quantities;
  }

  private assertVariantsOrderable(
    quantities: Map<string, number>,
    variantById: Map<string, OrderableVariant>,
  ): void {
    const missingIds = [...quantities.keys()].filter((id) => !variantById.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundError(
        'Variantes de produit introuvables',
        { variantIds: missingIds },
        'VARIANT_NOT_FOUND',
      );
    }

    const inactiveIds = [...variantById.values()]
      .filter((variant) => !variant.productIsActive)
      .map((variant) => variant.id);
    if (inactiveIds.length > 0) {
      throw new BadRequestError(
        'Certains produits ne sont plus disponibles à la commande',
        { variantIds: inactiveIds },
        'PRODUCT_INACTIVE',
      );
    }
  }

  private buildOrderItems(
    quantities: Map<string, number>,
    variantById: Map<string, OrderableVariant>,
  ): NewOrderItemInput[] {
    return [...quantities.entries()].map(([variantId, quantity]) => {
      const variant = variantById.get(variantId);
      if (!variant) {
        throw new NotFoundError(
          'Variante de produit introuvable',
          { variantId },
          'VARIANT_NOT_FOUND',
        );
      }
      return {
        id: randomUUID(),
        variantId: variant.id,
        productTitle: variant.productTitle,
        variantLabel: variant.label,
        sku: variant.sku,
        unitPriceCents: variant.priceCents,
        quantity,
        lineTotalCents: variant.priceCents * quantity,
      };
    });
  }

  private async releaseReservations(
    quantities: Map<string, number>,
    variantIds: string[],
  ): Promise<void> {
    await Promise.all(
      variantIds.map((variantId) =>
        this.orderRepository
          .releaseVariantStock(variantId, quantities.get(variantId) ?? 0)
          .catch(() => undefined),
      ),
    );
  }

  private generateOrderNumber(): string {
    const year = new Date().getFullYear();
    const sequence = randomInt(0, 1_000_000).toString().padStart(6, '0');
    return `CMD-${year}-${sequence}`;
  }
}
