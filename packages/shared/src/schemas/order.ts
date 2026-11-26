import { z } from 'zod';

export const orderStatusSchema = z.enum(['PENDING', 'PAID', 'FULFILLED', 'CANCELLED']);

export const orderItemSchema = z.object({
  id: z.string().min(1),
  orderId: z.string().min(1),
  variantId: z.string().min(1).nullable(),
  // Snapshot au moment de l'achat pour préserver l'historique
  productTitle: z.string().min(1),
  variantLabel: z.string().min(1),
  sku: z.string().min(1),
  unitPriceCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  lineTotalCents: z.number().int().nonnegative(),
});

export const createOrderItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().max(99),
});

export const shippingAddressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(2).max(2), // code ISO 3166-1 alpha-2
});

export const createOrderBodySchema = z.object({
  items: z.array(createOrderItemSchema).min(1).max(50),
  customerEmail: z.email().optional(), // sinon dérivé de la session utilisateur
  shippingAddress: shippingAddressSchema.optional(),
  stripeSessionId: z.string().min(1).optional(), // flux "pay first" Stripe Checkout
});

export const orderSchema = z.object({
  id: z.string().min(1),
  orderNumber: z.string().min(1),
  userId: z.string().min(1).nullable(),
  customerEmail: z.email(),
  status: orderStatusSchema,
  subtotalCents: z.number().int().nonnegative(),
  shippingCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  stripeSessionId: z.string().nullable(),
  stripePaymentIntentId: z.string().nullable(),
  reservedUntil: z.iso.datetime().nullable(),
  items: z.array(orderItemSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const orderSummarySchema = orderSchema.omit({ items: true });

export const orderListSchema = z.object({
  items: z.array(orderSummarySchema),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalItems: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export const orderParamsSchema = z.object({
  id: z.string().min(1),
});

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const stripeWebhookBodySchema = z.object({
  type: z.string().min(1),
  data: z.object({
    object: z.record(z.string(), z.unknown()),
  }),
});

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type CreateOrderItem = z.infer<typeof createOrderItemSchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export type OrderList = z.infer<typeof orderListSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
