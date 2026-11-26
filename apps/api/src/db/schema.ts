import { pgTable, pgEnum, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Enums ---

export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN']);

export const grindOptionEnum = pgEnum('grind_option', [
  'WHOLE_BEAN',
  'ESPRESSO',
  'FILTER',
  'FRENCH_PRESS',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'PENDING',
  'PAID',
  'CANCELLED',
  'FULFILLED',
]);

// --- Tables ---

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: userRoleEnum('role').notNull().default('USER'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    tastingNotes: text('tasting_notes').array().notNull().default([]),
    origin: text('origin'),
    imageUrl: text('image_url'),
    isActive: boolean('is_active').notNull().default(true),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('products_category_id_idx').on(table.categoryId),
    index('products_is_active_created_at_idx').on(table.isActive, table.createdAt),
  ],
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: text('id').primaryKey(),
    sku: text('sku').notNull().unique(),
    label: text('label').notNull(), // Ex. : "250g - Grains" ou "1kg - Expresso"
    weightGrams: integer('weight_grams').notNull(),
    grind: grindOptionEnum('grind'), // Nullable pour un accessoire/matériel non moulu
    priceCents: integer('price_cents').notNull(), // Toujours en centimes
    availableStock: integer('available_stock').notNull().default(0),
    reservedStock: integer('reserved_stock').notNull().default(0),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('product_variants_product_id_idx').on(table.productId),
    index('product_variants_price_cents_idx').on(table.priceCents),
  ],
);

export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(),
    orderNumber: text('order_number').notNull().unique(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    customerEmail: text('customer_email').notNull(),
    status: orderStatusEnum('status').notNull().default('PENDING'),
    subtotalCents: integer('subtotal_cents').notNull(),
    shippingCents: integer('shipping_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),
    stripeSessionId: text('stripe_session_id').unique(),
    stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
    reservedUntil: timestamp('reserved_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('orders_user_id_created_at_idx').on(table.userId, table.createdAt),
    index('orders_status_reserved_until_idx').on(table.status, table.reservedUntil),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    variantId: text('variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),
    // Snapshot au moment de l'achat pour préserver l'historique commande
    productTitle: text('product_title').notNull(),
    variantLabel: text('variant_label').notNull(),
    sku: text('sku').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalCents: integer('line_total_cents').notNull(),
  },
  (table) => [
    index('order_items_order_id_idx').on(table.orderId),
    index('order_items_variant_id_idx').on(table.variantId),
  ],
);

// --- Relations (pour l'API relationnelle Drizzle `db.query.*`) ---

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

// --- Types d'inférence Drizzle ---

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;

export type OrderRow = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type OrderItemRow = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
