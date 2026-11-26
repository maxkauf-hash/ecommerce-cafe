import { and, asc, count, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import type {
  Order,
  OrderItem,
  OrderList,
  OrderStatus,
  OrderSummary,
} from '@monorepo/shared';
import type {
  IOrderRepository,
  NewOrderItemInput,
  OrderableVariant,
} from '../interfaces/order-repository.interface';
import type { DrizzleDb } from '../interfaces/drizzle.interface';
import { orderItems, orders, productVariants, products } from '../db/schema';
import type {
  NewOrder,
  OrderItemRow,
  OrderRow,
} from '../db/schema';

type OrderWithItems = OrderRow & { items: OrderItemRow[] };

export class OrderRepository implements IOrderRepository {
  constructor(private readonly db: DrizzleDb) {}

  /**
   * Creates an order and its items in a single transaction.
   * @param data The order data to insert.
   * @param items The line items to associate with the order.
   * @returns The created order with its items in domain form.
   * @throws {Error} If the order insert fails.
   */
  public async createOrder(
    data: NewOrder,
    items: NewOrderItemInput[],
  ): Promise<Order> {
    return this.db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values(data).returning();
      if (!order) {
        throw new Error('Failed to create order');
      }
      const insertedItems = await tx
        .insert(orderItems)
        .values(items.map((item) => ({ ...item, orderId: order.id })))
        .returning();
      return this.toDomainOrder({ ...order, items: insertedItems });
    });
  }

  /**
   * Finds an order by its internal ID, including its items.
   * @param id The order ID.
   * @returns The order in domain form, or null if not found.
   */
  public async findOrderById(id: string): Promise<Order | null> {
    const row = await this.db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: { items: true },
    });
    return row ? this.toDomainOrder(row) : null;
  }

  /**
   * Fetches orderable variant data (price, stock, product snapshot fields)
   * for the given variant IDs.
   * @param ids The product variant IDs to look up.
   * @returns The matching variants; missing IDs are simply absent from the result.
   */
  public async findVariantsByIds(ids: string[]): Promise<OrderableVariant[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        label: productVariants.label,
        priceCents: productVariants.priceCents,
        availableStock: productVariants.availableStock,
        productTitle: products.title,
        productIsActive: products.isActive,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(inArray(productVariants.id, ids));
  }

  /**
   * Finds an order by its public order number, including its items.
   * @param orderNumber The human-readable order number.
   * @returns The order in domain form, or null if not found.
   */
  public async findOrderByNumber(orderNumber: string): Promise<Order | null> {
    const row = await this.db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderNumber),
      with: { items: true },
    });
    return row ? this.toDomainOrder(row) : null;
  }

  /**
   * Atomically reserves stock for a product variant, decrementing available
   * stock and incrementing reserved stock. Fails if not enough stock is available.
   * @param variantId The product variant ID.
   * @param quantity The quantity to reserve.
   * @returns true if the reservation succeeded, false if insufficient stock.
   */
  public async reserveVariantStock(variantId: string, quantity: number): Promise<boolean> {
    const result = await this.db
      .update(productVariants)
      .set({
        availableStock: sql`${productVariants.availableStock} - ${quantity}`,
        reservedStock: sql`${productVariants.reservedStock} + ${quantity}`,
      })
      .where(
        and(
          eq(productVariants.id, variantId),
          sql`${productVariants.availableStock} >= ${quantity}`,
        ),
      );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Releases previously reserved stock for a product variant, incrementing
   * available stock and decrementing reserved stock (floored at 0).
   * @param variantId The product variant ID.
   * @param quantity The quantity to release.
   */
  public async releaseVariantStock(variantId: string, quantity: number): Promise<void> {
    await this.db
      .update(productVariants)
      .set({
        availableStock: sql`${productVariants.availableStock} + ${quantity}`,
        reservedStock: sql`greatest(${productVariants.reservedStock} - ${quantity}, 0)`,
      })
      .where(eq(productVariants.id, variantId));
  }

  /**
   * Updates the status of an order and returns the refreshed order.
   * @param id The order ID.
   * @param status The new order status.
   * @returns The updated order with its items, or null if not found.
   */
  public async updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
    await this.db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id));
    return this.findOrderById(id);
  }

  /**
   * Stores the Stripe session ID (and optionally the payment intent ID) on an order.
   * @param id The order ID.
   * @param sessionId The Stripe checkout session ID.
   * @param paymentIntentId The Stripe payment intent ID, if available.
   */
  public async updateOrderStripeSession(
    id: string,
    sessionId: string,
    paymentIntentId?: string,
  ): Promise<void> {
    await this.db
      .update(orders)
      .set({
        stripeSessionId: sessionId,
        ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));
  }

  /**
   * Lists a user's orders with pagination, ordered by most recent first.
   * @param userId The user's ID.
   * @param page The 1-based page number (default: 1).
   * @param pageSize The number of orders per page (default: 12).
   * @returns A paginated list of order summaries.
   */
  public async findOrdersByUser(
    userId: string,
    page = 1,
    pageSize = 12,
  ): Promise<OrderList> {
    const whereCondition = eq(orders.userId, userId);

    const [totalItems] = await this.db
      .select({ value: count() })
      .from(orders)
      .where(whereCondition);

    const rows = await this.db.query.orders.findMany({
      where: whereCondition,
      orderBy: [desc(orders.createdAt), asc(orders.id)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    const total = totalItems?.value ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      items: rows.map((row) => this.toDomainOrderSummary(row)),
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Fetches order summaries for the given order IDs.
   * @param ids The order IDs to look up.
   * @returns The matching order summaries; empty if `ids` is empty.
   */
  public async findOrderSummariesByIds(ids: string[]): Promise<OrderSummary[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.db.query.orders.findMany({
      where: inArray(orders.id, ids),
    });
    return rows.map((row) => this.toDomainOrderSummary(row));
  }

  /**
   * Cancels pending orders whose stock reservation has expired, releasing the
   * reserved stock back to the variants. Intended to be run periodically.
   * @returns The number of expired orders that were cancelled.
   */
  public async releaseExpiredReservations(): Promise<number> {
    return this.db.transaction(async (tx) => {
      const expired = await tx.query.orders.findMany({
        where: and(eq(orders.status, 'PENDING'), lt(orders.reservedUntil, new Date())),
        with: { items: true },
      });

      for (const order of expired) {
        for (const item of order.items) {
          if (item.variantId) {
            await tx
              .update(productVariants)
              .set({
                availableStock: sql`${productVariants.availableStock} + ${item.quantity}`,
                reservedStock: sql`greatest(${productVariants.reservedStock} - ${item.quantity}, 0)`,
              })
              .where(eq(productVariants.id, item.variantId));
          }
        }
        await tx
          .update(orders)
          .set({ status: 'CANCELLED', updatedAt: new Date() })
          .where(eq(orders.id, order.id));
      }

      return expired.length;
    });
  }

  private toDomainOrder(row: OrderWithItems): Order {
    return {
      ...this.toDomainOrderSummary(row),
      items: row.items.map((item) => this.toDomainOrderItem(item)),
    };
  }

  private toDomainOrderSummary(row: OrderRow): OrderSummary {
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      userId: row.userId,
      customerEmail: row.customerEmail,
      status: row.status,
      subtotalCents: row.subtotalCents,
      shippingCents: row.shippingCents,
      totalCents: row.totalCents,
      stripeSessionId: row.stripeSessionId,
      stripePaymentIntentId: row.stripePaymentIntentId,
      reservedUntil: row.reservedUntil?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDomainOrderItem(row: OrderItemRow): OrderItem {
    return {
      id: row.id,
      orderId: row.orderId,
      variantId: row.variantId,
      productTitle: row.productTitle,
      variantLabel: row.variantLabel,
      sku: row.sku,
      unitPriceCents: row.unitPriceCents,
      quantity: row.quantity,
      lineTotalCents: row.lineTotalCents,
    };
  }
}
