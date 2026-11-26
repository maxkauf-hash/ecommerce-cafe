import type {
  Order,
  OrderList,
  OrderStatus,
  OrderSummary,
} from '@monorepo/shared';
import type { NewOrder, NewOrderItem } from '../db/schema';

/**
 * Order item data supplied by the caller. `orderId` is injected by the
 * repository once the parent order row exists.
 */
export type NewOrderItemInput = Omit<NewOrderItem, 'orderId'>;

/**
 * Minimal variant + product data needed to price an order line and build
 * the purchase snapshot.
 */
export interface OrderableVariant {
  id: string;
  sku: string;
  label: string;
  priceCents: number;
  availableStock: number;
  productTitle: string;
  productIsActive: boolean;
}

export interface IOrderRepository {
  // Création
  createOrder(data: NewOrder, items: NewOrderItemInput[]): Promise<Order>;
  // Lecture
  findOrderById(id: string): Promise<Order | null>;
  findOrderByNumber(orderNumber: string): Promise<Order | null>;
  // Variantes commandables (prix + snapshot produit)
  findVariantsByIds(ids: string[]): Promise<OrderableVariant[]>;
  // Stock
  reserveVariantStock(variantId: string, quantity: number): Promise<boolean>;
  releaseVariantStock(variantId: string, quantity: number): Promise<void>;
  // Statuts / paiement
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null>;
  updateOrderStripeSession(
    id: string,
    sessionId: string,
    paymentIntentId?: string,
  ): Promise<void>;
  // Historique client (optionnel mais cohérent avec l'index user_id_created_at)
  findOrdersByUser(userId: string, page?: number, pageSize?: number): Promise<OrderList>;
  findOrderSummariesByIds(ids: string[]): Promise<OrderSummary[]>;
  // Nettoyage des réservations expirées (reserved_until + index status_reserved_until)
  releaseExpiredReservations(): Promise<number>;
}
